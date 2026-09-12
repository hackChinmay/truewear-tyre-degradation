import {
  DriverLeaderboardEntry,
  LapRecord,
  StintData,
  WheelTelemetry,
} from '../../types';
import {
  CIRCUITS,
  DRIVERS_GRID,
  HISTORICAL_LAPS,
  STINTS_DATA,
  WHEEL_TELEMETRY_DATA,
} from '../../data/mockRaceData';
import {
  LapTelemetry,
  ProviderHealthStatus,
  RaceDataProvider,
  SessionSummary,
  TelemetrySample,
  WeatherTelemetry,
} from './types';

/**
 * DemoRaceDataProvider
 *
 * Implements the RaceDataProvider interface using the verified local demo dataset.
 * Allows the entire application to function offline or in demo mode with full fidelity.
 */
export class DemoRaceDataProvider implements RaceDataProvider {
  readonly providerId = 'demo-local';
  readonly providerName = 'DemoRaceDataProvider (Local Dataset)';
  readonly isDemo = true;

  private sessionsCache: SessionSummary[] = [
    {
      sessionId: '2026-monza-race',
      year: 2026,
      round: 16,
      eventName: 'Italian Grand Prix',
      circuitId: 'monza',
      circuitName: CIRCUITS.monza.name,
      location: CIRCUITS.monza.location,
      country: CIRCUITS.monza.country,
      sessionType: 'RACE',
      sessionDate: '2026-09-06',
      totalLaps: CIRCUITS.monza.totalLaps,
    },
    {
      sessionId: '2026-monza-qualifying',
      year: 2026,
      round: 16,
      eventName: 'Italian Grand Prix',
      circuitId: 'monza',
      circuitName: CIRCUITS.monza.name,
      location: CIRCUITS.monza.location,
      country: CIRCUITS.monza.country,
      sessionType: 'QUALIFYING',
      sessionDate: '2026-09-05',
      totalLaps: 24,
    },
    {
      sessionId: '2026-silverstone-race',
      year: 2026,
      round: 12,
      eventName: 'British Grand Prix',
      circuitId: 'silverstone',
      circuitName: CIRCUITS.silverstone.name,
      location: CIRCUITS.silverstone.location,
      country: CIRCUITS.silverstone.country,
      sessionType: 'RACE',
      sessionDate: '2026-07-12',
      totalLaps: CIRCUITS.silverstone.totalLaps,
    },
    {
      sessionId: '2026-spa-race',
      year: 2026,
      round: 14,
      eventName: 'Belgian Grand Prix',
      circuitId: 'spa',
      circuitName: CIRCUITS.spa.name,
      location: CIRCUITS.spa.location,
      country: CIRCUITS.spa.country,
      sessionType: 'RACE',
      sessionDate: '2026-08-30',
      totalLaps: CIRCUITS.spa.totalLaps,
    },
  ];

  async getSessions(year?: number, circuitId?: string): Promise<SessionSummary[]> {
    let filtered = [...this.sessionsCache];
    if (year) {
      filtered = filtered.filter((s) => s.year === year);
    }
    if (circuitId) {
      filtered = filtered.filter((s) => s.circuitId.toLowerCase() === circuitId.toLowerCase());
    }
    return filtered;
  }

  async getDrivers(sessionId: string): Promise<DriverLeaderboardEntry[]> {
    // Return copy of the grid
    return JSON.parse(JSON.stringify(DRIVERS_GRID));
  }

  async getLaps(sessionId: string, driverCode?: string): Promise<LapRecord[]> {
    const laps = JSON.parse(JSON.stringify(HISTORICAL_LAPS)) as LapRecord[];
    if (!driverCode || driverCode === 'RAO') {
      return laps;
    }

    // Adapt pace offset slightly for other drivers in demo mode
    const driver = DRIVERS_GRID.find((d) => d.driverCode === driverCode);
    const paceDelta = driver ? (driver.position - 4) * 0.12 : 0;

    return laps.map((l) => ({
      ...l,
      lapTimeSeconds: Number((l.lapTimeSeconds + paceDelta).toFixed(3)),
    }));
  }

