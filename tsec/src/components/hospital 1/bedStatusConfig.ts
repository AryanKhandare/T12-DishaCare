import type { BedStatus } from './types';

export interface BedStatusConfigItem {
  key: BedStatus;
  label: string;
  hexColor: string; // Used for Three.js 3D Mesh materials
  glowColor: string; // Used for 3D lights and glowing outlines
  bgClass: string; // Tailwind background style
  textClass: string; // Tailwind text color
  borderClass: string; // Tailwind border color
  badgeBg: string; // Solid badge color
  iconName: string; // Lucide icon identifier
  description: string;
}

export const bedStatusConfig: Record<BedStatus, BedStatusConfigItem> = {
  available: {
    key: 'available',
    label: 'Available',
    hexColor: '#22c55e', // Emerald Green
    glowColor: '#4ade80',
    bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-500',
    iconName: 'CheckCircle2',
    description: 'Bed is clean, disinfected, and ready for immediate patient admission.'
  },
  occupied: {
    key: 'occupied',
    label: 'Occupied',
    hexColor: '#ef4444', // Red
    glowColor: '#f87171',
    bgClass: 'bg-red-500/10 text-red-400 border-red-500/30',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/40',
    badgeBg: 'bg-red-500',
    iconName: 'UserCheck',
    description: 'Patient currently admitted and receiving care.'
  },
  reserved: {
    key: 'reserved',
    label: 'Reserved',
    hexColor: '#3b82f6', // Vivid Blue
    glowColor: '#60a5fa',
    bgClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/40',
    badgeBg: 'bg-blue-500',
    iconName: 'Clock',
    description: 'Bed reserved for incoming emergency / ambulance patient.'
  },
  cleaning: {
    key: 'cleaning',
    label: 'Cleaning',
    hexColor: '#f59e0b', // Amber / Yellow
    glowColor: '#fbbf24',
    bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/40',
    badgeBg: 'bg-amber-500',
    iconName: 'Sparkles',
    description: 'Sanitization in progress by environmental services.'
  },
  maintenance: {
    key: 'maintenance',
    label: 'Maintenance',
    hexColor: '#6b7280', // Grey
    glowColor: '#9ca3af',
    bgClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    textClass: 'text-slate-400',
    borderClass: 'border-slate-500/40',
    badgeBg: 'bg-slate-500',
    iconName: 'Wrench',
    description: 'Bed hardware or monitoring equipment undergoing maintenance.'
  },
  unavailable: {
    key: 'unavailable',
    label: 'Unavailable',
    hexColor: '#991b1b', // Dark Crimson Red
    glowColor: '#e11d48',
    bgClass: 'bg-rose-950/40 text-rose-400 border-rose-800/40',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-800/40',
    badgeBg: 'bg-rose-800',
    iconName: 'AlertTriangle',
    description: 'Bed temporarily out of service or isolated.'
  }
};
