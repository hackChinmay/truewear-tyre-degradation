export type TyreCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET';

export interface WheelTelemetry {
  corner: 'FL' | 'FR' | 'RL' | 'RR';
  label: string;
  surfaceTemp: number; // in °C
  carcassTemp: number; // in °C
  pressure: number; // in PSI
  wearPercent: number; // 0-100%
  status: 'NOMINAL' | 'MODERATE STRESS' | 'THERMAL PEAK' | 'CRITICAL';
  blisterProbability?: number; // 0-100%
  grainingStatus?: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE';
  tractionStatus?: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
}

export interface LapRecord {
  lapNumber: number;
  lapTimeStr: string;
  lapTimeSeconds: number;
  s1: number;
  s2: number;
  s3: number;
  compound: TyreCompound;
  tyreAge: number;
  observedDelta: number;
  modelPredictedDelta: number;
  trueWearDelta: number;
  fuelOffset: number;
  trackGripOffset: number;
  trafficOffset: number;
  trackTemp: number;
  airTemp: number;
  flag: 'GREEN' | 'YELLOW' | 'VSC' | 'SC';
  inPitWindow?: boolean;
}

export interface DriverLeaderboardEntry {
  position: number;
  driverNumber: string;
  driverCode: string;
  driverName: string;
  team: string;
  compound: TyreCompound;
  compoundCode: string; // e.g., 'C3', 'C2', 'C4'
  tyreAge: number;
  interval: string;
  intervalSeconds: number;
  lastLapTime: string;
  lastLapSeconds: number;
  degRatePerLap: number; // s/lap
  estPitWindow: string; // e.g. "L36-38"
  pitStatus: 'TRACK' | 'BOX WINDOW' | 'PIT IN' | 'IN PIT' | 'OUT LAP';
  isTargetDriver?: boolean;
  s1?: number;
  s2?: number;
  s3?: number;
}

export interface StintData {
  stintNumber: number;
  compound: TyreCompound;
  compoundCode: string;
  startLap: number;
  endLap: number;
  totalLaps: number;
  avgPace: string;
  avgPaceSeconds: number;
  bestLap: string;
  worstLap: string;
  degRate: number; // s/lap
  pitLossSeconds: number;
  status: 'COMPLETED' | 'ACTIVE' | 'PROJECTED';
  tyreTerminalState: string;
  fuelCorrectedDeltaVsBaseline: number;
  thermalStabilityIndex: number; // 0-100%
}

export interface ConfoundingFactorBreakdown {
  id: string;
  name: string;
  category: 'TYRE_AGE' | 'TRACK_EVO' | 'TRAFFIC' | 'FUEL_MASS' | 'THERMAL_STRESS';
  impactLabel: string;
  impactValueStr: string;
  impactValueSeconds: number;
  direction: string;
  sharePercentage: number;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface StrategyOption {
  id: 'A' | 'B' | 'C';
  codeName: string;
  title: string;
  isRecommended: boolean;
  type: '1-STOP' | '2-STOP' | 'OVERCUT' | 'UNDERCUT';
  sequenceStr: string;
  stints: {
    compound: TyreCompound;
    compoundCode: string;
    startLap: number;
    endLap: number;
    laps: number;
    note?: string;
  }[];
  pitWindow: string;
  targetPitLap: number;
  netDeltaSeconds: number;
  deltaVsBenchmarkStr: string;
  confidencePercent: number;
  estTotalRaceTime: string;
  reentryTraffic: string;
  reentryPosition: string;
  reentryBufferStr: string;
  riskFactor: string;
  description: string;
}

export interface RaceEvent {
  id: string;
  lap: number;
  timeStr: string;
  type: 'PIT_TRIGGER' | 'THERMAL_PEAK' | 'GRAINING' | 'TRAFFIC' | 'PIT_STOP' | 'FLAG' | 'MODEL_UPDATE';
  title: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
}

export interface ReportItem {
  id: string;
  reportCode: string;
  title: string;
  grandPrix: string;
  circuit: string;
  session: string;
  driver: string;
  driverNumber: string;
  type: 'FULL_RACE' | 'TYRE_DEG' | 'STRATEGY' | 'STINT';
  dateStr: string;
  status: 'READY' | 'ARCHIVED';
  recommendedPitWindow: string;
  estDegradation: string;
  confidence: number;
  netRaceTimeGain: string;
  summary: string;
  sections: {
    tyreAnalysis: {
      wearRate: string;
      thermalHysteresis: string;
      blisteringIndex: string;
      carcassCoreTemp: string;
    };
    strategyAnalysis: {
      undercutVulnerability: string;
      overcutDelta: string;
      trafficExitCleanAir: string;
      expectedPositionReentry: string;
    };
    trackConditions: {
      surfaceGripEvolution: string;
      trackTempDelta: string;
      rubberingIn: string;
      wind: string;
    };
    modelPerformance: {
      mae: string;
      rmse: string;
      fiaSync: string;
      inferenceLatency: string;
    };
  };
}

export type PageRoute =
  | 'dashboard'
  | 'tyres'
  | 'strategy'
  | 'live'
  | 'stints'
  | 'conditions'
  | 'reports'
  | 'model';

export * from '../frontend/services/raceDataProvider/types';
