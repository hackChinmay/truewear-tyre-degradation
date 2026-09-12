import {
  DriverLeaderboardEntry,
  LapRecord,
  StintData,
  TyreCompound,
  WheelTelemetry,
} from '../../types';

export type SessionType = 'FP1' | 'FP2' | 'FP3' | 'QUALIFYING' | 'SPRINT' | 'RACE';

export interface SessionSummary {
  sessionId: string; // e.g. "2026-monza-race"
  year: number;
  round: number;
  eventName: string; // e.g. "Italian Grand Prix"
  circuitId: string; // e.g. "monza"
  circuitName: string; // e.g. "Autodromo Nazionale Monza"
  location: string;
  country: string;
  sessionType: SessionType;
  sessionDate: string;
  totalLaps: number;
}

export interface WeatherTelemetry {
  airTemp: number; // in °C
  trackTemp: number; // in °C
  humidity: number; // percentage (0-100)
  pressure: number; // mbar
  windSpeed: number; // km/h
  windDirection: number; // 0-360 degrees
  windDirectionStr: string; // e.g. "NE", "SW"
  rainfall: boolean;
  trackState: 'DRY' | 'DAMP' | 'WET';
  asphaltGripIndex: number;
  sampleTimestamp: string;
}

export interface TelemetrySample {
  distanceMeters: number;
  timeSeconds: number;
  speedKmh: number;
  throttle: number; // 0-100%
  brake: number; // 0-100%
  gear: number; // 1-8 (0=N)
  rpm: number;
  drs: boolean;
  lateralG?: number;
  longitudinalG?: number;
}

export interface LapTelemetry {
  sessionId: string;
  driverCode: string;
  lapNumber: number;
  lapTimeSeconds: number;
  lapTimeStr: string;
  compound: TyreCompound;
  tyreAge: number;
  samples: TelemetrySample[];
  wheelTelemetry: WheelTelemetry[];
}

export interface ProviderHealthStatus {
  providerId: string;
  providerName: string;
  isDemo: boolean;
  status: 'ONLINE' | 'STANDBY' | 'ERROR';
  endpointUrl: string;
  latencyMs: number;
  supportedFeatures: string[];
  notes: string;
}

/**
 * RaceDataProvider
 *
 * Clean abstraction layer separating the React UI from telemetry data sources.
 *
 * Architecture Note:
 * FastF1 is a Python-only data library (dependent on pandas, numpy, scipy, and
 * local disk caching). It cannot run natively within browser JavaScript.
 *
 * This abstraction allows the application to currently run on DemoRaceDataProvider,
 * and be swapped for a Python FastF1 REST API service without modifying the React UI.
 */
export interface RaceDataProvider {
  readonly providerId: string;
  readonly providerName: string;
  readonly isDemo: boolean;

  /**
   * List available race sessions.
   */
  getSessions(year?: number, circuitId?: string): Promise<SessionSummary[]>;

  /**
   * Retrieve driver grid and standings for a given session.
   */
  getDrivers(sessionId: string): Promise<DriverLeaderboardEntry[]>;

  /**
   * Retrieve lap records for a session, optionally filtered by driver.
   */
  getLaps(sessionId: string, driverCode?: string): Promise<LapRecord[]>;

  /**
   * Retrieve stint performance breakdowns for a session, optionally filtered by driver.
   */
  getStints(sessionId: string, driverCode?: string): Promise<StintData[]>;

  /**
   * Retrieve environmental and weather conditions for a session.
   */
  getWeather(sessionId: string): Promise<WeatherTelemetry>;

  /**
   * Retrieve high-resolution telemetry (speed, throttle, brake, gears, tyre status)
   * for a driver's specific lap.
   */
  getTelemetry(
    sessionId: string,
    driverCode: string,
    lapNumber: number
  ): Promise<LapTelemetry>;

  /**
   * Check connection status and metadata for the provider.
   */
  getProviderStatus(): Promise<ProviderHealthStatus>;
}
