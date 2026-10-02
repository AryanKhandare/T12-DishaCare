import React from 'react';
import { useHospitalBeds } from './HospitalBedContext';
import { Activity, Clock } from 'lucide-react';

export const RecentActivityPanel: React.FC = () => {
  const { activityLogs } = useHospitalBeds();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3">
        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400" /> RECENT BED AUDIT TRAIL
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">Live Feed</span>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {activityLogs.length === 0 ? (
          <div className="text-xs text-slate-400 italic text-center py-4">No recent activity</div>
        ) : (
          activityLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold text-sky-700 dark:text-sky-400 shrink-0">
                  {log.bedId}
                </span>
                <span className="text-slate-700 dark:text-slate-300 truncate font-medium">{log.message}</span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> {log.timestamp}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
