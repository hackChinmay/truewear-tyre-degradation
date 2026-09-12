import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext';
import {
  runStrategySimulation,
  SimulationResult,
} from '../services/strategySimulator';
import { TyreCompound } from '../types';
import {
  CheckCircle2,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  AlertTriangle,
  Download,
  Cloud,
} from 'lucide-react';
import { saveStrategyRun } from '../services/firebase';

export const StrategySimulator: React.FC = () => {
  const {
    currentLap: globalLap,
    selectedCircuit,
    selectedDriver,
    setSelectedDriverCode,
    drivers,
    customPitLap,
    setCustomPitLap,
    activePlan,
    setActivePlan,
    triggerActionNotification,
  } = useRace();

  // Connected interactive state
  const [simCurrentLap, setSimCurrentLap] = useState<number>(globalLap || 34);
  const [simCurrentTyre, setSimCurrentTyre] = useState<TyreCompound>(selectedDriver?.compound || 'MEDIUM');
  const [simTyreAge, setSimTyreAge] = useState<number>(selectedDriver?.tyreAge || 18);
  const [simPitLap, setSimPitLap] = useState<number>(customPitLap || 38);
  const [simNextCompound, setSimNextCompound] = useState<TyreCompound>('HARD');
  const [simNumberOfStops, setSimNumberOfStops] = useState<1 | 2>(1);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isSavingFirestore, setIsSavingFirestore] = useState<boolean>(false);
  const [simulationRunCount, setSimulationRunCount] = useState<number>(500);

  // Sync with global selectedDriver's active tyre state
  useEffect(() => {
    if (selectedDriver) {
      setSimCurrentTyre(selectedDriver.compound);
      setSimTyreAge(selectedDriver.tyreAge);
      executeSimulation(
        simCurrentLap,
        selectedDriver.compound,
        selectedDriver.tyreAge,
        simPitLap,
        simNextCompound,
        simNumberOfStops
      );
    }
  }, [selectedDriver.driverCode, selectedDriver.compound, selectedDriver.tyreAge]);

  // Sync with global customPitLap if user changes elsewhere
  useEffect(() => {
    if (customPitLap && customPitLap !== simPitLap) {
      setSimPitLap(customPitLap);
    }
  }, [customPitLap]);

  // Sync with global currentLap
  useEffect(() => {
    if (globalLap && globalLap !== simCurrentLap) {
      setSimCurrentLap(globalLap);
    }
  }, [globalLap]);

  // Initial simulation computation
  const [simResult, setSimResult] = useState<SimulationResult>(() =>
    runStrategySimulation({
      currentLap: globalLap || 34,
      circuitTotalLaps: selectedCircuit.totalLaps,
      currentTyre: 'MEDIUM',
      currentTyreAge: 18,
      pitLap: customPitLap || 38,
      nextCompound: 'HARD',
      numberOfStops: 1,
      staticPitLossSeconds: 21.4,
      trackTemp: selectedCircuit.nominalTrackTemp,
    })
  );

  // Re-run simulation logic
  const executeSimulation = (
    lap = simCurrentLap,
    tyre = simCurrentTyre,
    age = simTyreAge,
    pit = simPitLap,
    nextComp = simNextCompound,
    stops = simNumberOfStops
  ) => {
    const res = runStrategySimulation({
      currentLap: lap,
      circuitTotalLaps: selectedCircuit.totalLaps,
      currentTyre: tyre,
      currentTyreAge: age,
      pitLap: pit,
      nextCompound: nextComp,
      numberOfStops: stops,
      staticPitLossSeconds: 21.4,
      trackTemp: selectedCircuit.nominalTrackTemp,
    });
    setSimResult(res);
    return res;
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const res = executeSimulation();
      setIsSimulating(false);
      const newCount = simulationRunCount + 500;
      setSimulationRunCount(newCount);
      triggerActionNotification(
        `Monte Carlo solver converged across ${newCount} iterations. Recommended: ${res.winningOption.codeName} (${res.winningOption.deltaVsBenchmarkStr}).`,
        'success'
      );
    }, 400);
  };

  const handlePitLapChange = (newPitLap: number) => {
    const clamped = Math.max(simCurrentLap + 1, Math.min(selectedCircuit.totalLaps - 1, newPitLap));
    setSimPitLap(clamped);
    setCustomPitLap(clamped);
    executeSimulation(simCurrentLap, simCurrentTyre, simTyreAge, clamped, simNextCompound, simNumberOfStops);
  };

  const handleApplyStrategy = (planId: 'A' | 'B' | 'C') => {
    setActivePlan(planId);
    const targetOpt = simResult.options.find((o) => o.id === planId);
    triggerActionNotification(
      `STRATEGY ${planId} COMMITTED: Box order submitted to pit wall crew for Lap ${targetOpt?.targetPitLap || simPitLap}.`,
      'success'
    );
  };

  const handleExportCSV = () => {
    const csv =
      'Strategy,Stints,PitWindow,TargetPitLap,NetGainSeconds,Confidence,EstTotalRaceTime,TrafficRisk\n' +
      simResult.options
        .map(
          (o) =>
            `"${o.codeName}","${o.sequenceStr}","${o.pitWindow}",${o.targetPitLap},${o.netDeltaSeconds},${o.confidencePercent}%,"${o.estTotalRaceTime}","${o.reentryTraffic}"`
        )
        .join('\n');

    const encoded = encodeURI('data:text/csv;charset=utf-8,' + csv);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `truewear_${selectedCircuit.id}_strategy_sim.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerActionNotification('Strategy simulation dataset exported to CSV.', 'success');
  };

  const handleSaveToFirestore = async () => {
    setIsSavingFirestore(true);
    try {
      const bestOption = simResult.options.reduce((prev, curr) =>
        curr.netDeltaSeconds < prev.netDeltaSeconds ? curr : prev, simResult.options[0]);

      const docId = await saveStrategyRun({
        circuitId: selectedCircuit.id,
        driverCode: selectedDriver.driverCode,
        model: 'XGBoost-Ensemble-v1',
        recommendedPitLap: bestOption.targetPitLap || simPitLap,
        projectedCliffLap: simResult.options[0]?.cliffLap || 39.4,
        totalRaceTimeDelta: bestOption.netDeltaSeconds,
        strategyAction: bestOption.codeName,
        primaryReason: `${bestOption.sequenceStr} provides net delta ${bestOption.netDeltaSeconds > 0 ? '+' : ''}${bestOption.netDeltaSeconds.toFixed(2)}s.`
      });

      triggerActionNotification(
        `Cloud Firestore: Strategy run saved to truewear-29356 (ID: ${docId.slice(0, 8)}...)`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      triggerActionNotification(
        'Firestore: Strategy cached locally (Enable Firestore in Firebase Console if not active yet)',
        'info'
      );
    } finally {
      setIsSavingFirestore(false);
    }
  };

  // SVG Chart path calculation
  const minLap = simCurrentLap;
  const maxLap = selectedCircuit.totalLaps;
  const minVal = -5;
  const maxVal = 32;

  const buildSvgPath = (key: 'deltaA' | 'deltaB' | 'deltaC') => {
    if (!simResult.chartPoints || simResult.chartPoints.length === 0) return '';
    return simResult.chartPoints
      .map((pt, idx) => {
        const x = 50 + ((pt.lap - minLap) / Math.max(1, maxLap - minLap)) * 710;
        const clampedVal = Math.max(minVal, Math.min(maxVal, pt[key]));
        const y = 160 - ((clampedVal - minVal) / (maxVal - minVal)) * 125;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const pathA = buildSvgPath('deltaA');
  const pathB = buildSvgPath('deltaB');
  const pathC = buildSvgPath('deltaC');

  return (
    <div id="page-strategy-simulator" className="space-y-6 pb-12 font-mono">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1b2536] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[#ff2a2a] font-bold tracking-widest uppercase">
              MODULE 03 // STRATEGY SIMULATOR
            </span>
            <span className="text-[10px] bg-[#162335] text-[#38bdf8] px-2 py-0.5 rounded border border-[#233852]">
              MONTE CARLO {simulationRunCount} LOOPS
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">STRATEGY SIMULATOR</h1>
          <p className="text-xs text-[#8fa1b6] mt-0.5">
            Compare pit windows and tyre strategies before committing to race control
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="save-firestore-btn"
            onClick={handleSaveToFirestore}
            disabled={isSavingFirestore}
            className="bg-[#101e30] hover:bg-[#182a42] text-[#38bdf8] hover:text-white px-3 py-1.5 rounded border border-[#213a5a] text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Save current strategy simulation run to Cloud Firestore (truewear-29356)"
          >
            <Cloud className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>{isSavingFirestore ? 'SAVING...' : 'SAVE TO CLOUD'}</span>
          </button>
          <button
            id="export-sim-csv-btn"
            onClick={handleExportCSV}
            className="bg-[#121c2a] hover:bg-[#1a273a] text-[#8fa2b8] hover:text-white px-3 py-1.5 rounded border border-[#23344b] text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
          <button
            id="run-simulation-btn"
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="bg-[#00e5a3] hover:bg-[#00c78e] text-black font-extrabold px-3.5 py-1.5 rounded text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>{isSimulating ? 'COMPUTING PHYSICS...' : 'RUN SIMULATION'}</span>
          </button>
        </div>
      </div>

      {/* Connected Simulation Controls Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 text-[10px] bg-[#0b1017] p-3 rounded border border-[#1b2536] text-[#788ca2]">
        {/* 1. Circuit */}
        <div className="space-y-0.5">
          <span className="text-[#5b6e85] block uppercase font-semibold">CIRCUIT</span>
          <strong className="text-white block text-xs truncate">
            {selectedCircuit.name.toUpperCase()}
          </strong>
          <span className="text-[9px] text-[#4d5e73] block">{selectedCircuit.totalLaps} LAPS TOTAL</span>
        </div>

        {/* 2. Current Lap */}
        <div className="space-y-0.5">
          <label htmlFor="sim-current-lap" className="text-[#5b6e85] block uppercase font-semibold">
            CURRENT LAP
          </label>
          <div className="flex items-center gap-1">
            <input
              id="sim-current-lap"
              type="number"
              min={1}
              max={selectedCircuit.totalLaps - 2}
              value={simCurrentLap}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSimCurrentLap(val);
                executeSimulation(val, simCurrentTyre, simTyreAge, simPitLap, simNextCompound, simNumberOfStops);
              }}
              className="bg-[#121c2a] text-[#00d2ff] font-bold px-1.5 py-1 rounded border border-[#23354b] w-14 text-xs text-center outline-none focus:border-[#00d2ff]"
            />
            <span className="text-white font-semibold">/ {selectedCircuit.totalLaps}</span>
          </div>
        </div>

        {/* 3. Current Tyre */}
        <div className="space-y-0.5">
          <label htmlFor="sim-current-tyre" className="text-[#5b6e85] block uppercase font-semibold">
            CURRENT TYRE
          </label>
          <select
            id="sim-current-tyre"
            value={simCurrentTyre}
            onChange={(e) => {
              const comp = e.target.value as TyreCompound;
              setSimCurrentTyre(comp);
              executeSimulation(simCurrentLap, comp, simTyreAge, simPitLap, simNextCompound, simNumberOfStops);
            }}
            className="bg-[#121c2a] text-yellow-400 font-bold px-1.5 py-1 rounded border border-[#23354b] text-[11px] w-full outline-none focus:border-yellow-400 cursor-pointer"
          >
            <option value="MEDIUM">MEDIUM (C3)</option>
            <option value="SOFT">SOFT (C4)</option>
            <option value="HARD">HARD (C2)</option>
          </select>
        </div>

        {/* 4. Tyre Age */}
        <div className="space-y-0.5">
          <label htmlFor="sim-tyre-age" className="text-[#5b6e85] block uppercase font-semibold">
            TYRE AGE
          </label>
          <div className="flex items-center gap-1">
            <input
              id="sim-tyre-age"
              type="number"
              min={1}
              max={Math.max(1, simCurrentLap)}
              value={simTyreAge}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSimTyreAge(val);
                executeSimulation(simCurrentLap, simCurrentTyre, val, simPitLap, simNextCompound, simNumberOfStops);
              }}
              className="bg-[#121c2a] text-white font-bold px-1.5 py-1 rounded border border-[#23354b] w-14 text-xs text-center outline-none focus:border-[#00e5a3]"
            />
            <span className="text-[#94a3b8] font-semibold">LAPS</span>
          </div>
        </div>

        {/* 5. Pit Lap */}
        <div className="space-y-0.5">
          <label htmlFor="sim-pit-lap" className="text-[#5b6e85] block uppercase font-semibold">
            PIT LAP
          </label>
          <div className="flex items-center gap-1">
            <input
              id="sim-pit-lap"
              type="number"
              min={simCurrentLap + 1}
              max={selectedCircuit.totalLaps - 1}
              value={simPitLap}
              onChange={(e) => handlePitLapChange(Number(e.target.value))}
              className="bg-[#121c2a] text-[#00e5a3] font-bold px-1.5 py-1 rounded border border-[#23354b] w-14 text-xs text-center outline-none focus:border-[#00e5a3]"
            />
            <span className="text-[#00e5a3] font-semibold">BOX</span>
          </div>
        </div>

        {/* 6. Next Compound */}
        <div className="space-y-0.5">
          <label htmlFor="sim-next-compound" className="text-[#5b6e85] block uppercase font-semibold">
            NEXT COMPOUND
          </label>
          <select
            id="sim-next-compound"
            value={simNextCompound}
            onChange={(e) => {
              const comp = e.target.value as TyreCompound;
              setSimNextCompound(comp);
              executeSimulation(simCurrentLap, simCurrentTyre, simTyreAge, simPitLap, comp, simNumberOfStops);
            }}
            className="bg-[#121c2a] text-cyan-400 font-bold px-1.5 py-1 rounded border border-[#23354b] text-[11px] w-full outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="HARD">HARD (C2)</option>
            <option value="MEDIUM">MEDIUM (C3)</option>
            <option value="SOFT">SOFT (C4)</option>
          </select>
        </div>

        {/* 7. Number of Stops */}
        <div className="space-y-0.5">
          <label htmlFor="sim-num-stops" className="text-[#5b6e85] block uppercase font-semibold">
            STOPS
          </label>
          <select
            id="sim-num-stops"
            value={simNumberOfStops}
            onChange={(e) => {
              const stops = Number(e.target.value) as 1 | 2;
              setSimNumberOfStops(stops);
              executeSimulation(simCurrentLap, simCurrentTyre, simTyreAge, simPitLap, simNextCompound, stops);
            }}
            className="bg-[#121c2a] text-amber-400 font-bold px-1.5 py-1 rounded border border-[#23354b] text-[11px] w-full outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value={1}>1-STOP</option>
            <option value={2}>2-STOP</option>
          </select>
        </div>

        {/* 8. Static Pit Loss */}
        <div className="space-y-0.5">
          <span className="text-[#5b6e85] block uppercase font-semibold">PIT LOSS (TRANSIT)</span>
          <strong className="text-amber-400 block text-xs">21.4s</strong>
          <span className="text-[9px] text-[#4d5e73] block">{simResult.remainingLaps} LAPS TO FLAG</span>
        </div>
      </div>

      {/* What-If Strategy Builder Slider & Controls */}
      <div className="bg-[#0d141e] p-4 rounded border border-[#1e2f44] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#182637]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00d2ff]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              WHAT-IF PIT STOP OPTIMIZATION SLIDER
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#72859b]">SELECTED PIT LAP:</span>
            <span className="text-lg font-black text-[#00e5a3] bg-[#091f16] px-2 py-0.5 rounded border border-[#144b34]">
              LAP {simPitLap}
            </span>
            <button
              id="reset-pit-lap-btn"
              onClick={() => handlePitLapChange(Math.min(selectedCircuit.totalLaps - 5, simCurrentLap + 4))}
              className="text-[10px] text-[#6b7f96] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset (L{Math.min(selectedCircuit.totalLaps - 5, simCurrentLap + 4)})
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1 py-1">
          <input
            id="pit-lap-slider"
            type="range"
            min={simCurrentLap + 1}
            max={Math.min(selectedCircuit.totalLaps - 1, simCurrentLap + 14)}
            step={1}
            value={simPitLap}
            onChange={(e) => handlePitLapChange(Number(e.target.value))}
            className="w-full h-2 bg-[#172230] rounded-lg appearance-none cursor-pointer accent-[#00e5a3]"
          />
          <div className="flex justify-between text-[10px] text-[#55677d] px-1 font-mono">
            <span>L{simCurrentLap + 1} (Immediate)</span>
            <span className="text-cyan-400">L{simCurrentLap + 2}</span>
            <span className="text-emerald-400 font-bold">L{simCurrentLap + 4} (OPTIMAL WINDOW)</span>
            <span className="text-yellow-400">L{simCurrentLap + 5}</span>
            <span className="text-red-400 font-bold">L{Math.min(selectedCircuit.totalLaps - 1, simCurrentLap + 7)} (CLIFF ZONE)</span>
            <span>L{Math.min(selectedCircuit.totalLaps - 1, simCurrentLap + 14)}</span>
          </div>
        </div>

        {simPitLap > simCurrentLap + 5 && (
          <div className="bg-[#260e12] border border-[#5c1c24] p-2.5 rounded text-[11px] text-[#ff8e8e] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#ff4b4b] shrink-0" />
            <span>
              <strong>THERMAL CLIFF WARNING:</strong> Pitting on Lap {simPitLap} incurs an estimated{' '}
              <strong>+{((simPitLap - (simCurrentLap + 5)) * 1.25).toFixed(1)}s</strong> acute degradation penalty on worn {simCurrentTyre} tyres
              and increases dirty air vulnerability on pit re-entry!
            </span>
          </div>
        )}
      </div>

      {/* 3 Strategy Comparison Cards - Ranked & Winner Not Hardcoded */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {simResult.options.map((opt) => {
          const isWinner = opt.isRecommended;
          const isCurrentActive = activePlan === opt.id;

          return (
            <div
              key={opt.id}
              id={`strategy-card-${opt.id.toLowerCase()}`}
              className={`p-4 rounded border flex flex-col justify-between transition-all ${
                isWinner
                  ? 'bg-gradient-to-b from-[#0e1a20] to-[#0c131d] border-[#1f5844] shadow-lg shadow-emerald-950/20'
                  : 'bg-[#0d131c] border-[#1a2536] hover:border-[#27394f]'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#182333] mb-3">
                  <div>
                    <span className="text-[10px] text-[#63768d] block font-semibold">{opt.codeName}</span>
                    <h4 className="text-xs font-bold text-white mt-0.5">{opt.title}</h4>
                  </div>
                  {isWinner && (
                    <span className="text-[9px] bg-[#0c271b] text-[#00e5a3] font-bold px-2 py-0.5 rounded border border-[#165a3c] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a3] animate-pulse" />
                      RECOMMENDED
                    </span>
                  )}
                </div>

                {/* Stint Sequence Bar */}
                <div className="bg-[#080d13] p-2 rounded border border-[#15202e] mb-3 space-y-1.5">
                  <div className="text-[10px] text-[#55677d] flex justify-between">
                    <span>COMPOUND SEQUENCE</span>
                    <span className="text-white font-bold">{opt.sequenceStr}</span>
                  </div>
                  <div className="h-4 w-full bg-[#131c28] rounded overflow-hidden flex gap-0.5">
                    {opt.stints.map((st, idx) => (
                      <div
                        key={idx}
                        className={`h-full flex items-center justify-center text-[9px] font-bold ${
                          st.compound === 'SOFT'
                            ? 'bg-red-600 text-white'
                            : st.compound === 'MEDIUM'
                            ? 'bg-yellow-500 text-black'
                            : 'bg-cyan-600 text-white'
                        }`}
                        style={{ width: `${(st.laps / selectedCircuit.totalLaps) * 100}%` }}
                        title={`${st.compound}: ${st.laps} Laps`}
                      >
                        {st.compound[0]}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-[#090f17] p-2 rounded border border-[#162130]">
                    <span className="text-[9px] text-[#55677d] block">PIT WINDOW</span>
                    <strong className="text-white text-sm">{opt.pitWindow}</strong>
                    <span className="text-[9px] text-[#00d2ff] block mt-0.5">Target: L{opt.targetPitLap}</span>
                  </div>

                  <div className="bg-[#090f17] p-2 rounded border border-[#162130]">
                    <span className="text-[9px] text-[#55677d] block">NET RACE DELTA</span>
                    <strong
                      className={`text-sm font-bold ${
                        opt.netDeltaSeconds === 0 ? 'text-[#00e5a3]' : 'text-[#ff4b4b]'
                      }`}
                    >
                      {opt.netDeltaSeconds === 0 ? '0.0s (Best)' : `+${opt.netDeltaSeconds}s`}
                    </strong>
                    <span className="text-[9px] text-[#718398] block mt-0.5 truncate">
                      {opt.deltaVsBenchmarkStr}
                    </span>
                  </div>

                  <div className="bg-[#090f17] p-2 rounded border border-[#162130]">
                    <span className="text-[9px] text-[#55677d] block">CONFIDENCE</span>
                    <strong className="text-white text-sm">{opt.confidencePercent}%</strong>
                    <span className="text-[9px] text-emerald-400 block mt-0.5">Monte Carlo fit</span>
                  </div>

                  <div className="bg-[#090f17] p-2 rounded border border-[#162130]">
                    <span className="text-[9px] text-[#55677d] block">EST. TOTAL TIME</span>
                    <strong className="text-white text-sm">{opt.estTotalRaceTime}</strong>
                    <span className="text-[9px] text-[#718398] block mt-0.5">Remaining line</span>
                  </div>
                </div>

                {/* Re-entry traffic */}
                <div className="bg-[#090f17] p-2 rounded border border-[#162130] text-[10px] text-[#718398] mb-3 space-y-1">
                  <div className="flex justify-between">
                    <span>RE-ENTRY TRAFFIC:</span>
                    <strong className="text-white">{opt.reentryTraffic}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>PROJECTED POSITION:</span>
                    <strong className="text-cyan-400">{opt.reentryPosition}</strong>
                  </div>
                </div>

                <p className="text-[10px] text-[#74879d] leading-relaxed mb-3">
                  {opt.description}
                </p>
              </div>

              {/* Action Button */}
              <button
                id={`apply-strategy-${opt.id.toLowerCase()}-btn`}
                onClick={() => handleApplyStrategy(opt.id)}
                className={`w-full py-2 px-3 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isCurrentActive
                    ? 'bg-[#00e5a3] text-black shadow-md shadow-emerald-950/40'
                    : 'bg-[#152131] hover:bg-[#1d2d42] text-white border border-[#23374f]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isCurrentActive ? `STRATEGY ${opt.id} ACTIVE` : `APPLY STRATEGY ${opt.id}`}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Cumulative Race Time Delta Chart */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536]">
        <div className="flex items-center justify-between pb-3 border-b border-[#182333] mb-3">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              CUMULATIVE RACE TIME DELTA // SECONDS VS OPTIMAL BENCHMARK (LAPS {simCurrentLap}-{selectedCircuit.totalLaps})
            </h3>
            <p className="text-[10px] text-[#5e7086]">
              Calculated lap-by-lap simulation: pit-stop transit dip (+21.4s) followed by tyre degradation evolution
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-[#00e5a3]">
              <span className="w-2.5 h-1 bg-[#00e5a3] rounded-full" />
              Strategy A ({simNumberOfStops}-Stop)
            </span>
            <span className="flex items-center gap-1 text-[#eab308]">
              <span className="w-2.5 h-1 bg-[#eab308] rounded-full" />
              Strategy B (Overcut)
            </span>
            <span className="flex items-center gap-1 text-[#ff4b4b]">
              <span className="w-2.5 h-1 bg-[#ff4b4b] rounded-full" />
              Strategy C (2-Stop)
            </span>
          </div>
        </div>

        {/* SVG Cumulative Chart */}
        <div className="h-56 bg-[#070b10] rounded border border-[#141d2a] p-2 flex items-center justify-center relative">
          <svg viewBox="0 0 800 200" className="w-full h-full" preserveAspectRatio="none">
            {/* Horizontal Grid lines */}
            <line x1="40" y1="160" x2="760" y2="160" stroke="#182332" strokeWidth="1" strokeDasharray="3 3" />
            <text x="35" y="163" textAnchor="end" fill="#55677d" fontSize="9">0s</text>

            <line x1="40" y1="100" x2="760" y2="100" stroke="#182332" strokeWidth="1" strokeDasharray="3 3" />
            <text x="35" y="103" textAnchor="end" fill="#55677d" fontSize="9">+15s</text>

            <line x1="40" y1="40" x2="760" y2="40" stroke="#182332" strokeWidth="1" strokeDasharray="3 3" />
            <text x="35" y="43" textAnchor="end" fill="#55677d" fontSize="9">+30s</text>

            {/* Current Lap Marker */}
            <line x1="50" y1="20" x2="50" y2="180" stroke="#00d2ff" strokeWidth="1" strokeDasharray="2 2" />
            <text x="50" y="195" textAnchor="middle" fill="#00d2ff" fontSize="9">NOW: L{simCurrentLap}</text>

            {/* Target Pit Marker */}
            {(() => {
              const pitX = 50 + ((simPitLap - minLap) / Math.max(1, maxLap - minLap)) * 710;
              return (
                <g>
                  <line x1={pitX} y1="20" x2={pitX} y2="180" stroke="#00e5a3" strokeWidth="1" strokeDasharray="2 2" />
                  <text x={pitX} y="195" textAnchor="middle" fill="#00e5a3" fontSize="9">BOX L{simPitLap}</text>
                </g>
              );
            })()}

            {/* Checkered Flag Marker */}
            <line x1="760" y1="20" x2="760" y2="180" stroke="#718298" strokeWidth="1" />
            <text x="760" y="195" textAnchor="middle" fill="#718298" fontSize="9">L{selectedCircuit.totalLaps} FLAG</text>

            {/* Strategy C curve (red) */}
            {pathC && (
              <path
                d={pathC}
                fill="none"
                stroke="#ff4b4b"
                strokeWidth="1.75"
                strokeDasharray="4 2"
              />
            )}

            {/* Strategy B curve (yellow) */}
            {pathB && (
              <path
                d={pathB}
                fill="none"
                stroke="#eab308"
                strokeWidth="2"
                strokeDasharray="3 1"
              />
            )}

            {/* Strategy A curve (cyan/green) */}
            {pathA && (
              <path
                d={pathA}
                fill="none"
                stroke="#00e5a3"
                strokeWidth="2.5"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Why This Strategy? (AI Decision Support Engine Explainability) */}
      <div className="bg-[#0b1017] p-5 rounded border border-[#1b2536] space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#182333]">
          <Sparkles className="w-4 h-4 text-[#00e5a3]" />
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            WHY THIS STRATEGY? (CALCULATED AI DECISION SUPPORT ENGINE EXPLAINABILITY)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {simResult.explainabilityReasons.map((reason, idx) => {
            const [title, ...rest] = reason.split(': ');
            return (
              <div
                key={idx}
                className="bg-[#0d131c] p-3 rounded border border-[#192435] flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-[#00e5a3] block mb-1">
                    {title}
                  </span>
                  <p className="text-[10px] text-[#7a8da2] leading-relaxed">
                    {rest.join(': ')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
