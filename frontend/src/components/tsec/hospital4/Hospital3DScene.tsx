import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useHospitalBeds } from './HospitalBedContext';
import { HospitalFloor } from './HospitalFloor';
import { HospitalRoom } from './HospitalRoom';
import { HospitalBed } from './HospitalBed';
import { mockZones } from './mockHospitalData';
import type { HospitalZoneId } from './types';

const CameraController: React.FC<{ selectedZone: HospitalZoneId; isDrawerOpen: boolean }> = ({
  selectedZone,
  isDrawerOpen
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (selectedZone === 'all') {
      const yPos = isDrawerOpen ? 58 : 50;
      const zPos = isDrawerOpen ? 68 : 60;
      camera.position.set(0, yPos, zPos);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    } else {
      const zoneObj = mockZones.find((z) => z.id === selectedZone);
      if (zoneObj && controlsRef.current) {
        const [cx, cy, cz] = zoneObj.center;
        camera.position.set(cx + 14, cy + 26, cz + 28);
        controlsRef.current.target.set(cx, cy, cz);
        controlsRef.current.update();
      }
    }
  }, [selectedZone, isDrawerOpen, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      panSpeed={0.7}
      minDistance={15}
      maxDistance={110}
      minPolarAngle={Math.PI / 12}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
};

export const Hospital3DScene: React.FC = () => {
  const {
    beds,
    selectedBedId,
    isDrawerOpen,
    selectedZone,
    selectedStatusFilter,
    searchQuery,
    setSelectedBedId,
    openBedDetails,
    setHoveredBedId
  } = useHospitalBeds();

  const filteredBedIds = React.useMemo(() => {
    return beds
      .filter((bed) => {
        if (selectedZone !== 'all' && bed.zone !== selectedZone) {
          return false;
        }
        if (selectedStatusFilter !== 'all' && bed.status !== selectedStatusFilter) {
          return false;
        }
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchId = bed.id.toLowerCase().includes(q);
          const matchZone = bed.zoneName.toLowerCase().includes(q);
          const matchStaff = bed.assignedStaff?.toLowerCase().includes(q);
          const matchPatient = bed.patientName?.toLowerCase().includes(q);
          if (!matchId && !matchZone && !matchStaff && !matchPatient) {
            return false;
          }
        }
        return true;
      })
      .map((b) => b.id);
  }, [beds, selectedZone, selectedStatusFilter, searchQuery]);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gradient-to-b from-slate-100 via-cyan-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 select-none transition-colors">
      <Canvas
        camera={{ position: [0, 50, 60], fov: 42 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedBedId(null);
          }
        }}
      >
        <ambientLight intensity={1.3} color="#ffffff" />
        <directionalLight
          position={[40, 65, 35]}
          intensity={1.4}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={140}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />

        <pointLight position={[-25, 18, 15]} intensity={0.6} color="#06b6d4" />
        <pointLight position={[25, 18, 15]} intensity={0.6} color="#8b5cf6" />
        <pointLight position={[0, 18, -15]} intensity={0.4} color="#10b981" />

        <CameraController selectedZone={selectedZone} isDrawerOpen={isDrawerOpen} />
        <HospitalFloor selectedZone={selectedZone} />
        <HospitalRoom />

        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.35}
          scale={110}
          blur={2.5}
          far={15}
        />

        {beds.map((bed) => {
          const isSelected = bed.id === selectedBedId;
          const isFilteredOut = !filteredBedIds.includes(bed.id);

          return (
            <HospitalBed
              key={bed.id}
              bed={bed}
              isSelected={isSelected}
              isFilteredOut={isFilteredOut}
              onSelect={(id) => setSelectedBedId(id)}
              onDoubleClick={(id) => openBedDetails(id)}
              onHover={(id) => setHoveredBedId(id)}
            />
          );
        })}
      </Canvas>

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 pointer-events-none shadow-md">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
        <span>Single-Click: Select Bed</span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <span className="text-cyan-600 dark:text-cyan-400 font-bold">Double-Click: Open Details Drawer</span>
      </div>
    </div>
  );
};