  async getStints(sessionId: string, driverCode?: string): Promise<StintData[]> {
    const stints = JSON.parse(JSON.stringify(STINTS_DATA)) as StintData[];
    if (!driverCode || driverCode === 'RAO') {
      return stints;
    }

    const driver = DRIVERS_GRID.find((d) => d.driverCode === driverCode);
    if (driver && driver.compound) {
      stints[1] = {
        ...stints[1],
        compound: driver.compound,
        compoundCode: driver.compoundCode,
        totalLaps: driver.tyreAge,
      };
    }
    return stints;
  }

  async getWeather(sessionId: string): Promise<WeatherTelemetry> {
    const session = this.sessionsCache.find((s) => s.sessionId === sessionId);
    const circuitId = session?.circuitId || 'monza';
    const circuit = CIRCUITS[circuitId] || CIRCUITS.monza;

    return {
      airTemp: circuit.nominalAirTemp,
      trackTemp: circuit.nominalTrackTemp,
      humidity: 48,
      pressure: 1014.2,
      windSpeed: 11.4,
      windDirection: 45,
      windDirectionStr: 'NE',
      rainfall: false,
      trackState: 'DRY',
      asphaltGripIndex: 1.042,
      sampleTimestamp: new Date().toISOString(),
    };
  }

  async getTelemetry(
    sessionId: string,
    driverCode: string,
    lapNumber: number
  ): Promise<LapTelemetry> {
    const driver = DRIVERS_GRID.find((d) => d.driverCode === driverCode) || DRIVERS_GRID[3];
    const session = this.sessionsCache.find((s) => s.sessionId === sessionId);
    const circuitLengthMeters = (CIRCUITS[session?.circuitId || 'monza']?.lengthKm || 5.793) * 1000;

    // Generate ~60 sampled points around the lap profile
    const numSamples = 60;
    const samples: TelemetrySample[] = [];
    const baseLapTime = 83.2;

    for (let i = 0; i < numSamples; i++) {
      const fraction = i / (numSamples - 1);
      const distance = Math.round(fraction * circuitLengthMeters);
      const time = Number((fraction * baseLapTime).toFixed(2));

      // Speed profile modeling straights, braking zones, corners
      const cornerPhase = Math.sin(fraction * Math.PI * 8);
      let speed = 260 + cornerPhase * 95;
      let throttle = 100;
      let brake = 0;
      let gear = 7;
      let drs = false;

      if (cornerPhase < -0.4) {
        // Heavy braking zone into chicane
        speed = 85 + Math.abs(cornerPhase) * 40;
        throttle = 0;
        brake = 85;
        gear = 2;
      } else if (cornerPhase < 0.1) {
        // Mid-corner apex
        speed = 135 + cornerPhase * 50;
        throttle = 45;
        brake = 0;
        gear = 3;
      } else if (fraction > 0.85 || (fraction > 0.35 && fraction < 0.45)) {
        // DRS zone (main straight & back straight)
        speed = 335;
        gear = 8;
        drs = true;
      }

      const rpm = Math.min(12500, Math.round(speed * 36 + 2500));

      samples.push({
        distanceMeters: distance,
        timeSeconds: time,
        speedKmh: Math.round(speed),
        throttle: Math.round(throttle),
        brake: Math.round(brake),
        gear,
        rpm,
        drs,
        lateralG: Number((cornerPhase * 3.4).toFixed(2)),
        longitudinalG: brake > 0 ? -4.2 : throttle > 80 ? 1.4 : 0.2,
      });
    }

    return {
      sessionId,
      driverCode: driver.driverCode,
      lapNumber,
      lapTimeSeconds: baseLapTime,
      lapTimeStr: '1:23.200',
      compound: driver.compound,
      tyreAge: driver.tyreAge,
      samples,
      wheelTelemetry: JSON.parse(JSON.stringify(WHEEL_TELEMETRY_DATA)) as WheelTelemetry[],
    };
  }

  async getProviderStatus(): Promise<ProviderHealthStatus> {
    return {
      providerId: this.providerId,
      providerName: this.providerName,
      isDemo: true,
      status: 'ONLINE',
      endpointUrl: 'in-memory (Local Demo Dataset)',
      latencyMs: 1.4,
      supportedFeatures: [
        'getSessions',
        'getDrivers',
        'getLaps',
        'getStints',
        'getWeather',
        'getTelemetry',
      ],
      notes:
        'Active provider: DemoRaceDataProvider using local calibration dataset. FastF1 Python REST API adapter is configured and ready for drop-in replacement.',
    };
  }
}

export const demoRaceDataProvider = new DemoRaceDataProvider();
