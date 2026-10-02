import type { HospitalBedData, ZoneConfig, ActivityLog } from './types';

export const mockZones: ZoneConfig[] = [
  {
    id: 'nicu',
    name: 'Neonatal ICU (NICU)',
    shortName: 'NEONATAL ICU (NICU)',
    color: '#8b5cf6', // Violet
    center: [22, 0, 21],
    labelPosition: [22, 4.5, 31], // North-East Arm Header
    bounds: { minX: 10, maxX: 34, minZ: 15, maxZ: 27 },
    description: 'Specialized premature infant incubators & neonatal life support'
  },
  {
    id: 'pet_scan',
    name: 'PET Scan & Nuclear Med',
    shortName: 'PET SCAN SUITE',
    color: '#e11d48', // Crimson Red
    center: [-25, 0, 21],
    labelPosition: [-25, 4.5, 31], // North-West Spine Header
    bounds: { minX: -35, maxX: -15, minZ: 15, maxZ: 27 },
    description: 'Positron Emission Tomography & radiopharmaceutical scanning'
  },
  {
    id: 'mri',
    name: 'MRI & Radiology Suite',
    shortName: '3T MRI SCANNER',
    color: '#0284c7', // Sky Blue
    center: [-25, 0, 0],
    labelPosition: [-25, 4.5, 0], // Mid-West Spine Header
    bounds: { minX: -35, maxX: -15, minZ: -10, maxZ: 10 },
    description: '3 Tesla High-Field MRI gantry & RF shielded diagnostic bay'
  },
  {
    id: 'oncology',
    name: 'Oncology & Infusion',
    shortName: 'ONCOLOGY INFUSION',
    color: '#10b981', // Emerald
    center: [22, 0, -21],
    labelPosition: [22, 4.5, -31], // South-East Arm Header
    bounds: { minX: 10, maxX: 34, minZ: -27, maxZ: -15 },
    description: 'Targeted chemotherapy infusion recliners & oncology suites'
  },
  {
    id: 'radiology',
    name: 'Emergency CT & X-Ray',
    shortName: 'EMERGENCY CT SCAN',
    color: '#f59e0b', // Amber
    center: [-25, 0, -21],
    labelPosition: [-25, 4.5, -31], // South-West Spine Header
    bounds: { minX: -35, maxX: -15, minZ: -27, maxZ: -15 },
    description: 'Rapid multislice CT trauma scanner & digital X-ray intake'
  },
  {
    id: 'courtyard',
    name: 'Atrium Healing Garden',
    shortName: 'C-WING COURTYARD',
    color: '#0d9488', // Teal
    center: [10, 0, 0],
    labelPosition: [10, 4.5, 0], // Central C-Courtyard Header
    bounds: { minX: -12, maxX: 32, minZ: -12, maxZ: 12 },
    description: 'Central open-air glass courtyard lounge & visitor garden (NO BEDS)'
  }
];

