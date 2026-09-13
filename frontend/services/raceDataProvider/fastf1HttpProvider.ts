import {
  DriverLeaderboardEntry,
  LapRecord,
  StintData,
  TyreCompound,
  WheelTelemetry,
} from '../../types';
import {
  LapTelemetry,
  ProviderHealthStatus,
  RaceDataProvider,
  SessionSummary,
  TelemetrySample,
  WeatherTelemetry,
} from './types';
import { DemoRaceDataProvider } from './demoProvider';
import { WHEEL_TELEMETRY_DATA } from '../../data/mockRaceData';
import { API_BASE_URL } from '../../config/api';

export interface FastF1HttpProviderConfig {
  baseUrl: string;
  fallbackToDemoOnFailure: boolean;
  timeoutMs: number;
}

export const DEFAULT_FASTF1_CONFIG: FastF1HttpProviderConfig = {
  baseUrl: API_BASE_URL,
  fallbackToDemoOnFailure: true,
  timeoutMs: 5000,
};

/**
 * FastF1HttpRaceDataProvider
 *
 * Concrete RaceDataProvider that connects to an external Python FastF1 backend service.
 *
 * ARCHITECTURAL NOTE:
 * FastF1 is a Python library (pip install fastf1) that processes Formula 1 timing
 * protocols, extracts car telemetry, and manages disk caches. Browser JavaScript
 * cannot run FastF1 directly. This class serves as the HTTP REST bridge to a
 * Python service running FastF1 (e.g. FastAPI / Flask / Gunicorn).
 *
 * Replacing DemoRaceDataProvider with this service requires zero changes to the React UI.
 */
export class FastF1HttpRaceDataProvider implements RaceDataProvider {
  readonly providerId = 'fastf1-python-http';
  readonly providerName = 'Python FastF1 API Service (HTTP Bridge)';
  readonly isDemo = false;

  private config: FastF1HttpProviderConfig;
  private fallbackProvider = new DemoRaceDataProvider();

  constructor(config: Partial<FastF1HttpProviderConfig> = {}) {
    this.config = { ...DEFAULT_FASTF1_CONFIG, ...config };
  }

  private async fetchWithTimeout<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const url = `${this.config.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`FastF1 HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async getSessions(year: number = 2024, circuitId?: string): Promise<SessionSummary[]> {
    try {
      const params = new URLSearchParams();
      if (year) params.set('year', String(year));
      if (circuitId) params.set('circuit', circuitId);
      const query = params.toString() ? `?${params.toString()}` : '';

      let raw: any;
      try {
        raw = await this.fetchWithTimeout<any>(`sessions${query}`);
      } catch {
        raw = await this.fetchWithTimeout<any>('sessions');
      }

      if (Array.isArray(raw)) {
        return raw;
      } else if (raw && Array.isArray(raw.events)) {
        return raw.events.map((ev: any) => ({
          sessionId: `${year}-${ev.round || 16}-race`,
          year,
          round: ev.round || 16,
          eventName: ev.officialEventName || ev.eventName || 'Italian Grand Prix',
          circuitId: (ev.location || 'monza').toLowerCase().replace(/\s+/g, '-'),
          circuitName: ev.location || 'Autodromo Nazionale Monza',
          location: ev.location || 'Monza',
          country: ev.country || 'Italy',
          sessionType: 'RACE' as const,
          sessionDate: ev.eventDate || new Date().toISOString(),
          totalLaps: 53,
        }));
      }
      return this.fallbackProvider.getSessions(year, circuitId);
    } catch (err) {
      if (this.config.fallbackToDemoOnFailure) {
        return this.fallbackProvider.getSessions(year, circuitId);
      }
      throw err;
    }
  }

  async getDrivers(sessionId: string): Promise<DriverLeaderboardEntry[]> {
    try {
      try {
        return await this.fetchWithTimeout<DriverLeaderboardEntry[]>(
          `sessions/${sessionId}/drivers`
        );
      } catch {
        return await this.fetchWithTimeout<DriverLeaderboardEntry[]>('drivers');
      }
    } catch (err) {
      if (this.config.fallbackToDemoOnFailure) {
        return this.fallbackProvider.getDrivers(sessionId);
      }
      throw err;
    }
  }

