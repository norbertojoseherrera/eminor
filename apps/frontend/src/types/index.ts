export type Role = 'ADMIN' | 'DOCTOR' | 'PATIENT';
export type AppointmentStatus = 'PENDING' | 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type FileType = 'PDF' | 'JPG' | 'PNG';
export type DocumentType = 'DNI' | 'PASAPORTE';

export interface User {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  patient?: Patient;
  doctor?: Doctor;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  dni: string;
  phone: string;
  birthDate: string;
  medicalInsurance?: string;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  specialty: string;
  isVerified: boolean;
}

export interface DoctorAvailability {
  id?: string;
  dayOfWeek: number; // 0=Domingo .. 6=Sábado
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  slotMinutes: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: AppointmentStatus;
  roomUuid: string;
  notes?: string;
  patient?: Pick<Patient, 'firstName' | 'lastName' | 'dni'>;
  doctor?: Pick<Doctor, 'licenseNumber' | 'specialty' | 'firstName' | 'lastName'>;
}

export interface SoapData {
  subjective: string;
  objective: string;
  assessment: { text: string; cie10Codes: string[] };
  plan: string;
  _signatureHash?: string;
}

export interface Evolution {
  id: string;
  appointmentId: string;
  patientId: string;
  soapData: SoapData;
  isSigned: boolean;
  signedAt?: string;
  createdAt: string;
}

export interface Study {
  id: string;
  patientId: string;
  title: string;
  fileType: FileType;
  uploadedAt: string;
}

export interface MedicationItem {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  medicationPayload: { medications: MedicationItem[]; instructions?: string };
  digitalSignatureHash: string;
  issuedAt: string;
}
