import React, { useRef, useState } from 'react';
import { Group } from 'three';
import { Html } from '@react-three/drei';
import type { HospitalBedData } from './types';
import { bedStatusMap } from './bedStatusConfig';

interface HospitalBedProps {
  bed: HospitalBedData;
  isSelected: boolean;
  isFilteredOut: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onHover: (id: string | null) => void;
}

export const HospitalBed: React.FC<HospitalBedProps> = ({
  bed,
  isSelected,
  isFilteredOut,
  onSelect,
  onDoubleClick,
  onHover
}) => {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  const statusConfig = bedStatusMap[bed.status] || bedStatusMap.available;
  const statusColor = statusConfig.hexColor;

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered(true);
    onHover(bed.id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHover(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    onSelect(bed.id);
  };

  const handleDoubleClick = (e: any) => {
    e.stopPropagation();
    onDoubleClick(bed.id);
  };

  const isNICU = bed.zone === 'nicu';
  const isScanCouch = bed.zone === 'mri' || bed.zone === 'pet_scan';
  const opacity = isFilteredOut ? 0.2 : 1.0;

  return (
    <group
      ref={groupRef}
      position={[bed.position[0], isSelected ? bed.position[1] + 0.4 : bed.position[1], bed.position[2]]}
      rotation={[0, bed.rotation || 0, 0]}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* 1. SELECTION BLUE GLOWING BASE PLATE & RINGS */}
      {isSelected && (
        <group position={[0, -0.05, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.5, 6.0]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[3.0, 3.6, 32]} />
            <meshBasicMaterial color="#0284c7" transparent opacity={0.7} />
          </mesh>
        </group>
      )}

      {/* Hover Light Aura */}
      {hovered && !isSelected && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.2, 5.5]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.3} />
        </mesh>
      )}

      {/* GROUND SHADOW */}
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 5.2]} />
        <meshBasicMaterial color="#020617" transparent opacity={0.5} />
      </mesh>

      {/* SPECIALIZED BED / INCUBATOR / SCANNER TABLE MODEL */}
      {isNICU ? (
        /* SPECIALIZED NICU INFANT INCUBATOR MODEL */
        <group position={[0, 0, 0]}>
          {/* Base Stand */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[2.2, 0.7, 3.2]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} transparent={isFilteredOut} opacity={opacity} />
          </mesh>
          {/* Transparent Acrylic Glass Canopy Dome */}
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[2.0, 0.8, 2.8]} />
            <meshPhysicalMaterial color="#a7f3d0" transparent opacity={0.4} transmission={0.9} roughness={0.1} />
          </mesh>
          {/* Infant Mattress */}
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[1.6, 0.15, 2.4]} />
            <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.3} />
          </mesh>
          {/* Warming Lamp Hood */}
          <mesh position={[0, 1.8, 0]}>
            <boxGeometry args={[1.8, 0.15, 1.2]} />
            <meshStandardMaterial color="#8b5cf6" />
          </mesh>
        </group>
      ) : isScanCouch ? (
        /* MOTORIZED SCANNER COUCH TABLE MODEL */
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[2.4, 0.5, 4.8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} transparent={isFilteredOut} opacity={opacity} />
          </mesh>
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[2.2, 0.18, 4.4]} />
            <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.35} />
          </mesh>
        </group>
      ) : (
        /* STANDARD DIAGNOSTIC / INFUSION BED MODEL */
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[3.0, 0.2, 4.8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} transparent={isFilteredOut} opacity={opacity} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[2.8, 0.3, 4.6]} />
            <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 0.75, -2.1]}>
            <boxGeometry args={[2.8, 0.3, 0.8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.7} />
          </mesh>
        </group>
      )}

      {/* FLOATING BED BADGE */}
      <Html
        position={[0, 2.5, 0]}
        center
        distanceFactor={26}
        zIndexRange={[100, 0]}
      >
        <div
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl shadow-2xl transition-all duration-200 cursor-pointer select-none border backdrop-blur-md ${
            isSelected
              ? 'bg-slate-950 text-white border-sky-400 ring-4 ring-sky-500/50 scale-110 font-bold'
              : hovered
              ? 'bg-slate-950/95 text-white border-slate-600 scale-105'
              : 'bg-slate-950/90 text-slate-100 border-slate-800 hover:border-slate-700'
          }`}
          style={{ opacity: isFilteredOut ? 0.3 : 1.0 }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block animate-pulse shadow-sm"
              style={{ backgroundColor: statusColor }}
            />
            <span className="font-mono text-xs font-black tracking-wider text-white">
              {bed.id}
            </span>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
            {statusConfig.label}
          </span>
        </div>
      </Html>
    </group>
  );
};
