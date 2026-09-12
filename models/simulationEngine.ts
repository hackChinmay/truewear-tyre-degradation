import { DriverLeaderboardEntry, WheelTelemetry, RaceEvent, TyreCompound } from '../database/types';
import { DRIVERS_GRID, getCircuitDrivers } from '../database/mockRaceData';

export interface WeatherSimulationState {
  airTemp: number;
  trackTemp: number;
  windSpeed: number;
  windDirection: string;
  humidity?: number;
  rainfall?: boolean;
  trackState?: 'DRY' | 'DAMP' | 'WET';
  trackFlag: 'GREEN' | 'YELLOW' | 'VSC' | 'SC' | 'CHECKERED';
}

export interface StrategySignalState {
  title: string;
  badge: string;
  badgeColor: string;
  confidence: number;
  netAdvantage: string;
  rejoinPrediction: string;
  pitStatus: 'TRACK' | 'BOX WINDOW' | 'PIT LANE' | 'OUT LAP';
}

export const MILESTONE_EVENTS_DATA: Record<
  number,
  { title: string; details: string; severity: 'INFO' | 'WARNING' | 'SUCCESS' | 'CRITICAL' }
> = {
  1: {
    title: 'RACE START // CLEAN RETTIFILO TRANSITION',
    details: 'All 20 cars cleanly navigate opening turns. Target car cleanly transitions on starting compound.',
    severity: 'SUCCESS',
  },
  10: {
    title: 'TRACK EVOLUTION DETECTED (+0.12s GRIP)',
    details: 'Optimal racing line rubbered in across key sectors. Telemetry decoupling active.',
    severity: 'INFO',
  },
  18: {
    title: 'TYRE DEGRADATION INCREASING (+0.078 s/lap)',
    details: 'Thermal surface drift detected on rear axle. Front-right pyrometer reaches 104°C.',
    severity: 'WARNING',
  },
  22: {
    title: 'TRAFFIC DETECTED // BACKMARKER PACK',
    details: 'Aerodynamic turbulent wake detected behind backmarkers in Sector 2. DRS buffer closed.',
    severity: 'INFO',
  },
  31: {
    title: 'TRACK TEMPERATURE PEAK (41.2°C)',
    details: 'Asphalt temperature reaches peak thermal stress point. FR pyrometer hits 108°C.',
    severity: 'WARNING',
  },
  35: {
    title: 'COMPETITOR TELEMETRY // P2 BOXES',
    details: 'Competitor calls P2 car into pit lane. Fitted fresh tyres. Clean pit release executed.',
    severity: 'INFO',
  },
  36: {
    title: 'COMPETITOR TELEMETRY // RACE LEADER PITS',
    details: 'Race leader boxes for fresh hard compound tyres. Stationary service: 2.24s.',
    severity: 'INFO',
  },
  37: {
    title: 'PIT WINDOW OPEN // STRATEGY PLAN A ARMED',
    details: 'Telemetry triggers strategic pit window L37-39. Projected clean air exit buffer confirmed.',
    severity: 'SUCCESS',
  },
  38: {
    title: 'PIT STOP EXECUTED // TARGET CAR IN PIT LANE',
    details: 'Stationary pit stop: 2.31s. Total pit transit: 21.84s. Switched compound successfully.',
    severity: 'SUCCESS',
  },
  39: {
    title: 'NEW TYRES ACTIVE // OUT-LAP COMPLETED',
    details: 'Target car successfully rejoins into clear air sector.',
    severity: 'SUCCESS',
  },
  45: {
    title: 'FASTEST LAP PACE // PURPLE SECTORS 1 & 2',
    details: 'Target car sets personal best pace on fresh hard rubber, closing delta to podium pack.',
    severity: 'SUCCESS',
  },
  53: {
    title: 'CHECKERED FLAG // RACE COMPLETED',
    details: 'Target car crosses finish line. TrueWear tyre degradation model matched reality within 0.014s/lap.',
    severity: 'SUCCESS',
  },
};

