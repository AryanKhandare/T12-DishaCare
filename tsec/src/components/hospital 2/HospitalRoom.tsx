import React from 'react';

export const HospitalRoom: React.FC = () => {
  return (
    <group position={[0, 0, 0]}>
      {/* ============================================================== */}
      {/* 1. UNEVEN ASYMMETRICAL EXTERIOR BOUNDARY WALLS & TRIM ACCENTS  */}
      {/* ============================================================== */}
      {/* Wall parameters */}
      {/* Color: #cbd5e1 (slate-300), Trim: #0284c7 (cyan-600) */}

      {/* --- NORTH WALL SEGMENTS --- */}
      {/* 1a. NW ICU Wing North Wall (X: -42 to -14, Z: 28) */}
      <mesh position={[-28, 1.6, 28]}>
        <boxGeometry args={[28, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[-28, 3.22, 28]}>
        <boxGeometry args={[28, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 1b. Central Triage North Wall (X: -14 to 14, Z: 28) */}
      <mesh position={[0, 1.6, 28]}>
        <boxGeometry args={[28, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.22, 28]}>
        <boxGeometry args={[28, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 1c. North Step Wall connecting Central to Shifted NE Exam Wing (X: 14, Z: 28 to 34) */}
      <mesh position={[14, 1.6, 31]}>
        <boxGeometry args={[0.5, 3.2, 6]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[14, 3.22, 31]}>
        <boxGeometry args={[0.55, 0.1, 6]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 1d. Shifted NE Exam Wing North Wall (X: 14 to 46, Z: 34) */}
      <mesh position={[30, 1.6, 34]}>
        <boxGeometry args={[32, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[30, 3.22, 34]}>
        <boxGeometry args={[32, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* --- EAST WALL SEGMENTS --- */}
      {/* 2a. NE Exam Wing East Wall (X: 46, Z: 6 to 34) */}
      <mesh position={[46, 1.6, 20]}>
        <boxGeometry args={[0.5, 3.2, 28]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[46, 3.22, 20]}>
        <boxGeometry args={[0.55, 0.1, 28]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 2b. East Step Wall connecting Exam Wing to Ambulance Wing (Z: 6, X: 46 to 48) */}
      <mesh position={[47, 1.6, 6]}>
        <boxGeometry args={[2, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[47, 3.22, 6]}>
        <boxGeometry args={[2, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 2c. SE Ambulance Wing East Wall (X: 48, Z: -26 to 6) */}
      <mesh position={[48, 1.6, -10]}>
        <boxGeometry args={[0.5, 3.2, 32]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[48, 3.22, -10]}>
        <boxGeometry args={[0.55, 0.1, 32]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* --- SOUTH WALL SEGMENTS --- */}
      {/* 3a. SE Wing South Wall (Ambulance Bay & Pharmacy) (X: 14 to 48, Z: -26) */}
      <mesh position={[31, 1.6, -26]}>
        <boxGeometry args={[34, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[31, 3.22, -26]}>
        <boxGeometry args={[34, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 3b. South Entrance Recess East Wall (Courtyard Setback) (X: 14, Z: -26 to -10) */}
      <mesh position={[14, 1.6, -18]}>
        <boxGeometry args={[0.5, 3.2, 16]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[14, 3.22, -18]}>
        <boxGeometry args={[0.55, 0.1, 16]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 3c. South Entrance Glass Atrium Back Wall (X: -14 to 14, Z: -10) */}
      <group position={[0, 1.6, -10]}>
        <mesh position={[-10, 0, 0]}>
          <boxGeometry args={[8, 3.2, 0.5]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
        <mesh position={[10, 0, 0]}>
          <boxGeometry args={[8, 3.2, 0.5]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
        {/* Automatic Sliding Glass Vestibule Doors */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[12, 3.0, 0.1]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.35} transmission={0.9} roughness={0.1} />
        </mesh>
        {/* Door Frame Aluminum Support */}
        <mesh position={[0, 1.55, 0]}>
          <boxGeometry args={[12.2, 0.15, 0.3]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* 3d. South Entrance Recess West Wall (Courtyard Setback) (X: -14, Z: -30 to -10) */}
      <mesh position={[-14, 1.6, -20]}>
        <boxGeometry args={[0.5, 3.2, 20]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[-14, 3.22, -20]}>
        <boxGeometry args={[0.55, 0.1, 20]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 3e. SW Resuscitation Wing South Wall (X: -42 to -14, Z: -30) */}
      <mesh position={[-28, 1.6, -30]}>
        <boxGeometry args={[28, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[-28, 3.22, -30]}>
        <boxGeometry args={[28, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* --- WEST WALL SEGMENT --- */}
      {/* 4. Entire West Facade Exterior Wall (X: -42, Z: -30 to 28) */}
      <mesh position={[-42, 1.6, -1]}>
        <boxGeometry args={[0.5, 3.2, 58]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[-42, 3.22, -1]}>
        <boxGeometry args={[0.55, 0.1, 58]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* ============================================================== */}
      {/* 2. INTERIOR PARTITION WALLS FOR UNEVEN HOSPITAL 2 LAYOUT       */}
      {/* ============================================================== */}
      {/* Divider separating ICU Wing (West-North) from Triage */}
      <mesh position={[-14, 1.4, 14]}>
        <boxGeometry args={[0.3, 2.8, 28]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* Divider separating Triage from Shifted Exam Wing (East-North) */}
      <mesh position={[14, 1.4, 18]}>
        <boxGeometry args={[0.3, 2.8, 20]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* Exam Room Internal Partition (Separating EXAM North & South Rows) */}
      <mesh position={[30, 1.4, 21]}>
        <boxGeometry args={[31, 2.8, 0.3]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
      </mesh>

      {/* Divider separating Main Central Corridor (Z: 5) */}
      <mesh position={[-14, 1.4, 5]}>
        <boxGeometry args={[56, 2.8, 0.4]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>

      {/* Divider between Pharmacy & Ambulance Bay (SE Wing) */}
      <mesh position={[32, 1.4, -14]}>
        <boxGeometry args={[0.3, 2.8, 24]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* ============================================================== */}
      {/* 3. INTERIOR FURNISHINGS & ARCHITECTURAL DETAILS                */}
      {/* ============================================================== */}
      {/* Triage Desk & Workstations (Central North Atrium) */}
      <group position={[0, 0.6, 9]}>
        <mesh>
          <boxGeometry args={[7.5, 1.2, 1.6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[7.7, 0.1, 1.7]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        <mesh position={[-2.0, 1.0, 0]}>
          <boxGeometry args={[0.9, 0.55, 0.08]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
        <mesh position={[2.0, 1.0, 0]}>
          <boxGeometry args={[0.9, 0.55, 0.08]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* Waiting Area Lounge Sofas & Coffee Table (Central Atrium Recess) */}
      <group position={[0, 0.45, -2]}>
        {[-3, 3].map((xOffset) => (
          <group key={`sofa-${xOffset}`} position={[xOffset, 0, 0]}>
            <mesh>
              <boxGeometry args={[4.5, 0.4, 1.4]} />
              <meshStandardMaterial color="#0284c7" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.45, -0.6]}>
              <boxGeometry args={[4.5, 0.6, 0.2]} />
              <meshStandardMaterial color="#0369a1" roughness={0.6} />
            </mesh>
          </group>
        ))}

        {/* Central Coffee Table & Indoor Planter */}
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[2.5, 0.45, 1.0]} />
          <meshStandardMaterial color="#475569" roughness={0.3} />
        </mesh>
      </group>

      {/* Pharmacy Service Counter & Shelves (SE Wing) */}
      <group position={[23, 0, -14]}>
        <mesh position={[0, 0.6, 5]}>
          <boxGeometry args={[11, 1.2, 1.4]} />
          <meshStandardMaterial color="#10b981" roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.6, 5]}>
          <boxGeometry args={[10, 0.8, 0.08]} />
          <meshPhysicalMaterial color="#a7f3d0" transparent opacity={0.5} transmission={0.9} />
        </mesh>
      </group>

      {/* Ambulance Bay & Vehicle (Far SE Wing Driveway Entrance) */}
      <group position={[39, 0, -14]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <planeGeometry args={[10, 20]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.25} />
        </mesh>

        {/* Overhead Open Canopy Roof Accent */}
        <mesh position={[0, 3.6, 0]}>
          <boxGeometry args={[11, 0.2, 21]} />
          <meshStandardMaterial color="#334155" roughness={0.4} />
        </mesh>

        {/* Emergency Ambulance Vehicle */}
        <group position={[0, 0.9, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[5.8, 2.2, 2.5]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[5.82, 0.48, 2.52]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          <mesh position={[2.2, 1.25, 0]}>
            <boxGeometry args={[1.3, 0.85, 2.46]} />
            <meshStandardMaterial color="#0f172a" roughness={0.1} />
          </mesh>
          <mesh position={[0.7, 1.9, 0]}>
            <boxGeometry args={[1.2, 0.22, 1.8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      </group>
    </group>
  );
};
