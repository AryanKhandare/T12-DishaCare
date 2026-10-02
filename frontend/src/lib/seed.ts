import type { Hospital, ResourceKey, ResourceSlot, User } from "./types";

export const DEMO_AMBULANCE = { lat: 19.1235, lng: 72.8450, label: "Andheri Station, Mumbai" };
export const MUMBAI_CENTER: [number, number] = [19.12, 72.84];

export const DEMO_USERS: (User & { password: string })[] = [
  { id: "u-1", username: "dispatcher1", password: "demo123", name: "Rohan Mehta", role: "dispatcher", hospital_id: null, ambulance_id: "A12" },
  { id: "u-bhy", username: "nurse_bhayandar", password: "demo123", name: "Sunita Sawant", role: "hospital", hospital_id: "bhimsen-joshi-bhayandar" },
  { id: "u-wock", username: "nurse_wockhardt", password: "demo123", name: "Anjali Kulkarni", role: "hospital", hospital_id: "wockhardt-mira" },
  { id: "u-karuna", username: "nurse_karuna", password: "demo123", name: "Sister Maria D'Souza", role: "hospital", hospital_id: "karuna-hospital" },
  { id: "u-kem", username: "nurse_kem", password: "demo123", name: "Sister Savita Jadhav", role: "hospital", hospital_id: "kem-hospital" },
  { id: "u-gt", username: "nurse_gt_churchgate", password: "demo123", name: "Anil Kamble", role: "hospital", hospital_id: "gt-hospital-churchgate" },
  { id: "u-2", username: "nurse_city", password: "demo123", name: "Priya Nair", role: "hospital", hospital_id: "h-city" },
  { id: "u-3", username: "nurse_metro", password: "demo123", name: "Anil Kulkarni", role: "hospital", hospital_id: "h-metro" },
  { id: "u-4", username: "admin", password: "demo123", name: "Command Center", role: "admin", hospital_id: null },
];

type R = [number, number]; // [available, total]
const res = (icu: R, vent: R, cardiac: 0 | 1, oxy: R, burns: 0 | 1): Record<ResourceKey, ResourceSlot> => ({
  icu: { available: icu[0], total: icu[1] },
  ventilator: { available: vent[0], total: vent[1] },
  cardiac: { available: cardiac, total: 1 },
  oxygen: { available: oxy[0], total: oxy[1] },
  burns: { available: burns, total: 1 },
});

interface SeedRow {
  id: string; name: string; area: string; lat: number; lng: number; load: number;
  specialties: string[]; r: Record<ResourceKey, ResourceSlot>; age: number; active?: boolean;
}

