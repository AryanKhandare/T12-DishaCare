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
      {/* 1. Main Hospital Foundation Base Slab (Light Neutral) */}
      <mesh position={[0, -0.3, 0]} receiveShadow>
        <boxGeometry args={[86, 0.6, 62]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Polished White Linoleum Hospital Tile Floor */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[84, 60]} />
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.2}
          metalness={0.05}
        />
      </mesh>

      {/* Main Central Corridor Pathways (Light Medical Blue Runner) */}
      <mesh position={[-16, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 58]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.4} />
      </mesh>
      
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 8]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.4} />
      </mesh>

      {/* Zone Floor Accents & Ground Highlight Boundaries */}
      {mockZones.map((zone) => {
        const isHighlighted = selectedZone === 'all' || selectedZone === zone.id;
        const width = zone.bounds.maxX - zone.bounds.minX;
        const depth = zone.bounds.maxZ - zone.bounds.minZ;
        const opacity = isHighlighted ? 0.18 : 0.04;

        return (
          <group key={zone.id} position={[zone.center[0], 0.03, zone.center[2]]}>
            {/* Zone Floor Plate (Pastel Tint) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[width, depth]} />
              <meshBasicMaterial
                color={zone.color}
                transparent
                opacity={opacity}
              />
            </mesh>

            {/* Zone Perimeter Border Outline */}
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
      {/* WARD NAME LABELS (HIGH-CONTRAST LIGHT MEDICAL BADGES) */}
      {/* ================================================================= */}
      {mockZones.map((zone) => (
        <Html
          key={`label-${zone.id}`}
          position={zone.labelPosition}
          center
          zIndexRange={[80, 0]}
        >
          <div
            className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm shadow-xl tracking-widest uppercase transition-all duration-300 pointer-events-none select-none border-2 ${
              selectedZone === zone.id
                ? 'bg-sky-600 text-white border-sky-300 ring-4 ring-sky-500/30 scale-105'
                : selectedZone === 'all'
                ? 'bg-slate-900 text-white border-slate-700 shadow-slate-300'
                : 'bg-white/90 text-slate-700 border-slate-300 opacity-70'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full inline-block shadow-md shrink-0"
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