/**
 * Generates realistic lap time and sector splits
 */
export function generateLapTime(
  lap: number,
  basePace: number,
  degRate: number,
  tyreAge: number,
  isPitInLap: boolean,
  isOutLap: boolean
): { lapTimeStr: string; lapSeconds: number; s1: number; s2: number; s3: number } {
  const fuelGain = -0.058 * Math.max(0, lap - 1);
  const trackGrip = -0.025 * Math.log(lap + 1);
  const wearLoss = degRate * tyreAge;
  const variation = Math.sin(lap * 3.7) * 0.12 + Math.cos(lap * 2.1) * 0.08;

  let totalSeconds = basePace + fuelGain + trackGrip + wearLoss + variation;
  if (isPitInLap) totalSeconds += 21.8;
  if (isOutLap) totalSeconds += 1.8;

  totalSeconds = Math.max(81.5, totalSeconds);

  // Sector breakdown (approx ~32% S1, ~32% S2, ~36% S3)
  const s1 = Number(((totalSeconds / 83.279) * 26.812 + Math.sin(lap) * 0.06).toFixed(3));
  const s2 = Number(((totalSeconds / 83.279) * 26.94 + Math.cos(lap) * 0.06).toFixed(3));
  const s3 = Number((totalSeconds - s1 - s2).toFixed(3));

  const mins = Math.floor(totalSeconds / 60);
  const secs = (totalSeconds % 60).toFixed(3);
  const lapTimeStr = `${mins}:${Number(secs) < 10 ? '0' : ''}${secs}`;

  return { lapTimeStr, lapSeconds: Number(totalSeconds.toFixed(3)), s1, s2, s3 };
}

/**
 * Calculates simulated leaderboard for all drivers at current lap
 */
export function calculateDriverLeaderboard(
  lap: number,
  customPitLap: number = 38,
  circuitId: string = 'monza',
  targetDriverCode?: string
): DriverLeaderboardEntry[] {
  const grid = getCircuitDrivers(circuitId);
  return grid.map((base, idx) => {
    let compound: TyreCompound = base.compound;
    let compoundCode = base.compoundCode;
    let tyreAge = lap;
    let degRate = base.degRatePerLap;
    let pitStatus: DriverLeaderboardEntry['pitStatus'] = 'TRACK';
    let basePace = base.lastLapSeconds || 83.2;

    const isTarget = targetDriverCode ? base.driverCode === targetDriverCode : (base.isTargetDriver || idx === 0);
    const driverPitLap = isTarget ? customPitLap : (33 + (idx * 2) % 9);

    if (lap < driverPitLap) {
      compound = base.compound;
      compoundCode = base.compoundCode;
      tyreAge = lap;
      degRate = Number((0.048 + tyreAge * 0.0014).toFixed(3));
      pitStatus = lap >= driverPitLap - 2 ? 'BOX WINDOW' : 'TRACK';
    } else if (lap === driverPitLap) {
      compound = base.compound;
      compoundCode = base.compoundCode;
      tyreAge = lap;
      degRate = 0.082;
      pitStatus = 'IN PIT';
    } else if (lap === driverPitLap + 1) {
      compound = base.compound === 'HARD' ? 'MEDIUM' : 'HARD';
      compoundCode = compound === 'HARD' ? 'C2' : 'C3';
      tyreAge = 1;
      degRate = 0.042;
      pitStatus = 'OUT LAP';
    } else {
      compound = base.compound === 'HARD' ? 'MEDIUM' : 'HARD';
      compoundCode = compound === 'HARD' ? 'C2' : 'C3';
      tyreAge = Math.max(1, lap - driverPitLap);
      degRate = Number((0.042 + tyreAge * 0.0011).toFixed(3));
      pitStatus = 'TRACK';
    }

    const isPitInLap = lap === driverPitLap;
    const isOutLap = lap === driverPitLap + 1;
    const timing = generateLapTime(lap, basePace, degRate, tyreAge, isPitInLap, isOutLap);

    // Dynamic interval calculation based on relative pace
    let intervalStr = base.interval;
    let intervalSeconds = base.intervalSeconds;
    if (base.position === 1) {
      intervalStr = 'LEADER';
      intervalSeconds = 0;
    } else {
      const baseGap = (base.position - 1) * 2.8;
      const pitOffset = lap > driverPitLap ? 1.4 : 0;
      intervalSeconds = Number((baseGap + pitOffset + Math.sin(lap * 0.5 + base.position) * 0.35).toFixed(3));
      intervalStr = `+${intervalSeconds.toFixed(3)}s`;
    }

    return {
      ...base,
      compound,
      compoundCode,
      tyreAge,
      degRatePerLap: degRate,
      interval: intervalStr,
      intervalSeconds,
      lastLapTime: timing.lapTimeStr,
      lastLapSeconds: timing.lapSeconds,
      s1: timing.s1,
      s2: timing.s2,
      s3: timing.s3,
      pitStatus,
      isTargetDriver: isTarget,
    };
  });
}

