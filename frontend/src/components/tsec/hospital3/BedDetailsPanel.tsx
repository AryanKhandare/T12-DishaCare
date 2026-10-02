import React, { useEffect } from 'react';
import { useHospitalBeds } from './HospitalBedContext';
import { bedStatusMap } from './bedStatusConfig';
import type { BedStatus } from './types';
import {
  X,
  Bed,
  MapPin,
  Clock,
  User,
  Ambulance,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  Sparkles,
  Wrench,
  AlertTriangle
} from 'lucide-react';

export const BedDetailsPanel: React.FC = () => {
  const { selectedBed, isDrawerOpen, closeBedDetails, updateBedStatus, userMode } = useHospitalBeds();

  // Handle Escape key to close details drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeBedDetails();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeBedDetails]);

  if (!isDrawerOpen || !selectedBed) return null;

  const currentStatusConfig = bedStatusMap[selectedBed.status] || bedStatusMap.available;

  const actionButtons: { status: BedStatus; label: string; icon: any; color: string }[] = [
    { status: 'available', label: 'Mark Available', icon: CheckCircle2, color: 'bg-emerald-600 hover:bg-emerald-500' },
    { status: 'occupied', label: 'Mark Occupied', icon: UserCheck, color: 'bg-red-600 hover:bg-red-500' },
    { status: 'reserved', label: 'Mark Reserved', icon: Clock, color: 'bg-blue-600 hover:bg-blue-500' },
    { status: 'cleaning', label: 'Mark Cleaning', icon: Sparkles, color: 'bg-amber-600 hover:bg-amber-500' },
    { status: 'maintenance', label: 'Mark Maintenance', icon: Wrench, color: 'bg-purple-600 hover:bg-purple-500' },
    { status: 'unavailable', label: 'Mark Unavailable', icon: AlertTriangle, color: 'bg-rose-800 hover:bg-rose-700' }
  ];

  return (
    <div
      className="w-full lg:w-96 max-w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 flex flex-col justify-between shrink-0 h-full overflow-y-auto z-20 animate-in slide-in-from-right duration-300 transition-colors"
      style={{ width: 'min(380px, 90vw)' }}
    >
      <div>
        {/* Header with Close Button */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-md font-mono border shrink-0"
              style={{
                backgroundColor: currentStatusConfig.hexColor,
                borderColor: currentStatusConfig.hexColor
              }}
            >
              {selectedBed.id}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-wide truncate">
                {selectedBed.id}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold truncate">{selectedBed.type}</p>
            </div>
          </div>
          <button
            onClick={closeBedDetails}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shrink-0 cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">CLOSE</span>
          </button>
        </div>

        {/* Current Status Badge */}
        <div className="mb-5">
          <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            BED STATUS
          </div>
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border font-bold text-xs shadow-sm ${currentStatusConfig.badgeBg} ${currentStatusConfig.badgeBorder}`}
          >
            <span
              className="w-3 h-3 rounded-full animate-ping inline-block shrink-0"
              style={{ backgroundColor: currentStatusConfig.hexColor }}
            />
            <span className={`tracking-wider ${currentStatusConfig.badgeText}`}>{currentStatusConfig.label.toUpperCase()}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic leading-relaxed">
            "{currentStatusConfig.description}"
          </p>
        </div>

        {/* Bed Details List */}
        <div className="space-y-3 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            BED INFORMATION
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-sky-600" /> Zone
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{selectedBed.zoneName}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <Bed className="w-3.5 h-3.5 text-sky-600" /> Bed Type
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{selectedBed.type}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-sky-600" /> Last Updated
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{selectedBed.updatedAt}</span>
          </div>

          {selectedBed.assignedStaff && (
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Assigned Staff
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {selectedBed.assignedStaff}
              </span>
            </div>
          )}

          {/* Reserved Bed Details */}
          {selectedBed.status === 'reserved' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2 mt-3">
              <div className="text-xs font-extrabold text-blue-800 dark:text-blue-300 uppercase tracking-wide flex items-center gap-1.5 border-b border-blue-200 dark:border-blue-800 pb-1.5">
                <Ambulance className="w-4 h-4" /> Ambulance Reservation
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Reservation ID:</span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">
                  {selectedBed.reservationId || 'BL-OR-882'}
                </span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Ambulance Unit:</span>
                <span className="font-mono text-sky-800 dark:text-sky-300 font-bold">
                  {selectedBed.ambulanceId || 'AMB-MED-09'}
                </span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Estimated Arrival (ETA):</span>
                <span className="font-bold text-amber-700 dark:text-amber-400 animate-pulse">
                  {selectedBed.eta || '12 minutes'}
                </span>
              </div>
            </div>
          )}

          {/* Occupied Patient Details */}
          {selectedBed.status === 'occupied' && selectedBed.patientName && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl space-y-2 mt-3">
              <div className="text-xs font-extrabold text-red-800 dark:text-red-300 uppercase tracking-wide flex items-center gap-1.5 border-b border-red-200 dark:border-red-800 pb-1.5">
                <User className="w-4 h-4" /> Admitted Patient Information
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Patient Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedBed.patientName}</span>
              </div>
              {selectedBed.patientId && (
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Patient ID:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">{selectedBed.patientId}</span>
                </div>
              )}
              {selectedBed.statusReason && (
                <div className="pt-1">
                  <span className="text-slate-600 dark:text-slate-400 block mb-0.5 font-semibold">Admission Reason:</span>
                  <p className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950 p-2 rounded-lg border border-red-200 dark:border-red-900 break-words leading-relaxed font-medium">
                    {selectedBed.statusReason}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Controls Section */}
      <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
        {userMode === 'nurse' ? (
          <div>
            <div className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>NURSE CONTROL ACTIONS</span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">Local Mock Update</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {actionButtons.map((btn) => {
                const Icon = btn.icon;
                const isCurrent = selectedBed.status === btn.status;

                return (
                  <button
                    key={btn.status}
                    onClick={() => updateBedStatus(selectedBed.id, btn.status)}
                    disabled={isCurrent}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-white transition-all duration-150 shadow-sm ${
                      isCurrent
                        ? 'opacity-40 ring-2 ring-slate-300 cursor-not-allowed'
                        : `${btn.color} active:scale-95 cursor-pointer`
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">ADMIN MODE ACTIVE</span>
            Read-only view mode.
          </div>
        )}
      </div>
    </div>
  );
};
