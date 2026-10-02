import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting BedLink database seed...");

  // 1. Seed Ambulances
  const ambulances = [
    {
      id: "A12",
      vehicleNumber: "MH-01-AB-4821",
      driverName: "Suresh Patil (demo)",
      driverPhone: "+91 98000 00012",
      paramedicName: "Anita Desai (demo)",
      paramedicPhone: "+91 98000 00112",
      crewSize: 3,
      operatorName: "108 Emergency Services",
    },
    {
      id: "A07",
      vehicleNumber: "MH-02-CD-1937",
      driverName: "Imran Shaikh (demo)",
      driverPhone: "+91 98000 00007",
      paramedicName: "Kavita Rao (demo)",
      paramedicPhone: "+91 98000 00107",
      crewSize: 2,
      operatorName: "108 Emergency Services",
    },
    {
      id: "A21",
      vehicleNumber: "MH-03-EF-5520",
      driverName: "Prakash Jadhav (demo)",
      driverPhone: "+91 98000 00021",
      paramedicName: "Neha Kulkarni (demo)",
      paramedicPhone: "+91 98000 00121",
      crewSize: 3,
      operatorName: "LifeLine Ambulance Pvt. (demo)",
    },
  ];

  for (const a of ambulances) {
    await prisma.ambulance.upsert({
      where: { id: a.id },
      create: a,
      update: a,
    });
  }
  console.log(`✅ Seeded ${ambulances.length} ambulances`);

  // 2. Seed Demo Hospitals & Availability
  const now = Date.now();
  type R = [number, number];
  interface HospitalSeed {
    id: string;
    name: string;
    area: string;
    lat: number;
    lng: number;
    load: number;
    specialties: string[];
    icu: R;
    vent: R;
    cardiac: number;
    oxy: R;
    burns: number;
    ageSec: number;
    active?: boolean;
  }

  const hospitalRows: HospitalSeed[] = [
    { id: "h-city", name: "City Hospital", area: "Parel", lat: 19.003, lng: 72.841, load: 17, specialties: ["cardiology", "trauma", "general", "pulmonology"], icu: [3, 12], vent: [3, 8], cardiac: 1, oxy: [10, 20], burns: 0, ageSec: 20 },
    { id: "h-metro", name: "Metro Hospital", area: "Mahim", lat: 19.041, lng: 72.84, load: 26, specialties: ["cardiology", "trauma", "general", "pulmonology"], icu: [2, 10], vent: [2, 6], cardiac: 1, oxy: [8, 16], burns: 0, ageSec: 35 },
    { id: "h-lifecare", name: "Lifecare Hospital", area: "Worli", lat: 19.012, lng: 72.818, load: 56, specialties: ["cardiology", "general", "pulmonology"], icu: [2, 8], vent: [1, 5], cardiac: 1, oxy: [6, 14], burns: 0, ageSec: 48 },
    { id: "h-sunrise", name: "Sunrise Hospital", area: "Sion", lat: 19.042, lng: 72.862, load: 35, specialties: ["cardiology", "trauma", "general"], icu: [4, 10], vent: [3, 6], cardiac: 1, oxy: [9, 18], burns: 0, ageSec: 460 },
    { id: "h-harbour", name: "Harbour View Hospital", area: "Byculla", lat: 18.979, lng: 72.833, load: 64, specialties: ["trauma", "general", "burns"], icu: [2, 8], vent: [2, 5], cardiac: 0, oxy: [7, 15], burns: 1, ageSec: 25 },
    { id: "h-seaside", name: "Seaside Medical Centre", area: "Bandra West", lat: 19.059, lng: 72.832, load: 48, specialties: ["cardiology", "general", "pulmonology"], icu: [3, 9], vent: [2, 6], cardiac: 1, oxy: [10, 16], burns: 0, ageSec: 150 },
    { id: "h-western", name: "Western Care Hospital", area: "Santacruz", lat: 19.081, lng: 72.841, load: 71, specialties: ["trauma", "general"], icu: [1, 8], vent: [1, 6], cardiac: 0, oxy: [5, 12], burns: 0, ageSec: 40 },
    { id: "h-kurla", name: "Kurla General Hospital", area: "Kurla", lat: 19.071, lng: 72.879, load: 88, specialties: ["general", "trauma", "pulmonology"], icu: [0, 6], vent: [1, 5], cardiac: 0, oxy: [4, 12], burns: 0, ageSec: 55 },
    { id: "h-ghatkopar", name: "Ghatkopar Heart Institute", area: "Ghatkopar", lat: 19.086, lng: 72.908, load: 52, specialties: ["cardiology", "general"], icu: [4, 10], vent: [3, 7], cardiac: 1, oxy: [8, 14], burns: 0, ageSec: 210 },
    { id: "h-colaba", name: "Colaba Naval Hospital", area: "Colaba", lat: 18.907, lng: 72.814, load: 38, specialties: ["trauma", "general", "burns"], icu: [3, 8], vent: [2, 5], cardiac: 0, oxy: [9, 14], burns: 1, ageSec: 30 },
    { id: "h-marine", name: "Marine Lines Hospital", area: "Marine Lines", lat: 18.944, lng: 72.824, load: 60, specialties: ["cardiology", "general"], icu: [2, 7], vent: [0, 4], cardiac: 1, oxy: [6, 12], burns: 0, ageSec: 45 },
    { id: "h-chembur", name: "Chembur Burns & Trauma", area: "Chembur", lat: 19.062, lng: 72.9, load: 45, specialties: ["burns", "trauma", "general"], icu: [2, 6], vent: [2, 4], cardiac: 0, oxy: [6, 10], burns: 1, ageSec: 680 },
    { id: "h-andheri", name: "Andheri Multispeciality", area: "Andheri East", lat: 19.115, lng: 72.865, load: 33, specialties: ["cardiology", "trauma", "general", "pulmonology", "burns"], icu: [5, 14], vent: [4, 9], cardiac: 1, oxy: [12, 20], burns: 1, ageSec: 22 },
    { id: "h-wadala", name: "Wadala Community Hospital", area: "Wadala", lat: 19.016, lng: 72.865, load: 92, specialties: ["general", "pulmonology"], icu: [0, 4], vent: [0, 3], cardiac: 0, oxy: [2, 8], burns: 0, ageSec: 80 },
    { id: "h-powai", name: "Powai Lakeside Hospital", area: "Powai", lat: 19.118, lng: 72.906, load: 40, specialties: ["cardiology", "general", "pulmonology"], icu: [3, 10], vent: [2, 6], cardiac: 1, oxy: [10, 16], burns: 0, ageSec: 340 },
    { id: "h-matunga", name: "Matunga Children & General", area: "Matunga", lat: 19.027, lng: 72.856, load: 77, specialties: ["general", "pulmonology"], icu: [1, 5], vent: [1, 4], cardiac: 0, oxy: [5, 10], burns: 0, ageSec: 0, active: false },
  ];

  for (const row of hospitalRows) {
    const updated = new Date(now - row.ageSec * 1000);
    const active = row.active ?? true;

    await prisma.hospital.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        name: row.name,
        area: row.area,
        address: `${row.area}, Mumbai, Maharashtra`,
        phone: "+91 22 2410 0000",
        hospitalType: "Multispeciality",
        lat: row.lat,
        lng: row.lng,
        active,
        loadPct: row.load,
        specialties: row.specialties,
        heartbeat: row.ageSec < 60 && active,
        updatedAt: updated,
      },
      update: {
        name: row.name,
        area: row.area,
        lat: row.lat,
        lng: row.lng,
        active,
        loadPct: row.load,
        specialties: row.specialties,
        heartbeat: row.ageSec < 60 && active,
        updatedAt: updated,
      },
    });

    await prisma.bedAvailability.upsert({
      where: { hospitalId: row.id },
      create: {
        hospitalId: row.id,
        icuAvailable: row.icu[0],
        icuTotal: row.icu[1],
        ventilatorAvailable: row.vent[0],
        ventilatorTotal: row.vent[1],
        cardiacAvailable: row.cardiac,
        cardiacTotal: 1,
        oxygenAvailable: row.oxy[0],
        oxygenTotal: row.oxy[1],
        burnsAvailable: row.burns,
        burnsTotal: 1,
        lastUpdated: updated,
        updatedBy: "system-seed",
      },
      update: {
        icuAvailable: row.icu[0],
        icuTotal: row.icu[1],
        ventilatorAvailable: row.vent[0],
        ventilatorTotal: row.vent[1],
        cardiacAvailable: row.cardiac,
        cardiacTotal: 1,
        oxygenAvailable: row.oxy[0],
        oxygenTotal: row.oxy[1],
        burnsAvailable: row.burns,
        burnsTotal: 1,
        lastUpdated: updated,
      },
    });
  }
  console.log(`✅ Seeded ${hospitalRows.length} hospitals and their dynamic availability`);

  // 3. Seed Users
  const defaultPasswordHash = await bcrypt.hash("demo123", 10);
  const adminEmail = process.env.ADMIN_EMAIL || "admin@bedlink.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "demo123";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const users = [
    {
      id: "u-1",
      name: "Rohan Mehta",
      username: "dispatcher1",
      email: "dispatcher1@bedlink.org",
      passwordHash: defaultPasswordHash,
      role: "dispatcher",
      hospitalId: null,
      ambulanceId: "A12",
    },
    {
      id: "u-2",
      name: "Priya Nair",
      username: "nurse_city",
      email: "nurse.city@bedlink.org",
      passwordHash: defaultPasswordHash,
      role: "hospital",
      hospitalId: "h-city",
      ambulanceId: null,
    },
    {
      id: "u-3",
      name: "Anil Kulkarni",
      username: "nurse_metro",
      email: "nurse.metro@bedlink.org",
      passwordHash: defaultPasswordHash,
      role: "hospital",
      hospitalId: "h-metro",
      ambulanceId: null,
    },
    {
      id: "u-4",
      name: "Command Center",
      username: "admin",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "admin",
      hospitalId: null,
      ambulanceId: null,
    },
  ];

  for (const u of users) {
    const { id, ...updateData } = u;
    await prisma.user.upsert({
      where: { username: u.username },
      create: u,
      update: updateData,
    });
  }
  console.log(`✅ Seeded ${users.length} users with bcrypt password hashes`);

  console.log("🚀 Database seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