export const initialBedsData: HospitalBedData[] = [
  // -------------------------------------------------------------
  // NICU - NEONATAL ICU (4 Incubator Beds in North-East Arm)
  // -------------------------------------------------------------
  {
    id: 'NICU-01',
    zone: 'nicu',
    zoneName: 'Neonatal ICU',
    type: 'Infant Incubator Unit',
    status: 'occupied',
    patientId: 'INF-102',
    patientName: 'Baby Boy Smith',
    statusReason: 'Premature 32-week telemetry care',
    assignedStaff: 'Dr. Evelyn Vance',
    updatedAt: '3 min ago',
    position: [16, 0.4, 21],
    rotation: 0
  },
  {
    id: 'NICU-02',
    zone: 'nicu',
    zoneName: 'Neonatal ICU',
    type: 'Infant Incubator Unit',
    status: 'available',
    assignedStaff: 'NICU Lead Nurse Clara',
    updatedAt: '12 min ago',
    position: [28, 0.4, 21],
    rotation: 0
  },
  {
    id: 'NICU-03',
    zone: 'nicu',
    zoneName: 'Neonatal ICU',
    type: 'Infant Warming Bed',
    status: 'reserved',
    reservationId: 'BL-NICU-09',
    ambulanceId: 'NEO-RESCUE-1',
    eta: '5 min',
    statusReason: 'Inbound high-risk neonate transport',
    assignedStaff: 'Dr. Evelyn Vance',
    updatedAt: '1 min ago',
    position: [16, 0.4, 16],
    rotation: 0
  },
  {
    id: 'NICU-04',
    zone: 'nicu',
    zoneName: 'Neonatal ICU',
    type: 'Infant Warming Bed',
    status: 'cleaning',
    statusReason: 'UV sterile incubator decontamination',
    assignedStaff: 'Sanitation Tech Mia',
    updatedAt: '8 min ago',
    position: [28, 0.4, 16],
    rotation: 0
  },

  // -------------------------------------------------------------
  // PET SCAN & NUCLEAR MED (4 Scanning Couches in North-West Spine)
  // -------------------------------------------------------------
  {
    id: 'PET-01',
    zone: 'pet_scan',
    zoneName: 'PET Scan',
    type: 'PET Scanner Couch',
    status: 'occupied',
    patientId: 'PT-8801',
    patientName: 'Frank Castle',
    statusReason: 'Full-body PET radiotracer scan',
    assignedStaff: 'Dr. Henry Wu',
    updatedAt: '15 min ago',
    position: [-28, 0.4, 21],
    rotation: Math.PI / 2
  },
  {
    id: 'PET-02',
    zone: 'pet_scan',
    zoneName: 'PET Scan',
    type: 'PET Scanner Couch',
    status: 'available',
    assignedStaff: 'Nuclear Tech Ray',
    updatedAt: '30 min ago',
    position: [-20, 0.4, 21],
    rotation: Math.PI / 2
  },
  {
    id: 'PET-03',
    zone: 'pet_scan',
    zoneName: 'PET Scan',
    type: 'Uptake Prep Bed',
    status: 'occupied',
    patientId: 'PT-8804',
    patientName: 'Sarah Connor',
    statusReason: 'Radiotracer uptake resting phase',
    assignedStaff: 'Dr. Henry Wu',
    updatedAt: '6 min ago',
    position: [-28, 0.4, 16],
    rotation: Math.PI / 2
  },
  {
    id: 'PET-04',
    zone: 'pet_scan',
    zoneName: 'PET Scan',
    type: 'Uptake Prep Bed',
    status: 'maintenance',
    statusReason: 'Detector crystal calibration',
    assignedStaff: 'BioMed Tech Mark',
    updatedAt: '45 min ago',
    position: [-20, 0.4, 16],
    rotation: Math.PI / 2
  },

  // -------------------------------------------------------------
  // MRI SUITE (4 High-Field Tables in Mid-West Spine)
  // -------------------------------------------------------------
  {
    id: 'MRI-01',
    zone: 'mri',
    zoneName: 'MRI Suite',
    type: '3T MRI Gantry Table',
    status: 'occupied',
    patientId: 'PT-3390',
    patientName: 'Bruce Banner',
    statusReason: 'Brain functional MRI sequence',
    assignedStaff: 'Dr. Charles Xavier',
    updatedAt: '2 min ago',
    position: [-28, 0.4, 3],
    rotation: Math.PI / 2
  },
  {
    id: 'MRI-02',
    zone: 'mri',
    zoneName: 'MRI Suite',
    type: '3T MRI Gantry Table',
    status: 'available',
    assignedStaff: 'MRI Technologist Alex',
    updatedAt: '20 min ago',
    position: [-20, 0.4, 3],
    rotation: Math.PI / 2
  },
  {
    id: 'MRI-03',
    zone: 'mri',
    zoneName: 'MRI Suite',
    type: 'MRI Prep Couch',
    status: 'reserved',
    reservationId: 'BL-MRI-441',
    ambulanceId: 'AMB-NEURO-2',
    eta: '10 min',
    statusReason: 'Emergency stroke MRI protocol',
    assignedStaff: 'Dr. Charles Xavier',
    updatedAt: '4 min ago',
    position: [-28, 0.4, -4],
    rotation: Math.PI / 2
  },
  {
    id: 'MRI-04',
    zone: 'mri',
    zoneName: 'MRI Suite',
    type: 'MRI Prep Couch',
    status: 'cleaning',
    statusReason: 'Post-scan coil sanitize',
    assignedStaff: 'Sanitation Team B',
    updatedAt: '10 min ago',
    position: [-20, 0.4, -4],
    rotation: Math.PI / 2
  },

  // -------------------------------------------------------------
  // ONCOLOGY & INFUSION (4 Chairs/Beds in South-East Arm)
  // -------------------------------------------------------------
  {
    id: 'ONCO-01',
    zone: 'oncology',
    zoneName: 'Oncology',
    type: 'Infusion Recliner Chair',
    status: 'occupied',
    patientId: 'PT-7102',
    patientName: 'Jane Foster',
    statusReason: 'Targeted immunotherapy infusion',
    assignedStaff: 'Oncology Specialist Lisa',
    updatedAt: '18 min ago',
    position: [16, 0.4, -21],
    rotation: 0
  },
  {
    id: 'ONCO-02',
    zone: 'oncology',
    zoneName: 'Oncology',
    type: 'Infusion Recliner Chair',
    status: 'available',
    assignedStaff: 'Nurse Rachel',
    updatedAt: '35 min ago',
    position: [28, 0.4, -21],
    rotation: 0
  },
  {
    id: 'ONCO-03',
    zone: 'oncology',
    zoneName: 'Oncology',
    type: 'Chemo Therapy Bed',
    status: 'occupied',
    patientId: 'PT-7108',
    patientName: 'Stephen Strange',
    statusReason: 'High-dose chemotherapy infusion',
    assignedStaff: 'Oncology Specialist Lisa',
    updatedAt: '25 min ago',
    position: [16, 0.4, -16],
    rotation: 0
  },
  {
    id: 'ONCO-04',
    zone: 'oncology',
    zoneName: 'Oncology',
    type: 'Chemo Therapy Bed',
    status: 'available',
    assignedStaff: 'Nurse Rachel',
    updatedAt: '1 hour ago',
    position: [28, 0.4, -16],
    rotation: 0
  },

  // -------------------------------------------------------------
  // EMERGENCY CT & X-RAY (4 Trauma Scanning Beds in South-West Spine)
  // -------------------------------------------------------------
  {
    id: 'CT-01',
    zone: 'radiology',
    zoneName: 'Emergency CT',
    type: 'Multi-Slice CT Table',
    status: 'occupied',
    patientId: 'PT-9912',
    patientName: 'Tony Stark',
    statusReason: 'Polytrauma chest/abdomen CT',
    assignedStaff: 'Dr. Helen Cho',
    updatedAt: '5 min ago',
    position: [-28, 0.4, -21],
    rotation: Math.PI / 2
  },
  {
    id: 'CT-02',
    zone: 'radiology',
    zoneName: 'Emergency CT',
    type: 'Multi-Slice CT Table',
    status: 'available',
    assignedStaff: 'CT Tech Steve',
    updatedAt: '15 min ago',
    position: [-20, 0.4, -21],
    rotation: Math.PI / 2
  },
  {
    id: 'CT-03',
    zone: 'radiology',
    zoneName: 'Emergency CT',
    type: 'Trauma Scanning Bed',
    status: 'reserved',
    reservationId: 'BL-CT-109',
    ambulanceId: 'TRAUMA-EMS-1',
    eta: '3 min',
    statusReason: 'Head injury CT intake',
    assignedStaff: 'Dr. Helen Cho',
    updatedAt: '1 min ago',
    position: [-28, 0.4, -16],
    rotation: Math.PI / 2
  },
  {
    id: 'CT-04',
    zone: 'radiology',
    zoneName: 'Emergency CT',
    type: 'Trauma Scanning Bed',
    status: 'cleaning',
    statusReason: 'Post-trauma contrast cleanup',
    assignedStaff: 'Sanitation Tech Alex',
    updatedAt: '7 min ago',
    position: [-20, 0.4, -16],
    rotation: Math.PI / 2
  }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    bedId: 'CT-03',
    status: 'reserved',
    message: 'CT-03 RESERVED for incoming Trauma head CT (ETA 3 min)',
    timestamp: '1 min ago'
  },
  {
    id: 'log-2',
    bedId: 'MRI-01',
    status: 'occupied',
    message: 'MRI-01 active 3T brain functional scan sequence in progress',
    timestamp: '2 min ago'
  },
  {
    id: 'log-3',
    bedId: 'NICU-01',
    status: 'occupied',
    message: 'NICU-01 incubator active for premature 32-week telemetry',
    timestamp: '3 min ago'
  },
  {
    id: 'log-4',
    bedId: 'PET-01',
    status: 'occupied',
    message: 'PET-01 full-body radiotracer scan initiated',
    timestamp: '5 min ago'
  },
  {
    id: 'log-5',
    bedId: 'NICU-04',
    status: 'cleaning',
    message: 'NICU-04 incubator UV sterile decontamination started',
    timestamp: '8 min ago'
  }
];
