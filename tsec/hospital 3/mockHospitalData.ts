import type { HospitalBedData, ZoneConfig, ActivityLog } from './types';

export const mockZones: ZoneConfig[] = [
  {
    id: 'surgery',
    name: 'Surgery & Operating Theater',
    shortName: 'SURGERY / OR WARD',
    color: '#0284c7', // Sky Blue
    center: [-22, 0, 16],
    labelPosition: [-22, 4.5, 27], // Top North-West Header
    bounds: { minX: -35, maxX: -9, minZ: 7, maxZ: 27 },
    description: 'Sterile surgical suites & post-anesthesia recovery unit'
  },
  {
    id: 'cardiology',
    name: 'Cardiology & Telemetry',
    shortName: 'CARDIOLOGY WARD',
    color: '#e11d48', // Crimson Red
    center: [-22, 0, -2],
    labelPosition: [-22, 4.5, 4], // Mid-West Header
    bounds: { minX: -35, maxX: -9, minZ: -10, maxZ: 5 },
    description: 'Continuous cardiac rhythm monitoring & vascular telemetry beds'
  },
  {
    id: 'emergency',
    name: 'Emergency Trauma Intake',
    shortName: 'EMERGENCY INTAKE',
    color: '#f59e0b', // Amber
    center: [-22, 0, -20],
    labelPosition: [-22, 4.5, -29], // South-West Corner Header
    bounds: { minX: -35, maxX: -9, minZ: -27, maxZ: -12 },
    description: 'Rapid resuscitation & acute trauma intake bays'
  },
  {
    id: 'pediatric',
    name: 'Pediatric Care Ward',
    shortName: 'PEDIATRIC CARE',
    color: '#8b5cf6', // Violet
    center: [0, 0, -16],
    labelPosition: [0, 4.5, -29], // Center South Header
    bounds: { minX: -8, maxX: 12, minZ: -27, maxZ: -5 },
    description: 'Specialized inpatient rooms for infants, children & adolescents'
  },
  {
    id: 'neurology',
    name: 'Neurology & Step-Down',
    shortName: 'NEUROLOGY WARD',
    color: '#10b981', // Emerald
    center: [22, 0, -16],
    labelPosition: [22, 4.5, -29], // East South Header
    bounds: { minX: 13, maxX: 35, minZ: -27, maxZ: -5 },
    description: 'Neurological monitoring & progressive care step-down unit'
  },
  {
    id: 'lounge',
    name: 'L-Wing Central Cafeteria',
    shortName: 'CENTRAL CAFETERIA',
    color: '#64748b', // Slate
    center: [-4, 0, -2],
    labelPosition: [-4, 4.5, 7], // Inner Corner Atrium Header
    bounds: { minX: -8, maxX: 4, minZ: -4, maxZ: 4 },
    description: 'Dining, staff break lounge & visitor refresh center (NO BEDS)'
  }
];

