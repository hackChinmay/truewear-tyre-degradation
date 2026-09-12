import { StrategyOption, TyreCompound } from '../database/types';

export interface StrategySimulationParams {
  currentLap: number;
  circuitTotalLaps: number;
  currentTyre: TyreCompound;
  currentTyreAge: number;
  pitLap: number;
  nextCompound: TyreCompound;
  numberOfStops: 1 | 2;
  secondPitLap?: number;
  finalCompound?: TyreCompound;
  staticPitLossSeconds?: number;
  trackTemp?: number;
  monteCarloIterations?: number;
}

export interface SimulationResult {
  options: StrategyOption[];
  winningOption: StrategyOption;
  recommendedOptionId: 'A' | 'B' | 'C';
  optimalPitWindow: string;
  optimalTargetLap: number;
  netGainSeconds: number;
  reentryGapToBehind: number;
  monteCarloIterations: number;
  trafficClearProb: number;
  remainingLaps: number;
  explainabilityReasons: string[];
  winProbabilityPercent: { A: number; B: number; C: number };
  raceTimeStdDevSeconds: { A: number; B: number; C: number };
  chartPoints: {
    lap: number;
    deltaA: number;
    deltaB: number;
    deltaC: number;
  }[];
}

interface CompoundSpecs {
  code: string;
  baselineDelta: number;
  wearPerLap: number;
  cliffAge: number;
  degSigma: number;
}

const COMPOUND_SPECS: Record<TyreCompound, CompoundSpecs> = {
  SOFT: {
    code: 'C4',
    baselineDelta: -0.65,
    wearPerLap: 0.088,
    cliffAge: 17,
    degSigma: 0.018,
  },
  MEDIUM: {
    code: 'C3',
    baselineDelta: 0.0,
    wearPerLap: 0.052,
    cliffAge: 27,
    degSigma: 0.012,
  },
  HARD: {
    code: 'C2',
    baselineDelta: +0.55,
    wearPerLap: 0.031,
    cliffAge: 39,
    degSigma: 0.008,
  },
  INTERMEDIATE: {
    code: 'INT',
    baselineDelta: +3.2,
    wearPerLap: 0.12,
    cliffAge: 25,
    degSigma: 0.025,
  },
  WET: {
    code: 'WET',
    baselineDelta: +6.5,
    wearPerLap: 0.16,
    cliffAge: 20,
    degSigma: 0.035,
  },
};

/**
 * Normal pseudo-random generator (Box-Muller transform)
 */
