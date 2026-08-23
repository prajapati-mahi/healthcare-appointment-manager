# System Design: Healthcare Appointment & Follow-up Manager

## 1. Architecture Overview

The system adopts a modular **client-server architecture** decoupled via **REST APIs** and **asynchronous message queues**.

```
[React SPA (Vite)] ──> [Express API Gateway / Controllers] ──> [Domain Services]
                                                                     │
       ┌───────────────────────────────┬─────────────────────────────┼────────────────────────┐
       ▼                               ▼                             ▼                        ▼
[PostgreSQL Database]          [Redis / BullMQ]               [OpenAI LLM API]         [Google Calendar / SMTP]
(Prisma ORM & Locks)        ┌──────────┴──────────┐       (Pre/Post Summaries)          (Async Sync Workers)
                            │  Notification Queue │
                            │  Medication Queue   │
                            │  Calendar Sync      │
                            │  Slot Hold Worker   │
                            └─────────────────────┘
```

---

## 2. Double-Booking Prevention & Concurrency Control

### Core Challenges
Concurrent booking requests for the same physician at the identical time slot can cause data inconsistencies (overbooking) if validation relies solely on in-memory or uncommitted read checks.

### Multi-Tier Defense Strategy
1. **Pessimistic Slot Hold**:
   - Patient claims a 5-minute hold in `SlotHold` table before proceeding to symptom data entry.
   - Hold uniqueness is constrained at the database level: `@@unique([doctorId, holdDate, startTime, isActive])`.
2. **Atomic Booking Transaction**:
   - Booking executes within an isolated `prisma.$transaction(async (tx) => { ... })`.
   - The transaction verifies active hold ownership and checks for any overlapping `BOOKED` / `CONFIRMED` appointment.
3. **Database-Level Partial Unique Index**:
   - `CREATE UNIQUE INDEX unique_active_appointment ON "Appointment"("doctorId", "appointmentDate", "startTime") WHERE status IN ('BOOKED', 'CONFIRMED', 'HOLD');`
   - Even if two concurrent requests bypass application logic, PostgreSQL rejects the second transaction with a unique constraint violation (`P2002`).

---

## 3. Asynchronous Resilience & Decoupling

External services (Email SMTP, Google Calendar, LLMs) introduce latency and intermittent network failures.

- **Transactional Isolation**: All external API calls (Google Calendar event insertion, Nodemailer sending, Medication reminder scheduling) are enqueued to **BullMQ** *after* the database transaction commits.
- **Degraded Graceful Operation**:
  - If Google Calendar sync fails, the appointment `calendarSyncStatus` is flagged as `FAILED`, recorded in the Admin Telemetry dashboard, and queued for retry without rolling back the confirmed visit.
  - If LLM generation times out, doctor and patient workflows remain unobstructed; doctor notes and patient symptoms are preserved with raw fallback views.

---

## 4. Dual-Stage LLM Summarization Architecture

```
[Patient Symptoms] ──> [Pre-Visit LLM] ──> [Urgency & Suggested Questions] ──> [Doctor Triage]
                                                                                      │
                                                                           (Consultation Visit)
                                                                                      │
[Patient Care Plan] <── [Doctor Approval Gate] <── [Post-Visit LLM] <── [Clinical Notes & Rx]
```

1. **Pre-Visit Clinical Triage**:
   - Transforms patient descriptions into structured JSON: `urgencyLevel` (`LOW`/`MEDIUM`/`HIGH`), `chiefComplaint`, and diagnostic follow-up questions.
2. **Post-Visit Patient Care Plan**:
   - Translates physician observations into layperson language: clear dosing schedules, warning signs, and recovery steps.
3. **Doctor Approval Gate (`summaryApprovedByDoctor`)**:
   - Enforces human-in-the-loop clinical governance. AI-generated summaries cannot be read by patients until explicitly approved by the doctor.

---

## 5. Doctor Leave Conflict Handling

When a physician schedules leave on a date:
1. `doctorService.handleLeaveConflicts` queries all active appointments (`BOOKED` / `CONFIRMED`) for that doctor on the specified date.
2. Each conflicting appointment status transitions to `DOCTOR_LEAVE`.
3. Patient notification records (`NotificationType.DOCTOR_LEAVE`) are created, email jobs are pushed to BullMQ, and linked Google Calendar events are dispatched for deletion.
