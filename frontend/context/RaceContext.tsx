import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  PageRoute,
  WheelTelemetry,
  DriverLeaderboardEntry,
  RaceEvent,
  ReportItem,
  TyreCompound,
  RaceDataProvider,
  ProviderHealthStatus,
  SessionSummary,
  LapTelemetry,
  WeatherTelemetry,
  LapRecord,
  StintData,
} from '../types';
import {
  CIRCUITS,
  CircuitInfo,
  WHEEL_TELEMETRY_DATA,
  DRIVERS_GRID,
  CIRCUIT_DRIVERS,
  getCircuitDrivers,
  RACE_EVENTS_LOG,
  AUDIT_REPORTS,
} from '../data/mockRaceData';
import {
  getRaceDataProvider,
  setRaceDataProvider,
  DemoRaceDataProvider,
  LiveOpenF1DataProvider,
  FastF1HttpRaceDataProvider,
} from '../services/raceDataProvider';
import { API_BASE_URL } from '../config/api';
import { TrackPointTelemetry, getCircuitTrackTelemetry } from '../utils/circuitTrackData';
import {
  WeatherSimulationState,
  StrategySignalState,
  calculateDriverLeaderboard,
  calculateWheelTelemetry,
  calculateWeather,
  calculateStrategySignal,
  getEventsUpToLap,
} from '../services/simulationEngine';

interface RaceContextType {
  currentRoute: PageRoute;
  navigateTo: (route: PageRoute) => void;
  selectedCircuit: CircuitInfo;
  setCircuitId: (id: string) => void;
  selectedDriver: DriverLeaderboardEntry;
  selectedDriverCode: string;
  setSelectedDriverCode: (code: string) => void;
  selectedSession: string;
  setSelectedSession: (session: string) => void;
  selectedStintNumber: number;
  setSelectedStintNumber: (stint: number) => void;
  selectedCompound: TyreCompound;
  setSelectedCompound: (compound: TyreCompound) => void;
  currentLap: number;
  totalLaps: number;
  setLap: (lap: number) => void;
  nextLap: () => void;
  prevLap: () => void;
  resetLap: () => void;
  isPlaying: boolean;
  togglePlay: () => void;
  customPitLap: number;
  setCustomPitLap: (lap: number) => void;
  fuelCorrectionEnabled: boolean;
  setFuelCorrectionEnabled: (v: boolean) => void;
  trackEvoCorrectionEnabled: boolean;
  setTrackEvoCorrectionEnabled: (v: boolean) => void;
  trafficDecouplingEnabled: boolean;
  setTrafficDecouplingEnabled: (v: boolean) => void;
  wheelTelemetry: WheelTelemetry[];
  drivers: DriverLeaderboardEntry[];
  events: RaceEvent[];
  reports: ReportItem[];
  addReport: (report: ReportItem) => void;
  activePlan: 'A' | 'B' | 'C';
  setActivePlan: (plan: 'A' | 'B' | 'C') => void;
  notification: { message: string; type: 'success' | 'info' | 'warning' } | null;
  dismissNotification: () => void;
  triggerActionNotification: (msg: string, type?: 'success' | 'info' | 'warning') => void;

  // Live Simulation State
  lapProgress: number;
  currentSector: 1 | 2 | 3;
  simulationSpeed: 0.5 | 1 | 2 | 5;
  setSimulationSpeed: (speed: 0.5 | 1 | 2 | 5) => void;
  isRaceFinished: boolean;
  simulationStatusText: string;
  carTelemetry: TrackPointTelemetry;
  strategySignal: StrategySignalState;
  weatherState: WeatherSimulationState;

  // RaceDataProvider Abstraction
  dataProvider: RaceDataProvider;
  providerStatus: ProviderHealthStatus | null;
  availableSessions: SessionSummary[];
  switchDataProvider: (provider: RaceDataProvider) => void;
  connectFastF1Backend: (baseUrl?: string) => Promise<boolean>;
  useDemoDataProvider: () => void;
  fetchTelemetryForLap: (driverCode: string, lap: number) => Promise<LapTelemetry>;
  fetchWeatherTelemetry: () => Promise<WeatherTelemetry>;
  fetchSessionLaps: (driverCode?: string) => Promise<LapRecord[]>;
  fetchSessionStints: (driverCode?: string) => Promise<StintData[]>;
}

