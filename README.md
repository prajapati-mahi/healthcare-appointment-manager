# Healthcare Appointment & Follow-up Manager

A full-stack, production-grade healthcare application featuring safe concurrent appointment booking, slot-hold reservations, dual-stage LLM clinical summarization with doctor approval gates, medication reminder schedules, Google Calendar synchronization, BullMQ background queues, and role-based portals for Patients, Doctors, and Administrators.

---

## 🌟 Key Architecture & Engineering Decisions

1. **Database-Level Double-Booking Prevention**:
   - Two-layer protection: An application-level Prisma interactive transaction combined with a PostgreSQL partial unique index (`unique_active_appointment`) over `(doctorId, appointmentDate, startTime)` where `status IN ('BOOKED', 'CONFIRMED', 'HOLD')`.
   - Guarantees zero double bookings even under heavy concurrent requests.

2. **5-Minute Server-Side Slot-Hold Mechanism**:
   - When a patient selects an available time slot in the booking wizard, a temporary record is created in `SlotHold` with `isActive = true` and `expiresAt = now() + 5 minutes`.
   - `SlotHold` utilizes a unique constraint `@@unique([doctorId, holdDate, startTime, isActive])` to ensure only one active hold exists per slot.
   - Background BullMQ worker automatically cleans expired holds every 60 seconds.

3. **Dual-Stage LLM Clinical Summaries**:
   - **Pre-Visit Triage**: Analyzes patient-submitted symptoms to extract chief complaints, compute triage urgency scores (`LOW`, `MEDIUM`, `HIGH`), and suggest targeted diagnostic questions for the physician.
   - **Post-Visit Patient Care Plan**: Translates complex medical notes into readable patient instructions, medication routines, and warning signs.
   - **Doctor Approval Gate**: AI-generated summaries remain draft until explicitly reviewed and approved by the doctor (`summaryApprovedByDoctor = true`).
   - **Fault Tolerance**: All LLM calls are wrapped in robust fallbacks; if OpenAI is unconfigured or rate-limited, appointments still succeed gracefully and fallback views are rendered.

4. **Reliable Background Queues & Non-Blocking Architecture**:
   - External dependencies (Nodemailer email notifications, Google Calendar OAuth sync, Medication reminder jobs) are decoupled into BullMQ queues with exponential backoff retries.
   - Failures in third-party services (e.g. invalid calendar tokens or SMTP timeouts) never cause appointment booking transactions to roll back.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** v18+ (tested on Node.js v24)
- **PostgreSQL** 14+ running on port `5432`
- **Redis** running on port `6379`

---

### 1. Database Setup & Seeding

```bash
# In backend directory
cd backend

# Copy environment variables
cp .env.example .env

# Run Prisma migrations
npx prisma migrate dev --name init

# Seed database with sample doctors, working hours, patients, and past visits
npm run seed
```

---

### 2. Running Backend API Server & Background Workers

```bash
# Terminal 1: Start Express API Server (Port 5000)
cd backend
npm run dev

# Terminal 2: Start BullMQ Background Workers
cd backend
npm run dev:worker
```

---

### 3. Running Frontend Web App

```bash
# Terminal 3: Start Vite React Frontend (Port 5173)
cd frontend
npm run dev
```

Visit **http://localhost:5173** to access the application.

---

## 🔑 Pre-Seeded Demo Credentials

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@healthcare.dev` | `Admin@123` | Master telemetry, user & doctor roster management |
| **Doctor** | `dr.smith@healthcare.dev` | `Doctor@123` | General Physician (MBBS, MD) |
| **Doctor** | `dr.sarah@healthcare.dev` | `Doctor@123` | Cardiologist (MD, DM) |
| **Doctor** | `dr.patel@healthcare.dev` | `Doctor@123` | Pediatrician (MBBS, MD) |
| **Patient** | `patient1@test.com` | `Patient@123` | Alice Thompson (has past visits & prescriptions) |
| **Patient** | `patient2@test.com` | `Patient@123` | Bob Martinez |

---

## 📂 Project Structure

```
healthcare-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # 11 relational models with enums
│   │   └── seed.ts                  # Comprehensive demo seed script
│   ├── src/
│   │   ├── config/                  # DB, Redis, Winston Logger, Constants
│   │   ├── controllers/             # Express route controllers
│   │   ├── middleware/              # JWT Auth, RBAC, Rate limiting, Error handler
│   │   ├── queues/                  # BullMQ queue initializers
│   │   ├── routes/                  # Modular REST API endpoints
│   │   ├── services/                # Business logic (Booking, Availability, LLM, Email, Calendar)
│   │   ├── workers/                 # Notification, Medication, Calendar, SlotHold workers
│   │   ├── index.ts                 # Server entry point
│   │   └── app.ts                   # Express application setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # Button, Input, Modal, StatusBadge, Cards, Select
│   │   │   ├── layout/              # Navbar, Sidebar, Patient/Doctor/Admin Layouts
│   │   │   └── common/              # DoctorCard, AppointmentCard, SlotPicker, NotificationBell
│   │   ├── context/                 # AuthContext (JWT state & profile)
│   │   ├── pages/
│   │   │   ├── auth/                # Login & Registration
│   │   │   ├── patient/             # Dashboard, Search, Multi-step Wizard, Visits, Meds
│   │   │   ├── doctor/              # Overview, Appointments, Post-Visit Studio, Availability
│   │   │   └── admin/               # System Telemetry, Users, Doctors, Leave Oversight
│   │   ├── router/                  # React Router with RBAC guards
│   │   └── types/                   # TypeScript interfaces
│   └── package.json
├── README.md
└── SYSTEM_DESIGN.md
```