/**
 * Calculates wheel thermal telemetry for Car #14
 */
export function calculateWheelTelemetry(lap: number, customPitLap: number = 38): WheelTelemetry[] {
  const isPostPit = lap > customPitLap;
  const tyreAge = isPostPit ? Math.max(1, lap - customPitLap) : Math.max(1, lap);
  const isThermalPeak = !isPostPit && lap >= 30 && lap <= 37;

  // Front Right (highest wear at Monza due to Curva Grande & Parabolica)
  const frWear = isPostPit ? Math.min(95, 10 + tyreAge * 1.5) : Math.min(95, 6 + tyreAge * 2.1);
  const frSurface = isThermalPeak
    ? Number((106 + (lap - 30) * 0.35).toFixed(1))
    : isPostPit
    ? Number((99 + tyreAge * 0.2).toFixed(1))
    : Number((98 + tyreAge * 0.25).toFixed(1));

  // Front Left
  const flWear = isPostPit ? Math.min(90, 8 + tyreAge * 1.3) : Math.min(90, 5 + tyreAge * 1.8);
  const flSurface = isThermalPeak ? 104 : isPostPit ? 98 : 99;

  // Rear Left
  const rlWear = isPostPit ? Math.min(85, 7 + tyreAge * 1.1) : Math.min(85, 5 + tyreAge * 1.5);
  const rlSurface = isThermalPeak ? 101 : 97;

  // Rear Right
  const rrWear = isPostPit ? Math.min(88, 8 + tyreAge * 1.2) : Math.min(88, 5 + tyreAge * 1.6);
  const rrSurface = isThermalPeak ? 102 : 98;

  const compoundStr = isPostPit ? 'C2 HARD' : 'C3 MEDIUM';

  return [
    {
      corner: 'FL',
      label: `FL // FRONT LEFT [${compoundStr}]`,
      surfaceTemp: flSurface,
      carcassTemp: Math.round(flSurface - 4),
      pressure: Number((21.5 + (flSurface - 95) * 0.05).toFixed(1)),
      wearPercent: Math.round(flWear),
      status: flSurface > 105 ? 'THERMAL PEAK' : flSurface > 101 ? 'MODERATE STRESS' : 'NOMINAL',
      grainingStatus: tyreAge > 25 ? 'MODERATE' : tyreAge > 15 ? 'MINOR' : 'NONE',
      blisterProbability: Math.min(90, Math.round(tyreAge * 1.1)),
      tractionStatus: frWear > 70 ? 'DEGRADED' : 'OPTIMAL',
    },
    {
      corner: 'FR',
      label: `FR // FRONT RIGHT [${compoundStr}]`,
      surfaceTemp: frSurface,
      carcassTemp: Math.round(frSurface - 4),
      pressure: Number((21.8 + (frSurface - 95) * 0.06).toFixed(1)),
      wearPercent: Math.round(frWear),
      status: frSurface >= 107 ? 'THERMAL PEAK' : frSurface > 102 ? 'MODERATE STRESS' : 'NOMINAL',
      grainingStatus: tyreAge > 22 ? 'MODERATE' : tyreAge > 12 ? 'MINOR' : 'NONE',
      blisterProbability: Math.min(95, Math.round(tyreAge * 1.4)),
      tractionStatus: frWear > 65 ? 'DEGRADED' : 'OPTIMAL',
    },
    {
      corner: 'RL',
      label: `RL // REAR LEFT [${compoundStr}]`,
      surfaceTemp: rlSurface,
      carcassTemp: Math.round(rlSurface - 4),
      pressure: Number((20.9 + (rlSurface - 95) * 0.04).toFixed(1)),
      wearPercent: Math.round(rlWear),
      status: 'NOMINAL',
      grainingStatus: 'NONE',
      blisterProbability: Math.min(80, Math.round(tyreAge * 0.7)),
      tractionStatus: 'OPTIMAL',
    },
    {
      corner: 'RR',
      label: `RR // REAR RIGHT [${compoundStr}]`,
      surfaceTemp: rrSurface,
      carcassTemp: Math.round(rrSurface - 4),
      pressure: Number((21.1 + (rrSurface - 95) * 0.04).toFixed(1)),
      wearPercent: Math.round(rrWear),
      status: 'NOMINAL',
      grainingStatus: 'NONE',
      blisterProbability: Math.min(80, Math.round(tyreAge * 0.8)),
      tractionStatus: 'OPTIMAL',
    },
  ];
}

