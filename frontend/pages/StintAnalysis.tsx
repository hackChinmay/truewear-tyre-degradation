import React, { useState } from 'react';
import { useRace } from '../context/RaceContext';
import { STINTS_DATA, HISTORICAL_LAPS } from '../data/mockRaceData';
import {
  ArrowRight,
  BarChart3,
  Download,
  Layers,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';

export const StintAnalysis: React.FC = () => {
  const {
    currentLap,
    selectedCircuit,
    selectedDriver,
    setSelectedDriverCode,
    selectedSession,
    setSelectedSession,
    selectedStintNumber,
    setSelectedStintNumber,
    selectedCompound,
    setSelectedCompound,
    drivers,
    weatherState,
    fuelCorrectionEnabled,
    setFuelCorrectionEnabled,
    trackEvoCorrectionEnabled,
    setTrackEvoCorrectionEnabled,
    navigateTo,
    triggerActionNotification,
  } = useRace();

  const handleExportReport = () => {
    triggerActionNotification(`Exported Stint Kinetics Report for #${selectedDriver.driverNumber} ${selectedDriver.driverName} (#RPT-STINT-0926-03).`, 'success');
  };

  return (
    <div id="page-stint-analysis" className="space-y-6 pb-12 font-mono">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1b2536] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[#ff2a2a] font-bold tracking-widest uppercase">
              MODULE 05 // STINT ANALYSIS
            </span>
            <span className="text-[10px] bg-[#162335] text-[#38bdf8] px-2 py-0.5 rounded border border-[#233852]">
              {selectedCircuit.name.toUpperCase()} {selectedCircuit.totalLaps} LAPS MASTER LOG
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">STINT ANALYSIS</h1>
          <p className="text-xs text-[#8fa1b6] mt-0.5">
            Driver and tyre-stint performance breakdown across multiple compound allocations • #{selectedDriver.driverNumber} {selectedDriver.driverName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportReport}
            className="bg-[#121c2a] hover:bg-[#1a273a] text-[#8fa2b8] hover:text-white px-3 py-1.5 rounded border border-[#23344b] text-xs flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT STINT REPORT</span>
          </button>
          <button
            onClick={() => navigateTo('tyres')}
            className="bg-[#ff2a2a] hover:bg-[#e02424] text-white px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <span>VIEW TYRE INTELLIGENCE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter / Configuration Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0b1017] p-3 rounded border border-[#1b2536] text-xs">
        <div>
          <label htmlFor="stint-driver-select" className="text-[10px] text-[#55677d] block mb-1">TARGET DRIVER</label>
          <select
            id="stint-driver-select"
            value={selectedDriver.driverCode}
            onChange={(e) => setSelectedDriverCode(e.target.value)}
            className="w-full bg-[#101722] p-2 rounded border border-[#1a2536] text-white font-bold outline-none cursor-pointer text-xs"
          >
            {drivers.map((d) => (
              <option key={d.driverCode} value={d.driverCode} className="bg-[#0e141f]">
                #{d.driverNumber} {d.driverName} (P{d.position})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="stint-session-select" className="text-[10px] text-[#55677d] block mb-1">SESSION RUN</label>
          <select
            id="stint-session-select"
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full bg-[#101722] p-2 rounded border border-[#1a2536] text-white font-bold outline-none cursor-pointer text-xs"
          >
            <option value="RACE" className="bg-[#0e141f]">Race ({weatherState.trackState} / {weatherState.trackTemp.toFixed(1)}°C Track)</option>
            <option value="QUALIFYING" className="bg-[#0e141f]">Qualifying Session</option>
            <option value="FP3" className="bg-[#0e141f]">Free Practice 3</option>
            <option value="FP2" className="bg-[#0e141f]">Free Practice 2</option>
            <option value="FP1" className="bg-[#0e141f]">Free Practice 1</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[#55677d] block mb-1">NORMALIZATION TOGGLES</label>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setFuelCorrectionEnabled(!fuelCorrectionEnabled)}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                fuelCorrectionEnabled
                  ? 'bg-[#10291e] text-[#00e5a3] border-[#1c553a]'
                  : 'bg-[#131b26] text-[#62768c] border-[#1d2737]'
              }`}
            >
              Fuel Corrected
            </button>
            <button
              onClick={() => setTrackEvoCorrectionEnabled(!trackEvoCorrectionEnabled)}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                trackEvoCorrectionEnabled
                  ? 'bg-[#10291e] text-[#00e5a3] border-[#1c553a]'
                  : 'bg-[#131b26] text-[#62768c] border-[#1d2737]'
              }`}
            >
              Track Evo Normalized
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="stint-compound-select" className="text-[10px] text-[#55677d] block mb-1">COMPOUND FILTER</label>
          <select
            id="stint-compound-select"
            value={selectedCompound}
            onChange={(e) => setSelectedCompound(e.target.value as any)}
            className="w-full bg-[#101722] p-2 rounded border border-[#1a2536] text-[#38bdf8] font-bold outline-none cursor-pointer text-xs"
          >
            <option value="MEDIUM" className="bg-[#0e141f]">MEDIUM (C3 Primary)</option>
            <option value="SOFT" className="bg-[#0e141f]">SOFT (C4 Aggressive)</option>
            <option value="HARD" className="bg-[#0e141f]">HARD (C2 Durable)</option>
          </select>
        </div>
      </div>

      {/* Chronological Stint Architecture (3 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {STINTS_DATA.map((stint) => {
          const isSelectedStint = selectedStintNumber === stint.stintNumber;
          const isActive = stint.status === 'ACTIVE';
          const isCompleted = stint.status === 'COMPLETED';
          const isProjected = stint.status === 'PROJECTED';

          const borderTheme = isSelectedStint
            ? 'border-[#ff2a2a] ring-1 ring-[#ff2a2a]/60 bg-gradient-to-b from-[#1c1214] to-[#0d131c]'
            : isActive
            ? 'border-[#8f6d19] bg-gradient-to-b from-[#181810] to-[#0d131c]'
            : isCompleted
            ? 'border-[#1b2536] bg-[#0d131c]'
            : 'border-[#1a3848] bg-[#09151e]';

          return (
            <div
              key={stint.stintNumber}
              onClick={() => setSelectedStintNumber(stint.stintNumber)}
              title={`Select Stint ${stint.stintNumber} for cross-page stint and tyre analysis`}
              className={`p-4 rounded border flex flex-col justify-between transition-all cursor-pointer hover:border-[#ff4b4b]/60 ${borderTheme}`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#182333] mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">
                      STINT 0{stint.stintNumber}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        stint.compound === 'SOFT'
                          ? 'bg-red-950/50 text-red-400 border border-red-800'
                          : stint.compound === 'MEDIUM'
                          ? 'bg-yellow-950/50 text-yellow-400 border border-yellow-800'
                          : 'bg-cyan-950/50 text-cyan-400 border border-cyan-800'
                      }`}
                    >
                      {stint.compound} ({stint.compoundCode})
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      isActive
                        ? 'bg-yellow-950/60 text-yellow-400 border-yellow-800'
                        : isCompleted
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : 'bg-cyan-950/60 text-cyan-400 border-cyan-800'
                    }`}
                  >
                    {stint.status}
                  </span>
                </div>

                <div className="text-[11px] text-[#8ea2b8] mb-3">
                  <span>LAPS {stint.startLap} - {stint.endLap} ({stint.totalLaps} Laps)</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-[#080d14] p-2 rounded border border-[#16202f]">
                    <span className="text-[9px] text-[#55677d] block">AVERAGE PACE</span>
                    <strong className="text-white text-sm">{stint.avgPace}</strong>
                  </div>
                  <div className="bg-[#080d14] p-2 rounded border border-[#16202f]">
                    <span className="text-[9px] text-[#55677d] block">DEGRADATION RATE</span>
                    <strong
                      className={`text-sm ${
                        stint.degRate > 0.09
                          ? 'text-red-400'
                          : stint.degRate > 0.05
                          ? 'text-yellow-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      +{stint.degRate} s/lap
                    </strong>
                  </div>
                  <div className="bg-[#080d14] p-2 rounded border border-[#16202f]">
                    <span className="text-[9px] text-[#55677d] block">BEST LAP</span>
                    <strong className="text-emerald-400 text-sm">{stint.bestLap}</strong>
                  </div>
                  <div className="bg-[#080d14] p-2 rounded border border-[#16202f]">
                    <span className="text-[9px] text-[#55677d] block">STABILITY INDEX</span>
                    <strong className="text-[#00d2ff] text-sm">{stint.thermalStabilityIndex}%</strong>
                  </div>
                </div>

                <div className="bg-[#080d14] p-2 rounded border border-[#16202f] text-[10px] text-[#71849a] mb-2">
                  <span className="text-[#55677d] block text-[9px] uppercase">TYRE TERMINAL STATE:</span>
                  <strong className="text-white">{stint.tyreTerminalState}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-[#16202f] text-[10px] text-[#55677d] flex justify-between">
                <span>PIT TRANSIT LOSS: {stint.pitLossSeconds}s</span>
                <span className="text-[#38bdf8]">
                  Δ vs S1: {stint.fuelCorrectedDeltaVsBaseline > 0 ? '+' : ''}
                  {stint.fuelCorrectedDeltaVsBaseline}s
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stint Lap Time Trajectory & Pace Kinetics Line Chart */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536]">
        <div className="flex items-center justify-between pb-3 border-b border-[#182333] mb-3">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              STINT LAP TIME TRAJECTORY &amp; PACE KINETICS (LAPS 1-53)
            </h3>
            <p className="text-[10px] text-[#5e7086]">
              Visualizing the degradation slopes across Stint 1 (Soft), Stint 2 (Medium), and Stint 3 (Hard)
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2.5 h-1 bg-red-500 rounded-full" />
              Stint 1 (Soft C4)
            </span>
            <span className="flex items-center gap-1 text-yellow-400">
              <span className="w-2.5 h-1 bg-yellow-500 rounded-full" />
              Stint 2 (Med C3)
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2.5 h-1 bg-cyan-400 rounded-full" />
              Stint 3 (Hard C2 Proj)
            </span>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="h-64 bg-[#070b10] rounded border border-[#141d2a] p-2 flex items-center justify-center">
          <svg viewBox="0 0 840 220" className="w-full h-full" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="50" y1="40" x2="800" y2="40" stroke="#162334" strokeWidth="1" strokeDasharray="2 2" />
            <text x="42" y="43" textAnchor="end" fill="#55677d" fontSize="9">1:26.0</text>

            <line x1="50" y1="90" x2="800" y2="90" stroke="#162334" strokeWidth="1" strokeDasharray="2 2" />
            <text x="42" y="93" textAnchor="end" fill="#55677d" fontSize="9">1:25.0</text>

            <line x1="50" y1="140" x2="800" y2="140" stroke="#162334" strokeWidth="1" strokeDasharray="2 2" />
            <text x="42" y="143" textAnchor="end" fill="#55677d" fontSize="9">1:24.0</text>

            <line x1="50" y1="190" x2="800" y2="190" stroke="#162334" strokeWidth="1" strokeDasharray="2 2" />
            <text x="42" y="193" textAnchor="end" fill="#55677d" fontSize="9">1:23.0</text>

            {/* Pit Stop Markers */}
            <line x1="280" y1="20" x2="280" y2="200" stroke="#ff2a2a" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x="280" y="32" textAnchor="middle" fill="#ff4b4b" fontSize="8" fontWeight="bold">BOX 1 (L16)</text>

            <line x1="600" y1="20" x2="600" y2="200" stroke="#00e5a3" strokeWidth="1.5" strokeDasharray="4 2" />
            <text x="600" y="32" textAnchor="middle" fill="#00e5a3" fontSize="8" fontWeight="bold">TARGET BOX 2 (L38)</text>

            {/* Stint 1 line (Soft: starts 1:23.4 -> degrades to 1:26.1) */}
            <path
              d="M 60 170 L 100 165 L 150 155 L 200 135 L 250 85 L 275 50"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
            />

            {/* Stint 2 line (Medium: starts 1:23.2 -> degrades to 1:24.5) */}
            <path
              d="M 285 180 L 350 175 L 430 165 L 510 150 L 550 135 L 595 115"
              fill="none"
              stroke="#eab308"
              strokeWidth="2.5"
            />

            {/* Stint 3 projected (Hard: 1:23.6 -> stable to 1:24.0) */}
            <path
              d="M 605 160 L 660 158 L 720 152 L 780 148 L 800 145"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />
          </svg>
        </div>
      </div>

      {/* Multi-Compound Degradation Benchmark Table */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536]">
        <div className="flex items-center justify-between pb-3 border-b border-[#182333] mb-3">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            COMPOUND DEGRADATION BENCHMARK &amp; MULTI-STINT COMPARISON
          </h3>
          <span className="text-[10px] text-[#00e5a3]">MONZA BENCHMARK DATASET</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#182435] text-[#5a6c82] text-[10px] uppercase">
                <th className="py-2 px-3">COMPOUND</th>
                <th className="py-2 px-3">STINT REFERENCE</th>
                <th className="py-2 px-3">INITIAL PACE</th>
                <th className="py-2 px-3">DEGRADATION RATE</th>
                <th className="py-2 px-3">COMPETITIVE LIFE</th>
                <th className="py-2 px-3">END-OF-STINT PACE</th>
                <th className="py-2 px-3">THERMAL STABILITY</th>
                <th className="py-2 px-3">WEAR STATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d2b]">
              <tr className="hover:bg-[#0e141f]">
                <td className="py-2.5 px-3">
                  <span className="bg-red-950/60 text-red-400 px-2 py-0.5 rounded border border-red-800 font-bold text-[10px]">
                    SOFT (C4)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-white">Stint 1 (L1-16)</td>
                <td className="py-2.5 px-3">1:23.420s</td>
                <td className="py-2.5 px-3 text-red-400 font-bold">+0.114 s/lap</td>
                <td className="py-2.5 px-3 text-white">13 Laps</td>
                <td className="py-2.5 px-3 text-red-400 font-bold">1:26.110s</td>
                <td className="py-2.5 px-3 text-red-400">62% (Overheating)</td>
                <td className="py-2.5 px-3 text-[#94a3b8]">Severe Shoulder Blistering</td>
              </tr>
              <tr className="hover:bg-[#0e141f] bg-[#121924]/40">
                <td className="py-2.5 px-3">
                  <span className="bg-yellow-950/60 text-yellow-400 px-2 py-0.5 rounded border border-yellow-800 font-bold text-[10px]">
                    MEDIUM (C3)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-white font-bold">Stint 2 (L17-34 Active)</td>
                <td className="py-2.5 px-3 text-[#00d2ff] font-bold">1:23.218s</td>
                <td className="py-2.5 px-3 text-yellow-400 font-bold">+0.078 s/lap</td>
                <td className="py-2.5 px-3 text-white">22 Laps</td>
                <td className="py-2.5 px-3 text-yellow-400">1:24.510s</td>
                <td className="py-2.5 px-3 text-emerald-400">89% (Optimal)</td>
                <td className="py-2.5 px-3 text-[#94a3b8]">Uniform Wear / FR Peak</td>
              </tr>
              <tr className="hover:bg-[#0e141f]">
                <td className="py-2.5 px-3">
                  <span className="bg-cyan-950/60 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800 font-bold text-[10px]">
                    HARD (C2)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-white">Benchmark Projection</td>
                <td className="py-2.5 px-3">1:23.640s</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">+0.042 s/lap</td>
                <td className="py-2.5 px-3 text-white">32 Laps</td>
                <td className="py-2.5 px-3 text-emerald-400">1:24.180s</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">95% (Ultra Stable)</td>
                <td className="py-2.5 px-3 text-[#94a3b8]">Low Grain / High Endurance</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Aggregate Stint Energy & Dissipation Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-[#0b1017] p-4 rounded border border-[#1b2536] text-xs">
        <div className="bg-[#0e1520] p-2.5 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">FL CORNER ENERGY</span>
          <strong className="text-white text-base">18.2 kJ</strong>
        </div>
        <div className="bg-[#0e1520] p-2.5 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">FR CORNER ENERGY</span>
          <strong className="text-[#ff4b4b] text-base">22.4 kJ (PEAK)</strong>
        </div>
        <div className="bg-[#0e1520] p-2.5 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">RL CORNER ENERGY</span>
          <strong className="text-white text-base">11.9 kJ</strong>
        </div>
        <div className="bg-[#0e1520] p-2.5 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">RR CORNER ENERGY</span>
          <strong className="text-white text-base">12.3 kJ</strong>
        </div>
        <div className="bg-[#0e1520] p-2.5 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">TOTAL THERMAL WORK</span>
          <strong className="text-[#00e5a3] text-base">64.8 kJ</strong>
        </div>
      </div>
    </div>
  );
};
