import React from 'react';
import { bedStatusMap } from './bedStatusConfig';

export const BedStatusLegend: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
          BED STATUS COLOR LEGEND
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">Real-time Telemetry Key</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {Object.entries(bedStatusMap).map(([key, item]) => (
          <div
            key={key}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: item.hexColor }}
            />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
