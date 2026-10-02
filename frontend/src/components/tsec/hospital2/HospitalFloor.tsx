import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { mockZones } from './mockHospitalData';
import type { HospitalZoneId } from './types';

interface HospitalFloorProps {
  selectedZone: HospitalZoneId;
}

export const HospitalFloor: React.FC<HospitalFloorProps> = ({ selectedZone }) => {
  return (
    <group position={[0, 0, 0]}>
      {/* ================================================================= */}
      {/* 1. UNEVEN MULTI-WING FOUNDATION BASE SLABS (Light Neutral Gray)  */}
      {/* ================================================================= */}
      {/* NW ICU Wing Foundation Base Slab */}
      <mesh position={[-28, -0.3, 14]} receiveShadow>
        <boxGeometry args={[28, 0.6, 28]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Central Atrium & Triage Base Slab */}
      <mesh position={[0, -0.3, 9]} receiveShadow>
        <boxGeometry args={[28, 0.6, 38]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Shifted NE Exam Wing Base Slab (North offset wing) */}
      <mesh position={[30, -0.3, 20]} receiveShadow>
        <boxGeometry args={[32, 0.6, 28]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* SW Resuscitation Wing Base Slab */}
      <mesh position={[-28, -0.3, -18]} receiveShadow>
        <boxGeometry args={[28, 0.6, 24]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* SE Pharmacy & Ambulance Bay Base Slab */}
      <mesh position={[31, -0.3, -10]} receiveShadow>
        <boxGeometry args={[34, 0.6, 32]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* ================================================================= */}
      {/* 2. POLISHED WHITE LINOLEUM FLOOR TILES (Per Wing Section)         */}
      {/* ================================================================= */}
      {/* NW ICU Wing Floor */}
      <mesh position={[-28, 0.01, 14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[27.6, 27.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* Central Atrium Floor */}
      <mesh position={[0, 0.01, 9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[27.6, 37.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* Shifted NE Exam Wing Floor */}
      <mesh position={[30, 0.01, 20]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[31.6, 27.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* SW Resuscitation Wing Floor */}
      <mesh position={[-28, 0.01, -18]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[27.6, 23.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* SE Pharmacy & Ambulance Bay Floor */}
      <mesh position={[31, 0.01, -10]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[33.6, 31.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* ================================================================= */}
      {/* 3. INTER-WING MEDICAL CORRIDOR RUNNERS (Light Medical Blue)      */}
      {/* ================================================================= */}
      {/* Main East-West Corridor Runner */}
      <mesh position={[1, 0.02, 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 5]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.4} />
      </mesh>

      {/* Central North-South Atrium Runner */}
      <mesh position={[0, 0.02, 9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 36]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.4} />
      </mesh>

      {/* SW Resuscitation Access Corridor */}
      <mesh position={[-28, 0.02, -18]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 20]} />
        <meshStandardMaterial color="#ffe4e6" roughness={0.4} />
      </mesh>

      {/* SE Ambulance Driveway Access Corridor */}
      <mesh position={[39, 0.02, -14]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 20]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.4} />
      </mesh>

      {/* ================================================================= */}
      {/* 4. ZONE FLOOR HIGHLIGHT BOUNDARIES                                */}
      {/* ================================================================= */}
      {mockZones.map((zone) => {
        const isHighlighted = selectedZone === 'all' || selectedZone === zone.id;
        const width = zone.bounds.maxX - zone.bounds.minX;
        const depth = zone.bounds.maxZ - zone.bounds.minZ;
        const opacity = isHighlighted ? 0.18 : 0.04;

        return (
          <group key={zone.id} position={[zone.center[0], 0.03, zone.center[2]]}>
            {/* Zone Floor Tint */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[width, depth]} />
              <meshBasicMaterial color={zone.color} transparent opacity={opacity} />
            </mesh>

            {/* Zone Perimeter Outline */}
            <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
              <edgesGeometry args={[new THREE.PlaneGeometry(width, depth)]} />
              <lineBasicMaterial
                color={zone.color}
                transparent
                opacity={isHighlighted ? 0.8 : 0.25}
                linewidth={2}
              />
            </lineSegments>
          </group>
        );
      })}

      {/* ================================================================= */}
      {/* 5. ROOM NAME LABELS - NON-OVERLAPPING BADGES                       */}
      {/* ================================================================= */}
      {mockZones.map((zone) => (
        <Html
          key={`label-${zone.id}`}
          position={zone.labelPosition}
          center
          zIndexRange={[80, 0]}
        >
          <div
            className={`px-3 py-1.5 rounded-xl font-black text-[11px] sm:text-xs shadow-xl tracking-wider uppercase transition-all duration-300 pointer-events-none select-none border-2 whitespace-nowrap backdrop-blur-md ${
              selectedZone === zone.id
                ? 'bg-sky-600 text-white border-sky-300 ring-4 ring-sky-500/30 scale-110 shadow-sky-500/50'
                : selectedZone === 'all'
                ? 'bg-slate-900/90 text-white border-slate-700 shadow-slate-900/50'
                : 'bg-white/90 text-slate-700 border-slate-300 opacity-60'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shadow-md shrink-0"
                style={{ backgroundColor: zone.color }}
              />
              <span className="font-sans font-black whitespace-nowrap">{zone.shortName}</span>
            </div>
          </div>
        </Html>
      ))}
    </group>
  );
};
