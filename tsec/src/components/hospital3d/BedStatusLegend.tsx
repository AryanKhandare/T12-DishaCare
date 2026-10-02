import React from 'react';
import { bedStatusConfig } from './bedStatusConfig';
import type { BedStatus } from './types';

export const BedStatusLegend: React.FC = () => {
  const statuses: BedStatus[] = [
    'available',
    'occupied',
    'reserved',
    'cleaning',
    'maintenance',
    'unavailable'
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
        <span>STATUS LEGEND</span>
        <span className="text-[10px] text-slate-400 font-mono font-bold">3D Bed Color Key</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {statuses.map((stKey) => {
          const cfg = bedStatusConfig[stKey];
          return (
            <div
              key={stKey}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: cfg.hexColor }}
              />
              <span className="font-bold text-slate-800">{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
