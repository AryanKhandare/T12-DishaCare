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
      {/* 1. C-SHAPED FOUNDATION BASE SLABS                                 */}
      {/* ================================================================= */}
      {/* West Spine Slab (X: -36 to -14, Z: -28 to 28) */}
      <mesh position={[-25, -0.3, 0]} receiveShadow>
        <boxGeometry args={[22, 0.6, 56]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* North Arm Slab (X: -14 to 36, Z: 14 to 28) */}
      <mesh position={[11, -0.3, 21]} receiveShadow>
        <boxGeometry args={[50, 0.6, 14]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* South Arm Slab (X: -14 to 36, Z: -28 to -14) */}
      <mesh position={[11, -0.3, -21]} receiveShadow>
        <boxGeometry args={[50, 0.6, 14]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* ================================================================= */}
      {/* 2. POLISHED FLOOR TILES & CENTRAL COURTYARD GARDEN                */}
      {/* ================================================================= */}
      {/* West Spine Floor */}
      <mesh position={[-25, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[21.6, 55.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* North Arm Floor */}
      <mesh position={[11, 0.01, 21]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[49.6, 13.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* South Arm Floor */}
      <mesh position={[11, 0.01, -21]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[49.6, 13.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
      </mesh>

      {/* Central Open Courtyard Healing Garden (Center of the C) */}
      <mesh position={[11, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[48, 26]} />
        <meshStandardMaterial color="#0f766e" roughness={0.7} />
      </mesh>
      {/* Courtyard Walkway Perimeter Accent */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[11, 0.02, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(48, 26)]} />
        <lineBasicMaterial color="#2dd4bf" linewidth={3} />
      </lineSegments>

      {/* ================================================================= */}
      {/* 3. C-SHAPED MEDICAL CORRIDOR RUNNERS                              */}
      {/* ================================================================= */}
      {/* West Spine Corridor */}
      <mesh position={[-25, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 54]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.4} />
      </mesh>

      {/* North Arm Corridor */}
      <mesh position={[11, 0.02, 21]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[48, 5]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.4} />
      </mesh>

      {/* South Arm Corridor */}
      <mesh position={[11, 0.02, -21]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[48, 5]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.4} />
      </mesh>

      {/* ================================================================= */}
      {/* 4. ZONE HIGHLIGHT BOUNDARIES                                      */}
      {/* ================================================================= */}
      {mockZones.map((zone) => {
        const isHighlighted = selectedZone === 'all' || selectedZone === zone.id;
        const width = zone.bounds.maxX - zone.bounds.minX;
        const depth = zone.bounds.maxZ - zone.bounds.minZ;
        const opacity = isHighlighted ? 0.18 : 0.04;

        return (
          <group key={zone.id} position={[zone.center[0], 0.03, zone.center[2]]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[width, depth]} />
              <meshBasicMaterial color={zone.color} transparent opacity={opacity} />
            </mesh>
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
