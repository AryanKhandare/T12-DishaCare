import type { HospitalBedData, ZoneConfig, ActivityLog } from './types';

export const mockZones: ZoneConfig[] = [
  {
    id: 'icu',
    name: 'Intensive Care Unit (ICU)',
    shortName: 'ICU (INTENSIVE CARE)',
    color: '#8b5cf6', // Violet/Purple
    center: [-28, 0, 14],
    labelPosition: [-28, 4.5, 27], // North-West Wing Header
    bounds: { minX: -41, maxX: -15, minZ: 1, maxZ: 27 },
    description: 'High-acuity critical monitoring unit with advanced life support'
  },
  {
    id: 'triage',
    name: 'Triage Zone',
    shortName: 'TRIAGE ZONE',
    color: '#0284c7', // Sky Blue
    center: [0, 0, 17],
    labelPosition: [0, 4.5, 27], // North-Center Header
    bounds: { minX: -12, maxX: 12, minZ: 7, maxZ: 27 },
    description: 'Initial patient assessment & rapid priority intake area'
  },
  {
    id: 'examination',
    name: 'Examination Rooms',
    shortName: 'EXAMINATION ROOMS',
    color: '#0d9488', // Teal
    center: [30, 0, 20],
    labelPosition: [30, 4.5, 33], // Shifted North-East Wing Header
    bounds: { minX: 16, maxX: 44, minZ: 8, maxZ: 32 },
    description: 'Private outpatient examination rooms EXAM-01 to EXAM-06'
  },
  {
    id: 'resuscitation',
    name: 'Resuscitation Area',
    shortName: 'RESUSCITATION AREA',
    color: '#e11d48', // Rose / Red
    center: [-28, 0, -18],
    labelPosition: [-28, 4.5, -29], // South-West Wing Header
    bounds: { minX: -41, maxX: -15, minZ: -28, maxZ: -8 },
    description: 'Emergency trauma & cardiac resuscitation bays RES-01 to RES-04'
  },
  {
    id: 'waiting',
    name: 'Waiting Area',
    shortName: 'WAITING AREA',
    color: '#64748b', // Slate
    center: [0, 0, -2],
    labelPosition: [0, 4.5, -6], // Central Atrium Recess (separated from South labels)
    bounds: { minX: -12, maxX: 12, minZ: -9, maxZ: 4 },
    description: 'Patient waiting lounge with comfortable seating and queue counter'
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    shortName: 'PHARMACY',
    color: '#10b981', // Emerald
    center: [23, 0, -14],
    labelPosition: [22, 4.5, -27], // South-East Inner Wing Header
    bounds: { minX: 16, maxX: 30, minZ: -24, maxZ: -4 },
    description: 'Inpatient prescription dispenser, medication storage & clinical pharmacy desk'
  },
  {
    id: 'ambulance_bay',
    name: 'Ambulance Bay',
    shortName: 'AMBULANCE BAY',
    color: '#f59e0b', // Amber
    center: [39, 0, -14],
    labelPosition: [40, 4.5, -27], // Far South-East Driveway Header
    bounds: { minX: 32, maxX: 46, minZ: -24, maxZ: -4 },
    description: 'Emergency vehicular access entrance & rapid transfer bay (NO BEDS)'
  }
];