const ROWS: SeedRow[] = [
  // ── Western Corridor: Bhayandar to Dahisar ──
  { id: "bhimsen-joshi-bhayandar", name: "Bharat Ratna Pandit Bhimsen Joshi Hospital", area: "Bhayandar West", lat: 19.2998, lng: 72.8480, load: 38, specialties: ["trauma", "general", "cardiology"], r: res([5, 16], [3, 8], 1, [14, 25], 1), age: 10 },
  { id: "thunga-bhayandar", name: "Thunga Hospital Bhayandar", area: "Bhayandar East", lat: 19.3015, lng: 72.8578, load: 45, specialties: ["cardiology", "trauma", "general"], r: res([3, 12], [2, 6], 1, [10, 20], 0), age: 15 },
  { id: "bhaktivedanta-hospital", name: "Bhaktivedanta Hospital & Research Institute", area: "Mira Road", lat: 19.2818, lng: 72.8682, load: 35, specialties: ["cardiology", "trauma", "general", "burns"], r: res([6, 20], [4, 10], 1, [20, 35], 1), age: 12 },
  { id: "wockhardt-mira", name: "Wockhardt Super Speciality Hospital Mira Road", area: "Mira Road", lat: 19.2825, lng: 72.8610, load: 42, specialties: ["cardiology", "trauma", "pulmonology", "neurology"], r: res([6, 24], [5, 14], 1, [25, 45], 1), age: 8 },
  { id: "navneet-dahisar", name: "Navneet Hi-Tech Multispeciality Hospital", area: "Dahisar East", lat: 19.2554, lng: 72.8624, load: 50, specialties: ["trauma", "general"], r: res([3, 10], [2, 6], 1, [10, 18], 0), age: 14 },
  { id: "sanjeevani-dahisar", name: "Sanjeevani Hospital Dahisar", area: "Dahisar West", lat: 19.2505, lng: 72.8552, load: 48, specialties: ["general", "trauma"], r: res([2, 8], [2, 5], 0, [8, 15], 0), age: 18 },

  // ── Western Corridor: Borivali to Goregaon ──
  { id: "apex-borivali", name: "Apex Superspeciality Hospital Borivali", area: "Borivali West", lat: 19.2312, lng: 72.8567, load: 39, specialties: ["cardiology", "trauma", "general"], r: res([4, 14], [3, 8], 1, [12, 22], 0), age: 9 },
  { id: "karuna-hospital", name: "Karuna Hospital Borivali", area: "Borivali West", lat: 19.2435, lng: 72.8532, load: 36, specialties: ["cardiology", "trauma", "general", "pulmonology"], r: res([6, 22], [4, 12], 1, [18, 32], 1), age: 11 },
  { id: "dna-hospital-kandivali", name: "DNA Multispeciality Hospital & Trauma Care", area: "Kandivali West", lat: 19.2130, lng: 72.8420, load: 45, specialties: ["trauma", "cardiology", "general"], r: res([3, 12], [2, 6], 1, [10, 18], 0), age: 15 },
  { id: "oscar-hospital-kandivali", name: "Oscar Super Speciality Hospital Kandivali", area: "Kandivali West", lat: 19.2115, lng: 72.8360, load: 41, specialties: ["cardiology", "trauma", "general"], r: res([4, 14], [3, 8], 1, [12, 22], 0), age: 12 },
  { id: "zenith-hospital-malad", name: "Zenith Super Speciality Hospital Malad", area: "Malad West", lat: 19.1878, lng: 72.8436, load: 44, specialties: ["cardiology", "trauma", "general", "pulmonology"], r: res([4, 16], [3, 10], 1, [18, 30], 0), age: 10 },
  { id: "suchak-hospital-malad", name: "Suchak Multispeciality Hospital Malad", area: "Malad East", lat: 19.1824, lng: 72.8572, load: 52, specialties: ["trauma", "general"], r: res([3, 10], [2, 5], 0, [8, 16], 0), age: 20 },
  { id: "srv-hospital-goregaon", name: "SRV Hospital Goregaon", area: "Goregaon West", lat: 19.1685, lng: 72.8415, load: 43, specialties: ["cardiology", "trauma", "general"], r: res([4, 15], [3, 8], 1, [14, 25], 0), age: 10 },
  { id: "kapadia-hospital-goregaon", name: "Kapadia Multispeciality Hospital Goregaon", area: "Goregaon East", lat: 19.1620, lng: 72.8590, load: 47, specialties: ["trauma", "general"], r: res([3, 12], [2, 6], 1, [10, 20], 0), age: 14 },

  // ── Western Corridor: Jogeshwari to Bandra ──
  { id: "hbt-trauma-jogeshwari", name: "HBT Trauma Care Municipal Hospital", area: "Jogeshwari East", lat: 19.1382, lng: 72.8620, load: 55, specialties: ["trauma", "general", "burns"], r: res([5, 18], [4, 10], 1, [15, 30], 1), age: 12 },
  { id: "millat-hospital-jogeshwari", name: "Millat Multispeciality Hospital Jogeshwari", area: "Jogeshwari West", lat: 19.1415, lng: 72.8402, load: 46, specialties: ["cardiology", "general"], r: res([3, 12], [2, 6], 1, [10, 20], 0), age: 18 },
  { id: "holy-spirit-hospital", name: "Holy Spirit Hospital & Research Centre", area: "Andheri East", lat: 19.1235, lng: 72.8670, load: 40, specialties: ["cardiology", "trauma", "general", "pulmonology", "burns"], r: res([8, 28], [5, 15], 1, [24, 45], 1), age: 8 },
  { id: "criticare-andheri-west", name: "CritiCare Asia Multispeciality Hospital", area: "Andheri West", lat: 19.1215, lng: 72.8320, load: 42, specialties: ["cardiology", "trauma", "general"], r: res([4, 15], [3, 8], 1, [12, 22], 0), age: 10 },
  { id: "kokilaben-hospital", name: "Kokilaben Dhirubhai Ambani Hospital", area: "Andheri West", lat: 19.1312, lng: 72.8252, load: 55, specialties: ["cardiology", "trauma", "general", "pulmonology", "neurology", "burns"], r: res([7, 30], [5, 18], 1, [25, 50], 1), age: 8 },
  { id: "cooper-hospital", name: "Dr. R.N. Cooper Municipal Hospital", area: "Juhu / Vile Parle", lat: 19.1080, lng: 72.8364, load: 60, specialties: ["trauma", "general", "cardiology"], r: res([4, 18], [3, 10], 1, [16, 32], 0), age: 15 },
  { id: "nanavati-hospital", name: "Nanavati Max Super Speciality Hospital", area: "Vile Parle West", lat: 19.0968, lng: 72.8406, load: 50, specialties: ["cardiology", "trauma", "general", "burns"], r: res([6, 25], [4, 14], 1, [20, 40], 1), age: 10 },
  { id: "lilavati-hospital", name: "Lilavati Hospital & Research Centre", area: "Bandra West", lat: 19.0514, lng: 72.8291, load: 48, specialties: ["cardiology", "trauma", "general", "pulmonology"], r: res([5, 20], [4, 12], 1, [16, 35], 0), age: 12 },
  { id: "hinduja-hospital", name: "P.D. Hinduja National Hospital", area: "Mahim", lat: 19.0330, lng: 72.8385, load: 45, specialties: ["cardiology", "trauma", "general", "pulmonology", "burns"], r: res([6, 22], [4, 14], 1, [20, 38], 1), age: 9 },

  // ── Western Corridor: Central to Churchgate & Fort ──
  { id: "kem-hospital", name: "King Edward Memorial Hospital (KEM)", area: "Parel", lat: 18.9995, lng: 72.8427, load: 65, specialties: ["cardiology", "trauma", "general", "pulmonology", "burns"], r: res([5, 25], [4, 15], 1, [18, 40], 1), age: 10 },
  { id: "nair-hospital", name: "B.Y.L. Nair Charitable Hospital", area: "Mumbai Central", lat: 18.9712, lng: 72.8223, load: 62, specialties: ["cardiology", "trauma", "general"], r: res([4, 20], [3, 12], 1, [16, 32], 0), age: 14 },
  { id: "sir-jj-hospital", name: "Sir J.J. Group of Hospitals", area: "Byculla", lat: 18.9626, lng: 72.8336, load: 68, specialties: ["trauma", "cardiology", "burns", "general"], r: res([4, 22], [3, 14], 1, [15, 35], 1), age: 15 },
  { id: "saifee-hospital", name: "Saifee Hospital", area: "Charni Road", lat: 18.9529, lng: 72.8178, load: 42, specialties: ["cardiology", "trauma", "general"], r: res([5, 18], [3, 10], 1, [14, 28], 0), age: 11 },
  { id: "bombay-hospital", name: "Bombay Hospital & Medical Research Centre", area: "Marine Lines", lat: 18.9392, lng: 72.8282, load: 46, specialties: ["cardiology", "trauma", "general", "pulmonology"], r: res([6, 24], [4, 14], 1, [20, 42], 0), age: 9 },
  { id: "gt-hospital-churchgate", name: "Gokuldas Tejpal Hospital (G.T. Hospital)", area: "Churchgate / CST", lat: 18.9430, lng: 72.8315, load: 50, specialties: ["trauma", "general", "cardiology"], r: res([4, 16], [3, 8], 1, [12, 24], 0), age: 13 },
  { id: "st-george-hospital", name: "St. George's Hospital", area: "Fort", lat: 18.9385, lng: 72.8350, load: 53, specialties: ["trauma", "general", "burns"], r: res([4, 18], [3, 10], 1, [14, 26], 1), age: 12 },

  // ── Baseline Demo Hospitals ──
  { id: "h-city", name: "City Hospital", area: "Parel", lat: 19.003, lng: 72.841, load: 17, specialties: ["cardiology", "trauma", "general", "pulmonology"], r: res([3, 12], [3, 8], 1, [10, 20], 0), age: 20 },
  { id: "h-metro", name: "Metro Hospital", area: "Mahim", lat: 19.041, lng: 72.84, load: 26, specialties: ["cardiology", "trauma", "general", "pulmonology"], r: res([2, 10], [2, 6], 1, [8, 16], 0), age: 35 },
  { id: "h-lifecare", name: "Lifecare Hospital", area: "Worli", lat: 19.012, lng: 72.818, load: 56, specialties: ["cardiology", "general", "pulmonology"], r: res([2, 8], [1, 5], 1, [6, 14], 0), age: 48 },
  { id: "h-sunrise", name: "Sunrise Hospital", area: "Sion", lat: 19.042, lng: 72.862, load: 35, specialties: ["cardiology", "trauma", "general"], r: res([4, 10], [3, 6], 1, [9, 18], 0), age: 460 },
  { id: "h-harbour", name: "Harbour View Hospital", area: "Byculla", lat: 18.979, lng: 72.833, load: 64, specialties: ["trauma", "general", "burns"], r: res([2, 8], [2, 5], 0, [7, 15], 1), age: 25 },
  { id: "h-seaside", name: "Seaside Medical Centre", area: "Bandra West", lat: 19.059, lng: 72.832, load: 48, specialties: ["cardiology", "general", "pulmonology"], r: res([3, 9], [2, 6], 1, [10, 16], 0), age: 150 },
  { id: "h-western", name: "Western Care Hospital", area: "Santacruz", lat: 19.081, lng: 72.841, load: 71, specialties: ["trauma", "general"], r: res([1, 8], [1, 6], 0, [5, 12], 0), age: 40 },
  { id: "h-kurla", name: "Kurla General Hospital", area: "Kurla", lat: 19.071, lng: 72.879, load: 88, specialties: ["general", "trauma", "pulmonology"], r: res([0, 6], [1, 5], 0, [4, 12], 0), age: 55 },
  { id: "h-ghatkopar", name: "Ghatkopar Heart Institute", area: "Ghatkopar", lat: 19.086, lng: 72.908, load: 52, specialties: ["cardiology", "general"], r: res([4, 10], [3, 7], 1, [8, 14], 0), age: 210 },
  { id: "h-colaba", name: "Colaba Naval Hospital", area: "Colaba", lat: 18.907, lng: 72.814, load: 38, specialties: ["trauma", "general", "burns"], r: res([3, 8], [2, 5], 0, [9, 14], 1), age: 30 },
  { id: "h-chembur", name: "Chembur Burns & Trauma", area: "Chembur", lat: 19.062, lng: 72.9, load: 45, specialties: ["burns", "trauma", "general"], r: res([2, 6], [2, 4], 0, [6, 10], 1), age: 680 },
  { id: "h-andheri", name: "Andheri Multispeciality", area: "Andheri East", lat: 19.115, lng: 72.865, load: 33, specialties: ["cardiology", "trauma", "general", "pulmonology", "burns"], r: res([5, 14], [4, 9], 1, [12, 20], 1), age: 22 },
  { id: "h-wadala", name: "Wadala Community Hospital", area: "Wadala", lat: 19.016, lng: 72.865, load: 92, specialties: ["general", "pulmonology"], r: res([0, 4], [0, 3], 0, [2, 8], 0), age: 80 },
  { id: "h-powai", name: "Powai Lakeside Hospital", area: "Powai", lat: 19.118, lng: 72.906, load: 40, specialties: ["cardiology", "general", "pulmonology"], r: res([3, 10], [2, 6], 1, [10, 16], 0), age: 340 },
];