  async getLaps(sessionId: string, driverCode?: string): Promise<LapRecord[]> {
    try {
      const query = driverCode ? `?driver=${encodeURIComponent(driverCode)}` : '';
      try {
        return await this.fetchWithTimeout<LapRecord[]>(
          `sessions/${sessionId}/laps${query}`
        );
      } catch {
        return await this.fetchWithTimeout<LapRecord[]>(`laps${query}`);
      }
    } catch (err) {
      if (this.config.fallbackToDemoOnFailure) {
        return this.fallbackProvider.getLaps(sessionId, driverCode);
      }
      throw err;
    }
  }

  async getStints(sessionId: string, driverCode?: string): Promise<StintData[]> {
    try {
      const query = driverCode ? `?driver=${encodeURIComponent(driverCode)}` : '';
      try {
        return await this.fetchWithTimeout<StintData[]>(
          `sessions/${sessionId}/stints${query}`
        );
      } catch {
        return await this.fetchWithTimeout<StintData[]>(`stints${query}`);
      }
    } catch (err) {
      if (this.config.fallbackToDemoOnFailure) {
        return this.fallbackProvider.getStints(sessionId, driverCode);
      }
      throw err;
    }
  }

  async getWeather(sessionId: string): Promise<WeatherTelemetry> {
    try {
      const circuitId = (sessionId.split('-')[1] || 'monza').toLowerCase();
      const roundMap: Record<string, number> = {
        monza: 16,
        silverstone: 12,
        spa: 14,
      };
      const roundNum = roundMap[circuitId] || 16;

      let raw: any;
      try {
        raw = await this.fetchWithTimeout<any>(
          `weather?year=2024&round_num=${roundNum}&circuit=${circuitId}&session_type=R`
        );
      } catch {
        try {
          raw = await this.fetchWithTimeout<any>(`sessions/${sessionId}/weather`);
        } catch {
          raw = await this.fetchWithTimeout<any>(`weather?circuit=${circuitId}`);
        }
      }

      if (raw && (raw.trackTemp !== undefined || raw.airTemp !== undefined)) {
        const airTemp = Number(raw.airTemp ?? 27.2);
        const trackTemp = Number(raw.trackTemp ?? 38.4);
        const humidity = Number(raw.humidity ?? 45.0);
        const windSpeed = Number(raw.windSpeed ?? 11.4);
        const windDirection = Number(raw.windDirection ?? 180.0);
        const rainfall = Boolean(raw.rainfall);

        return {
          airTemp,
          trackTemp,
          humidity,
          pressure: Number(raw.pressure ?? 1014.2),
          windSpeed,
          windDirection,
          windDirectionStr: raw.windDirectionStr || (windDirection >= 90 && windDirection <= 270 ? 'S' : 'NE'),
          rainfall,
          trackState: raw.trackState || (rainfall ? 'WET' : 'DRY'),
          asphaltGripIndex: Number(raw.asphaltGripIndex ?? 1.042),
          sampleTimestamp: raw.sampleTimestamp || new Date().toISOString(),
        };
      }

      return this.fallbackProvider.getWeather(sessionId);
    } catch (err) {
      if (this.config.fallbackToDemoOnFailure) {
        return this.fallbackProvider.getWeather(sessionId);
      }
      throw err;
    }
  }

