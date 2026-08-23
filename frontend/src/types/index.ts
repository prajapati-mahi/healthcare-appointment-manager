export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type AppointmentStatus = 'HOLD' | 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'DOCTOR_LEAVE' | 'EXPIRED';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  doctorProfile?: DoctorProfile;
}

export interface DoctorProfile {
  id: string;
  specialization: string;
  qualifications: string;
  bio?: string;
  experienceYears: number;
  slotDuration: number;
  isActive: boolean;
  consultationFee?: number;
  workingHours: WorkingHours[];
}

export interface WorkingHours {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface SlotHold {
  id: string;
  expiresAt: string;
  startTime: string;
  endTime: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  patient: User;
  doctor: User;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  symptoms?: string;
  symptomDuration?: string;
  symptomSeverity?: string;
  additionalInfo?: string;
  urgencyLevel?: UrgencyLevel;
  chiefComplaint?: string;
  suggestedQuestions?: string[];
  preVisitSummaryStatus: string;
  postVisitNotes?: string;
  patientFriendlySummary?: string;
  summaryApprovedByDoctor: boolean;
  calendarSyncStatus: string;
  prescriptions?: Prescription[];
  medications?: Medication[];
  createdAt: string;
}

export interface Prescription {
  id: string;
  notes?: string;
  diagnosis?: string;
  followUpDate?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Notification {
  id: string;
  type: string;
  status: string;
  subject?: string;
  body?: string;
  createdAt: string;
  appointment?: Appointment;
}
