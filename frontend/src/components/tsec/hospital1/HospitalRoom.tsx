import React from 'react';

export const HospitalRoom: React.FC = () => {
  return (
    <group position={[0, 0, 0]}>
      {/* ============================================================== */}
      {/* 1. LIGHT HOSPITAL EXTERIOR BOUNDARY WALLS */}
      {/* ============================================================== */}
      {/* North Wall (Back) */}
      <mesh position={[0, 1.6, -28]}>
        <boxGeometry args={[84, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      {/* South Wall (Front) */}
      <mesh position={[0, 1.6, 28]}>
        <boxGeometry args={[84, 3.2, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      {/* West Wall (Left) */}
      <mesh position={[-42, 1.6, 0]}>
        <boxGeometry args={[0.5, 3.2, 56]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      {/* East Wall (Right) */}
      <mesh position={[42, 1.6, 0]}>
        <boxGeometry args={[0.5, 3.2, 56]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>

      {/* Wall Top Cyan Trim Accent Rail */}
      <mesh position={[0, 3.22, -28]}>
        <boxGeometry args={[84, 0.1, 0.55]} />
        <meshBasicMaterial color="#0284c7" />
      </mesh>

      {/* ============================================================== */}
      {/* 2. INTERIOR PARTITION WALLS & ROOM DIVIDERS */}
      {/* ============================================================== */}
      {/* Divider between Ambulance Bay & Triage Zone */}
      <mesh position={[-26.5, 1.4, 16]}>
        <boxGeometry args={[0.3, 2.8, 22]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* Divider between Triage Zone & Center Corridor */}
      <mesh position={[-10, 1.4, 0]}>
        <boxGeometry args={[0.4, 2.8, 55]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* Divider between Center Zone & ICU/Pharmacy */}
      <mesh position={[16, 1.4, 0]}>
        <boxGeometry args={[0.4, 2.8, 55]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* Divider separating South Corridor (Resus & Pharmacy) */}
      <mesh position={[0, 1.4, -4.5]}>
        <boxGeometry args={[82, 2.8, 0.4]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      {/* Examination Rooms Individual Partition Walls */}
      {[-9, 3, 15].map((x, idx) => (
        <mesh key={`exam-wall-${idx}`} position={[x, 1.4, 16]}>
          <boxGeometry args={[0.3, 2.8, 22]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
        </mesh>
      ))}

      {/* Glass Windows for Examination Rooms */}
      {[-9, 3, 15].map((x, idx) => (
        <mesh key={`exam-glass-${idx}`} position={[x, 2.4, 16]}>
          <boxGeometry args={[0.1, 0.8, 20]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            transparent
            opacity={0.4}
            roughness={0.1}
            transmission={0.9}
          />
        </mesh>
      ))}

      {/* ============================================================== */}
      {/* 3. ICU SPECIALIZED GLASS ENCLOSURES & GANTRIES */}
      {/* ============================================================== */}
      {/* ICU Glass Perimeter Partition Enclosure */}
      <mesh position={[28, 1.4, 26.5]}>
        <boxGeometry args={[22, 2.8, 0.2]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          transparent
          opacity={0.3}
          roughness={0.1}
        />
      </mesh>

      {/* Overhead Medical Equipment Monitor Gantry (ICU) */}
      <mesh position={[28, 3.0, 16]}>
        <boxGeometry args={[20, 0.2, 0.2]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} />
      </mesh>

      {/* ============================================================== */}
      {/* 4. TRIAGE RECEPTION & WAITING AREA FURNITURE */}
      {/* ============================================================== */}
      {/* Triage Reception Desk Counter (Clean White & Blue Accent) */}
      <group position={[-18, 0.6, 5]}>
        <mesh>
          <boxGeometry args={[6.5, 1.2, 1.5]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        {/* Desk Countertop Accent */}
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[6.7, 0.1, 1.6]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        {/* Computer Screen */}
        <mesh position={[-1.5, 1.0, 0]}>
          <boxGeometry args={[0.8, 0.5, 0.08]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
        <mesh position={[1.5, 1.0, 0]}>
          <boxGeometry args={[0.8, 0.5, 0.08]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* Waiting Area Lounge Sofas (Hospital Blue/Slate) */}
      {[-22, -16, -10].map((z, i) => (
        <group key={`sofa-${i}`} position={[-26, 0.45, z]}>
          {/* Seat Cushion */}
          <mesh>
            <boxGeometry args={[6.0, 0.4, 1.2]} />
            <meshStandardMaterial color="#0284c7" roughness={0.6} />
          </mesh>
          {/* Sofa Backrest */}
          <mesh position={[0, 0.45, -0.5]}>
            <boxGeometry args={[6.0, 0.6, 0.2]} />
            <meshStandardMaterial color="#0369a1" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* ============================================================== */}
      {/* 5. PHARMACY SERVICE COUNTER & SHELVING */}
      {/* ============================================================== */}
      <group position={[28, 0, -16]}>
        {/* Pharmacy Main Service Counter */}
        <mesh position={[0, 0.6, 4]}>
          <boxGeometry args={[14, 1.2, 1.4]} />
          <meshStandardMaterial color="#10b981" roughness={0.3} />
        </mesh>
        {/* Glass Dispensing Bay Screen */}
        <mesh position={[0, 1.6, 4]}>
          <boxGeometry args={[13, 0.8, 0.08]} />
          <meshPhysicalMaterial
            color="#a7f3d0"
            transparent
            opacity={0.5}
            transmission={0.9}
          />
        </mesh>
        {/* Medicine Storage Shelves (Back Wall) */}
        {[-5, 0, 5].map((x, idx) => (
          <group key={`shelf-${idx}`} position={[x, 1.4, -7]}>
            <mesh>
              <boxGeometry args={[3.8, 2.8, 0.8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ============================================================== */}
      {/* 6. AMBULANCE BAY & 3D AMBULANCE VEHICLE */}
      {/* ============================================================== */}
      <group position={[-34, 0, 16]}>
        {/* Driveway Striping Markings */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <planeGeometry args={[10, 18]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.25} />
        </mesh>

        {/* 3D Stylized Emergency Ambulance Vehicle */}
        <group position={[0, 0.9, 0]} rotation={[0, Math.PI / 2, 0]}>
          {/* Main Body Chassis */}
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[5.8, 2.2, 2.5]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          {/* Red Emergency Stripe */}
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[5.82, 0.48, 2.52]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
          {/* Ambulance Front Cab Windows */}
          <mesh position={[2.2, 1.25, 0]}>
            <boxGeometry args={[1.3, 0.85, 2.46]} />
            <meshStandardMaterial color="#0f172a" roughness={0.1} />
          </mesh>
          {/* Emergency Flashing Beacon Light Bar */}
          <mesh position={[0.7, 1.9, 0]}>
            <boxGeometry args={[1.2, 0.22, 1.8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      </group>
    </group>
  );
};
