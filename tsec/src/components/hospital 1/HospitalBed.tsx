import React, { useRef, useState } from 'react';
import { Group } from 'three';
import { Html } from '@react-three/drei';
import type { HospitalBedData } from './types';
import { bedStatusConfig } from './bedStatusConfig';

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

  const statusConfig = bedStatusConfig[bed.status] || bedStatusConfig.available;
  const statusColor = statusConfig.hexColor;
  const glowColor = statusConfig.glowColor;

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHovered.call(null, true);
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

  // REALISTIC & ENLARGED HOSPITAL BED DIMENSIONS
  const isICU = bed.zone === 'icu';
  const isResus = bed.zone === 'resuscitation';
  const bedWidth = isICU ? 3.6 : 3.2;
  const bedLength = isICU ? 5.4 : 5.0;
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
            <planeGeometry args={[bedWidth + 1.6, bedLength + 1.6]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[bedLength * 0.55, bedLength * 0.65, 32]} />
            <meshBasicMaterial color="#0284c7" transparent opacity={0.7} />
          </mesh>
        </group>
      )}

      {/* Hover Light Aura */}
      {hovered && !isSelected && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[bedWidth + 1.0, bedLength + 1.0]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0.3} />
        </mesh>
      )}

      {/* Ground Zone Shadow accent */}
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[bedWidth + 0.6, bedLength + 0.6]} />
        <meshBasicMaterial color="#020617" transparent opacity={0.5} />
      </mesh>

      {/* 2. LOWER STAINLESS STEEL BASE FRAME & ACTUATORS */}
      {/* Heavy Wheel Base Beams */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[bedWidth - 0.2, 0.18, bedLength - 0.4]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.8}
          roughness={0.2}
          transparent={isFilteredOut}
          opacity={opacity}
        />
      </mesh>

      {/* Central Hydraulic Lift Columns */}
      {[-bedLength * 0.22, bedLength * 0.22].map((z, i) => (
        <mesh key={`lift-${i}`} position={[0, 0.5, z]}>
          <cylinderGeometry args={[0.22, 0.26, 0.4, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* 3. FOUR HEAVY HOSPITAL CASTER WHEELS WITH RUBBER TIRES */}
      {[-bedWidth / 2 + 0.35, bedWidth / 2 - 0.35].map((x, i) =>
        [-bedLength / 2 + 0.45, bedLength / 2 - 0.45].map((z, j) => (
          <group key={`wheel-unit-${i}-${j}`} position={[x, 0.16, z]}>
            {/* Swivel Fork */}
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.16, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
            {/* Rubber Wheel Tire */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.12, 16]} />
              <meshStandardMaterial color="#020617" roughness={0.9} />
            </mesh>
          </group>
        ))
      )}

      {/* 4. UPPER DECK BED FRAME */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[bedWidth, 0.14, bedLength]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.7}
          roughness={0.3}
          transparent={isFilteredOut}
          opacity={opacity}
        />
      </mesh>

      {/* 5. ARTICULATED TWO-PIECE MATTRESS (HEADREST ELEVATED AT ANGLE!) */}
      {/* Lower Flat Body Mattress (Legs/Torso) */}
      <mesh position={[0, 0.94, bedLength * 0.12]}>
        <boxGeometry args={[bedWidth - 0.2, 0.32, bedLength * 0.65]} />
        <meshStandardMaterial
          color={statusColor}
          roughness={0.5}
          metalness={0.1}
          emissive={statusColor}
          emissiveIntensity={isSelected ? 0.45 : hovered ? 0.35 : 0.22}
          transparent={isFilteredOut}
          opacity={opacity}
        />
      </mesh>

      {/* Elevated Headrest Section Mattress (Tilted slightly upward like a real hospital bed!) */}
      <group position={[0, 0.94, -bedLength * 0.26]} rotation={[-Math.PI / 14, 0, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[bedWidth - 0.2, 0.32, bedLength * 0.38]} />
          <meshStandardMaterial
            color={statusColor}
            roughness={0.5}
            metalness={0.1}
            emissive={statusColor}
            emissiveIntensity={isSelected ? 0.45 : hovered ? 0.35 : 0.22}
            transparent={isFilteredOut}
            opacity={opacity}
          />
        </mesh>
        {/* Crisp White Linen Blanket Draped on Mattress */}
        <mesh position={[0, 0.2, 0.1]}>
          <boxGeometry args={[bedWidth - 0.24, 0.2, bedLength * 0.32]} />
          <meshStandardMaterial
            color="#f8fafc"
            roughness={0.7}
            transparent={isFilteredOut}
            opacity={opacity}
          />
        </mesh>
        {/* Soft Ergonomic White Pillow */}
        <mesh position={[0, 0.34, -bedLength * 0.1]}>
          <boxGeometry args={[bedWidth - 0.6, 0.18, 0.9]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.8}
            transparent={isFilteredOut}
            opacity={opacity}
          />
        </mesh>
      </group>

      {/* 6. MOLDED COMPOSITE HEADBOARD WITH STAINLESS PUSH HANDLES */}
      <group position={[0, 1.35, -bedLength / 2 + 0.12]}>
        {/* Main Molded Panel */}
        <mesh>
          <boxGeometry args={[bedWidth + 0.1, 1.1, 0.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Dark Slate Accent Trim */}
        <mesh position={[0, 0.1, 0.02]}>
          <boxGeometry args={[bedWidth - 0.4, 0.7, 0.14]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Stainless Steel Push Bar Handle */}
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[bedWidth - 0.6, 0.08, 0.12]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
        </mesh>
        {/* Embedded LED Status Strip Light */}
        <mesh position={[0, -0.45, 0.09]}>
          <boxGeometry args={[bedWidth - 0.4, 0.1, 0.04]} />
          <meshBasicMaterial color={glowColor} />
        </mesh>
      </group>

      {/* 7. MOLDED COMPOSITE FOOTBOARD */}
      <group position={[0, 1.1, bedLength / 2 - 0.12]}>
        <mesh>
          <boxGeometry args={[bedWidth + 0.1, 0.8, 0.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Chart Holder Pocket on Footboard */}
        <mesh position={[0, 0, 0.09]}>
          <boxGeometry args={[bedWidth * 0.4, 0.4, 0.04]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      {/* 8. SPLIT METALLIC SAFETY GUARD RAILS (UPPER & LOWER PAIRS) */}
      {[-bedWidth / 2 + 0.06, bedWidth / 2 - 0.06].map((x, idx) => (
        <group key={`rails-side-${idx}`}>
          {/* Upper Rail (Head section) */}
          <group position={[x, 1.15, -bedLength * 0.15]}>
            <mesh>
              <boxGeometry args={[0.08, 0.45, bedLength * 0.36]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.04, 0.04, bedLength * 0.36, 12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
            </mesh>
          </group>
          {/* Lower Rail (Foot section) */}
          <group position={[x, 1.05, bedLength * 0.2]}>
            <mesh>
              <boxGeometry args={[0.08, 0.4, bedLength * 0.32]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.2} />
            </mesh>
          </group>
        </group>
      ))}

      {/* 9. SPECIALIZED MEDICAL ACCESSORIES (IV POLE & VITALS MONITOR) */}
      {(isICU || isResus) && (
        <group position={[bedWidth / 2 + 0.6, 0, -bedLength / 2 + 0.5]}>
          {/* Heavy Duty Stainless Steel IV Pole */}
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 3.2, 12]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Dual IV Fluid Bags */}
          <mesh position={[-0.15, 2.9, 0]}>
            <boxGeometry args={[0.25, 0.5, 0.2]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0.15, 2.9, 0]}>
            <boxGeometry args={[0.25, 0.5, 0.2]} />
            <meshStandardMaterial color="#e0f2fe" transparent opacity={0.85} />
          </mesh>

          {/* Vitals Telemetry Monitor Stand with Articulated Swivel Arm */}
          <group position={[-0.25, 1.6, -0.6]}>
            {/* Vertical Support Column */}
            <mesh>
              <boxGeometry args={[0.5, 1.5, 0.4]} />
              <meshStandardMaterial color="#020617" roughness={0.3} />
            </mesh>
            {/* Glowing Vital Signs ECG Screen */}
            <mesh position={[0, 0.3, 0.21]}>
              <boxGeometry args={[0.46, 0.42, 0.04]} />
              <meshBasicMaterial color={isICU ? '#10b981' : '#38bdf8'} />
            </mesh>
          </group>
        </group>
      )}

      {/* ================================================================= */}
      {/* FLOATING BED BADGE (HIGH CONTRAST & READABLE) */}
      {/* ================================================================= */}
      <Html
        position={[0, 2.6, 0]}
        center
        distanceFactor={26}
        zIndexRange={[100, 0]}
      >
        <div
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          className={`flex flex-col items-center justify-center px-3.5 py-1.5 rounded-xl shadow-2xl transition-all duration-200 cursor-pointer select-none border backdrop-blur-md ${
            isSelected
              ? 'bg-slate-950 text-white border-sky-400 ring-4 ring-sky-500/50 scale-110 font-bold'
              : hovered
              ? 'bg-slate-950/95 text-white border-slate-600 scale-105'
              : 'bg-slate-950/90 text-slate-100 border-slate-800 hover:border-slate-700'
          }`}
          style={{ opacity: isFilteredOut ? 0.3 : 1.0 }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full inline-block animate-pulse shadow-sm"
              style={{ backgroundColor: statusColor }}
            />
            <span className="font-mono text-sm font-black tracking-wider text-white">
              {bed.id}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
            {statusConfig.label}
          </span>
        </div>
      </Html>

      {/* Desktop Hover Quick Info Tag */}
      {hovered && !isSelected && (
        <Html
          position={[0, 3.4, 0]}
          center
          distanceFactor={22}
          zIndexRange={[200, 100]}
        >
          <div className="bg-slate-950/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs w-52 backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-1 mb-1.5">
              <span className="font-mono text-sky-400 text-base">{bed.id}</span>
              <span
                className="text-[11px] px-2 py-0.5 rounded font-semibold text-white uppercase"
                style={{ backgroundColor: statusColor }}
              >
                {statusConfig.label}
              </span>
            </div>
            <div className="text-[12px] text-slate-300 space-y-0.5">
              <div>
                <span className="text-slate-400">Zone:</span> {bed.zoneName}
              </div>
              <div>
                <span className="text-slate-400">Type:</span> {bed.type}
              </div>
              {bed.patientName && (
                <div className="text-emerald-300 font-medium">
                  Patient: {bed.patientName}
                </div>
              )}
            </div>
            <div className="mt-2 text-[11px] text-sky-400 font-bold border-t border-slate-800 pt-1 text-center">
              Double-click for details
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