const RaceContext = createContext<RaceContextType | undefined>(undefined);

const VALID_ROUTES: PageRoute[] = [
  'dashboard',
  'tyres',
  'strategy',
  'live',
  'stints',
  'conditions',
  'reports',
  'model',
];

export const parseRouteFromUrl = (): PageRoute => {
  if (typeof window === 'undefined') return 'dashboard';

  // 1. Check path (e.g., /tyres, /strategy, /model)
  const path = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
  if (VALID_ROUTES.includes(path as PageRoute)) {
    return path as PageRoute;
  }

  // 2. Check hash (e.g., #/tyres, #strategy)
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (VALID_ROUTES.includes(hash as PageRoute)) {
    return hash as PageRoute;
  }

  return 'dashboard';
};

export const RaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<PageRoute>(parseRouteFromUrl);
  const [circuitId, setCircuitIdState] = useState<string>('monza');
  const [currentLap, setCurrentLap] = useState<number>(1);
  const [lapProgress, setLapProgress] = useState<number>(0.0);
  const [currentSector, setCurrentSector] = useState<1 | 2 | 3>(1);
  const [simulationSpeed, setSimulationSpeed] = useState<0.5 | 1 | 2 | 5>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRaceFinished, setIsRaceFinished] = useState<boolean>(false);
  const [customPitLap, setCustomPitLap] = useState<number>(38);
  const [fuelCorrectionEnabled, setFuelCorrectionEnabled] = useState<boolean>(true);
  const [trackEvoCorrectionEnabled, setTrackEvoCorrectionEnabled] = useState<boolean>(true);
  const [trafficDecouplingEnabled, setTrafficDecouplingEnabled] = useState<boolean>(true);
  const [activePlan, setActivePlan] = useState<'A' | 'B' | 'C'>('A');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  const [carTelemetry, setCarTelemetry] = useState<TrackPointTelemetry>(() => getCircuitTrackTelemetry('monza', 0.0));
  const [weatherState, setWeatherState] = useState<WeatherSimulationState>(() => calculateWeather(1, 53));
  const [strategySignal, setStrategySignal] = useState<StrategySignalState>(() =>
    calculateStrategySignal(1, 38, 'A', 53, 'monza', 'LEC')
  );
  const [drivers, setDrivers] = useState<DriverLeaderboardEntry[]>(() =>
    calculateDriverLeaderboard(1, 38, 'monza', 'LEC')
  );
  const [selectedDriverCode, setSelectedDriverCode] = useState<string>('LEC');
  const [selectedSession, setSelectedSessionState] = useState<string>('RACE');
  const [selectedStintNumber, setSelectedStintNumberState] = useState<number>(1);
  const [selectedCompound, setSelectedCompoundState] = useState<TyreCompound>('HARD');
  const [wheelTelemetry, setWheelTelemetry] = useState<WheelTelemetry[]>(() => calculateWheelTelemetry(1, 38));
  const [events, setEvents] = useState<RaceEvent[]>(() => getEventsUpToLap(1));
  const [reports, setReports] = useState<ReportItem[]>(AUDIT_REPORTS);

  // RaceDataProvider state

  const [dataProvider, setDataProviderState] = useState<RaceDataProvider>(getRaceDataProvider);
  const [providerStatus, setProviderStatus] = useState<ProviderHealthStatus | null>(null);
  const [availableSessions, setAvailableSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    let isMounted = true;
    dataProvider.getProviderStatus().then((status) => {
      if (isMounted) setProviderStatus(status);
    });
    dataProvider.getSessions(2024, circuitId).then((sessions) => {
      if (isMounted && sessions.length > 0) setAvailableSessions(sessions);
    });

    // Auto-probe FastF1 daemon on load
    if (dataProvider.isDemo) {
      connectFastF1Backend(API_BASE_URL).catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [dataProvider, circuitId]);

  const switchDataProvider = (newProvider: RaceDataProvider) => {
    setRaceDataProvider(newProvider);
    setDataProviderState(newProvider);
    newProvider.getProviderStatus().then(setProviderStatus);
    triggerActionNotification(`Race data source switched to: ${newProvider.providerName}`, 'info');
  };

  const connectFastF1Backend = async (baseUrl?: string): Promise<boolean> => {
    const targetUrl = baseUrl || API_BASE_URL;
    const httpProvider = new FastF1HttpRaceDataProvider({ baseUrl: targetUrl, fallbackToDemoOnFailure: true });
    const status = await httpProvider.getProviderStatus();
    switchDataProvider(httpProvider);
    if (status.status === 'ONLINE') {
      triggerActionNotification(`Connected to Python FastF1 REST API at ${targetUrl}`, 'success');
      try {
        const weather = await httpProvider.getWeather(`2024-${circuitId}-race`);
        if (weather) {
          setWeatherState((prev) => ({
            ...prev,
            airTemp: weather.airTemp,
            trackTemp: weather.trackTemp,
            humidity: weather.humidity,
            windSpeed: weather.windSpeed,
            rainfall: weather.rainfall,
          }));
        }
      } catch (e) {
        console.warn('Initial FastF1 sync:', e);
      }
      return true;
    } else {
      triggerActionNotification(`FastF1 Python endpoint at ${targetUrl} unreachable. Waiting for daemon...`, 'warning');
      return false;
    }
  };

  const useDemoDataProvider = () => {
    connectFastF1Backend(API_BASE_URL);
    triggerActionNotification('Re-syncing FastF1 Python telemetry pipeline.', 'info');
  };

  const fetchTelemetryForLap = async (driverCode: string, lap: number) => {
    const sessionId = `2024-${circuitId}-${selectedSession.toLowerCase()}`;
    return dataProvider.getTelemetry(sessionId, driverCode, lap);
  };

  const fetchWeatherTelemetry = async () => {
    const sessionId = `2024-${circuitId}-${selectedSession.toLowerCase()}`;
    return dataProvider.getWeather(sessionId);
  };

  // Synchronize genuine FastF1 weather and telemetry directly into app state
  useEffect(() => {
    let isMounted = true;
    const syncFastF1RealData = async () => {
      try {
        const [weatherRes, telemetryRes] = await Promise.allSettled([
          dataProvider.getWeather(`2024-${circuitId}-${selectedSession.toLowerCase()}`),
          dataProvider.getTelemetry(`2024-${circuitId}-${selectedSession.toLowerCase()}`, selectedDriverCode, currentLap),
        ]);

        if (!isMounted) return;

        if (weatherRes.status === 'fulfilled' && weatherRes.value) {
          const w = weatherRes.value;
          setWeatherState((prev) => ({
            ...prev,
            airTemp: w.airTemp,
            trackTemp: w.trackTemp,
            humidity: w.humidity,
            windSpeed: w.windSpeed,
            rainfall: w.rainfall,
          }));
        }

        if (telemetryRes.status === 'fulfilled' && telemetryRes.value?.samples?.length) {
          const samples = telemetryRes.value.samples;
          const idx = Math.min(
            samples.length - 1,
            Math.max(0, Math.floor(lapProgress * samples.length))
          );
          const pt = samples[idx];
          if (pt) {
            setCarTelemetry((prev) => ({
              ...prev,
              speedKmh: Math.round(pt.speedKmh),
              throttlePct: Math.round(pt.throttle),
              brakePct: Math.round(pt.brake),
              gear: pt.gear,
              drsActive: pt.drs,
            }));
          }
        }
      } catch (err) {
        // quiet fallback
      }
    };

    syncFastF1RealData();
    return () => {
      isMounted = false;
    };
  }, [currentLap, selectedDriverCode, lapProgress, circuitId, selectedSession, dataProvider]);

  const fetchSessionLaps = async (driverCode?: string) => {
    const sessionId = `2026-${circuitId}-${selectedSession.toLowerCase()}`;
    return dataProvider.getLaps(sessionId, driverCode);
  };

  const fetchSessionStints = async (driverCode?: string) => {
    const sessionId = `2026-${circuitId}-${selectedSession.toLowerCase()}`;
    return dataProvider.getStints(sessionId, driverCode);
  };

  const selectedCircuit = CIRCUITS[circuitId] || CIRCUITS.monza;
  const totalLaps = selectedCircuit.totalLaps;
  const selectedDriver = drivers.find((d) => d.driverCode === selectedDriverCode) || drivers[0];

  const handleSelectDriverCode = (code: string) => {
    setSelectedDriverCode(code);
    const target = drivers.find((d) => d.driverCode === code);
    if (target) {
      setSelectedCompoundState(target.compound);
      syncStateForLap(currentLap, customPitLap, activePlan, circuitId, code);
      triggerActionNotification(
        `Focus switched to #${target.driverNumber} ${target.driverName} (P${target.position} • ${target.compound} • Age: ${target.tyreAge}L)`,
        'info'
      );
    }
  };

  const setSelectedSession = (session: string) => {
    setSelectedSessionState(session);
    triggerActionNotification(`Session set to ${session}`, 'info');
  };

  const setSelectedStintNumber = (stint: number) => {
    setSelectedStintNumberState(stint);
    triggerActionNotification(`Analysis focus set to Stint ${stint}`, 'info');
  };

  const setSelectedCompound = (compound: TyreCompound) => {
    setSelectedCompoundState(compound);
    triggerActionNotification(`Compound filter set to ${compound}`, 'info');
  };

  const navigateTo = (route: PageRoute) => {
    setCurrentRoute(route);

    // Sync browser URL to /route
    try {
      if (window.location.pathname !== `/${route}`) {
        window.history.pushState({ route }, '', `/${route}`);
      }
    } catch {
      window.location.hash = `/${route}`;
    }

    // Scroll main content pane to top
    const mainEl = document.getElementById('main-scrollable-content');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // Sync with browser back/forward and hash change
  useEffect(() => {
    const handleUrlSync = () => {
      const detected = parseRouteFromUrl();
      setCurrentRoute(detected);
      const mainEl = document.getElementById('main-scrollable-content');
      if (mainEl) {
        mainEl.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };

    window.addEventListener('popstate', handleUrlSync);
    window.addEventListener('hashchange', handleUrlSync);

    return () => {
      window.removeEventListener('popstate', handleUrlSync);
      window.removeEventListener('hashchange', handleUrlSync);
    };
  }, []);

  const triggerActionNotification = (
    message: string,
    type: 'success' | 'info' | 'warning' = 'info'
  ) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const dismissNotification = () => setNotification(null);

  const syncStateForLap = (
    lap: number,
    targetPitLap: number = customPitLap,
    plan: 'A' | 'B' | 'C' = activePlan,
    targetCircuitId: string = circuitId,
    targetDriver: string = selectedDriverCode
  ) => {
    const circuitObj = CIRCUITS[targetCircuitId] || CIRCUITS.monza;
    const circuitLaps = circuitObj.totalLaps;
    setDrivers(calculateDriverLeaderboard(lap, targetPitLap, targetCircuitId, targetDriver));
    setWheelTelemetry(calculateWheelTelemetry(lap, targetPitLap));
    setWeatherState(
      calculateWeather(lap, circuitLaps, circuitObj.nominalTrackTemp, circuitObj.nominalAirTemp)
    );
    setStrategySignal(
      calculateStrategySignal(lap, targetPitLap, plan, circuitLaps, targetCircuitId, targetDriver)
    );
    setEvents(getEventsUpToLap(lap));
    setSelectedCompoundState(lap > targetPitLap ? 'HARD' : 'MEDIUM');
    setSelectedStintNumberState(lap > targetPitLap ? 2 : 1);
  };

  const setCircuitId = (id: string) => {
    if (CIRCUITS[id]) {
      setCircuitIdState(id);
      const targetCircuit = CIRCUITS[id];
      const circuitTotalLaps = targetCircuit.totalLaps;
      const validLap = Math.min(currentLap, circuitTotalLaps);
      setCurrentLap(validLap);
      setLapProgress(0.0);
      const carTel = getCircuitTrackTelemetry(id, 0.0);
      setCarTelemetry(carTel);
      setCurrentSector(carTel.sector);

      // Select winning or featured driver for the new circuit
      const grid = getCircuitDrivers(id);
      const featured = grid.find((d) => d.isTargetDriver) || grid[0];
      const newDriverCode = featured ? featured.driverCode : 'LEC';
      setSelectedDriverCode(newDriverCode);
      if (featured) {
        setSelectedCompoundState(featured.compound);
      }

      syncStateForLap(validLap, customPitLap, activePlan, id, newDriverCode);
      triggerActionNotification(
        `Circuit switched to ${targetCircuit.name} • Grid updated with official F1 drivers`,
        'info'
      );
    }
  };

  const setLap = (lap: number) => {
    const validLap = Math.max(1, Math.min(totalLaps, lap));
    setCurrentLap(validLap);
    setLapProgress(0.0);
    const carTel = getCircuitTrackTelemetry(circuitId, 0.0);
    setCarTelemetry(carTel);
    setCurrentSector(carTel.sector);
    syncStateForLap(validLap);
    setIsRaceFinished(validLap >= totalLaps);
  };

  const nextLap = () => {
    if (currentLap < totalLaps) {
      const next = currentLap + 1;
      setCurrentLap(next);
      setLapProgress(0.0);
      const carTel = getCircuitTrackTelemetry(circuitId, 0.0);
      setCarTelemetry(carTel);
      setCurrentSector(carTel.sector);
      syncStateForLap(next);

      if (next === customPitLap) {
        triggerActionNotification(`BOX LAP ${customPitLap}: Target pit window open for #${selectedDriver.driverNumber} [${selectedDriver.driverName}]!`, 'warning');
      } else if (next === customPitLap + 1) {
        triggerActionNotification('PIT COMPLETE: Clean 2.3s stationary stop. Fresh C2 Hard tyres fitted.', 'success');
      } else if (next === totalLaps) {
        setIsPlaying(false);
        setIsRaceFinished(true);
        triggerActionNotification(`RACE FINISHED // Checkered flag shown for #${selectedDriver.driverNumber} [${selectedDriver.driverName}]!`, 'success');
      }
    } else {
      setIsPlaying(false);
      setIsRaceFinished(true);
      triggerActionNotification('Race completed! Checkered flag shown.', 'success');
    }
  };

  const prevLap = () => {
    if (currentLap > 1) {
      setLap(currentLap - 1);
    }
  };

  const resetLap = () => {
    setIsPlaying(false);
    setIsRaceFinished(false);
    setCurrentLap(1);
    setLapProgress(0.0);
    setCurrentSector(1);
    const carTel = getCircuitTrackTelemetry(circuitId, 0.0);
    setCarTelemetry(carTel);
    syncStateForLap(1);
    triggerActionNotification(`Simulation reset to Lap 1 / ${totalLaps} start state.`, 'info');
  };

  const togglePlay = () => {
    if (isRaceFinished || currentLap >= totalLaps) {
      // Replay from start
      setCurrentLap(1);
      setLapProgress(0.0);
      setCurrentSector(1);
      setIsRaceFinished(false);
      const carTel = getCircuitTrackTelemetry(circuitId, 0.0);
      setCarTelemetry(carTel);
      syncStateForLap(1);
      setIsPlaying(true);
      triggerActionNotification('Live race replay initiated from Lap 1.', 'info');
      return;
    }

    setIsPlaying((prev) => {
      const next = !prev;
      triggerActionNotification(
        next ? `Live race simulation running at ${simulationSpeed}× speed.` : 'Simulation paused.',
        'info'
      );
      return next;
    });
  };

  // High-fidelity single-interval simulation loop (safely teardown on pause/speed change)
  useEffect(() => {
    if (!isPlaying) return;

    const TICK_INTERVAL_MS = 40; // 25 updates/sec for smooth car marker animation
    // Base 1x speed: 1.6s per simulated lap
    const BASE_LAP_MS = 1600;
    const lapDurationMs = BASE_LAP_MS / simulationSpeed;
    const stepProgress = TICK_INTERVAL_MS / lapDurationMs;

    const intervalId = setInterval(() => {
      setLapProgress((prevProgress) => {
        const nextProgress = prevProgress + stepProgress;
        const carTel = getCircuitTrackTelemetry(circuitId, nextProgress % 1.0);
        setCarTelemetry(carTel);
        setCurrentSector(carTel.sector);

        if (nextProgress >= 1.0) {
          // Lap completed!
          setCurrentLap((prevLap) => {
            const nextLap = prevLap + 1;
            if (nextLap > totalLaps) {
              setIsPlaying(false);
              setIsRaceFinished(true);
              triggerActionNotification(`RACE FINISHED // Checkered flag shown for #${selectedDriver.driverNumber} [${selectedDriver.driverName}]!`, 'success');
              return totalLaps;
            }

            syncStateForLap(nextLap);

            if (nextLap === customPitLap) {
              triggerActionNotification(
                `BOX LAP ${customPitLap}: Target pit window active for #${selectedDriver.driverNumber} [${selectedDriver.driverName}]!`,
                'warning'
              );
            } else if (nextLap === customPitLap + 1) {
              triggerActionNotification(
                'PIT COMPLETE: Clean 2.3s stationary stop. Fresh C2 Hard tyres fitted.',
                'success'
              );
            }

            return nextLap;
          });

          return nextProgress - 1.0;
        }

        return nextProgress;
      });
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isPlaying, simulationSpeed, totalLaps, customPitLap, activePlan, circuitId]);

  const addReport = (report: ReportItem) => {
    setReports((prev) => [report, ...prev]);
    triggerActionNotification(`Generated new report: ${report.reportCode}`, 'success');
  };

  const simulationStatusText = isRaceFinished
    ? 'RACE FINISHED'
    : isPlaying
    ? 'LIVE SIMULATION'
    : 'SIMULATION PAUSED';

  return (
    <RaceContext.Provider
      value={{
        currentRoute,
        navigateTo,
        selectedCircuit,
        setCircuitId,
        selectedDriver,
        selectedDriverCode,
        setSelectedDriverCode: handleSelectDriverCode,
        selectedSession,
        setSelectedSession,
        selectedStintNumber,
        setSelectedStintNumber,
        selectedCompound,
        setSelectedCompound,
        currentLap,
        totalLaps,
        setLap,
        nextLap,
        prevLap,
        resetLap,
        isPlaying,
        togglePlay,
        customPitLap,
        setCustomPitLap,
        fuelCorrectionEnabled,
        setFuelCorrectionEnabled,
        trackEvoCorrectionEnabled,
        setTrackEvoCorrectionEnabled,
        trafficDecouplingEnabled,
        setTrafficDecouplingEnabled,
        wheelTelemetry,
        drivers,
        events,
        reports,
        addReport,
        activePlan,
        setActivePlan,
        notification,
        dismissNotification,
        triggerActionNotification,

        // Live Simulation State
        lapProgress,
        currentSector,
        simulationSpeed,
        setSimulationSpeed,
        isRaceFinished,
        simulationStatusText,
        carTelemetry,
        strategySignal,
        weatherState,

        dataProvider,
        providerStatus,
        availableSessions,
        switchDataProvider,
        connectFastF1Backend,
        useDemoDataProvider,
        fetchTelemetryForLap,
        fetchWeatherTelemetry,
        fetchSessionLaps,
        fetchSessionStints,
      }}
    >
      {children}
    </RaceContext.Provider>
  );
};

export const useRace = (): RaceContextType => {
  const context = useContext(RaceContext);
  if (!context) {
    throw new Error('useRace must be used within a RaceProvider');
  }
  return context;
};