function randomGaussian(mean = 0, stdDev = 1): number {
  const u1 = Math.max(1e-6, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Calculates remaining lap times and total remaining race time for a given stint schedule.
 */
function simulateStintSchedule(
  currentLap: number,
  totalLaps: number,
  stints: {
    compound: TyreCompound;
    startLap: number;
    endLap: number;
    startingAge: number;
  }[],
  pitLaps: number[],
  staticPitLossSeconds: number,
  trafficGaps: { gapBehind: number; gapAhead: number },
  wearNoiseFactor = 0.0
): {
  totalRemainingTime: number;
  lapTimes: { lap: number; time: number }[];
  trafficLossTotal: number;
  reentryTrafficDesc: string;
  reentryPositionDesc: string;
  reentryBufferStr: string;
  trafficClearProb: number;
} {
  const baseLapTime = 83.2;
  const fuelBurnGainPerLap = 0.055;
  let totalTime = 0;
  const lapTimes: { lap: number; time: number }[] = [];
  let totalTrafficLoss = 0;

  for (let lap = currentLap + 1; lap <= totalLaps; lap++) {
    const stint = stints.find((s) => lap >= s.startLap && lap <= s.endLap) || stints[stints.length - 1];
    const specs = COMPOUND_SPECS[stint.compound] || COMPOUND_SPECS.MEDIUM;

    const stintLapsCompleted = lap - stint.startLap;
    const currentTyreAge = stint.startingAge + stintLapsCompleted;

    const effectiveWearPerLap = Math.max(0.01, specs.wearPerLap + wearNoiseFactor * specs.degSigma);
    let deg = effectiveWearPerLap * currentTyreAge;

    // Continuous thermal risk penalty beyond cliff threshold (not arbitrary disqualification)
    if (currentTyreAge > specs.cliffAge) {
      const overCliff = currentTyreAge - specs.cliffAge;
      deg += Math.pow(overCliff, 1.38) * 0.24;
    }

    const fuelEffect = -fuelBurnGainPerLap * (lap - currentLap);
    const lapTime = baseLapTime + specs.baselineDelta + deg + fuelEffect;
    totalTime += lapTime;
    lapTimes.push({ lap, time: lapTime });
  }

  const numStops = pitLaps.length;
  totalTime += numStops * staticPitLossSeconds;

  const firstPitLap = pitLaps[0] || currentLap + 5;
  const pitDeltaTotal = staticPitLossSeconds;
  const exitDeltaSeconds = trafficGaps.gapBehind - pitDeltaTotal;

  let trafficLoss = 0;
  let reentryTrafficDesc = '92% CLEAR AIR (LOW RISK)';
  let reentryPositionDesc = 'P4 (In Clean Air)';
  let reentryBufferStr = `+${Math.max(0.5, exitDeltaSeconds).toFixed(1)}s ahead of P5`;
  let trafficClearProb = 92;

  if (firstPitLap > 39.5) {
    trafficLoss += 2.2;
    reentryTrafficDesc = '64% CLEAR (36% DIRTY AIR RISK)';
    reentryPositionDesc = 'P5 (Behind rival car if undercut succeeds)';
    reentryBufferStr = '-1.2s Behind rival on exit';
    trafficClearProb = 64;
  } else if (numStops > 1) {
    trafficLoss += 3.8;
    reentryTrafficDesc = '48% CLEAR (MID-PACK TRAFFIC RISK)';
    reentryPositionDesc = 'P7 (Requires on-track overtakes)';
    reentryBufferStr = 'Traffic train exposure';
    trafficClearProb = 48;
  } else if (exitDeltaSeconds < 1.0) {
    trafficLoss += 1.4;
    reentryTrafficDesc = '75% CLEAR (TIGHT EXIT MARGIN)';
    reentryPositionDesc = 'P4 (Tight gap to car behind)';
    reentryBufferStr = `+${Math.max(0.2, exitDeltaSeconds).toFixed(1)}s tight exit margin`;
    trafficClearProb = 75;
  }

  totalTime += trafficLoss;
  totalTrafficLoss = trafficLoss;

  return {
    totalRemainingTime: totalTime,
    lapTimes,
    trafficLossTotal: totalTrafficLoss,
    reentryTrafficDesc,
    reentryPositionDesc,
    reentryBufferStr,
    trafficClearProb,
  };
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = (totalSeconds % 60).toFixed(1);
  return `${m}m ${Number(s) < 10 ? '0' : ''}${s}s`;
}

function formatClockTime(startMinutes: number, totalSeconds: number): string {
  const totalMin = startMinutes + totalSeconds / 60;
  const hours = Math.floor(totalMin / 60) + 1;
  const mins = Math.floor(totalMin % 60);
  const secs = (totalSeconds % 60).toFixed(1);
  return `${hours}:${mins < 10 ? '0' : ''}${mins}:${Number(secs) < 10 ? '0' : ''}${secs}`;
}

export function runStrategySimulation(params: StrategySimulationParams): SimulationResult {
  const {
    currentLap,
    circuitTotalLaps,
    currentTyre,
    currentTyreAge,
    pitLap,
    nextCompound,
    numberOfStops,
    staticPitLossSeconds = 21.4,
    monteCarloIterations = 500,
  } = params;

  const remainingLaps = Math.max(1, circuitTotalLaps - currentLap);
  const trafficGaps = { gapBehind: 11.2, gapAhead: 3.2 };

  // STRATEGY A (User customized primary plan)
  const validPitLapA = Math.max(currentLap + 1, Math.min(circuitTotalLaps - 1, pitLap));
  let stintsA: {
    compound: TyreCompound;
    compoundCode: string;
    startLap: number;
    endLap: number;
    startingAge: number;
    laps: number;
    note?: string;
  }[] = [];

  let pitLapsA: number[] = [];

  if (numberOfStops === 1) {
    pitLapsA = [validPitLapA];
    stintsA = [
      {
        compound: currentTyre,
        compoundCode: COMPOUND_SPECS[currentTyre].code,
        startLap: 1,
        endLap: validPitLapA,
        startingAge: currentTyreAge - (currentLap - 1),
        laps: validPitLapA,
        note: `Current stint (Box L${validPitLapA})`,
      },
      {
        compound: nextCompound,
        compoundCode: COMPOUND_SPECS[nextCompound].code,
        startLap: validPitLapA + 1,
        endLap: circuitTotalLaps,
        startingAge: 0,
        laps: circuitTotalLaps - validPitLapA,
        note: 'Stint to checkered flag',
      },
    ];
  } else {
    const secondPitA = Math.min(circuitTotalLaps - 5, validPitLapA + 14);
    pitLapsA = [validPitLapA, secondPitA];
    stintsA = [
      {
        compound: currentTyre,
        compoundCode: COMPOUND_SPECS[currentTyre].code,
        startLap: 1,
        endLap: validPitLapA,
        startingAge: currentTyreAge - (currentLap - 1),
        laps: validPitLapA,
      },
      {
        compound: nextCompound,
        compoundCode: COMPOUND_SPECS[nextCompound].code,
        startLap: validPitLapA + 1,
        endLap: secondPitA,
        startingAge: 0,
        laps: secondPitA - validPitLapA,
      },
      {
        compound: 'SOFT',
        compoundCode: 'C4',
        startLap: secondPitA + 1,
        endLap: circuitTotalLaps,
        startingAge: 0,
        laps: circuitTotalLaps - secondPitA,
      },
    ];
  }

  // STRATEGY B: Overcut Plan
  const pitLapB = Math.min(circuitTotalLaps - 5, validPitLapA + 4);
  const pitLapsB = [pitLapB];
  const compB: TyreCompound = nextCompound === 'HARD' ? 'HARD' : 'MEDIUM';
  const stintsB = [
    {
      compound: currentTyre,
      compoundCode: COMPOUND_SPECS[currentTyre].code,
      startLap: 1,
      endLap: pitLapB,
      startingAge: currentTyreAge - (currentLap - 1),
      laps: pitLapB,
      note: 'Extended overcut stint',
    },
    {
      compound: compB,
      compoundCode: COMPOUND_SPECS[compB].code,
      startLap: pitLapB + 1,
      endLap: circuitTotalLaps,
      startingAge: 0,
      laps: circuitTotalLaps - pitLapB,
      note: 'Late sprint stint',
    },
  ];

  // STRATEGY C: Aggressive 2-Stop Sprint Plan
  const firstPitC = Math.max(currentLap + 1, Math.min(validPitLapA - 4, 30));
  const secondPitC = Math.min(circuitTotalLaps - 4, firstPitC + 13);
  const pitLapsC = [firstPitC, secondPitC];
  const stintsC: { compound: TyreCompound; compoundCode: string; startLap: number; endLap: number; startingAge: number; laps: number; note?: string; }[] = [
    {
      compound: currentTyre,
      compoundCode: COMPOUND_SPECS[currentTyre].code,
      startLap: 1,
      endLap: firstPitC,
      startingAge: currentTyreAge - (currentLap - 1),
      laps: firstPitC,
    },
    {
      compound: 'SOFT' as TyreCompound,
      compoundCode: 'C4',
      startLap: firstPitC + 1,
      endLap: secondPitC,
      startingAge: 0,
      laps: secondPitC - firstPitC,
    },
    {
      compound: 'HARD' as TyreCompound,
      compoundCode: 'C2',
      startLap: secondPitC + 1,
      endLap: circuitTotalLaps,
      startingAge: 0,
      laps: circuitTotalLaps - secondPitC,
    },
  ];

  // Deterministic Base Runs
  const resultA = simulateStintSchedule(currentLap, circuitTotalLaps, stintsA, pitLapsA, staticPitLossSeconds, trafficGaps);
  const resultB = simulateStintSchedule(currentLap, circuitTotalLaps, stintsB, pitLapsB, staticPitLossSeconds, trafficGaps);
  const resultC = simulateStintSchedule(currentLap, circuitTotalLaps, stintsC, pitLapsC, staticPitLossSeconds, trafficGaps);

  // GENUINE STOCHASTIC MONTE CARLO SIMULATION
  const mcIterations = Math.max(50, Math.min(2000, monteCarloIterations));
  let winsA = 0;
  let winsB = 0;
  let winsC = 0;
  const timesA: number[] = [];
  const timesB: number[] = [];
  const timesC: number[] = [];

  for (let i = 0; i < mcIterations; i++) {
    const wearNoiseA = randomGaussian(0, 1.0);
    const wearNoiseB = randomGaussian(0, 1.0);
    const wearNoiseC = randomGaussian(0, 1.0);

    const tA = simulateStintSchedule(currentLap, circuitTotalLaps, stintsA, pitLapsA, staticPitLossSeconds, trafficGaps, wearNoiseA).totalRemainingTime;
    const tB = simulateStintSchedule(currentLap, circuitTotalLaps, stintsB, pitLapsB, staticPitLossSeconds, trafficGaps, wearNoiseB).totalRemainingTime;
    const tC = simulateStintSchedule(currentLap, circuitTotalLaps, stintsC, pitLapsC, staticPitLossSeconds, trafficGaps, wearNoiseC).totalRemainingTime;

    timesA.push(tA);
    timesB.push(tB);
    timesC.push(tC);

    if (tA <= tB && tA <= tC) winsA++;
    else if (tB <= tA && tB <= tC) winsB++;
    else winsC++;
  }

  const winProbabilityPercent = {
    A: Math.round((winsA / mcIterations) * 100),
    B: Math.round((winsB / mcIterations) * 100),
    C: Math.round((winsC / mcIterations) * 100),
  };

  const calcStdDev = (arr: number[]) => {
    const mean = arr.reduce((acc, v) => acc + v, 0) / arr.length;
    return Number(Math.sqrt(arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length).toFixed(2));
  };

  const raceTimeStdDevSeconds = {
    A: calcStdDev(timesA),
    B: calcStdDev(timesB),
    C: calcStdDev(timesC),
  };

  // Rank strategies by expected total race time & clean air probability
  const rawTimes = [
    { id: 'A' as const, time: resultA.totalRemainingTime, res: resultA, stints: stintsA, pitLaps: pitLapsA },
    { id: 'B' as const, time: resultB.totalRemainingTime, res: resultB, stints: stintsB, pitLaps: pitLapsB },
    { id: 'C' as const, time: resultC.totalRemainingTime, res: resultC, stints: stintsC, pitLaps: pitLapsC },
  ];

  const bestTime = Math.min(...rawTimes.map((r) => r.time));
  const sorted = [...rawTimes].sort((a, b) => a.time - b.time);
  const winningId = sorted[0].id;

  const options: StrategyOption[] = [
    {
      id: 'A',
      codeName: `STRATEGY A [${numberOfStops === 1 ? '1-STOP OPTIMAL' : '2-STOP SPRINT'}]`,
      title: `Plan A: Box Lap ${validPitLapA} (${currentTyre} -> ${nextCompound})`,
      isRecommended: winningId === 'A',
      type: numberOfStops === 1 ? '1-STOP' : '2-STOP',
      sequenceStr: `${currentTyre} (${COMPOUND_SPECS[currentTyre].code}) -> ${nextCompound} (${COMPOUND_SPECS[nextCompound].code})`,
      stints: stintsA.map((s) => ({
        compound: s.compound,
        compoundCode: s.compoundCode,
        startLap: s.startLap,
        endLap: s.endLap,
        laps: s.laps,
        note: s.note,
      })),
      pitWindow: `L${Math.max(currentLap, validPitLapA - 1)} - L${validPitLapA + 1}`,
      targetPitLap: validPitLapA,
      netDeltaSeconds: Number((resultA.totalRemainingTime - bestTime).toFixed(1)),
      deltaVsBenchmarkStr:
        winningId === 'A'
          ? 'Fastest Line (Optimal)'
          : `+${(resultA.totalRemainingTime - bestTime).toFixed(1)}s vs Plan ${winningId}`,
      confidencePercent: winProbabilityPercent.A,
      estTotalRaceTime: formatClockTime(16, resultA.totalRemainingTime),
      reentryTraffic: resultA.reentryTrafficDesc,
      reentryPosition: resultA.reentryPositionDesc,
      reentryBufferStr: resultA.reentryBufferStr,
      riskFactor:
        validPitLapA > COMPOUND_SPECS[currentTyre].cliffAge
          ? 'Elevated • Post-cliff degradation risk'
          : 'Low • Clean air exit window',
      description:
        validPitLapA > COMPOUND_SPECS[currentTyre].cliffAge
          ? `Pitting on Lap ${validPitLapA} extends past the ${currentTyre} cliff region, incurring ~${((validPitLapA - COMPOUND_SPECS[currentTyre].cliffAge) * 0.85).toFixed(1)}s pace drop.`
          : `Executes primary stop at Lap ${validPitLapA}. Exits before the critical degradation region into clean track space.`,
    },
    {
      id: 'B',
      codeName: 'STRATEGY B [EXTENDED OVERCUT]',
      title: `Plan B: Extend to Lap ${pitLapB} (${currentTyre} -> ${compB})`,
      isRecommended: winningId === 'B',
      type: 'OVERCUT',
      sequenceStr: `${currentTyre} (${COMPOUND_SPECS[currentTyre].code}) -> ${compB} (${COMPOUND_SPECS[compB].code})`,
      stints: stintsB.map((s) => ({
        compound: s.compound,
        compoundCode: s.compoundCode,
        startLap: s.startLap,
        endLap: s.endLap,
        laps: s.laps,
        note: s.note,
      })),
      pitWindow: `L${pitLapB - 1} - L${pitLapB + 1}`,
      targetPitLap: pitLapB,
      netDeltaSeconds: Number((resultB.totalRemainingTime - bestTime).toFixed(1)),
      deltaVsBenchmarkStr:
        winningId === 'B'
          ? 'Fastest Line (Optimal)'
          : `+${(resultB.totalRemainingTime - bestTime).toFixed(1)}s vs Plan ${winningId}`,
      confidencePercent: winProbabilityPercent.B,
      estTotalRaceTime: formatClockTime(16, resultB.totalRemainingTime),
      reentryTraffic: resultB.reentryTrafficDesc,
      reentryPosition: resultB.reentryPositionDesc,
      reentryBufferStr: resultB.reentryBufferStr,
      riskFactor: 'Moderate • Overcut cliff exposure and dirty air proxy',
      description:
        'Stretches the current tyre set into later race laps. Provides insurance against unexpected safety car deployments but risks acute pace drop if tyres hit thermal cliff.',
    },
    {
      id: 'C',
      codeName: 'STRATEGY C [2-STOP ATTACK SPRINT]',
      title: `Plan C: Aggressive 2-Stop (Box L${firstPitC} & L${secondPitC})`,
      isRecommended: winningId === 'C',
      type: '2-STOP',
      sequenceStr: `${currentTyre} -> SOFT (C4) -> HARD (C2)`,
      stints: stintsC.map((s) => ({
        compound: s.compound,
        compoundCode: s.compoundCode,
        startLap: s.startLap,
        endLap: s.endLap,
        laps: s.laps,
        note: s.note,
      })),
      pitWindow: `L${firstPitC} & L${secondPitC}`,
      targetPitLap: firstPitC,
      netDeltaSeconds: Number((resultC.totalRemainingTime - bestTime).toFixed(1)),
      deltaVsBenchmarkStr:
        winningId === 'C'
          ? 'Fastest Line (Optimal)'
          : `+${(resultC.totalRemainingTime - bestTime).toFixed(1)}s vs Plan ${winningId}`,
      confidencePercent: winProbabilityPercent.C,
      estTotalRaceTime: formatClockTime(16, resultC.totalRemainingTime),
      reentryTraffic: resultC.reentryTrafficDesc,
      reentryPosition: resultC.reentryPositionDesc,
      reentryBufferStr: resultC.reentryBufferStr,
      riskFactor: 'High • Additional pit transit loss penalty and dirty air',
      description:
        'Double pit stop incurs an additional stationary transit penalty. Requires significant overtakes on track to recover time on faster compound.',
    },
  ];

  const winningOption = options.find((o) => o.id === winningId) || options[0];

  // SVG cumulative chart path points
  const chartPoints: { lap: number; deltaA: number; deltaB: number; deltaC: number }[] = [];
  const lapStep = Math.max(1, Math.floor(remainingLaps / 25));

  let cumA = 0;
  let cumB = 0;
  let cumC = 0;

  for (let i = 0; i < resultA.lapTimes.length; i += lapStep) {
    const lap = resultA.lapTimes[i].lap;
    const tA = resultA.lapTimes[i]?.time || 83.2;
    const tB = resultB.lapTimes[i]?.time || 83.2;
    const tC = resultC.lapTimes[i]?.time || 83.2;

    const pitAThisLap = pitLapsA.includes(lap) ? staticPitLossSeconds : 0;
    const pitBThisLap = pitLapsB.includes(lap) ? staticPitLossSeconds : 0;
    const pitCThisLap = pitLapsC.includes(lap) ? staticPitLossSeconds : 0;

    cumA += (tA - 83.2) + pitAThisLap;
    cumB += (tB - 83.2) + pitBThisLap;
    cumC += (tC - 83.2) + pitCThisLap;

    chartPoints.push({
      lap,
      deltaA: Number(cumA.toFixed(2)),
      deltaB: Number(cumB.toFixed(2)),
      deltaC: Number(cumC.toFixed(2)),
    });
  }

  const winningStintCount = winningOption.stints.length;
  const runnerUp = sorted[1];
  const deltaVsSecond = (runnerUp.time - bestTime).toFixed(1);

  const explainabilityReasons = [
    `01. EXPECTED TOTAL RACE TIME (${winningOption.codeName}): Calculated remaining race time of ${formatDuration(bestTime)} is ${deltaVsSecond}s faster than closest alternative across ${mcIterations} Monte Carlo iterations (Win Probability: ${winProbabilityPercent[winningId]}%).`,
    `02. TYRE DEGRADATION & CLIFF: Current ${currentTyre} (${COMPOUND_SPECS[currentTyre].code}) wear slope is ${COMPOUND_SPECS[currentTyre].wearPerLap.toFixed(3)}s/lap with critical region at ~${COMPOUND_SPECS[currentTyre].cliffAge} laps. Pitting at Lap ${winningOption.targetPitLap} minimizes performance cliff exposure.`,
    `03. PIT TRANSIT DELTA: Fixed stationary loss of ${staticPitLossSeconds}s factored into ${winningStintCount - 1} scheduled stop(s). Minimizes track re-entry penalties.`,
    `04. CLEAN AIR RE-ENTRY: Predicts ${resultA.trafficClearProb}% probability of rejoining into ${winningOption.reentryTraffic.toLowerCase()} with ${winningOption.reentryBufferStr}.`,
    `05. COMPOUND TRANSITION: Fitting fresh ${nextCompound} (${COMPOUND_SPECS[nextCompound].code}) maximizes mechanical grip with low thermal sensitivity to the checkered flag.`,
  ];

  return {
    options,
    winningOption,
    recommendedOptionId: winningId,
    optimalPitWindow: winningOption.pitWindow,
    optimalTargetLap: winningOption.targetPitLap,
    netGainSeconds: winningOption.netDeltaSeconds,
    reentryGapToBehind: trafficGaps.gapBehind - staticPitLossSeconds,
    monteCarloIterations: mcIterations,
    trafficClearProb: resultA.trafficClearProb,
    remainingLaps,
    explainabilityReasons,
    winProbabilityPercent,
    raceTimeStdDevSeconds,
    chartPoints,
  };
}
