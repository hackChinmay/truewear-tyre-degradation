import React, { useState, useMemo } from 'react';
import { useRace } from '../context/RaceContext';
import { getCircuitStintsData } from '../data/mockRaceData';
import { TyreCompound, StintData } from '../types';
import {
  Activity,
  ArrowRight,
  Cpu,
  Download,
  Flame,
  Gauge,
  Info,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export const StintAnalysis: React.FC = () => {
  const {
    currentLap,
    selectedCircuit,
    selectedDriver,
    selectedDriverCode,
    setSelectedDriverCode,
    selectedSession,
    setSelectedSession,
    selectedStintNumber,
    setSelectedStintNumber,
    selectedCompound,
    setSelectedCompound,
    drivers,
    fuelCorrectionEnabled,
    setFuelCorrectionEnabled,
    trackEvoCorrectionEnabled,
    setTrackEvoCorrectionEnabled,
    trafficDecouplingEnabled,
    setTrafficDecouplingEnabled,
    navigateTo,
    triggerActionNotification,
  } = useRace();

  const [hoveredLap, setHoveredLap] = useState<number | null>(null);
  const [compoundFilter, setCompoundFilter] = useState<TyreCompound | 'ALL'>('ALL');

  // Driver pace offset relative to pole/lead
  const driverPaceOffset = useMemo(() => {
    return (selectedDriver.position - 1) * 0.082;
  }, [selectedDriver.position]);

  // Session options dynamically tailored to circuit
  const sessionOptions = useMemo(() => {
    return [
      `Race Session (${selectedCircuit.totalLaps} Laps)`,
      'Free Practice 2 (Long Run)',
      'Qualifying Sim',
    ];
  }, [selectedCircuit.totalLaps]);

  // Base raw stints data from circuit model
  const rawStints: StintData[] = useMemo(() => {
    return getCircuitStintsData(
      selectedCircuit.id,
      selectedCircuit.baseLapTimeSeconds,
      selectedCircuit.totalLaps,
      driverPaceOffset
    );
  }, [selectedCircuit.id, selectedCircuit.baseLapTimeSeconds, selectedCircuit.totalLaps, driverPaceOffset]);

  // Compute dynamic stints with normalization adjustments & live status
  const stints = useMemo(() => {
    return rawStints.map((stint) => {
      // Dynamic status based on currentLap
      let dynamicStatus: 'COMPLETED' | 'ACTIVE' | 'PROJECTED' = 'PROJECTED';
      if (currentLap > stint.endLap) {
        dynamicStatus = 'COMPLETED';
      } else if (currentLap >= stint.startLap && currentLap <= stint.endLap) {
        dynamicStatus = 'ACTIVE';
      } else {
        dynamicStatus = 'PROJECTED';
      }

      // Normalization fuel correction adjustment
      const fuelShift = fuelCorrectionEnabled ? stint.fuelCorrectedDeltaVsBaseline * 0.45 : 0;
      const trackEvoShift = trackEvoCorrectionEnabled ? 0.22 : 0;
      const adjustedAvgSec = stint.avgPaceSeconds - fuelShift - trackEvoShift;

      const formatSec = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = (sec % 60).toFixed(3);
        return `${m}:${Number(s) < 10 ? '0' : ''}${s}s`;
      };

      return {
        ...stint,
        status: dynamicStatus,
        avgPaceSeconds: Number(adjustedAvgSec.toFixed(3)),
        avgPace: formatSec(adjustedAvgSec) + (dynamicStatus === 'PROJECTED' ? ' (PROJ)' : ''),
      };
    });
  }, [rawStints, currentLap, fuelCorrectionEnabled, trackEvoCorrectionEnabled]);

  // Generate lap-by-lap pace series for multi-stint kinetics chart
  const paceKineticsData = useMemo(() => {
    const totalLaps = selectedCircuit.totalLaps;
    const basePace = selectedCircuit.baseLapTimeSeconds + driverPaceOffset;
    const data: Array<{
      lap: number;
      stintNumber: number;
      compound: TyreCompound;
      compoundCode: string;
      tyreAge: number;
      observedPace: number;
      fuelCorrectedPace: number;
      trueDegDelta: number;
      isPitLap: boolean;
    }> = [];

    stints.forEach((stint) => {
      for (let lap = stint.startLap; lap <= stint.endLap; lap++) {
        const tyreAge = lap - stint.startLap + 1;
        const compoundFactor =
          stint.compound === 'SOFT' ? 0.092 : stint.compound === 'MEDIUM' ? 0.065 : 0.038;
        
        // Non-linear degradation curve (exponential acceleration as tyres near cliff)
        const cliffThreshold = selectedCircuit.cliffLapThreshold * (stint.compound === 'SOFT' ? 0.5 : stint.compound === 'MEDIUM' ? 0.75 : 1.1);
        const cliffRatio = tyreAge / cliffThreshold;
        const cliffDeg = cliffRatio > 0.85 ? Math.pow(cliffRatio - 0.85, 2) * 2.8 : 0;
        
        const rawDeg = tyreAge * compoundFactor + cliffDeg;
        const fuelBurnGain = (totalLaps - lap) * 0.052; // heavier at start
        const trackRubberGrip = Math.log(lap + 1) * 0.045; // grip improves with race
        const trafficRandom = trafficDecouplingEnabled ? 0 : Math.sin(lap * 1.7) * 0.08;

        const observedPace = basePace + rawDeg - (fuelCorrectionEnabled ? 0 : fuelBurnGain) - (trackEvoCorrectionEnabled ? 0 : trackRubberGrip) + trafficRandom;
        const fuelCorrectedPace = basePace + rawDeg;

        data.push({
          lap,
          stintNumber: stint.stintNumber,
          compound: stint.compound,
          compoundCode: stint.compoundCode,
          tyreAge,
          observedPace: Number(observedPace.toFixed(3)),
          fuelCorrectedPace: Number(fuelCorrectedPace.toFixed(3)),
          trueDegDelta: Number(rawDeg.toFixed(3)),
          isPitLap: lap === stint.endLap && stint.stintNumber < stints.length,
        });
      }
    });

    return data;
  }, [
    selectedCircuit,
    driverPaceOffset,
    stints,
    fuelCorrectionEnabled,
    trackEvoCorrectionEnabled,
    trafficDecouplingEnabled,
  ]);

  // Min / Max for SVG chart scaling
  const { minPace, maxPace, chartLaps } = useMemo(() => {
    if (paceKineticsData.length === 0) {
      return { minPace: 80, maxPace: 90, chartLaps: 53 };
    }
    const paces = paceKineticsData.map((d) => (fuelCorrectionEnabled ? d.fuelCorrectedPace : d.observedPace));
    const min = Math.min(...paces) - 0.4;
    const max = Math.max(...paces) + 0.5;
    return {
      minPace: min,
      maxPace: max,
      chartLaps: selectedCircuit.totalLaps,
    };
  }, [paceKineticsData, fuelCorrectionEnabled, selectedCircuit.totalLaps]);

  // SVG dimensions
  const svgWidth = 900;
  const svgHeight = 280;
  const padding = { top: 25, right: 30, bottom: 40, left: 60 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const scaleX = (lap: number) => padding.left + ((lap - 1) / Math.max(1, chartLaps - 1)) * graphWidth;
  const scaleY = (pace: number) => padding.top + (1 - (pace - minPace) / Math.max(0.1, maxPace - minPace)) * graphHeight;

  // Generate SVG path for a specific stint
  const generateStintPath = (stintNum: number) => {
    const stintPoints = paceKineticsData.filter((d) => d.stintNumber === stintNum);
    if (stintPoints.length === 0) return '';
    return stintPoints
      .map((d, i) => {
        const x = scaleX(d.lap);
        const y = scaleY(fuelCorrectionEnabled ? d.fuelCorrectedPace : d.observedPace);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const getCompoundColor = (compound: TyreCompound) => {
    switch (compound) {
      case 'SOFT':
        return '#ef4444'; // Red
      case 'MEDIUM':
        return '#eab308'; // Yellow
      case 'HARD':
        return '#f8fafc'; // White / Slate
      case 'INTERMEDIATE':
        return '#22c55e'; // Green
      case 'WET':
        return '#3b82f6'; // Blue
      default:
        return '#06b6d4';
    }
  };

  const getCompoundBadgeClass = (compound: TyreCompound) => {
    switch (compound) {
      case 'SOFT':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'HARD':
        return 'bg-slate-500/10 text-slate-300 border-slate-400/30';
      case 'INTERMEDIATE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'WET':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
  };

  // Export CSV handler
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Circuit,Driver,Session,StintNumber,Compound,StartLap,EndLap,TotalLaps,AvgPace,BestLap,WorstLap,DegRatePerLap,Status\n' +
      stints
        .map(
          (s) =>
            `"${selectedCircuit.name}","${selectedDriver.driverName}","${selectedSession}",${s.stintNumber},${s.compound},${s.startLap},${s.endLap},${s.totalLaps},"${s.avgPace}","${s.bestLap}","${s.worstLap}",${s.degRate},${s.status}`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `truewear_stints_${selectedCircuit.id}_${selectedDriver.driverCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerActionNotification('Stint degradation benchmark CSV exported successfully.', 'success');
  };

  // Highlighted stint data or active hover
  const activeHoverData = paceKineticsData.find((d) => d.lap === hoveredLap);

  // Corner thermal dissipation dynamic values based on circuit
  const cornerDissipation = useMemo(() => {
    const isHighLateral = ['silverstone', 'spa', 'suzuka', 'zandvoort'].includes(selectedCircuit.id);
    const isHighBraking = ['monza', 'bahrain', 'baku', 'canada', 'singapore'].includes(selectedCircuit.id);

    const baseThermal = selectedCircuit.nominalTrackTemp * 3.8;
    return {
      FL: {
        work: Math.round(baseThermal * (isHighLateral ? 1.25 : 1.05)),
        temp: Math.round(selectedCircuit.nominalTrackTemp * 2.8),
        status: isHighLateral ? 'THERMAL STRESS' : 'NOMINAL',
        wearRate: isHighLateral ? '0.042 mm/lap' : '0.028 mm/lap',
      },
      FR: {
        work: Math.round(baseThermal * (isHighLateral ? 1.38 : 1.12)),
        temp: Math.round(selectedCircuit.nominalTrackTemp * 2.95),
        status: 'HIGH LOAD',
        wearRate: isHighLateral ? '0.048 mm/lap' : '0.032 mm/lap',
      },
      RL: {
        work: Math.round(baseThermal * (isHighBraking ? 1.32 : 1.08)),
        temp: Math.round(selectedCircuit.nominalTrackTemp * 2.75),
        status: isHighBraking ? 'TRACTION STRESS' : 'NOMINAL',
        wearRate: isHighBraking ? '0.045 mm/lap' : '0.026 mm/lap',
      },
      RR: {
        work: Math.round(baseThermal * (isHighBraking ? 1.41 : 1.15)),
        temp: Math.round(selectedCircuit.nominalTrackTemp * 2.9),
        status: 'CRITICAL TRACTION',
        wearRate: isHighBraking ? '0.049 mm/lap' : '0.030 mm/lap',
      },
    };
  }, [selectedCircuit]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              MODULE 05
            </span>
            <span className="text-xs font-mono text-slate-400">HISTORICAL & LIVE STINT COMPARATOR</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1 flex items-center gap-2">
            Stint Analysis & Multi-Compound Kinetics
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Normalized tyre degradation curves across compounds, fuel mass burn-off offsets, and thermal cliff trajectories for{' '}
            <span className="text-cyan-300 font-semibold">{selectedCircuit.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            Export Stints CSV
          </button>
          <button
            onClick={() => navigateTo('strategy')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-semibold shadow-lg shadow-cyan-500/20 transition-all"
          >
            Strategy Workbench
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Controls & Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Driver Selector */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
            Target Driver
          </label>
          <select
            value={selectedDriverCode}
            onChange={(e) => {
              setSelectedDriverCode(e.target.value);
              triggerActionNotification(`Switched stint telemetry analysis to driver ${e.target.value}.`, 'info');
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500"
          >
            {drivers.map((d) => (
              <option key={d.driverCode} value={d.driverCode}>
                {d.driverCode} - {d.driverName} ({d.team}) [P{d.position}]
              </option>
            ))}
          </select>
        </div>

        {/* Session Selector */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
            Session Baseline
          </label>
          <select
            value={selectedSession}
            onChange={(e) => {
              setSelectedSession(e.target.value);
              triggerActionNotification(`Loaded session baseline: ${e.target.value}`, 'info');
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-cyan-500"
          >
            {sessionOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Compound Filter */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
            Compound Focus
          </label>
          <div className="flex items-center gap-1">
            {(['ALL', 'SOFT', 'MEDIUM', 'HARD'] as const).map((cmp) => {
              const isActive = compoundFilter === cmp;
              return (
                <button
                  key={cmp}
                  onClick={() => {
                    setCompoundFilter(cmp);
                    if (cmp !== 'ALL') {
                      setSelectedCompound(cmp);
                    }
                    triggerActionNotification(`Filtered stint analysis focus: ${cmp}`, 'info');
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-mono font-semibold rounded-lg border transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {cmp}
                </button>
              );
            })}
          </div>
        </div>

        {/* Normalization Toggles */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
            Data Normalization Engine
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFuelCorrectionEnabled(!fuelCorrectionEnabled);
                triggerActionNotification(
                  `Fuel Mass Correction ${!fuelCorrectionEnabled ? 'ENABLED' : 'DISABLED'}`,
                  'info'
                );
              }}
              className={`flex-1 px-2 py-1 text-[10px] font-mono font-semibold rounded border flex items-center justify-center gap-1 transition-all ${
                fuelCorrectionEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Cpu className="w-3 h-3" />
              Fuel {fuelCorrectionEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={() => {
                setTrackEvoCorrectionEnabled(!trackEvoCorrectionEnabled);
                triggerActionNotification(
                  `Track Evolution Correction ${!trackEvoCorrectionEnabled ? 'ENABLED' : 'DISABLED'}`,
                  'info'
                );
              }}
              className={`flex-1 px-2 py-1 text-[10px] font-mono font-semibold rounded border flex items-center justify-center gap-1 transition-all ${
                trackEvoCorrectionEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Activity className="w-3 h-3" />
              Evo {trackEvoCorrectionEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Stint Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stints.map((stint) => {
          const isSelected = selectedStintNumber === stint.stintNumber;
          const isCompoundMatch = compoundFilter === 'ALL' || compoundFilter === stint.compound;

          return (
            <div
              key={stint.stintNumber}
              onClick={() => {
                setSelectedStintNumber(stint.stintNumber);
                setSelectedCompound(stint.compound);
                setCompoundFilter(stint.compound);
                triggerActionNotification(
                  `Selected Stint ${stint.stintNumber} (${stint.compound} ${stint.compoundCode})`,
                  'info'
                );
              }}
              className={`cursor-pointer rounded-xl border p-4 transition-all relative overflow-hidden backdrop-blur-sm ${
                isSelected
                  ? 'bg-slate-850 border-cyan-500/80 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/40'
                  : isCompoundMatch
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  : 'bg-slate-900/40 border-slate-850 opacity-60 hover:opacity-100'
              }`}
            >
              {/* Corner accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: getCompoundColor(stint.compound) }}
              />

              <div className="flex items-start justify-between mb-3 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold font-mono text-white">
                    STINT {stint.stintNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-mono font-bold rounded border ${getCompoundBadgeClass(
                      stint.compound
                    )}`}
                  >
                    {stint.compound} ({stint.compoundCode})
                  </span>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    stint.status === 'COMPLETED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : stint.status === 'ACTIVE'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                      : 'bg-slate-700/30 text-slate-400 border-slate-700'
                  }`}
                >
                  {stint.status === 'ACTIVE'
                    ? `ACTIVE (LAP ${currentLap}/${stint.endLap})`
                    : stint.status}
                </span>
              </div>

              {/* Laps info */}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <span>
                  Laps: <strong className="text-slate-200 font-mono">L{stint.startLap} - L{stint.endLap}</strong>
                </span>
                <span>
                  Length: <strong className="text-cyan-400 font-mono">{stint.totalLaps} Laps</strong>
                </span>
                <span>
                  Pit Loss: <strong className="text-slate-300 font-mono">{stint.pitLossSeconds}s</strong>
                </span>
              </div>

              {/* Primary metrics */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                  <div className="text-[10px] text-slate-400 font-mono uppercase">
                    {fuelCorrectionEnabled ? 'Fuel-Corr Avg Pace' : 'Observed Avg Pace'}
                  </div>
                  <div className="text-sm font-bold font-mono text-white mt-0.5">
                    {stint.avgPace}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Δ {stint.fuelCorrectedDeltaVsBaseline > 0 ? '+' : ''}
                    {stint.fuelCorrectedDeltaVsBaseline.toFixed(2)}s vs Base
                  </div>
                </div>

                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Degradation Rate</div>
                  <div className="text-sm font-bold font-mono text-amber-400 mt-0.5 flex items-center gap-1">
                    +{stint.degRate} s/lap
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Best: <span className="text-emerald-400">{stint.bestLap}</span>
                  </div>
                </div>
              </div>

              {/* Thermal stability & terminal state */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Thermal Stability Index:</span>
                  <span
                    className={`font-mono font-bold ${
                      stint.thermalStabilityIndex > 80
                        ? 'text-emerald-400'
                        : stint.thermalStabilityIndex > 65
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {stint.thermalStabilityIndex}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stint.thermalStabilityIndex > 80
                        ? 'bg-emerald-500'
                        : stint.thermalStabilityIndex > 65
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${stint.thermalStabilityIndex}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 italic pt-1 leading-relaxed line-clamp-2">
                  {stint.tyreTerminalState}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* SVG Multi-Stint Pace Kinetics Chart */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Lap-by-Lap Stint Kinetics & Pace Evolution
            </h2>
            <p className="text-xs text-slate-400">
              Comparing raw pace degradation slopes across all stints on {selectedCircuit.name} (Total {selectedCircuit.totalLaps} Laps).
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-slate-300">Stint 1 (Soft C4)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-slate-300">Stint 2 (Medium C3)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="text-slate-300">Stint 3 (Hard C2)</span>
            </div>
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-cyan-300 font-semibold">Live Lap {currentLap}</span>
            </div>
          </div>
        </div>

        {/* SVG Container */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none overflow-visible"
            style={{ minWidth: '700px' }}
          >
            <defs>
              <linearGradient id="softGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="mediumGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eab308" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#eab308" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="hardGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Pace labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + ratio * graphHeight;
              const paceVal = maxPace - ratio * (maxPace - minPace);
              const m = Math.floor(paceVal / 60);
              const s = (paceVal % 60).toFixed(1);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="#334155"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {`${m}:${Number(s) < 10 ? '0' : ''}${s}`}
                  </text>
                </g>
              );
            })}

            {/* Vertical Lap Grid lines */}
            {Array.from({ length: 11 }, (_, i) => {
              const lap = Math.round(1 + (i * (selectedCircuit.totalLaps - 1)) / 10);
              const x = scaleX(lap);
              return (
                <g key={lap}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={svgHeight - padding.bottom}
                    stroke="#1e293b"
                    strokeWidth="0.75"
                  />
                  <text
                    x={x}
                    y={svgHeight - padding.bottom + 16}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    L{lap}
                  </text>
                </g>
              );
            })}

            {/* Pit Stop transition lines */}
            {stints.slice(0, -1).map((stint) => {
              const x = scaleX(stint.endLap);
              return (
                <g key={`pit-${stint.stintNumber}`}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={svgHeight - padding.bottom}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={x}
                    y={padding.top - 8}
                    fill="#f59e0b"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    PIT STOP {stint.stintNumber} (L{stint.endLap})
                  </text>
                </g>
              );
            })}

            {/* Stint 1 Line (Soft) */}
            <path
              d={generateStintPath(1)}
              fill="none"
              stroke="#ef4444"
              strokeWidth={compoundFilter === 'SOFT' || compoundFilter === 'ALL' ? '2.5' : '1'}
              strokeOpacity={compoundFilter === 'SOFT' || compoundFilter === 'ALL' ? 1 : 0.25}
              strokeLinecap="round"
            />

            {/* Stint 2 Line (Medium) */}
            <path
              d={generateStintPath(2)}
              fill="none"
              stroke="#eab308"
              strokeWidth={compoundFilter === 'MEDIUM' || compoundFilter === 'ALL' ? '2.5' : '1'}
              strokeOpacity={compoundFilter === 'MEDIUM' || compoundFilter === 'ALL' ? 1 : 0.25}
              strokeLinecap="round"
            />

            {/* Stint 3 Line (Hard) */}
            <path
              d={generateStintPath(3)}
              fill="none"
              stroke="#f8fafc"
              strokeWidth={compoundFilter === 'HARD' || compoundFilter === 'ALL' ? '2.5' : '1'}
              strokeOpacity={compoundFilter === 'HARD' || compoundFilter === 'ALL' ? 1 : 0.25}
              strokeLinecap="round"
            />

            {/* Live Lap Indicator Line */}
            {currentLap >= 1 && currentLap <= selectedCircuit.totalLaps && (
              <g>
                <line
                  x1={scaleX(currentLap)}
                  y1={padding.top}
                  x2={scaleX(currentLap)}
                  y2={svgHeight - padding.bottom}
                  stroke="#06b6d4"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                <circle
                  cx={scaleX(currentLap)}
                  cy={padding.top}
                  r="4"
                  fill="#06b6d4"
                  className="animate-pulse"
                />
                <rect
                  x={scaleX(currentLap) - 34}
                  y={svgHeight - padding.bottom + 22}
                  width="68"
                  height="16"
                  rx="3"
                  fill="#0891b2"
                />
                <text
                  x={scaleX(currentLap)}
                  y={svgHeight - padding.bottom + 34}
                  fill="#ffffff"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  L{currentLap} (NOW)
                </text>
              </g>
            )}

            {/* Interactive Points on Hover */}
            {paceKineticsData.map((d) => {
              const x = scaleX(d.lap);
              const y = scaleY(fuelCorrectionEnabled ? d.fuelCorrectedPace : d.observedPace);
              const isCurrent = d.lap === currentLap;
              const isHovered = d.lap === hoveredLap;
              const color = getCompoundColor(d.compound);

              return (
                <g
                  key={d.lap}
                  onMouseEnter={() => setHoveredLap(d.lap)}
                  onMouseLeave={() => setHoveredLap(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : isCurrent ? 4 : 2}
                    fill={isHovered ? '#38bdf8' : color}
                    stroke="#0f172a"
                    strokeWidth={isHovered || isCurrent ? 2 : 0.5}
                    opacity={compoundFilter === 'ALL' || compoundFilter === d.compound ? 1 : 0.2}
                  />
                  {/* Invisible hit target for smooth hover */}
                  <rect
                    x={x - 6}
                    y={padding.top}
                    width="12"
                    height={graphHeight}
                    fill="transparent"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Tooltip card below chart */}
        {activeHoverData ? (
          <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/40 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCompoundColor(activeHoverData.compound) }} />
              <span className="text-white font-bold">Lap {activeHoverData.lap}</span>
              <span className="text-slate-400">({activeHoverData.compound} {activeHoverData.compoundCode}, Stint {activeHoverData.stintNumber})</span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                Tyre Age: <strong className="text-cyan-400">{activeHoverData.tyreAge} Laps</strong>
              </span>
              <span>
                Observed Pace: <strong className="text-white">{activeHoverData.observedPace}s</strong>
              </span>
              <span>
                Fuel-Corrected Pace: <strong className="text-emerald-400">{activeHoverData.fuelCorrectedPace}s</strong>
              </span>
              <span>
                Deg Delta: <strong className="text-amber-400">+{activeHoverData.trueDegDelta}s</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 font-mono text-center pt-1">
            Hover over any lap on the graph to inspect exact fuel-normalized degradation and tyre compound age.
          </div>
        )}
      </div>

      {/* Compound Benchmark Matrix & Corner Thermal Work */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compound Benchmark Table */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Compound Performance Matrix ({selectedCircuit.name})
              </h3>
              <p className="text-xs text-slate-400">
                Pirelli tyre compound baseline degradation slopes and crossover windows.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2">Compound</th>
                  <th className="pb-2">Spec Code</th>
                  <th className="pb-2">Optimal Window</th>
                  <th className="pb-2">Deg Slope</th>
                  <th className="pb-2">Thermal Cliff</th>
                  <th className="pb-2">Degradation Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr
                  onClick={() => {
                    setCompoundFilter('SOFT');
                    setSelectedCompound('SOFT');
                  }}
                  className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                    compoundFilter === 'SOFT' ? 'bg-red-500/10' : ''
                  }`}
                >
                  <td className="py-2.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="font-bold text-red-400">SOFT</span>
                  </td>
                  <td className="py-2.5 text-slate-300">C4</td>
                  <td className="py-2.5 text-slate-200">
                    L1 - L{Math.round(selectedCircuit.cliffLapThreshold * 0.45)}
                  </td>
                  <td className="py-2.5 text-amber-400 font-bold">+0.114 s/lap</td>
                  <td className="py-2.5 text-red-400 font-bold">
                    Lap {Math.round(selectedCircuit.cliffLapThreshold * 0.45)}
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/30">
                      HIGH THERMAL PEAK
                    </span>
                  </td>
                </tr>

                <tr
                  onClick={() => {
                    setCompoundFilter('MEDIUM');
                    setSelectedCompound('MEDIUM');
                  }}
                  className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                    compoundFilter === 'MEDIUM' ? 'bg-yellow-500/10' : ''
                  }`}
                >
                  <td className="py-2.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="font-bold text-yellow-400">MEDIUM</span>
                  </td>
                  <td className="py-2.5 text-slate-300">C3</td>
                  <td className="py-2.5 text-slate-200">
                    L{Math.round(selectedCircuit.cliffLapThreshold * 0.35)} - L{Math.round(selectedCircuit.cliffLapThreshold * 0.78)}
                  </td>
                  <td className="py-2.5 text-amber-400 font-bold">+0.078 s/lap</td>
                  <td className="py-2.5 text-yellow-400 font-bold">
                    Lap {Math.round(selectedCircuit.cliffLapThreshold * 0.78)}
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                      MODERATE GRAINING
                    </span>
                  </td>
                </tr>

                <tr
                  onClick={() => {
                    setCompoundFilter('HARD');
                    setSelectedCompound('HARD');
                  }}
                  className={`cursor-pointer hover:bg-slate-800/40 transition-colors ${
                    compoundFilter === 'HARD' ? 'bg-slate-700/30' : ''
                  }`}
                >
                  <td className="py-2.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <span className="font-bold text-slate-200">HARD</span>
                  </td>
                  <td className="py-2.5 text-slate-300">C2</td>
                  <td className="py-2.5 text-slate-200">
                    L{Math.round(selectedCircuit.cliffLapThreshold * 0.65)} - L{selectedCircuit.totalLaps}
                  </td>
                  <td className="py-2.5 text-emerald-400 font-bold">+0.042 s/lap</td>
                  <td className="py-2.5 text-slate-300 font-bold">
                    Lap {selectedCircuit.cliffLapThreshold}
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      LINEAR RETENTION
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4-Corner Energy Dissipation Grid */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              Corner Thermal Dissipation
            </h3>
            <p className="text-xs text-slate-400">
              Lateral & traction work per wheel on {selectedCircuit.corners} corners.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(['FL', 'FR', 'RL', 'RR'] as const).map((corner) => {
              const data = cornerDissipation[corner];
              return (
                <div
                  key={corner}
                  className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-cyan-400">{corner}</span>
                    <span className="text-[10px] text-slate-400">{data.status}</span>
                  </div>
                  <div className="text-base font-bold font-mono text-white">
                    {data.work} <span className="text-xs font-normal text-slate-400">kJ/lap</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Temp: <strong className="text-amber-400">{data.temp}°C</strong></span>
                    <span>Wear: <strong className="text-slate-300">{data.wearRate}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-cyan-400 inline mr-1" />
            Lateral load distribution is calibrated to {selectedCircuit.name}&apos;s high-energy sectors. Fuel mass burn reduces front axle scrub by ~0.012s/lap.
          </div>
        </div>
      </div>
    </div>
  );
};
