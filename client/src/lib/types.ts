export interface DashboardMetrics {
  todayAppointments: number;
  activePatients: number;
  monthlyRevenue: number;
  pendingPayments: number;
}

export interface Patient {
  id: number;
  name: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email?: string;
  // Structured address fields
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address?: string; // Keep for backwards compatibility
  isActive: boolean;
  clinicalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Procedure {
  id: number;
  name: string;
  description?: string;
  price: string;
  duration: number;
  category: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProcedureCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  dentistId: number;
  procedureId: number;
  scheduledDate: string;
  status: "scheduled" | "confirmed" | "attended" | "cancelled";
  notes?: string;
  createdAt: string;
  updatedAt: string;
  patient?: Patient;
  dentist?: User;
  procedure?: Procedure;
}

export interface Consultation {
  id: number;
  patientId: number;
  dentistId: number;
  appointmentId?: number;
  date: string;
  procedures?: string[];
  clinicalNotes?: string;
  observations?: string;
  createdAt: string;
  patient?: Patient;
  dentist?: User;
}

export interface DentalChart {
  id: number;
  patientId: number;
  toothNumber: string;
  condition: "healthy" | "carie" | "restoration" | "extraction" | "planned_treatment" | "completed_treatment";
  notes?: string;
  treatmentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnamneseAdditionalQuestions {
  hasHeartProblems?: boolean;
  hasDiabetes?: boolean;
  hasHypertension?: boolean;
  isPregnant?: boolean;
  smokingHabits?: string;
  bleedingProblems?: boolean;
  familyHistory?: string;
}

export interface Anamnese {
  id: number;
  patientId: number;
  medicalTreatment: boolean;
  medications?: string;
  allergies?: string;
  previousDentalTreatment: boolean;
  painComplaint?: string;
  additionalQuestions?: AnamneseAdditionalQuestions;
  createdAt: string;
  updatedAt: string;
}

export interface Financial {
  id: number;
  patientId: number;
  consultationId?: number;
  appointmentId?: number;
  amount: string;
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  status: "pending" | "paid" | "overdue";
  description?: string;
  createdAt: string;
  updatedAt: string;
  patient?: Patient;
}

export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string; // Now supports custom profiles
  isActive: boolean;
  forcePasswordChange?: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: number;
  name: string;
  description?: string;
  modules: string[];
  isActive: boolean;
  createdAt: string;
}

export interface ProcedureCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}
