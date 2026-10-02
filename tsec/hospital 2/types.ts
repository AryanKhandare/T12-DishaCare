export type BedStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'cleaning'
  | 'maintenance'
  | 'unavailable';

export type HospitalZoneId =
  | 'all'
  | 'triage'
  | 'examination'
  | 'icu'
  | 'resuscitation'
  | 'pharmacy'
  | 'waiting'
  | 'ambulance_bay';

export type UserMode = 'nurse' | 'admin';

export interface HospitalBedData {
  id: string;
  zone: HospitalZoneId;
  zoneName: string;
  type: 'Triage Bed' | 'Exam Bed' | 'ICU Bed' | 'Resuscitation Bed';
  status: BedStatus;
  statusReason?: string;
  reservationId?: string;
  patientId?: string;
  patientName?: string;
  ambulanceId?: string;
  eta?: string;
  assignedStaff?: string;
  updatedAt: string;
  position: [number, number, number]; // [x, y, z] coordinates in 3D floor layout
  rotation?: number; // Y-axis rotation angle in radians
}

export interface ActivityLog {
  id: string;
  bedId: string;
  status: BedStatus;
  message: string;
  timestamp: string;
}

export interface ZoneConfig {
  id: HospitalZoneId;
  name: string;
  shortName: string;
  color: string;
  center: [number, number, number];
  labelPosition: [number, number, number]; // Dedicated header position outside bed area
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  description: string;
}