/**
 * Calculates ambient weather for the lap based on circuit physical micro-climate
 */
export function calculateWeather(
  lap: number,
  totalLaps: number = 53,
  nominalTrackTemp: number = 39.4,
  nominalAirTemp: number = 24.2
): WeatherSimulationState {
  const progress = lap / totalLaps;
  const airTemp = Number((nominalAirTemp + progress * 0.4).toFixed(1));
  const baseDelta = nominalTrackTemp - 39.4;
  const trackTemp = Number(
    (nominalTrackTemp - 3.2 + (lap <= 31 ? (lap / 31) * 5.0 : 5.0 - ((lap - 31) / 22) * 1.8)).toFixed(1)
  );
  const windSpeed = Number((11.4 + Math.sin(lap * 0.4) * 0.9).toFixed(1));
  const trackFlag = lap >= totalLaps ? 'CHECKERED' : 'GREEN';

  return {
    airTemp,
    trackTemp,
    windSpeed,
    windDirection: nominalTrackTemp > 35 ? 'NE' : 'SW',
    humidity: 48,
    rainfall: false,
    trackState: 'DRY',
    trackFlag,
  };
}

/**
 * Generates dynamic AI strategy signal from current race state
 */
export function calculateStrategySignal(
  lap: number,
  customPitLap: number = 38,
  activePlan: 'A' | 'B' | 'C' = 'A',
  totalLaps: number = 53,
  circuitId: string = 'monza',
  targetDriverCode: string = 'LEC'
): StrategySignalState {
  const grid = getCircuitDrivers(circuitId);
  const targetDriver = grid.find((d) => d.driverCode === targetDriverCode) || grid[0];
  const targetPos = targetDriver?.position || 4;

  // Real rival immediately behind target car
  const rivalBehind =
    grid.find((d) => d.position === targetPos + 1) ||
    grid.find((d) => d.driverCode !== targetDriverCode) ||
    grid[4] ||
    { driverName: 'L. Norris', position: 5 };

  // Real rival immediately ahead of target car
  const rivalAhead =
    grid.find((d) => d.position === Math.max(1, targetPos - 1)) ||
    grid[0] ||
    { driverName: 'O. Piastri', position: 2 };

  const rivalBehindStr = `P${rivalBehind.position} ${rivalBehind.driverName}`;
  const rivalAheadStr = `P${rivalAhead.position} ${rivalAhead.driverName}`;
  const myPosStr = `P${targetPos}`;

  if (lap >= totalLaps) {
    return {
      title: `RACE FINISHED // ${myPosStr} RESULT SECURED`,
      badge: 'FINISH',
      badgeColor: 'bg-purple-900 text-purple-200 border-purple-700',
      confidence: 100,
      netAdvantage: '+3.4s overall',
      rejoinPrediction: `${myPosStr} (+8.4s buffer ahead of ${rivalBehindStr})`,
      pitStatus: 'TRACK',
    };
  }

  if (lap === customPitLap) {
    return {
      title: 'BOX NOW // PIT ENTRY THIS LAP - SWITCH TO HARD (C2)',
      badge: 'BOX NOW',
      badgeColor: 'bg-red-950 text-red-300 border-red-700',
      confidence: 99,
      netAdvantage: '-2.8s net transit',
      rejoinPrediction: `Rejoin in ${myPosStr} (+4.2s clean air buffer ahead of ${rivalBehindStr})`,
      pitStatus: 'PIT LANE',
    };
  }

  if (lap === customPitLap + 1) {
    return {
      title: 'PLAN A ACTIVE // FRESH HARDS FITTED - OUT-LAP CLEAR',
      badge: 'RACING',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
      confidence: 94,
      netAdvantage: '+3.1s clean air delta',
      rejoinPrediction: `${myPosStr} (+5.8s buffer ahead of ${rivalBehindStr}, targeting ${rivalAheadStr})`,
      pitStatus: 'OUT LAP',
    };
  }

  if (lap >= customPitLap - 3 && lap < customPitLap) {
    return {
      title: `STRATEGY SIGNAL // PIT WINDOW ARMED (LAP ${customPitLap - 1} - ${customPitLap + 1})`,
      badge: 'PIT',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
      confidence: 89,
      netAdvantage: '-2.8s net gain',
      rejoinPrediction: `${myPosStr} (+4.2s clean air buffer ahead of ${rivalBehindStr})`,
      pitStatus: 'BOX WINDOW',
    };
  }

  if (lap > customPitLap + 1) {
    return {
      title: 'STINT 2 ATTACK // HARD TYRE PACE STABLE',
      badge: 'ATTACK',
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-700',
      confidence: 92,
      netAdvantage: '+2.4s net equity',
      rejoinPrediction: `${myPosStr} comfortably holding gap to ${rivalBehindStr}`,
      pitStatus: 'TRACK',
    };
  }

  // Early in the race
  return {
    title: 'STAY OUT // TYRE DEGRADATION WITHIN NOMINAL TOLERANCE',
    badge: 'STAY',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    confidence: 94,
    netAdvantage: '+3.2s vs target delta',
    rejoinPrediction: `Target Pit Window: Lap ${customPitLap - 1} - ${customPitLap + 1} (Defends against ${rivalBehindStr})`,
    pitStatus: 'TRACK',
  };
}

/**
 * Returns chronological race events up to current lap
 */
export function getEventsUpToLap(lap: number): RaceEvent[] {
  const result: RaceEvent[] = [];
  const laps = Object.keys(MILESTONE_EVENTS_DATA)
    .map(Number)
    .sort((a, b) => a - b);

  for (const milestoneLap of laps) {
    if (milestoneLap <= lap) {
      const data = MILESTONE_EVENTS_DATA[milestoneLap];
      const hour = 14 + Math.floor((milestoneLap * 1.4) / 60);
      const min = Math.floor((milestoneLap * 1.4) % 60);
      const sec = (milestoneLap * 17) % 60;
      const timeStr = `${hour}:${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;

      result.unshift({
        id: `sim-ev-${milestoneLap}`,
        lap: milestoneLap,
        timeStr,
        type:
          milestoneLap === 1
            ? 'FLAG'
            : milestoneLap === 38
            ? 'PIT_STOP'
            : milestoneLap === 31
            ? 'THERMAL_PEAK'
            : 'PIT_TRIGGER',
        title: data.title,
        details: data.details,
        severity: data.severity,
      });
    }
  }

  return result;
}