  async getTelemetry(
    sessionId: string,
    driverCode: string,
    lapNumber: number
  ): Promise<LapTelemetry> {
    try {
      const circuitId = (sessionId.split('-')[1] || 'monza').toLowerCase();
      const roundMap: Record<string, number> = {
        monza: 16,
        silverstone: 12,
        spa: 14,
      };
      const roundNum = roundMap[circuitId] || 16;

      let raw: any;
      try {
        raw = await this.fetchWithTimeout<any>(
          `telemetry?driver_code=${encodeURIComponent(driverCode)}&lap_number=${lapNumber}&year=2024&round_num=${roundNum}&circuit=${circuitId}&session_type=R`
        );
      } catch {
        try {
          raw = await this.fetchWithTimeout<any>(
            `sessions/${sessionId}/telemetry/${driverCode}/${lapNumber}`
          );
        } catch {
          raw = await this.fetchWithTimeout<any>(
            `telemetry?driver=${encodeURIComponent(driverCode)}&lap=${lapNumber}&circuit=${circuitId}`
          );
        }
      }

      const pointsArray = Array.isArray(raw?.telemetry)
        ? raw.telemetry
        : Array.isArray(raw?.samples)
        ? raw.samples
        : Array.isArray(raw)
        ? raw
        : [];

      if (pointsArray.length > 0) {
        const samples: TelemetrySample[] = pointsArray.map((p: any, idx: number) => ({
          distanceMeters: Number(p.distance ?? p.distanceMeters ?? idx * 50),
          timeSeconds: Number(p.timeSeconds ?? idx * 0.8),
          speedKmh: Number(p.speed ?? p.speedKmh ?? 295),
          throttle: Number(p.throttle ?? 85),
          brake: Number(p.brake ?? 0),
          gear: Number(p.gear ?? p.nGear ?? 6),
          rpm: Number(p.rpm ?? 11500),
          drs: Boolean(p.drs),
        }));

        const demoTel = JSON.parse(JSON.stringify(WHEEL_TELEMETRY_DATA)) as WheelTelemetry[];

        return {
          sessionId,
          driverCode,
          lapNumber: Number(raw.lap ?? raw.lapNumber ?? lapNumber),
          lapTimeSeconds: Number(raw.lapTimeSeconds ?? 81.432),
          lapTimeStr: raw.lapTimeStr || '1:21.432',
          compound: (raw.compound || (lapNumber > 38 ? 'HARD' : 'MEDIUM')) as TyreCompound,
          tyreAge: Number(raw.tyreAge ?? lapNumber),
          samples,
          wheelTelemetry: demoTel,
        };
      }

      return this.fallbackProvider.getTelemetry(sessionId, driverCode, lapNumber);
    } catch (err) {
      if (this.config.fallbackToDemoOnFailure) {
        return this.fallbackProvider.getTelemetry(sessionId, driverCode, lapNumber);
      }
      throw err;
    }
  }

  async getProviderStatus(): Promise<ProviderHealthStatus> {
    const start = performance.now();
    try {
      let res: { status?: string; version?: string; fastf1Version?: string } | null = null;
      try {
        res = await this.fetchWithTimeout<{
          status?: string;
          version?: string;
          fastf1Version?: string;
        }>('health');
      } catch {
        res = await this.fetchWithTimeout<{
          status?: string;
          version?: string;
          fastf1Version?: string;
        }>('status');
      }

      const latencyMs = Number((performance.now() - start).toFixed(1));

      return {
        providerId: this.providerId,
        providerName: this.providerName,
        isDemo: false,
        status: 'ONLINE',
        endpointUrl: this.config.baseUrl,
        latencyMs,
        supportedFeatures: [
          'getSessions',
          'getDrivers',
          'getLaps',
          'getStints',
          'getWeather',
          'getTelemetry',
        ],
        notes: `Connected to Python FastF1 backend daemon (FastF1 ${res?.fastf1Version || 'installed'}).`,
      };
    } catch {
      return {
        providerId: this.providerId,
        providerName: this.providerName,
        isDemo: false,
        status: 'STANDBY',
        endpointUrl: this.config.baseUrl,
        latencyMs: 0,
        supportedFeatures: [
          'getSessions',
          'getDrivers',
          'getLaps',
          'getStints',
          'getWeather',
          'getTelemetry',
        ],
        notes:
          'Python FastF1 backend endpoint unreachable. Running in automatic fallback mode (DemoRaceDataProvider).',
      };
    }
  }
}
