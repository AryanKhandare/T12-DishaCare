export type BedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance' | 'unavailable';

export type HospitalZoneId =
  | 'nicu'
  | 'pet_scan'
  | 'mri'
  | 'oncology'
  | 'radiology'
  | 'courtyard'
  | 'all';

export type UserMode = 'nurse' | 'admin';

export interface HospitalBedData {
  id: string;
  zone: Exclude<HospitalZoneId, 'all'>;
  zoneName: string;
  type: string;
  status: BedStatus;
  patientId?: string;
  patientName?: string;
  statusReason?: string;
  assignedStaff?: string;
  reservationId?: string;
  ambulanceId?: string;
  eta?: string;
  updatedAt: string;
  position: [number, number, number];
  rotation: number;
}

export interface ZoneConfig {
  id: Exclude<HospitalZoneId, 'all'>;
  name: string;
  shortName: string;
  color: string;
  center: [number, number, number];
  labelPosition: [number, number, number];
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  description: string;
}

export interface ActivityLog {
  id: string;
  bedId: string;
  status: BedStatus;
  message: string;
  timestamp: string;
}