export function createSeedHospitals(now: number): Hospital[] {
  return ROWS.map((r) => ({
    id: r.id,
    name: r.name,
    area: r.area,
    lat: r.lat,
    lng: r.lng,
    active: r.active ?? true,
    load_pct: r.load,
    specialties: r.specialties,
    resources: structuredClone(r.r),
    updated_at: now - r.age * 1000,
    heartbeat: r.age < 60 && (r.active ?? true),
  }));
}

/** SIMULATED ambulance fleet — names and numbers are fictional demo data. */
export const DEMO_AMBULANCES: import("./types").Ambulance[] = [
  { id: "A12", vehicle_number: "MH-01-AB-4821", driver_name: "Suresh Patil (demo)", driver_phone: "+91 98000 00012", paramedic_name: "Anita Desai (demo)", paramedic_phone: "+91 98000 00112", crew_size: 3, operator_name: "108 Emergency Services" },
  { id: "A07", vehicle_number: "MH-02-CD-1937", driver_name: "Imran Shaikh (demo)", driver_phone: "+91 98000 00007", paramedic_name: "Kavita Rao (demo)", paramedic_phone: "+91 98000 00107", crew_size: 2, operator_name: "108 Emergency Services" },
  { id: "A21", vehicle_number: "MH-03-EF-5520", driver_name: "Prakash Jadhav (demo)", driver_phone: "+91 98000 00021", paramedic_name: "Neha Kulkarni (demo)", paramedic_phone: "+91 98000 00121", crew_size: 3, operator_name: "LifeLine Ambulance Pvt. (demo)" },
  { id: "A33", vehicle_number: "MH-04-GH-7104", driver_name: "Ramesh Gupta (demo)", driver_phone: "+91 98000 00033", paramedic_name: "Farah Khan (demo)", paramedic_phone: "+91 98000 00133", crew_size: 2, operator_name: "Ziqitza Care (demo)" },
  { id: "A45", vehicle_number: "MH-01-JK-2268", driver_name: "Vijay More (demo)", driver_phone: "+91 98000 00045", paramedic_name: "Pooja Nair (demo)", paramedic_phone: "+91 98000 00145", crew_size: 4, operator_name: "BMC Disaster Response (demo)" },
  { id: "A58", vehicle_number: "MH-47-LM-8391", driver_name: "Ajay Sawant (demo)", driver_phone: "+91 98000 00058", paramedic_name: "Sneha Iyer (demo)", paramedic_phone: "+91 98000 00158", crew_size: 3, operator_name: "Red Cross Mumbai (demo)" },
];

export const getAmbulance = (id: string) => DEMO_AMBULANCES.find((a) => a.id === id) ?? DEMO_AMBULANCES[0]!;

export const DECLINE_REASONS: { id: string; label: string; resource?: import("./types").ResourceKey }[] = [
  { id: "no_beds", label: "No beds available" },
  { id: "icu", label: "ICU not free", resource: "icu" },
  { id: "ventilator", label: "Ventilator not available", resource: "ventilator" },
  { id: "cardiac", label: "Cardiac / specialty unit unavailable", resource: "cardiac" },
  { id: "burns", label: "Burns unit unavailable", resource: "burns" },
  { id: "oxygen", label: "Oxygen supply issue", resource: "oxygen" },
  { id: "diversion", label: "Hospital at full capacity / diversion" },
  { id: "specialist", label: "Specialist not on duty" },
  { id: "other", label: "Other" },
];
export const reasonLabel = (id: string) => DECLINE_REASONS.find((r) => r.id === id)?.label ?? id;
