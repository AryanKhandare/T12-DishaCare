import React from 'react';
import { useHospitalBeds } from './HospitalBedContext';
import { bedStatusConfig } from './bedStatusConfig';
import { Activity, Clock } from 'lucide-react';

export const RecentActivityPanel: React.FC = () => {
  const { activityLogs } = useHospitalBeds();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-600" />
          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            RECENT BED ACTIVITY
          </h4>
        </div>
        <span className="text-[10px] font-mono bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200 font-bold">
          Live Mock Stream
        </span>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1 scrollbar-thin scrollbar-thumb-slate-200">
        {activityLogs.map((log) => {
          const cfg = bedStatusConfig[log.status] || bedStatusConfig.available;
          return (
            <div
              key={log.id}
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs transition-all duration-200 hover:border-slate-300"
            >
              <span
                className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 animate-pulse shadow-sm"
                style={{ backgroundColor: cfg.hexColor }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 leading-snug">
                  {log.message}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-mono font-medium">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{log.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