export const initialBedsData: HospitalBedData[] = [
  // -------------------------------------------------------------
  // ICU - INTENSIVE CARE UNIT (8 Beds in West-North Wing)
  // -------------------------------------------------------------
  {
    id: 'ICU-01',
    zone: 'icu',
    zoneName: 'ICU',
    type: 'ICU Bed',
    status: 'available',
    assignedStaff: 'ICU Lead Specialist',
    updatedAt: '8 min ago',
    position: [-35, 0.4, 21],
    rotation: 0
  },
  {
    id: 'ICU-02',
    zone: 'icu',
    zoneName: 'ICU',
    type: 'ICU Bed',
    status: 'occupied',
    patientId: 'PT-3301',
    patientName: 'Arthur Dent',
    statusReason: 'Post-op cardiac telemetry monitoring',
    assignedStaff: 'Dr. Gregory House',
    updatedAt: '15 min ago',
    position: [-28, 0.4, 21],
    rotation: 0
  },
  {
    id: 'ICU-03',
    zone: 'icu',
    zoneName: 'ICU',
    type: 'ICU Bed',
    status: 'occupied',
    patientId: 'PT-4491',
    patientName: 'Clara Oswald',
    statusReason: 'Severe respiratory distress / Ventilator support',
    assignedStaff: 'Nurse Clara',
    updatedAt: '2 min ago',
    position: [-21, 0.4, 21],
    rotation: 0
  },
  {
    id: 'ICU-04',
    zone: 'icu',
    zoneName: 'ICU',
    type: 'ICU Bed',
    status: 'occupied',
    patientId: 'PT-1052',
    patientName: 'Marcus Aurelius',
    statusReason: 'Acute sepsis management',
    assignedStaff: 'Dr. Amanda Blake',
    updatedAt: '22 min ago',
    position: [-35, 0.4, 12],
    rotation: 0
  },
  {
    id: 'ICU-05',
    zone: 'icu',
    zoneName: 'ICU',
    type: 'ICU Bed',
    status: 'reserved',
    reservationId: 'BL-REQ-1042',
    ambulanceId: 'MH-04-AB-1234',
    eta: '8 minutes',
    statusReason: 'Incoming STEMI Transfer from St. Jude EMS',
    assignedStaff: 'ICU Critical Response Unit',
    updatedAt: '4 min ago',
    position: [-28, 0.4, 12],
    rotation: 0
  },
  {
    id: 'ICU-06',
    zone: 'icu',
    zoneName: 'ICU',
    type: 'ICU Bed',
    status: 'available',
    assignedStaff: 'ICU Shift Lead',
    updatedAt: '1 hour ago',
    position: [-21, 0.4, 12],
    rotation: 0
  },
  {
    id: 'ICU-07',
    zone: 'icu',
    zoneName: 'ICU',
    type: 'ICU Bed',
    status: 'cleaning',
    statusReason: 'Sterile isolation cleaning protocol',
    assignedStaff: 'Sanitation Team B',
    updatedAt: '14 min ago',
    position: [-33, 0.4, 4],
    rotation: Math.PI / 2
  },
  {
    id: 'ICU-08',
    zone: 'icu',
    zoneName: 'ICU',
    type: 'ICU Bed',
    status: 'unavailable',
    statusReason: 'Ventilator sensor calibration error',
    assignedStaff: 'Clinical Engineering',
    updatedAt: '50 min ago',
    position: [-23, 0.4, 4],
    rotation: Math.PI / 2
  },

  // -------------------------------------------------------------
  // TRIAGE ZONE (4 Beds in Center-North Atrium)
  // -------------------------------------------------------------
  {
    id: 'TR-01',
    zone: 'triage',
    zoneName: 'Triage Zone',
    type: 'Triage Bed',
    status: 'available',
    patientName: undefined,
    assignedStaff: 'Nurse Sarah Jenkins',
    updatedAt: '5 min ago',
    position: [-5, 0.4, 14],
    rotation: 0
  },
  {
    id: 'TR-02',
    zone: 'triage',
    zoneName: 'Triage Zone',
    type: 'Triage Bed',
    status: 'occupied',
    patientId: 'PT-9982',
    patientName: 'Robert Vance',
    statusReason: 'Acute abdominal pain intake',
    assignedStaff: 'Nurse Sarah Jenkins',
    updatedAt: '12 min ago',
    position: [5, 0.4, 14],
    rotation: 0
  },
  {
    id: 'TR-03',
    zone: 'triage',
    zoneName: 'Triage Zone',
    type: 'Triage Bed',
    status: 'reserved',
    reservationId: 'BL-REQ-1049',
    ambulanceId: 'AMB-NY-442',
    eta: '6 mins',
    statusReason: 'En route: Suspected fracture from EMS',
    assignedStaff: 'Triage Officer Ray',
    updatedAt: '2 min ago',
    position: [-5, 0.4, 22],
    rotation: 0
  },
  {
    id: 'TR-04',
    zone: 'triage',
    zoneName: 'Triage Zone',
    type: 'Triage Bed',
    status: 'available',
    assignedStaff: 'Nurse Sarah Jenkins',
    updatedAt: '25 min ago',
    position: [5, 0.4, 22],
    rotation: 0
  },

  // -------------------------------------------------------------
  // EXAMINATION ROOMS (6 Rooms in Shifted East-North Wing)
  // -------------------------------------------------------------
  {
    id: 'EXAM-01',
    zone: 'examination',
    zoneName: 'Examination Rooms',
    type: 'Exam Bed',
    status: 'occupied',
    patientId: 'PT-7721',
    patientName: 'Elena Rostova',
    statusReason: 'Routine diagnostic check & ECG',
    assignedStaff: 'Dr. Michael Chen',
    updatedAt: '18 min ago',
    position: [20, 0.4, 27],
    rotation: Math.PI / 2
  },
  {
    id: 'EXAM-02',
    zone: 'examination',
    zoneName: 'Examination Rooms',
    type: 'Exam Bed',
    status: 'cleaning',
    statusReason: 'Post-examination deep sanitize',
    assignedStaff: 'Sanitation Tech Alex',
    updatedAt: '6 min ago',
    position: [30, 0.4, 27],
    rotation: Math.PI / 2
  },
  {
    id: 'EXAM-03',
    zone: 'examination',
    zoneName: 'Examination Rooms',
    type: 'Exam Bed',
    status: 'available',
    assignedStaff: 'Dr. Michael Chen',
    updatedAt: '40 min ago',
    position: [40, 0.4, 27],
    rotation: Math.PI / 2
  },
  {
    id: 'EXAM-04',
    zone: 'examination',
    zoneName: 'Examination Rooms',
    type: 'Exam Bed',
    status: 'occupied',
    patientId: 'PT-8812',
    patientName: 'David Kim',
    statusReason: 'Laceration suturing & dressing',
    assignedStaff: 'Dr. Lisa Park',
    updatedAt: '10 min ago',
    position: [20, 0.4, 15],
    rotation: Math.PI / 2
  },
  {
    id: 'EXAM-05',
    zone: 'examination',
    zoneName: 'Examination Rooms',
    type: 'Exam Bed',
    status: 'available',
    assignedStaff: 'Dr. Lisa Park',
    updatedAt: '1 hour ago',
    position: [30, 0.4, 15],
    rotation: Math.PI / 2
  },
  {
    id: 'EXAM-06',
    zone: 'examination',
    zoneName: 'Examination Rooms',
    type: 'Exam Bed',
    status: 'maintenance',
    statusReason: 'Adjustable hydraulics repair',
    assignedStaff: 'BioMed Tech Tom',
    updatedAt: '35 min ago',
    position: [40, 0.4, 15],
    rotation: Math.PI / 2
  },

  // -------------------------------------------------------------
  // RESUSCITATION AREA (4 Bays in South-West Wing)
  // -------------------------------------------------------------
  {
    id: 'RES-01',
    zone: 'resuscitation',
    zoneName: 'Resuscitation Area',
    type: 'Resuscitation Bed',
    status: 'available',
    assignedStaff: 'Trauma Team Alpha',
    updatedAt: '30 min ago',
    position: [-33, 0.4, -13],
    rotation: 0
  },
  {
    id: 'RES-02',
    zone: 'resuscitation',
    zoneName: 'Resuscitation Area',
    type: 'Resuscitation Bed',
    status: 'occupied',
    patientId: 'PT-9110',
    patientName: 'James Holden',
    statusReason: 'Level 1 Trauma - Multiple contusions',
    assignedStaff: 'Dr. Naomi Nagata',
    updatedAt: '5 min ago',
    position: [-19, 0.4, -13],
    rotation: 0
  },
  {
    id: 'RES-03',
    zone: 'resuscitation',
    zoneName: 'Resuscitation Area',
    type: 'Resuscitation Bed',
    status: 'available',
    assignedStaff: 'Trauma Team Beta',
    updatedAt: '45 min ago',
    position: [-33, 0.4, -22],
    rotation: 0
  },
  {
    id: 'RES-04',
    zone: 'resuscitation',
    zoneName: 'Resuscitation Area',
    type: 'Resuscitation Bed',
    status: 'reserved',
    reservationId: 'BL-REQ-1055',
    ambulanceId: 'MEDIC-99',
    eta: '3 minutes',
    statusReason: 'Cardiac arrest in transit with CPR active',
    assignedStaff: 'Trauma Team Alpha',
    updatedAt: '1 min ago',
    position: [-19, 0.4, -22],
    rotation: 0
  }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    bedId: 'ICU-03',
    status: 'occupied',
    message: 'ICU-03 marked OCCUPIED (Ventilator support initiated)',
    timestamp: '2 min ago'
  },
  {
    id: 'log-2',
    bedId: 'ICU-05',
    status: 'reserved',
    message: 'ICU-05 RESERVED for Ambulance MH-04-AB-1234 (ETA 8 min)',
    timestamp: '4 min ago'
  },
  {
    id: 'log-3',
    bedId: 'EXAM-02',
    status: 'cleaning',
    message: 'EXAM-02 status changed to CLEANING after discharge',
    timestamp: '6 min ago'
  },
  {
    id: 'log-4',
    bedId: 'ICU-01',
    status: 'available',
    message: 'ICU-01 marked AVAILABLE after patient transfer to stepdown',
    timestamp: '8 min ago'
  },
  {
    id: 'log-5',
    bedId: 'RES-04',
    status: 'reserved',
    message: 'RES-04 RESERVED for incoming Trauma MEDIC-99',
    timestamp: '11 min ago'
  }
];
