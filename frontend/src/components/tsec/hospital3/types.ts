export type BedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance' | 'unavailable';

export type HospitalZoneId =
  | 'surgery'
  | 'cardiology'
  | 'emergency'
  | 'pediatric'
  | 'neurology'
  | 'lounge'
  | 'all';

export type UserMode = 'nurse' | 'admin';

export interface HospitalBedData {
  id: string;
  zone: Exclude<HospitalZoneId, 'all'>;
  zoneName: string;
  type: string;
  status: BedStatus;
  patientId?: string | undefined;
  patientName?: string | undefined;
  statusReason?: string | undefined;
  assignedStaff?: string | undefined;
  reservationId?: string | undefined;
  ambulanceId?: string | undefined;
  eta?: string | undefined;
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
