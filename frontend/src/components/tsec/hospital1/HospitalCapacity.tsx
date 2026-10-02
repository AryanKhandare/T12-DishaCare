import React from 'react';
import { useHospitalBeds } from './HospitalBedContext';
import {
  Bed,
  CheckCircle2,
  UserCheck,
  Clock,
  Sparkles,
  Wrench,
  AlertTriangle,
  Activity
} from 'lucide-react';

export const HospitalCapacity: React.FC = () => {
  const { capacity, selectedStatusFilter, setSelectedStatusFilter } = useHospitalBeds();

  const cards = [
    {
      key: 'total',
      label: 'Total Capacity',
      count: capacity.total,
      icon: Bed,
      colorClass: 'text-sky-700 bg-sky-50 border-sky-200',
      activeFilter: 'all' as const
    },
    {
      key: 'available',
      label: 'Available',
      count: capacity.available,
      icon: CheckCircle2,
      colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      activeFilter: 'available' as const
    },
    {
      key: 'occupied',
      label: 'Occupied',
      count: capacity.occupied,
      icon: UserCheck,
      colorClass: 'text-red-700 bg-red-50 border-red-200',
      activeFilter: 'occupied' as const
    },
    {
      key: 'reserved',
      label: 'Reserved',
      count: capacity.reserved,
      icon: Clock,
      colorClass: 'text-blue-700 bg-blue-50 border-blue-200',
      activeFilter: 'reserved' as const
    },
    {
      key: 'cleaning',
      label: 'Cleaning',
      count: capacity.cleaning,
      icon: Sparkles,
      colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
      activeFilter: 'cleaning' as const
    },
    {
      key: 'maintenance',
      label: 'Maintenance',
      count: capacity.maintenance,
      icon: Wrench,
      colorClass: 'text-slate-700 bg-slate-100 border-slate-200',
      activeFilter: 'maintenance' as const
    },
    {
      key: 'unavailable',
      label: 'Unavailable',
      count: capacity.unavailable,
      icon: AlertTriangle,
      colorClass: 'text-rose-800 bg-rose-50 border-rose-200',
      activeFilter: 'unavailable' as const
    }
  ];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-100 text-sky-600 border border-sky-200 shadow-inner">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
              HOSPITAL CAPACITY MONITOR
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200 font-bold">
                Live Dynamic Feed
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Real-time bed availability & emergency status calculated directly from active hospital state
            </p>
          </div>
        </div>

        {/* Occupancy Rate Bar */}
        <div className="w-full md:w-64 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-slate-600">Bed Occupancy Rate</span>
            <span
              className={`font-mono font-bold ${
                capacity.occupancyRate > 85
                  ? 'text-red-600'
                  : capacity.occupancyRate > 65
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {capacity.occupancyRate}% ({capacity.occupied + capacity.reserved}/{capacity.total})
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
            <div
              className="bg-red-500 transition-all duration-500"
              style={{
                width: `${(capacity.occupied / (capacity.total || 1)) * 100}%`
              }}
            />
            <div
              className="bg-blue-500 transition-all duration-500"
              style={{
                width: `${(capacity.reserved / (capacity.total || 1)) * 100}%`
              }}
            />
            <div
              className="bg-amber-500 transition-all duration-500"
              style={{
                width: `${(capacity.cleaning / (capacity.total || 1)) * 100}%`
              }}
            />
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{
                width: `${(capacity.available / (capacity.total || 1)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {cards.map((card) => {
          const Icon = card.icon;
          const isSelected = selectedStatusFilter === card.activeFilter;

          return (
            <button
              key={card.key}
              onClick={() => setSelectedStatusFilter(card.activeFilter)}
              className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                card.colorClass
              } ${
                isSelected
                  ? 'ring-2 ring-sky-500 scale-[1.02] shadow-md'
                  : 'hover:border-slate-300 hover:bg-slate-100/60 opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[11px] font-bold text-slate-700">
                  {card.label}
                </span>
                <Icon className="w-4 h-4 opacity-80" />
              </div>
              <div className="text-2xl font-black font-mono tracking-tight text-slate-900">
                {card.count}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
