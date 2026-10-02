import React from 'react';

export const HospitalRoom: React.FC = () => {
  return (
    <group position={[0, 0, 0]}>
      {/* ============================================================== */}
      {/* 1. C-SHAPED EXTERIOR BOUNDARY WALLS & TRIM ACCENTS              */}
      {/* ============================================================== */}
      {/* Wall height: 3.2, y: 1.6. Color: #cbd5e1 (slate-300), Trim: #0284c7 */}

      {/* 1. North Wall of C-Shape (North Arm: X: -36 to 36, Z: 28) */}
      <mesh position={[0, 1.6, 28]}>
        <boxGeometry args={[72, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.22, 28]}>
        <boxGeometry args={[72, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 2. North Arm East Tip Wall (X: 36, Z: 14 to 28) */}
      <mesh position={[36, 1.6, 21]}>
        <boxGeometry args={[0.5, 3.2, 14]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>

      {/* 3. North Arm Inner Courtyard Wall (Glass & Slate) (X: -14 to 36, Z: 14) */}
      <group position={[11, 1.6, 14]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[50, 3.0, 0.1]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.35} transmission={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <boxGeometry args={[50.2, 0.15, 0.3]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* 4. West Spine Exterior Wall (West Facade: X: -36, Z: -28 to 28) */}
      <mesh position={[-36, 1.6, 0]}>
        <boxGeometry args={[0.5, 3.2, 56]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[-36, 3.22, 0]}>
        <boxGeometry args={[0.55, 0.1, 56]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 5. South Wall of C-Shape (South Arm: X: -36 to 36, Z: -28) */}
      <mesh position={[0, 1.6, -28]}>
        <boxGeometry args={[72, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.22, -28]}>
        <boxGeometry args={[72, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* 6. South Arm East Tip Wall (X: 36, Z: -28 to -14) */}
      <mesh position={[36, 1.6, -21]}>
        <boxGeometry args={[0.5, 3.2, 14]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>

      {/* 7. South Arm Inner Courtyard Wall (Glass & Slate) (X: -14 to 36, Z: -14) */}
      <group position={[11, 1.6, -14]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[50, 3.0, 0.1]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.35} transmission={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <boxGeometry args={[50.2, 0.15, 0.3]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* 8. West Spine Inner Courtyard Wall (X: -14, Z: -14 to 14) */}
      <group position={[-14, 1.6, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.1, 3.0, 28]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.35} transmission={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 2. INTERIOR PARTITION WALLS                                    */}
      {/* ============================================================== */}
      {/* Partition between PET Scan & MRI (West Spine Z: 11) */}
      <mesh position={[-25, 1.4, 11]}>
        <boxGeometry args={[22, 2.8, 0.3]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* Partition between MRI & Emergency CT (West Spine Z: -11) */}
      <mesh position={[-25, 1.4, -11]}>
        <boxGeometry args={[22, 2.8, 0.3]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* ============================================================== */}
      {/* 3. 3D MRI SCANNER & PET SCAN MACHINE EQUIPMENT MESHES           */}
      {/* ============================================================== */}
      {/* 3D MRI Scanner Gantry (Cylindrical Donut Ring in MRI Suite [-25, 0, 0]) */}
      <group position={[-25, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* MRI Donut Outer Ring */}
        <mesh>
          <torusGeometry args={[1.8, 0.7, 24, 48]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.1} metalness={0.2} />
        </mesh>
        {/* MRI Bore Inner Ring Glow */}
        <mesh>
          <cylinderGeometry args={[1.15, 1.15, 1.5, 32, 1, true]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
        </mesh>
        {/* MRI Control Console Tower */}
        <mesh position={[2.2, 0, 0]}>
          <boxGeometry args={[0.8, 2.2, 1.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>
      </group>

      {/* 3D PET Scanner Gantry Ring in PET Suite [-25, 0, 21] */}
      <group position={[-25, 1.5, 21]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <torusGeometry args={[1.6, 0.6, 24, 48]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.1} metalness={0.3} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[1.05, 1.05, 1.3, 32, 1, true]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  );
};
