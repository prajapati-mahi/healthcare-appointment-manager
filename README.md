# Healthcare Appointment & Follow-up Manager

> 🌐 **Live Frontend (Vercel)**: [https://healthcare-appointment-manager-lac.vercel.app](https://healthcare-appointment-manager-lac.vercel.app)  
> ⚙️ **Live Backend API (Render)**: [https://healthcare-backend-bm4s.onrender.com](https://healthcare-backend-bm4s.onrender.com)

A full-stack, production-grade clinical scheduling and follow-up management platform. It guarantees concurrency safety via database-level unique constraints and 5-minute atomic slot holds, implements dual-stage AI clinical workflows with human-in-the-loop doctor approval gates, and manages notifications, medication reminders, and Google Calendar sync via decoupled BullMQ background worker queues.


---

## 🌟 Table of Contents
- [Application Showcase & User Flows](#-application-showcase--user-flows)
- [Architecture & Key Features](#-architecture--key-features)
- [Quick Start & Setup Guide](#-quick-start--setup-guide)
- [Environment Variables (.env.example)](#-environment-variables-envexample)
- [Database Schema (Prisma)](#-database-schema-prisma)
- [API Documentation](#-api-documentation)
- [LLM Prompts & Clinical Guidance](#-llm-prompts--clinical-guidance)
- [Google Calendar Setup Guide](#-google-calendar-setup-guide)
- [Demo Credentials](#-demo-credentials)
- [Deployment Guide](#-deployment-guide)

---

## 📸 Application Showcase & User Flows

### 1. Landing & Authentication
| **Landing Page** | **Multi-Role Authentication** |
| :---: | :---: |
| ![Landing Page](docs/screenshots/01_landing_page.png) | ![Login Portal](docs/screenshots/02_login_portal.png) |
| *Hero showcase, service overview, and quick entrypoints* | *Role-based sign in with 1-Click demo account filling* |

---

### 2. Patient Portal & Booking Flow
| **Patient Dashboard** | **Doctor Search & Slot Booking** |
| :---: | :---: |
| ![Patient Dashboard](docs/screenshots/03_patient_dashboard.png) | ![Doctor Search & Booking](docs/screenshots/04_doctor_search_booking.png) |
| *Upcoming appointments, quick booking actions, and records* | *Specialization filtering and atomic 5-minute slot hold* |

| **Medications & Care Instructions** |
| :---: |
| ![Patient Medications](docs/screenshots/05_patient_medications.png) |
| *Active prescriptions, dosage timing, and doctor-approved instructions* |

---

### 3. Doctor Clinical Portal
| **Doctor Queue & Patient Overview** | **Availability & Shift Management** |
| :---: | :---: |
| ![Doctor Dashboard](docs/screenshots/06_doctor_dashboard.png) | ![Doctor Availability](docs/screenshots/07_doctor_availability.png) |
| *Patient queue with pre-visit AI triage and post-visit notes* | *Weekly working shifts, consultation duration, and leaves* |

---

### 4. Admin Governance & System Operations
| **System Telemetry & Metrics** | **Doctor Directory & Onboarding** |
| :---: | :---: |
| ![Admin Dashboard](docs/screenshots/08_admin_dashboard.png) | ![Admin Doctors](docs/screenshots/09_admin_doctors.png) |
| *High-level KPIs, appointment volume, and platform activity* | *Manage physician profiles, consultation fees, and credentials* |

| **Doctor Leave Conflict Engine** |
| :---: |
| ![Admin Leave Management](docs/screenshots/10_admin_leave_conflicts.png) |
| *Automatic conflict detection, notification queue, and auto-reschedule handling* |

---

## 🌟 Architecture & Key Features

1. **Double-Booking Prevention**:
   - PostgreSQL Partial Unique Index: `CREATE UNIQUE INDEX unique_active_appointment ON "Appointment"("doctorId", "appointmentDate", "startTime") WHERE status IN ('BOOKED', 'CONFIRMED', 'HOLD');`
   - ACID Prisma Transaction inside `appointmentService.bookAppointment` verifying hold ownership before committing.

2. **5-Minute Server-Side Slot-Hold Engine**:
   - Temporary reservation in `SlotHold` with `@@unique([doctorId, holdDate, startTime, isActive])`.
   - BullMQ cron worker automatically releases expired holds every 60 seconds.

3. **Dual-Stage Clinical LLM Workflows**:
   - **Pre-Visit Triage**: Analyzes patient symptoms into `urgencyLevel` (`LOW`/`MEDIUM`/`HIGH`), chief complaint, and suggested diagnostic questions.
   - **Post-Visit Patient Care Plan**: Translates clinical notes into layperson recovery instructions, dosing routines, and warning signs.
   - **Doctor Approval Gate**: Post-visit summaries remain draft until explicitly approved by the attending doctor (`summaryApprovedByDoctor = true`).

4. **Decoupled Asynchronous Workers**:
   - BullMQ queues handle Nodemailer emails, medication reminders, and Google Calendar sync with exponential retry backoff.
   - Third-party failures never block or roll back appointment transactions.

5. **Doctor Leave Conflict Resolution**:
   - When a doctor marks leave, conflicting appointments automatically transition to `DOCTOR_LEAVE` and trigger patient email alerts.

---

## 🚀 Quick Start & Setup Guide

### Prerequisites
- **Node.js** v18+ (tested on Node.js v24)
- **PostgreSQL** 14+ on `localhost:5432`
- **Redis** on `localhost:6379`

### Step 1: Database Setup & Seeding
```bash
# Navigate to backend
cd backend

# Copy environment template
cp .env.example .env

# Run Prisma database migrations
npx prisma migrate dev --name init

# Seed database with sample doctors, working shifts, and patients
npm run seed
```

### Step 2: Run Backend & Background Workers
```bash
# Terminal 1: Start Backend API (Port 5000)
cd backend
npm run dev

# Terminal 2: Start Background Workers
cd backend
npm run dev:worker
```

### Step 3: Run Frontend Client
```bash
# Terminal 3: Start Vite React Frontend (Port 5173 / 5174)
cd frontend
npm run dev
```
Open **`http://localhost:5173`** (or `http://localhost:5174`) in your browser.

---

## ⚙️ Environment Variables (`.env.example`)

File: `backend/.env.example`
```env
# ─── Database ───────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/healthcare_app"

# ─── JWT & Auth ─────────────────────────────────────────────────────────────
JWT_SECRET="healthcare-jwt-secret-change-in-production-2024"
JWT_EXPIRES_IN="7d"

# ─── Server & CORS ──────────────────────────────────────────────────────────
PORT=5000
NODE_ENV=development
CORSORIGIN="http://localhost:5173,http://localhost:5174"

# ─── Redis & Queues ─────────────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ─── Email (Nodemailer / SMTP) ──────────────────────────────────────────────
EMAIL_HOST="smtp.ethereal.email"
EMAIL_PORT=587
EMAIL_USER="dev@ethereal.email"
EMAIL_PASS="devpassword"
EMAIL_FROM="HealthCare App <noreply@healthcare.dev>"

# ─── LLM (OpenAI) ───────────────────────────────────────────────────────────
LLM_API_KEY="sk-your-openai-api-key-here"
LLM_MODEL="gpt-4o-mini"

# ─── Google Calendar OAuth 2.0 ──────────────────────────────────────────────
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5000/api/calendar/callback"

# ─── Worker Settings ────────────────────────────────────────────────────────
WORKER_CONCURRENCY=5
```

---

## 🗄️ Database Schema (Prisma)

The PostgreSQL database consists of 11 relational models with enforced constraints:

- **`User`**: System identity (`id`, `email`, `passwordHash`, `name`, `role` [`PATIENT`, `DOCTOR`, `ADMIN`], `isActive`).
- **`DoctorProfile`**: Specialization, qualifications, experience, slot duration (15/20/30/45/60 min), consultation fee.
- **`WorkingHours`**: Doctor weekly schedule (`dayOfWeek` [0–6], `startTime`, `endTime`, `isActive`).
- **`DoctorLeave`**: Scheduled physician leaves (`leaveDate`, `reason`, `notified`).
- **`SlotHold`**: 5-minute atomic holds (`holdDate`, `startTime`, `endTime`, `expiresAt`, `isActive`).
- **`Appointment`**: Visits (`patientId`, `doctorId`, `appointmentDate`, `startTime`, `endTime`, `status`, `symptoms`, `urgencyLevel`, `chiefComplaint`, `suggestedQuestions`, `postVisitNotes`, `patientFriendlySummary`, `summaryApprovedByDoctor`, `calendarEventIdPatient`, `calendarSyncStatus`).
- **`Prescription`**: Consultation diagnosis, notes, follow-up date.
- **`Medication`**: Active prescription courses (`name`, `dosage`, `frequency`, `durationDays`, `reminderTimes`, `isActive`).
- **`Notification`**: Email dispatch logs (`type`, `status` [`PENDING`, `SENT`, `FAILED`, `DEAD_LETTER`], `attempts`, `errorMessage`).
- **`CalendarIntegration`**: Google OAuth tokens (`accessToken`, `refreshToken`, `tokenExpiry`, `isConnected`).

---

## 📡 API Documentation

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Public | Register new patient account |
| **POST** | `/api/auth/login` | Public | Authenticate user & return JWT token |
| **GET** | `/api/auth/me` | Authenticated | Fetch current user session |
| **GET** | `/api/doctors` | Public | Search doctors by query or specialization |
| **GET** | `/api/availability/slots` | Public | Generate available time slots for doctor & date |
| **POST** | `/api/availability/hold` | Patient | Claim exclusive 5-minute slot reservation |
| **POST** | `/api/appointments` | Patient | Confirm appointment booking with symptoms & hold ID |
| **GET** | `/api/appointments/my` | Authenticated | List user appointments with status filter |
| **PATCH** | `/api/appointments/:id/cancel` | Patient/Doctor | Cancel appointment with reason |
| **POST** | `/api/appointments/:id/reschedule`| Patient | Reschedule appointment to a new slot hold |
| **POST** | `/api/appointments/:id/complete` | Doctor | Save clinical assessment notes & diagnosis |
| **GET** | `/api/ai/pre-visit/:id` | Doctor | Access pre-visit AI triage and urgency level |
| **POST** | `/api/ai/post-visit/:id` | Doctor | Generate patient-friendly AI care plan from notes |
| **POST** | `/api/ai/post-visit/:id/approve` | Doctor | Doctor Approval Gate releasing summary to patient |
| **GET** | `/api/ai/post-visit/:id/patient` | Patient | Fetch approved post-visit care plan |
| **POST** | `/api/medications` | Doctor | Add medication course with daily reminder schedule |
| **GET** | `/api/medications/my` | Patient | Get patient active medications |
| **POST** | `/api/doctors/me/leaves` | Doctor | Schedule leave date and auto-cancel conflicts |
| **GET** | `/api/admin/dashboard` | Admin | System telemetry and queue health metrics |

---

## 🧠 LLM Prompts & Clinical Guidance

### 1. Pre-Visit Triage Prompt (Doctor Preparation)
```
Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor.

Symptoms: <symptoms>
Duration: <duration>
Severity: <severity>

Return ONLY a valid JSON object:
{
  "urgencyLevel": "Low" | "Medium" | "High",
  "chiefComplaint": "1-2 sentence description",
  "suggestedQuestions": ["question 1", "question 2", "question 3"]
}
```

### 2. Post-Visit Care Plan Prompt (Patient Translation)
```
Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps:

Clinical Notes: <notes>
Prescribed Medications: <medication_list>

Return ONLY a valid JSON object:
{
  "visitSummary": "clear plain language summary for patient",
  "keyInstructions": ["instruction 1", "instruction 2"],
  "medicationSchedule": [
    { "name": "med name", "dosage": "dose", "frequency": "timing", "instructions": "how to take" }
  ],
  "followUpSteps": ["step 1", "step 2"],
  "warnings": ["warning or red-flag symptom"]
}
```

---

## 📅 Google Calendar Setup Guide

To enable live Google Calendar synchronization:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. `Healthcare-App`) and navigate to **APIs & Services > Library**.
3. Search for **Google Calendar API** and click **Enable**.
4. Go to **APIs & Services > Credentials** → click **Create Credentials > OAuth client ID**.
5. Application Type: **Web application**.
6. Under **Authorized redirect URIs**, add:
   `http://localhost:5000/api/calendar/callback`
7. Copy your **Client ID** and **Client Secret** into `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_REDIRECT_URI="http://localhost:5000/api/calendar/callback"
   ```
8. In the app, navigate to **Profile > Google Calendar** and click **Connect Google Calendar** to authorize.

---

## 🔑 Demo Credentials

| Role | Email | Password | Features to Review |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@healthcare.dev` | `Admin@123` | Master telemetry dashboard, doctor onboarding, notification queue retry controls |
| **Doctor** | `dr.smith@healthcare.dev` | `Doctor@123` | Daily queue, pre-visit AI triage, post-visit documentation with approval gate, weekly availability |
| **Doctor** | `dr.sarah@healthcare.dev` | `Doctor@123` | Cardiologist profile, working schedule & leaves |
| **Patient** | `patient1@test.com` | `Patient@123` | Doctor directory, 5-step booking wizard with slot-hold countdown, appointment rescheduling, active medications |

---

## 🌐 Deployment Guide

### Frontend Deployment (Vercel)
1. Push project to GitHub.
2. Go to [Vercel](https://vercel.com/) and click **Add New > Project**.
3. Select your repository and set the **Root Directory** to `frontend`.
4. Build Command: `npm run build`, Output Directory: `dist`.
5. Under Environment Variables, set `VITE_API_URL=https://your-backend-service.onrender.com/api`.
6. Click **Deploy**.

### Backend Deployment (Render / Railway)
1. In [Render](https://render.com/) or [Railway](https://railway.app/), create a **PostgreSQL** database and a **Redis** instance.
2. Create a new **Web Service** pointing to your repository with **Root Directory** `backend`.
3. Build Command: `npm install && npx prisma generate && npm run build`.
4. Start Command: `npm run start`.
5. Add environment variables from `.env.example` (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `CORSORIGIN`).
6. Create a separate **Background Worker** service on Render with start command: `npm run start:worker`.
