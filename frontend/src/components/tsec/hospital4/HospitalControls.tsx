import React from 'react';
import { useHospitalBeds } from './HospitalBedContext';
import { mockZones } from './mockHospitalData';
import type { HospitalZoneId, BedStatus } from './types';
import { bedStatusMap } from './bedStatusConfig';
import {
  Search,
  RotateCcw,
  UserCheck,
  Shield,
  Layers,
  Filter
} from 'lucide-react';

export const HospitalControls: React.FC = () => {
  const {
    selectedZone,
    setSelectedZone,
    selectedStatusFilter,
    setSelectedStatusFilter,
    userMode,
    setUserMode,
    searchQuery,
    setSearchQuery,
    resetAllFilters
  } = useHospitalBeds();

  const zonesList: { id: HospitalZoneId; name: string }[] = [
    { id: 'all', name: 'All Areas' },
    ...mockZones.map((z) => ({ id: z.id, name: z.name }))
  ];

  const statusesList: { id: BedStatus | 'all'; label: string }[] = [
    { id: 'all', label: 'All Statuses' },
    { id: 'available', label: 'Available' },
    { id: 'occupied', label: 'Occupied' },
    { id: 'reserved', label: 'Reserved' },
    { id: 'cleaning', label: 'Cleaning' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'unavailable', label: 'Unavailable' }
  ];

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-4 space-y-3.5 transition-colors">
      {/* Top Toolbar Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Mode Toggle & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nurse vs Admin Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setUserMode('nurse')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                userMode === 'nurse'
                  ? 'bg-cyan-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Nurse Mode
            </button>
            <button
              onClick={() => setUserMode('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                userMode === 'admin'
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Admin Mode
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search bed ID, zone, patient, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>

        {/* Right: Reset Button */}
        <button
          onClick={resetAllFilters}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset View & Filters
        </button>
      </div>

      {/* Zone Selection Buttons Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
          <Layers className="w-3.5 h-3.5 text-cyan-600" /> Hospital Areas:
        </span>
        {zonesList.map((z) => {
          const isSelected = selectedZone === z.id;
          return (
            <button
              key={z.id}
              onClick={() => setSelectedZone(z.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                isSelected
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm ring-2 ring-cyan-500/20'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {z.name}
            </button>
          );
        })}
      </div>

      {/* Bed Status Filter Buttons Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-slate-100 dark:border-slate-800 pt-2.5">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5 text-emerald-600" /> Bed Status:
        </span>
        {statusesList.map((st) => {
          const isSelected = selectedStatusFilter === st.id;
          const config = st.id !== 'all' ? bedStatusMap[st.id] : null;

          return (
            <button
              key={st.id}
              onClick={() => setSelectedStatusFilter(st.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {config && (
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: config.hexColor }}
                />
              )}
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