export const initialBedsData: HospitalBedData[] = [
  // -------------------------------------------------------------
  // SURGERY / OR (4 Beds in North-West Arm)
  // -------------------------------------------------------------
  {
    id: 'OR-01',
    zone: 'surgery',
    zoneName: 'Surgery',
    type: 'Surgical Recovery Bed',
    status: 'occupied',
    patientId: 'PT-6001',
    patientName: 'Sophia Loren',
    statusReason: 'Post-laparoscopic monitoring',
    assignedStaff: 'Dr. Robert Ford',
    updatedAt: '10 min ago',
    position: [-28, 0.4, 21],
    rotation: 0
  },
  {
    id: 'OR-02',
    zone: 'surgery',
    zoneName: 'Surgery',
    type: 'Surgical Recovery Bed',
    status: 'available',
    assignedStaff: 'Surgical Shift Lead',
    updatedAt: '25 min ago',
    position: [-16, 0.4, 21],
    rotation: 0
  },
  {
    id: 'OR-03',
    zone: 'surgery',
    zoneName: 'Surgery',
    type: 'Surgical Recovery Bed',
    status: 'cleaning',
    statusReason: 'Post-op terminal sterile sanitize',
    assignedStaff: 'Sanitation Team A',
    updatedAt: '5 min ago',
    position: [-28, 0.4, 12],
    rotation: 0
  },
  {
    id: 'OR-04',
    zone: 'surgery',
    zoneName: 'Surgery',
    type: 'Surgical Recovery Bed',
    status: 'reserved',
    reservationId: 'BL-OR-882',
    ambulanceId: 'AMB-MED-09',
    eta: '12 min',
    statusReason: 'Incoming Emergency Surgery Transfer',
    assignedStaff: 'Dr. Robert Ford',
    updatedAt: '2 min ago',
    position: [-16, 0.4, 12],
    rotation: 0
  },

  // -------------------------------------------------------------
  // CARDIOLOGY (4 Beds in Mid-West Arm)
  // -------------------------------------------------------------
  {
    id: 'CARD-01',
    zone: 'cardiology',
    zoneName: 'Cardiology',
    type: 'Telemetry Bed',
    status: 'occupied',
    patientId: 'PT-4102',
    patientName: 'Ethan Hunt',
    statusReason: 'Arrhythmia telemetry monitoring',
    assignedStaff: 'Dr. Sarah Connor',
    updatedAt: '18 min ago',
    position: [-28, 0.4, -2],
    rotation: 0
  },
  {
    id: 'CARD-02',
    zone: 'cardiology',
    zoneName: 'Cardiology',
    type: 'Telemetry Bed',
    status: 'available',
    assignedStaff: 'Nurse Jessica',
    updatedAt: '40 min ago',
    position: [-16, 0.4, -2],
    rotation: 0
  },
  {
    id: 'CARD-03',
    zone: 'cardiology',
    zoneName: 'Cardiology',
    type: 'Telemetry Bed',
    status: 'occupied',
    patientId: 'PT-5290',
    patientName: 'Diana Prince',
    statusReason: 'Post-angioplasty telemetry',
    assignedStaff: 'Dr. Sarah Connor',
    updatedAt: '8 min ago',
    position: [-28, 0.4, -8],
    rotation: 0
  },
  {
    id: 'CARD-04',
    zone: 'cardiology',
    zoneName: 'Cardiology',
    type: 'Telemetry Bed',
    status: 'maintenance',
    statusReason: 'ECG sensor battery replacement',
    assignedStaff: 'BioMed Tech Mark',
    updatedAt: '1 hour ago',
    position: [-16, 0.4, -8],
    rotation: 0
  },

  // -------------------------------------------------------------
  // EMERGENCY TRAUMA (4 Beds in South-West Corner)
  // -------------------------------------------------------------
  {
    id: 'EMRG-01',
    zone: 'emergency',
    zoneName: 'Emergency',
    type: 'Trauma Bay Bed',
    status: 'occupied',
    patientId: 'PT-9901',
    patientName: 'Bruce Wayne',
    statusReason: 'Acute trauma intake',
    assignedStaff: 'Trauma Lead Dave',
    updatedAt: '4 min ago',
    position: [-28, 0.4, -20],
    rotation: 0
  },
  {
    id: 'EMRG-02',
    zone: 'emergency',
    zoneName: 'Emergency',
    type: 'Trauma Bay Bed',
    status: 'available',
    assignedStaff: 'Nurse Tom',
    updatedAt: '15 min ago',
    position: [-16, 0.4, -20],
    rotation: 0
  },
  {
    id: 'EMRG-03',
    zone: 'emergency',
    zoneName: 'Emergency',
    type: 'Trauma Bay Bed',
    status: 'reserved',
    reservationId: 'BL-EMG-102',
    ambulanceId: 'EMS-RESCUE-4',
    eta: '5 min',
    statusReason: 'Motor vehicle accident intake',
    assignedStaff: 'Trauma Team Alpha',
    updatedAt: '1 min ago',
    position: [-28, 0.4, -25],
    rotation: 0
  },
  {
    id: 'EMRG-04',
    zone: 'emergency',
    zoneName: 'Emergency',
    type: 'Trauma Bay Bed',
    status: 'available',
    assignedStaff: 'Nurse Tom',
    updatedAt: '30 min ago',
    position: [-16, 0.4, -25],
    rotation: 0
  },

  // -------------------------------------------------------------
  // PEDIATRIC CARE (4 Beds in Center-South Arm)
  // -------------------------------------------------------------
  {
    id: 'PED-01',
    zone: 'pediatric',
    zoneName: 'Pediatric Care',
    type: 'Pediatric Bed',
    status: 'occupied',
    patientId: 'PT-1102',
    patientName: 'Leo Das',
    statusReason: 'Acute asthma nebulizer therapy',
    assignedStaff: 'Dr. Grace Hopper',
    updatedAt: '14 min ago',
    position: [-4, 0.4, -14],
    rotation: Math.PI / 2
  },
  {
    id: 'PED-02',
    zone: 'pediatric',
    zoneName: 'Pediatric Care',
    type: 'Pediatric Bed',
    status: 'available',
    assignedStaff: 'Nurse Mia',
    updatedAt: '50 min ago',
    position: [4, 0.4, -14],
    rotation: Math.PI / 2
  },
  {
    id: 'PED-03',
    zone: 'pediatric',
    zoneName: 'Pediatric Care',
    type: 'Pediatric Bed',
    status: 'occupied',
    patientId: 'PT-1105',
    patientName: 'Maya Lin',
    statusReason: 'Dehydration IV drip protocol',
    assignedStaff: 'Dr. Grace Hopper',
    updatedAt: '20 min ago',
    position: [-4, 0.4, -22],
    rotation: Math.PI / 2
  },
  {
    id: 'PED-04',
    zone: 'pediatric',
    zoneName: 'Pediatric Care',
    type: 'Pediatric Bed',
    status: 'cleaning',
    statusReason: 'Pediatric discharge sanitize',
    assignedStaff: 'Sanitation Tech Leo',
    updatedAt: '10 min ago',
    position: [4, 0.4, -22],
    rotation: Math.PI / 2
  },

  // -------------------------------------------------------------
  // NEUROLOGY WARD (4 Beds in East-South Arm)
  // -------------------------------------------------------------
  {
    id: 'NEURO-01',
    zone: 'neurology',
    zoneName: 'Neurology',
    type: 'Neuro Step-Down Bed',
    status: 'occupied',
    patientId: 'PT-8831',
    patientName: 'Walter Bishop',
    statusReason: 'Post-stroke neurological telemetry',
    assignedStaff: 'Dr. Charles Xavier',
    updatedAt: '6 min ago',
    position: [18, 0.4, -14],
    rotation: Math.PI / 2
  },
  {
    id: 'NEURO-02',
    zone: 'neurology',
    zoneName: 'Neurology',
    type: 'Neuro Step-Down Bed',
    status: 'available',
    assignedStaff: 'Nurse Olivia',
    updatedAt: '1 hour ago',
    position: [28, 0.4, -14],
    rotation: Math.PI / 2
  },
  {
    id: 'NEURO-03',
    zone: 'neurology',
    zoneName: 'Neurology',
    type: 'Neuro Step-Down Bed',
    status: 'reserved',
    reservationId: 'BL-NEURO-04',
    ambulanceId: 'EMS-STROKE-1',
    eta: '15 min',
    statusReason: 'Inbound acute stroke transfer',
    assignedStaff: 'Dr. Charles Xavier',
    updatedAt: '3 min ago',
    position: [18, 0.4, -22],
    rotation: Math.PI / 2
  },
  {
    id: 'NEURO-04',
    zone: 'neurology',
    zoneName: 'Neurology',
    type: 'Neuro Step-Down Bed',
    status: 'available',
    assignedStaff: 'Nurse Olivia',
    updatedAt: '45 min ago',
    position: [28, 0.4, -22],
    rotation: Math.PI / 2
  }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    bedId: 'OR-04',
    status: 'reserved',
    message: 'OR-04 RESERVED for emergency surgical transfer (ETA 12 min)',
    timestamp: '2 min ago'
  },
  {
    id: 'log-2',
    bedId: 'NEURO-03',
    status: 'reserved',
    message: 'NEURO-03 RESERVED for incoming Stroke Ambulance EMS-STROKE-1',
    timestamp: '3 min ago'
  },
  {
    id: 'log-3',
    bedId: 'EMRG-01',
    status: 'occupied',
    message: 'EMRG-01 marked OCCUPIED (Trauma intake initiated)',
    timestamp: '4 min ago'
  },
  {
    id: 'log-4',
    bedId: 'OR-03',
    status: 'cleaning',
    message: 'OR-03 marked CLEANING after successful surgery',
    timestamp: '5 min ago'
  },
  {
    id: 'log-5',
    bedId: 'CARD-03',
    status: 'occupied',
    message: 'CARD-03 marked OCCUPIED for telemetry monitoring',
    timestamp: '8 min ago'
  }
];
