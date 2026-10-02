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

// Camera Controller Component for responsive framing & zone focus
const CameraController: React.FC<{ selectedZone: HospitalZoneId; isDrawerOpen: boolean }> = ({
  selectedZone,
  isDrawerOpen
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    if (selectedZone === 'all') {
      const yPos = isDrawerOpen ? 48 : 44;
      const zPos = isDrawerOpen ? 58 : 52;
      camera.position.set(0, yPos, zPos);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    } else {
      const zoneObj = mockZones.find((z) => z.id === selectedZone);
      if (zoneObj && controlsRef.current) {
        const [cx, cy, cz] = zoneObj.center;
        camera.position.set(cx + 12, cy + 24, cz + 26);
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
      maxDistance={95}
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

  // Filter logic for beds based on active zone, status filter & search query
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
    <div className="relative w-full h-full min-h-[500px] bg-gradient-to-b from-slate-100 via-sky-50 to-slate-100 rounded-2xl overflow-hidden shadow-xl border border-slate-200 select-none">
      {/* 3D Canvas Container - Bright Light Healthcare Atmosphere */}
      <Canvas
        camera={{ position: [0, 44, 52], fov: 42 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedBedId(null);
          }
        }}
      >
        {/* Bright Studio Healthcare Lighting */}
        <ambientLight intensity={1.3} color="#ffffff" />
        <directionalLight
          position={[35, 60, 30]}
          intensity={1.4}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={120}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />

        {/* Crisp Fill Lights */}
        <pointLight position={[-20, 15, 10]} intensity={0.5} color="#38bdf8" />
        <pointLight position={[20, 15, 10]} intensity={0.5} color="#8b5cf6" />
        <pointLight position={[0, 15, -10]} intensity={0.4} color="#10b981" />

        {/* Camera Controller & Orbit Limits */}
        <CameraController selectedZone={selectedZone} isDrawerOpen={isDrawerOpen} />

        {/* 3D Hospital Floor & Zone Outlines */}
        <HospitalFloor selectedZone={selectedZone} />

        {/* 3D Hospital Architecture Walls & Rooms */}
        <HospitalRoom />

        {/* Soft Contact Shadows on Floor */}
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.35}
          scale={100}
          blur={2.5}
          far={15}
        />

        {/* Interactive Hospital Beds */}
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

      {/* Floating Guidance Badge */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 text-[11px] font-medium text-slate-700 pointer-events-none shadow-md">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Single-Click: Select Bed</span>
        <span className="text-slate-300">•</span>
        <span className="text-sky-600 font-bold">Double-Click: Open Details Drawer</span>
      </div>
    </div>
  );
};
