import React from 'react';
import { HospitalBedProvider } from './HospitalBedContext';
import { HospitalCapacity } from './HospitalCapacity';
import { HospitalControls } from './HospitalControls';
import { Hospital3DScene } from './Hospital3DScene';
import { BedDetailsPanel } from './BedDetailsPanel';
import { BedStatusLegend } from './BedStatusLegend';
import { RecentActivityPanel } from './RecentActivityPanel';
import type { UserMode } from './types';

export interface Hospital3DViewProps {
  mode?: UserMode;
  onBedSelect?: (bedId: string | null) => void;
  className?: string;
}

const Hospital3DContent: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 font-sans text-slate-900 dark:text-slate-100 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Top Header Branding Banner */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black shadow-md shadow-emerald-500/20 font-mono">
              H3
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
              Hospital 3 <span className="text-emerald-600 dark:text-emerald-400 font-sans text-lg font-bold">(St. Jude L-Wing Complex)</span>
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">
            L-Shaped Emergency Medical Wing, Surgical Recovery & Pediatric Command Center
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-extrabold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            L-Shape Architecture Active
          </span>
        </div>
      </header>

      {/* 1. Dynamic Hospital Capacity Summary Cards */}
      <HospitalCapacity />

      {/* 2. Interactive Controls & Filters Toolbar */}
      <HospitalControls />

      {/* 3. Main 3D Hospital Stage & Responsive Details Panel Container */}
      <div className="flex flex-col lg:flex-row items-stretch gap-4 h-[580px] sm:h-[650px] lg:h-[720px] relative mb-6">
        {/* 3D Scene Viewport */}
        <div className="flex-1 h-full min-w-0 relative">
          <Hospital3DScene />
        </div>

        {/* Selected Bed Details Inspector Drawer */}
        <BedDetailsPanel />
      </div>

      {/* 4. Bottom Grid: Legend & Recent Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BedStatusLegend />
        <RecentActivityPanel />
      </div>
    </div>
  );
};

export const Hospital3DView: React.FC<Hospital3DViewProps> = ({
  mode = 'nurse'
}) => {
  return (
    <HospitalBedProvider initialMode={mode}>
      <Hospital3DContent />
    </HospitalBedProvider>
  );
};

export default Hospital3DView;
