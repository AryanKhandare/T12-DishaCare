import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type {
  HospitalBedData,
  BedStatus,
  HospitalZoneId,
  UserMode,
  ActivityLog
} from './types';
import { initialBedsData, initialActivityLogs } from './mockHospitalData';
import { bedStatusMap } from './bedStatusConfig';

interface CapacityMetrics {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  cleaning: number;
  maintenance: number;
  unavailable: number;
  occupancyRate: number;
}

interface HospitalBedContextType {
  beds: HospitalBedData[];
  selectedBedId: string | null;
  selectedBed: HospitalBedData | null;
  isDrawerOpen: boolean;
  selectedZone: HospitalZoneId;
  selectedStatusFilter: BedStatus | 'all';
  userMode: UserMode;
  hoveredBedId: string | null;
  activityLogs: ActivityLog[];
  searchQuery: string;
  capacity: CapacityMetrics;
  
  // Actions
  setSelectedBedId: (id: string | null) => void;
  openBedDetails: (id: string) => void;
  closeBedDetails: () => void;
  setSelectedZone: (zone: HospitalZoneId) => void;
  setSelectedStatusFilter: (status: BedStatus | 'all') => void;
  setUserMode: (mode: UserMode) => void;
  setHoveredBedId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  updateBedStatus: (bedId: string, newStatus: BedStatus, reason?: string) => void;
  resetAllFilters: () => void;
}

const HospitalBedContext = createContext<HospitalBedContextType | undefined>(undefined);

export interface HospitalBedProviderProps {
  children: React.ReactNode;
  initialMode?: UserMode;
}

export const HospitalBedProvider: React.FC<HospitalBedProviderProps> = ({
  children,
  initialMode = 'nurse'
}) => {
  const [beds, setBeds] = useState<HospitalBedData[]>(initialBedsData);
  const [selectedBedId, setSelectedBedIdState] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [selectedZone, setSelectedZone] = useState<HospitalZoneId>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<BedStatus | 'all'>('all');
  const [userMode, setUserMode] = useState<UserMode>(initialMode);
  const [hoveredBedId, setHoveredBedId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initialActivityLogs);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected bed object lookup
  const selectedBed = useMemo(() => {
    return beds.find((b) => b.id === selectedBedId) || null;
  }, [beds, selectedBedId]);

  // Single-click selection
  const setSelectedBedId = useCallback((id: string | null) => {
    setSelectedBedIdState(id);
  }, []);

  // Double-click opens full details drawer
  const openBedDetails = useCallback((id: string) => {
    setSelectedBedIdState(id);
    setIsDrawerOpen(true);
  }, []);

  // Close drawer
  const closeBedDetails = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Dynamically calculate capacity metrics directly from beds array
  const capacity = useMemo<CapacityMetrics>(() => {
    const total = beds.length;
    const available = beds.filter((b) => b.status === 'available').length;
    const occupied = beds.filter((b) => b.status === 'occupied').length;
    const reserved = beds.filter((b) => b.status === 'reserved').length;
    const cleaning = beds.filter((b) => b.status === 'cleaning').length;
    const maintenance = beds.filter((b) => b.status === 'maintenance').length;
    const unavailable = beds.filter((b) => b.status === 'unavailable').length;
    
    const occupancyRate = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;

    return {
      total,
      available,
      occupied,
      reserved,
      cleaning,
      maintenance,
      unavailable,
      occupancyRate
    };
  }, [beds]);

  // Handler to update bed status cleanly in local state
  const updateBedStatus = useCallback(
    (bedId: string, newStatus: BedStatus, reason?: string) => {
      setBeds((prevBeds) =>
        prevBeds.map((bed) => {
          if (bed.id === bedId) {
            const statusLabel = bedStatusMap[newStatus]?.label || newStatus;
            
            // Append a log entry
            const newLog: ActivityLog = {
              id: `log-${Date.now()}`,
              bedId,
              status: newStatus,
              message: `${bedId} marked as ${statusLabel.toUpperCase()}${reason ? ` (${reason})` : ''}`,
              timestamp: 'Just now'
            };

            setActivityLogs((prevLogs) => [newLog, ...prevLogs.slice(0, 15)]);

            return {
              ...bed,
              status: newStatus,
              statusReason: reason || bed.statusReason,
              updatedAt: 'Just now'
            };
          }
          return bed;
        })
      );
    },
    []
  );

  const resetAllFilters = useCallback(() => {
    setSelectedZone('all');
    setSelectedStatusFilter('all');
    setSearchQuery('');
  }, []);

  return (
    <HospitalBedContext.Provider
      value={{
        beds,
        selectedBedId,
        selectedBed,
        isDrawerOpen,
        selectedZone,
        selectedStatusFilter,
        userMode,
        hoveredBedId,
        activityLogs,
        searchQuery,
        capacity,
        setSelectedBedId,
        openBedDetails,
        closeBedDetails,
        setSelectedZone,
        setSelectedStatusFilter,
        setUserMode,
        setHoveredBedId,
        setSearchQuery,
        updateBedStatus,
        resetAllFilters
      }}
    >
      {children}
    </HospitalBedContext.Provider>
  );
};

export const useHospitalBeds = (): HospitalBedContextType => {
  const context = useContext(HospitalBedContext);
  if (!context) {
    throw new Error('useHospitalBeds must be used within a HospitalBedProvider');
  }
  return context;
};
