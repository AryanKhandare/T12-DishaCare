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
      {/* 1. L-SHAPED FOUNDATION BASE SLABS (Light Neutral Gray)           */}
      {/* ================================================================= */}
      {/* Vertical Arm Base Slab (West Wing: X [-36, -8], Z [-28, 28]) */}
      <mesh position={[-22, -0.3, 0]} receiveShadow>
        <boxGeometry args={[28, 0.6, 56]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Horizontal Arm Base Slab (South Wing: X [-8, 36], Z [-28, -4]) */}
      <mesh position={[14, -0.3, -16]} receiveShadow>
        <boxGeometry args={[44, 0.6, 24]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* ================================================================= */}
      {/* 2. POLISHED WHITE LINOLEUM FLOOR TILES (L-Shape Planes)          */}
      {/* ================================================================= */}
      {/* Vertical Arm Floor */}
      <mesh position={[-22, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[27.6, 55.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* Horizontal Arm Floor */}
      <mesh position={[14, 0.01, -16]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[43.6, 23.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* ================================================================= */}
      {/* 3. L-SHAPED MEDICAL CORRIDOR RUNNERS (Light Medical Blue)         */}
      {/* ================================================================= */}
      {/* Vertical Corridor Runner */}
      <mesh position={[-22, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 54]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.4} />
      </mesh>

      {/* Horizontal Corridor Runner */}
      <mesh position={[7, 0.02, -16]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[56, 5]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.4} />
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
