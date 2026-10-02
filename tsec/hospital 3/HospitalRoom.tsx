import React from 'react';

export const HospitalRoom: React.FC = () => {
  return (
    <group position={[0, 0, 0]}>
      {/* ============================================================== */}
      {/* 1. L-SHAPED EXTERIOR BOUNDARY WALLS & TRIM ACCENTS              */}
      {/* ============================================================== */}
      {/* Wall height: 3.2, y: 1.6. Color: #cbd5e1 (slate-300), Trim: #0284c7 */}

      {/* 1. North Wall of Vertical Arm (X: -36 to -8, Z: 28) */}
      <mesh position={[-22, 1.6, 28]}>
        <boxGeometry args={[28, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[-22, 3.22, 28]}>
        <boxGeometry args={[28, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 2. East Wall of Vertical Arm (X: -8, Z: 28 to -4) */}
      <mesh position={[-8, 1.6, 12]}>
        <boxGeometry args={[0.5, 3.2, 32]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[-8, 3.22, 12]}>
        <boxGeometry args={[0.55, 0.1, 32]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 3. Inner Corner Top Wall of Horizontal Arm with Main Entrance Glass (X: -8 to 36, Z: -4) */}
      <group position={[14, 1.6, -4]}>
        <mesh position={[-9, 0, 0]}>
          <boxGeometry args={[26, 3.2, 0.5]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
        <mesh position={[13, 0, 0]}>
          <boxGeometry args={[18, 3.2, 0.5]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
        {/* L-Wing Main Glass Entrance Doors */}
        <mesh position={[2, 0, 0]}>
          <boxGeometry args={[10, 3.0, 0.1]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.35} transmission={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[2, 1.55, 0]}>
          <boxGeometry args={[10.2, 0.15, 0.3]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* 4. East Wall of Horizontal Arm (X: 36, Z: -4 to -28) */}
      <mesh position={[36, 1.6, -16]}>
        <boxGeometry args={[0.5, 3.2, 24]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[36, 3.22, -16]}>
        <boxGeometry args={[0.55, 0.1, 24]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 5. South Wall of Horizontal Arm (Entire Bottom Edge: X: 36 to -36, Z: -28) */}
      <mesh position={[0, 1.6, -28]}>
        <boxGeometry args={[72, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.22, -28]}>
        <boxGeometry args={[72, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 6. West Wall of Vertical Arm (Entire Left Edge: X: -36, Z: -28 to 28) */}
      <mesh position={[-36, 1.6, 0]}>
        <boxGeometry args={[0.5, 3.2, 56]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[-36, 3.22, 0]}>
        <boxGeometry args={[0.55, 0.1, 56]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* ============================================================== */}
      {/* 2. INTERIOR PARTITION WALLS FOR L-SHAPE LAYOUT                  */}
      {/* ============================================================== */}
      {/* Divider separating Surgery (North) & Cardiology (Mid-West) */}
      <mesh position={[-22, 1.4, 6]}>
        <boxGeometry args={[27, 2.8, 0.3]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* Divider separating Cardiology & Emergency Intake (South-West) */}
      <mesh position={[-22, 1.4, -11]}>
        <boxGeometry args={[27, 2.8, 0.3]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* Divider separating Pediatric (Center-South) & Neurology (East-South) */}
      <mesh position={[12.5, 1.4, -16]}>
        <boxGeometry args={[0.3, 2.8, 23]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* Divider separating Central Cafeteria (Inner corner) & Pediatric */}
      <mesh position={[-2, 1.4, -4.5]}>
        <boxGeometry args={[12, 2.8, 0.3]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>

      {/* ============================================================== */}
      {/* 3. INTERIOR FURNISHINGS & ARCHITECTURAL DETAILS                */}
      {/* ============================================================== */}
      {/* Surgery Operating Room Overhead Surgical Lights & Control Desk */}
      <group position={[-22, 0.5, 16]}>
        <mesh position={[0, 2.6, 0]}>
          <cylinderGeometry args={[1.5, 1.8, 0.2, 16]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        <mesh position={[0, 2.8, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      </group>

      {/* Central Cafeteria Dining Tables & Chairs (Inner L-Corner) */}
      <group position={[-4, 0.4, -2]}>
        {[-2, 2].map((x) => (
          <group key={`table-${x}`} position={[x, 0, 0]}>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[1.2, 1.2, 0.1, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.3, 8]} />
              <meshStandardMaterial color="#0284c7" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Emergency Ambulance Entrance Canopy at South-West Exterior */}
      <group position={[-36, 0, -20]}>
        <mesh position={[-2, 3.4, 0]}>
          <boxGeometry args={[6, 0.2, 14]} />
          <meshStandardMaterial color="#334155" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
};
