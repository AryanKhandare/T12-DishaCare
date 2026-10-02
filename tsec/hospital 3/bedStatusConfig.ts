import type { BedStatus } from './types';

export interface StatusStyleConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  hexColor: string;
  description: string;
}

export const bedStatusMap: Record<BedStatus, StatusStyleConfig> = {
  available: {
    label: 'AVAILABLE',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeBorder: 'border-emerald-300 dark:border-emerald-600',
    dotColor: 'bg-emerald-500',
    hexColor: '#10b981',
    description: 'Cleaned, sanitized and open for instant patient assignment'
  },
  occupied: {
    label: 'OCCUPIED',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-700 dark:text-rose-400',
    badgeBorder: 'border-rose-300 dark:border-rose-600',
    dotColor: 'bg-rose-500',
    hexColor: '#ef4444',
    description: 'Currently assigned to an admitted patient'
  },
  reserved: {
    label: 'RESERVED (EMS)',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-700 dark:text-amber-400',
    badgeBorder: 'border-amber-300 dark:border-amber-600',
    dotColor: 'bg-amber-500',
    hexColor: '#f59e0b',
    description: 'Held for incoming ambulance transfer via BedLink request'
  },
  cleaning: {
    label: 'CLEANING',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-700 dark:text-sky-400',
    badgeBorder: 'border-sky-300 dark:border-sky-600',
    dotColor: 'bg-sky-500',
    hexColor: '#0284c7',
    description: 'Sanitation team active on site conducting sterile terminal clean'
  },
  maintenance: {
    label: 'MAINTENANCE',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-700 dark:text-purple-400',
    badgeBorder: 'border-purple-300 dark:border-purple-600',
    dotColor: 'bg-purple-500',
    hexColor: '#8b5cf6',
    description: 'Undergoing telemetry or mechanical bed frame repair'
  },
  unavailable: {
    label: 'UNAVAILABLE',
    badgeBg: 'bg-slate-500/15',
    badgeText: 'text-slate-700 dark:text-slate-400',
    badgeBorder: 'border-slate-300 dark:border-slate-600',
    dotColor: 'bg-slate-500',
    hexColor: '#64748b',
    description: 'Out of service due to ward isolation or technical fault'
  }
};
