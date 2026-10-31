/**
 * mobile-app/src/context/AppContext.tsx
 * Unified application state managing Citizen & Driver responder workflows.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppRole, CitizenTab, DriverTab, Mission, Ambulance, MissionStatus } from '../types';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { crashService, CrashState } from '../services/crashService';
import { Config } from '../config';

interface AppContextType {
  // Navigation & Role
  role: AppRole;
  setRole: (role: AppRole) => void;
  citizenTab: CitizenTab;
  setCitizenTab: (tab: CitizenTab) => void;
  driverTab: DriverTab;
  setDriverTab: (tab: DriverTab) => void;

  // Server & Connectivity
  isOnline: boolean;
  offlineSmsMode: boolean;
  setOfflineSmsMode: (val: boolean) => void;

  // Citizen State
  activeMission: Mission | null;
  assignedAmbulance: Ambulance | null;
  missionHistory: Mission[];
  isSosLoading: boolean;
  sosError: string | null;
  triggerSos: (opts?: { flags?: number }) => Promise<void>;
  cancelCurrentMission: () => Promise<void>;
  call112: () => void;
  callModalOpen: boolean;
  setCallModalOpen: (open: boolean) => void;
  messageModalOpen: boolean;
  setMessageModalOpen: (open: boolean) => void;

  // Crash Detection
  crashState: CrashState;
  cancelCrashAlert: () => void;
  simulateCrashImpact: (g?: number) => void;

  // Driver State
  driverAmbulance: Ambulance;
  driverAvailability: 'AVAILABLE' | 'ENROUTE' | 'ON_SCENE' | 'OFFLINE';
  toggleDriverAvailability: () => void;
  incomingOffer: Mission | null;
  activeDriverMission: Mission | null;
  driverConflictError: string | null;
  acceptIncomingMission: () => Promise<boolean>;
  declineIncomingMission: () => Promise<void>;
  updateMissionProgress: (status: MissionStatus) => Promise<void>;
  reportBreakdownAction: () => Promise<void>;
  breakdownModalOpen: boolean;
  setBreakdownModalOpen: (open: boolean) => void;

  // Demo Helpers
  seedDemoScenario: () => void;
}

const defaultDriver: Ambulance = {
  id: 'ambu-402',
  driverName: 'James Harris',
  vehicleNo: 'GJ-01-EM-402',
  lat: 23.0365,
  lon: 72.5642,
  status: 'AVAILABLE',
  heading: 145,
  speedKmh: 42,
  zone: 'Navrangpura',
  phone: '+91 98765 43210',
  avatarUrl: '',
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<AppRole>('citizen');
  const [citizenTab, setCitizenTab] = useState<CitizenTab>('home');
  const [driverTab, setDriverTab] = useState<DriverTab>('missions');

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineSmsMode, setOfflineSmsMode] = useState<boolean>(false);

  // Citizen state
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [assignedAmbulance, setAssignedAmbulance] = useState<Ambulance | null>(null);
  const [missionHistory, setMissionHistory] = useState<Mission[]>([]);
  const [isSosLoading, setIsSosLoading] = useState<boolean>(false);
  const [sosError, setSosError] = useState<string | null>(null);
  const [callModalOpen, setCallModalOpen] = useState<boolean>(false);
  const [messageModalOpen, setMessageModalOpen] = useState<boolean>(false);

  // Crash detection
  const [crashState, setCrashState] = useState<CrashState>(crashService.getState());

  // Driver state
  const [driverAmbulance, setDriverAmbulance] = useState<Ambulance>(defaultDriver);
  const [driverAvailability, setDriverAvailability] = useState<'AVAILABLE' | 'ENROUTE' | 'ON_SCENE' | 'OFFLINE'>('AVAILABLE');
  const [incomingOffer, setIncomingOffer] = useState<Mission | null>(null);
  const [activeDriverMission, setActiveDriverMission] = useState<Mission | null>(null);
  const [driverConflictError, setDriverConflictError] = useState<string | null>(null);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState<boolean>(false);

  // Initial connection & socket subscription
  useEffect(() => {
    socket.connect();
    const unsub = socket.subscribe((msg) => {
      if (msg.type === 'MISSION_CREATED' || msg.type === 'MISSION_UPDATED') {
        const m = msg.mission;
        if (activeMission && activeMission.id === m.id) {
          setActiveMission(m);
        }
        if (activeDriverMission && activeDriverMission.id === m.id) {
          setActiveDriverMission(m);
        }
      } else if (msg.type === 'OFFER_SENT' || msg.type === 'DRIVER_OFFER') {
        if (msg.ambulanceId === driverAmbulance.id) {
          api.fetchMission(msg.missionId).then((m) => {
            if (m) setIncomingOffer(m);
          });
        }
      } else if (msg.type === 'OFFER_CANCELLED') {
        if (msg.ambulanceId === driverAmbulance.id) {
          setIncomingOffer(null);
        }
      } else if (msg.type === 'AMBULANCE_LOCATION') {
        if (assignedAmbulance && assignedAmbulance.id === msg.ambulanceId) {
          setAssignedAmbulance((prev) =>
            prev ? { ...prev, lat: msg.lat, lon: msg.lon, speedKmh: msg.speedKmh ?? prev.speedKmh } : null
          );
        }
      }
    });

    const unsubCrash = crashService.subscribe((s) => {
      setCrashState(s);
    });

    // Wire crash auto-dispatch
    crashService.setDispatchCallback(() => {
      triggerSos({ flags: 1 }); // flags=1 for crash_auto
    });

    // Initial check
    api.checkServerHealth().then((ok) => {
      setIsOnline(ok);
    });

    return () => {
      unsub();
      unsubCrash();
    };
  }, [activeMission?.id, activeDriverMission?.id, assignedAmbulance?.id, driverAmbulance.id]);

  // Trigger Citizen SOS
  const triggerSos = useCallback(async (opts?: { flags?: number }) => {
    if (isSosLoading) return; // Prevent duplicate submission
    setIsSosLoading(true);
    setSosError(null);

    const flags = opts?.flags ?? 0;
    const patientLat = Config.AHMEDABAD_CENTER.lat;
    const patientLon = Config.AHMEDABAD_CENTER.lon;
    const sosUid = `sos-${Date.now().toString(36)}`;

    try {
      const res = await api.triggerSos({
        lat: patientLat,
        lon: patientLon,
        flags,
        sosUid,
      });

      if (res.ok && res.missionId) {
        // Fetch fresh mission
        const m = await api.fetchMission(res.missionId);
        const missionObj: Mission = m || {
          id: res.missionId,
          patientLat,
          patientLon,
          patientLatLive: patientLat,
          patientLonLive: patientLon,
          addrId: 0,
          flags,
          sosUid,
          status: 'DISPATCHING',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          currentRadiusM: 500,
          searchStartedAt: Date.now(),
          pendingOffers: [defaultDriver.id],
          previousAmbulanceIds: [],
          localityName: 'Navrangpura, Ahmedabad',
          patientName: 'Citizen User',
          patientAge: 42,
          incidentDiagnosis: 'Acute Chest Distress & High Palpitation',
          priorityLabel: 'Code Red Priority',
          distanceKm: 2.4,
          etaMinutes: 5,
        };

        setActiveMission(missionObj);
        setCitizenTab('track'); // Seamless jump to tracking view

        // Also offer to driver
        setIncomingOffer(missionObj);

        // Auto quick-assign for demo if no human driver answers in 2s
        setTimeout(async () => {
          if (!missionObj.assignedAmbulanceId) {
            await api.quickAssign(missionObj.id);
            const updated = await api.fetchMission(missionObj.id);
            if (updated) {
              setActiveMission(updated);
              setAssignedAmbulance(defaultDriver);
            } else {
              setAssignedAmbulance(defaultDriver);
              setActiveMission((prev) => (prev ? { ...prev, status: 'ASSIGNED', assignedAmbulanceId: defaultDriver.id } : null));
            }
          }
        }, 2500);
      } else {
        setSosError('Could not connect to dispatch server. Fallback to 112 or SMS.');
      }
    } catch (err: any) {
      setSosError('Network error. Switch to simulated SMS or Call 112.');
    } finally {
      setIsSosLoading(false);
    }
  }, [isSosLoading]);

  // Cancel Citizen Mission
  const cancelCurrentMission = useCallback(async () => {
    if (!activeMission) return;
    await api.updateMissionStatus(activeMission.id, 'CANCELLED');
    const cancelled = { ...activeMission, status: 'CANCELLED' as MissionStatus };
    setMissionHistory((prev) => [cancelled, ...prev]);
    setActiveMission(null);
    setAssignedAmbulance(null);
    setIncomingOffer(null);
    setActiveDriverMission(null);
    setCitizenTab('home');
  }, [activeMission]);

  // Call 112 Action
  const call112 = useCallback(() => {
    setCallModalOpen(true);
  }, []);

  // Crash Alert Handlers
  const cancelCrashAlert = useCallback(() => {
    crashService.cancelAlert();
  }, []);

  const simulateCrashImpact = useCallback((g: number = 2.8) => {
    crashService.triggerImpact(g);
  }, []);

  // Driver Availability
  const toggleDriverAvailability = useCallback(() => {
    setDriverAvailability((prev) => (prev === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE'));
  }, []);

  // Driver Accept Incoming Mission
  const acceptIncomingMission = useCallback(async (): Promise<boolean> => {
    if (!incomingOffer) return false;
    setDriverConflictError(null);

    const res = await api.acceptMission(incomingOffer.id, driverAmbulance.id);
    if (!res.won) {
      setDriverConflictError(res.error || 'Offer expired or taken by another unit');
      return false;
    }

    const updatedMission: Mission = {
      ...incomingOffer,
      status: 'ASSIGNED',
      assignedAmbulanceId: driverAmbulance.id,
    };
    setActiveDriverMission(updatedMission);
    setIncomingOffer(null);
    setDriverAvailability('ENROUTE');

    // Sync citizen side
    if (activeMission && activeMission.id === incomingOffer.id) {
      setActiveMission(updatedMission);
      setAssignedAmbulance(driverAmbulance);
    }
    return true;
  }, [incomingOffer, driverAmbulance, activeMission]);

  // Driver Decline Mission
  const declineIncomingMission = useCallback(async () => {
    if (!incomingOffer) return;
    await api.declineMission(incomingOffer.id, driverAmbulance.id);
    setIncomingOffer(null);
  }, [incomingOffer, driverAmbulance.id]);

  // Driver Update Status
  const updateMissionProgress = useCallback(async (status: MissionStatus) => {
    if (!activeDriverMission) return;
    await api.updateMissionStatus(activeDriverMission.id, status);
    const updated = { ...activeDriverMission, status };
    setActiveDriverMission(updated);

    if (activeMission && activeMission.id === activeDriverMission.id) {
      setActiveMission(updated);
    }

    if (status === 'COMPLETED') {
      setMissionHistory((prev) => [updated, ...prev]);
      setActiveDriverMission(null);
      setDriverAvailability('AVAILABLE');
      if (activeMission) {
        setActiveMission(null);
        setAssignedAmbulance(null);
      }
    }
  }, [activeDriverMission, activeMission]);

  // Driver Report Breakdown
  const reportBreakdownAction = useCallback(async () => {
    if (!activeDriverMission) return;
    await api.reportBreakdown(activeDriverMission.id, driverAmbulance.id);
    const broken: Mission = {
      ...activeDriverMission,
      status: 'REDISPATCH',
      breakdownAmbulanceId: driverAmbulance.id,
      previousAmbulanceIds: [...activeDriverMission.previousAmbulanceIds, driverAmbulance.id],
    };
    setActiveDriverMission(null);
    setDriverAvailability('OFFLINE');
    setBreakdownModalOpen(false);

    // Citizen side shows re-dispatch
    if (activeMission && activeMission.id === activeDriverMission.id) {
      setActiveMission(broken);
      setAssignedAmbulance(null);
    }
  }, [activeDriverMission, driverAmbulance.id, activeMission]);

  // Seed fixed Demo Scenario (from reference screenshots)
  const seedDemoScenario = useCallback(() => {
    const demo: Mission = {
      id: 'incident-8841',
      patientLat: 23.0300,
      patientLon: 72.5600,
      patientLatLive: 23.0300,
      patientLonLive: 72.5600,
      addrId: 14,
      flags: 0,
      sosUid: 'demo-8841',
      status: 'ASSIGNED',
      createdAt: Date.now() - 120000,
      updatedAt: Date.now(),
      currentRadiusM: 1000,
      searchStartedAt: Date.now() - 120000,
      pendingOffers: [],
      assignedAmbulanceId: defaultDriver.id,
      previousAmbulanceIds: [],
      localityName: 'MG Road, Sector 4, Ahmedabad',
      patientName: 'Vikram Malhotra',
      patientAge: 58,
      vitals: {
        spO2: 88,
        bp: '165/100',
        pulse: 104,
      },
      incidentDiagnosis: 'Critical Cardiac Distress & Rapid Transport',
      priorityLabel: 'Code Red Priority',
      distanceKm: 4.2,
      etaMinutes: 5,
    };

    setActiveMission(demo);
    setAssignedAmbulance(defaultDriver);
    setActiveDriverMission(demo);
    setDriverAvailability('ENROUTE');
  }, []);

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        citizenTab,
        setCitizenTab,
        driverTab,
        setDriverTab,
        isOnline,
        offlineSmsMode,
        setOfflineSmsMode,
        activeMission,
        assignedAmbulance,
        missionHistory,
        isSosLoading,
        sosError,
        triggerSos,
        cancelCurrentMission,
        call112,
        callModalOpen,
        setCallModalOpen,
        messageModalOpen,
        setMessageModalOpen,
        crashState,
        cancelCrashAlert,
        simulateCrashImpact,
        driverAmbulance,
        driverAvailability,
        toggleDriverAvailability,
        incomingOffer,
        activeDriverMission,
        driverConflictError,
        acceptIncomingMission,
        declineIncomingMission,
        updateMissionProgress,
        reportBreakdownAction,
        breakdownModalOpen,
        setBreakdownModalOpen,
        seedDemoScenario,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};

