import React from 'react';
import { useRace } from '../context/RaceContext';
import { DegradationChart } from '../components/DegradationChart';
import { TyreThermalCard } from '../components/TyreThermalCard';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Flame,
  Gauge,
  Layers,
  Radio,
  Sliders,
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const {
    currentLap,
    selectedCircuit,
    wheelTelemetry,
    drivers,
    selectedDriver,
    setSelectedDriverCode,
    navigateTo,
    triggerActionNotification,
    activePlan,
    setActivePlan,
  } = useRace();

  const handleConfirmPlanA = () => {
    setActivePlan('A');
    triggerActionNotification(
      'PLAN A CONFIRMED: Box call transmitted to Race Control for Lap 38. Crew ready.',
      'success'
    );
  };

  const handleSimulatePlanB = () => {
    setActivePlan('B');
    navigateTo('strategy');
  };

  const driverPaceOffset = (selectedDriver.position - 1) * 0.085;
  const basePace = selectedCircuit.baseLapTimeSeconds + driverPaceOffset;
  const currentPaceSec = basePace + 0.133;

  const formatLapTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(3);
    return `${m}:${Number(s) < 10 ? '0' : ''}${s}`;
  };

  const s1 = (currentPaceSec * 0.322).toFixed(3);
  const s2 = (currentPaceSec * 0.324).toFixed(3);
  const s3 = (currentPaceSec - Number(s1) - Number(s2)).toFixed(3);

  const totalLaps = selectedCircuit.totalLaps;
  const s1End = Math.max(10, Math.round(totalLaps * 0.30));
  const s2End = Math.max(s1End + 10, Math.round(totalLaps * 0.70));
  const s3Laps = totalLaps - s2End;
  const s2Laps = s2End - s1End;

  return (
    <div id="page-command-center" className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1b2536] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-[#ff2a2a] font-bold tracking-widest uppercase">
              MODULE 01 // COMMAND CENTER
            </span>
            <span className="text-[10px] font-mono bg-[#162335] text-[#38bdf8] px-2 py-0.5 rounded border border-[#233852]">
              PUBLIC TIMING &amp; TELEMETRY DATA
            </span>
          </div>
          <h1 className="text-2xl font-black font-mono tracking-tight text-white flex items-center gap-3">
            COMMAND CENTER
          </h1>
          <p className="text-xs font-mono text-[#8fa1b6] mt-0.5">
            AI-Powered Race Strategy &amp; Tyre Intelligence • {selectedCircuit.name.toUpperCase()} (
            {selectedCircuit.lengthKm} km) • LAP {currentLap} / {selectedCircuit.totalLaps}
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="bg-[#0f1722] text-[#8ea2b8] px-3 py-1.5 rounded border border-[#1b2838] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00e5a3] animate-pulse" />
            <span>ESTIMATED &amp; PREDICTED TELEMETRY</span>
          </div>
        </div>
      </div>

      {/* Metrics Row (4 Prominent Motorsport Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 font-mono">
        {/* Metric 1: Current Pace */}
        <div className="bg-[#0d131c] p-4 rounded border border-[#1b2636] hover:border-[#27384e] transition-all">
          <div className="flex items-center justify-between text-[11px] text-[#6b7d93] mb-1">
            <span>CURRENT LAP PACE</span>
            <span className="text-[9px] bg-[#0c221a] text-[#00e5a3] px-1.5 py-0.5 rounded border border-[#184835] font-bold">
              VALIDATED
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">{formatLapTime(currentPaceSec)}s</div>
          <div className="text-[11px] text-[#00d2ff] font-semibold mt-1">
            +0.133s vs optimal ({formatLapTime(basePace)})
          </div>
          <div className="text-[10px] text-[#55677d] mt-2 pt-2 border-t border-[#172230] flex justify-between">
            <span>S1: {s1}</span>
            <span>S2: {s2}</span>
            <span>S3: {s3}</span>
          </div>
        </div>

        {/* Metric 2: Tyre Age & Compound */}
        <div className="bg-[#0d131c] p-4 rounded border border-[#1b2636] hover:border-[#27384e] transition-all">
          <div className="flex items-center justify-between text-[11px] text-[#6b7d93] mb-1">
            <span>TYRE AGE &amp; COMPOUND</span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                selectedDriver.compound === 'SOFT'
                  ? 'bg-[#29080b] text-red-400 border-red-800'
                  : selectedDriver.compound === 'MEDIUM'
                  ? 'bg-[#271d07] text-[#eab308] border-[#523d0f]'
                  : 'bg-[#082029] text-cyan-400 border-cyan-800'
              }`}
            >
              {selectedDriver.compoundCode} {selectedDriver.compound}
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">{selectedDriver.tyreAge} LAPS</div>
          <div className="text-[11px] text-[#eab308] font-semibold mt-1">
            #{selectedDriver.driverNumber} {selectedDriver.driverName} (P{selectedDriver.position})
          </div>
          <div className="text-[10px] text-[#55677d] mt-2 pt-2 border-t border-[#172230] flex justify-between">
            <span>PIT WINDOW: {selectedDriver.estPitWindow}</span>
            <span className="text-amber-400 font-bold">INTERVAL: {selectedDriver.interval}</span>
          </div>
        </div>

        {/* Metric 3: Pace Degradation Rate */}
        <div className="bg-[#0d131c] p-4 rounded border border-[#1b2636] hover:border-[#27384e] transition-all">
          <div className="flex items-center justify-between text-[11px] text-[#6b7d93] mb-1">
            <span>PACE DEGRADATION RATE</span>
            <span className="text-[9px] bg-[#22170c] text-amber-400 px-1.5 py-0.5 rounded border border-[#482e18] font-bold">
              +0.078 s/lap
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">+{selectedDriver.degRatePerLap.toFixed(3)} s/lap</div>
          <div className="text-[11px] text-[#ff8f8f] font-semibold mt-1">
            +0.026s vs baseline model
          </div>
          <div className="text-[10px] text-[#55677d] mt-2 pt-2 border-t border-[#172230] flex justify-between">
            <span>OVERHEAT: 1.18x</span>
            <span className="text-[#ff4b4b] font-bold">CROSSOVER: L{selectedCircuit.cliffLapThreshold}</span>
          </div>
        </div>

        {/* Metric 4: Tyre Residual Life */}
        <div className="bg-[#0d131c] p-4 rounded border border-[#1b2636] hover:border-[#27384e] transition-all">
          <div className="flex items-center justify-between text-[11px] text-[#6b7d93] mb-1">
            <span>TYRE RESIDUAL LIFE</span>
            <span className="text-[9px] bg-[#11241a] text-[#00e5a3] px-1.5 py-0.5 rounded border border-[#1b4d37] font-bold">
              31% USABLE
            </span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">{Math.max(1, Math.round(selectedCircuit.cliffLapThreshold - selectedDriver.tyreAge))} LAPS</div>
          <div className="text-[11px] text-[#00e5a3] font-semibold mt-1">
            BOX STRATEGY VALID • L{s2End - 1}-{s2End + 1} Window
          </div>
          <div className="text-[10px] text-[#55677d] mt-2 pt-2 border-t border-[#172230] flex justify-between">
            <span>RACE REMAIN: {Math.max(0, totalLaps - currentLap)} LAPS</span>
            <span className="text-cyan-400 font-bold">NEXT: C2 HARD</span>
          </div>
        </div>
      </div>

      {/* Race Timeline & Stint Architecture */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536] font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-[#182333] mb-3">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              RACE TIMELINE &amp; STINT ARCHITECTURE
            </h3>
            <span className="text-[10px] text-[#5e7086]">
              Total Distance: {totalLaps} Laps, {selectedCircuit.totalDistanceKm} km • Pit Lane Transit Delta: 21.4s
            </span>
          </div>
          <span className="text-[10px] text-[#38bdf8] bg-[#101b29] px-2 py-0.5 rounded border border-[#1d2f46]">
            1-STOP TARGET COMMITTED
          </span>
        </div>

        {/* Visual Multi-Segment Stint Bar */}
        <div className="space-y-2">
          <div className="h-9 w-full bg-[#080d14] rounded overflow-hidden flex border border-[#182434] p-1 gap-1">
            {/* Stint 1: Soft */}
            <div
              className="bg-gradient-to-r from-red-600 to-red-500 rounded-sm h-full flex items-center justify-center text-[10px] text-white font-bold px-2 relative group cursor-pointer"
              style={{ width: `${(s1End / totalLaps) * 100}%` }}
              title={`Stint 1: C4 Soft, ${s1End} Laps Completed (Pit Lap ${s1End})`}
            >
              <span>STINT 1: SOFT [{s1End}L]</span>
            </div>

            {/* Stint 2: Medium */}
            <div
              className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-sm h-full flex items-center justify-between text-[10px] text-black font-extrabold px-3 relative group cursor-pointer"
              style={{ width: `${(s2Laps / totalLaps) * 100}%` }}
              title={`Stint 2: C3 Medium, Active ${s2Laps} Laps, Target Pit Lap ${s2End}`}
            >
              <span>STINT 2: MEDIUM [ACTIVE L{s1End + 1}-{s2End}]</span>
              <span className="bg-black/40 text-white px-1 rounded text-[9px]">NOW: L{currentLap}</span>
            </div>

            {/* Pit Window Indicator Bracket */}
            <div
              className="bg-emerald-500/20 border border-emerald-400 border-dashed rounded-sm h-full flex items-center justify-center text-[9px] text-emerald-300 font-bold px-1"
              style={{ width: `${(2 / totalLaps) * 100}%` }}
              title={`Pit Window: Lap ${s2End - 1}-${s2End + 1}`}
            >
              BOX
            </div>

            {/* Stint 3: Hard */}
            <div
              className="bg-gradient-to-r from-cyan-600 to-slate-400 rounded-sm h-full flex items-center justify-center text-[10px] text-white font-bold px-2 relative group cursor-pointer"
              style={{ width: `${(s3Laps / totalLaps) * 100}%` }}
              title={`Stint 3: C2 Hard (Projected ${s3Laps} Laps to flag)`}
            >
              <span>STINT 3: HARD (PROJ {s3Laps}L)</span>
            </div>
          </div>

          {/* Lap Markers Axis */}
          <div className="flex justify-between text-[10px] text-[#55677d] px-1">
            <span>LAP 01 [START]</span>
            <span>LAP {Math.round(totalLaps * 0.2)}</span>
            <span>LAP {s1End} [BOX 1]</span>
            <span>LAP {Math.round(totalLaps * 0.5)}</span>
            <span>LAP {s2End} [TARGET BOX 2]</span>
            <span>LAP {totalLaps} [FINISH]</span>
          </div>
        </div>
      </div>

      {/* Degradation Forecast & Cliff Projection Chart */}
      <DegradationChart currentLap={currentLap} highlightPitWindow={true} />

      {/* Mission Directive // Race Engineer Co-Pilot */}
      <div
        id="race-engineer-directive"
        className="bg-gradient-to-br from-[#0c181f] via-[#0d1622] to-[#121c2a] p-5 rounded border border-[#1b3d36] font-mono shadow-lg relative overflow-hidden"
      >
        {/* Glow Accent */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#00e5a3]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1b3330] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-[#00e5a3] text-black flex items-center justify-center font-bold">
              AI
            </div>
            <div>
              <span className="text-[10px] text-[#00e5a3] font-bold tracking-widest uppercase">
                MISSION DIRECTIVE // RACE ENGINEER CO-PILOT
              </span>
              <h3 className="text-sm font-bold text-white">
                RECOMMENDED ACTION: BOX LAP 37-39 [MEDIUM -&gt; HARD]
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-[#0a271c] text-[#00e5a3] font-bold px-2.5 py-1 rounded border border-[#16563d]">
              PLAN A • PRIMARY COMMITTED PATH
            </span>
          </div>
        </div>

        {/* Key Rationale Numbers (6-Point Explainable Framework) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs">
          <div className="bg-[#081017]/80 p-3 rounded border border-[#172c2c]">
            <span className="text-[#64798e] text-[10px] block">EXPECTED RACE-TIME ADVANTAGE</span>
            <strong className="text-2xl font-black text-[#00e5a3]">-2.8s</strong>
            <span className="text-[10px] text-[#55697d] block mt-0.5">
              Across 500 Monte Carlo iterations vs Plan B
            </span>
          </div>
          <div className="bg-[#081017]/80 p-3 rounded border border-[#172c2c]">
            <span className="text-[#64798e] text-[10px] block">PREDICTED DEGRADATION [P10 - P90]</span>
            <strong className="text-2xl font-black text-amber-400">+0.078 s/lap</strong>
            <span className="text-[10px] text-[#55697d] block mt-0.5">
              Interval: [+0.065s, +0.094s] (80% confidence)
            </span>
          </div>
          <div className="bg-[#081017]/80 p-3 rounded border border-[#172c2c]">
            <span className="text-[#64798e] text-[10px] block">CLEAN-AIR REJOIN WINDOW</span>
            <strong className="text-2xl font-black text-white">92% CLEAR</strong>
            <span className="text-[10px] text-[#55697d] block mt-0.5">
              Re-entry into P4 (+4.2s track cushion ahead of P5)
            </span>
          </div>
        </div>

        {/* Engineer-Friendly 6-Point Explainable Rationale */}
        <div className="text-xs text-[#9bb0c7] leading-relaxed bg-[#060c14]/70 p-3.5 rounded border border-[#14232f] mb-4 space-y-2">
          <div className="flex items-center justify-between border-b border-[#14222e] pb-1.5">
            <strong className="text-white text-xs">Race Engineer Decision Rationale (Plan A // Lap 38 Box):</strong>
            <span className="text-[10px] text-amber-400 font-bold">Estimated Cliff Risk: 82% if extended to L42</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            <span className="text-white font-semibold">1. Expected Pace &amp; Cliff Avoidance:</span> Current medium tyre degradation is accelerating at <span className="text-[#ff4b4b] font-bold">+0.078s/lap</span> (P50). The performance cliff probability reaches 56% at Lap 38 and surges to 82% by Lap 42. Pitting on Lap 38 keeps tyre degradation below the critical performance region.
          </p>
          <p className="text-[11px] leading-relaxed">
            <span className="text-white font-semibold">2. Traffic Optimization:</span> Re-entering the circuit behind the 21.4s pit delta ensures a clean air gap of +4.2s ahead of chasing cars, completely avoiding dirty air aerodynamic loss (&lt;1.5s wake penalty).
          </p>
          <p className="text-[11px] leading-relaxed">
            <span className="text-white font-semibold">3. Summary:</span> Pitting at Lap 38 minimizes expected total race time while providing an optimal buffer against competitor undercut vulnerability.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              id="btn-confirm-plan-a"
              onClick={handleConfirmPlanA}
              className="bg-[#ff2a2a] hover:bg-[#e02424] text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-red-950/40"
            >
              <CheckCircle className="w-4 h-4" />
              <span>CONFIRM PLAN A (BOX LAP 38)</span>
            </button>
            <button
              id="btn-simulate-plan-b"
              onClick={handleSimulatePlanB}
              className="bg-[#121c2a] hover:bg-[#1b2b3f] text-[#a0b5cc] px-4 py-2 rounded font-semibold text-xs border border-[#253952] flex items-center gap-2 transition-all"
            >
              <Sliders className="w-4 h-4" />
              <span>SIMULATE PLAN B (EXTEND TO L41)</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#6e8299]">
            <button
              onClick={() => navigateTo('tyres')}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>VIEW TYRE INTELLIGENCE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span>•</span>
            <button
              onClick={() => navigateTo('strategy')}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>SIMULATE STRATEGY</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span>•</span>
            <button
              onClick={() => navigateTo('live')}
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>VIEW LIVE RACE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="text-[10px] text-[#4f6479] pt-3 mt-3 border-t border-[#13222d] flex justify-between">
          <span>STATIC PIT LANE DELTA LOSS: 21.4s</span>
          <span>CREW STATUS: STANDBY BOX 2 (STOP TIME TARGET: 2.4s)</span>
        </div>
      </div>

      {/* Paddock Timing Matrix (Top 6 Competitors) */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536] font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-[#182333] mb-3">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              PADDOCK TIMING MATRIX // COMPETITOR TYRE DEGRADATION ESTIMATE
            </h3>
            <p className="text-[10px] text-[#5e7086]">
              Competitor Tyre Degradation Estimates &amp; Interval Analysis (Top 6 Positions)
            </p>
          </div>
          <span className="text-[10px] text-[#00e5a3] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a3] animate-pulse" />
            SIMULATED LIVE REPLAY
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#182435] text-[#5a6c82] text-[10px] uppercase">
                <th className="py-2 px-3">POS</th>
                <th className="py-2 px-3">DRIVER</th>
                <th className="py-2 px-3">TYRE</th>
                <th className="py-2 px-3">AGE</th>
                <th className="py-2 px-3">INTERVAL</th>
                <th className="py-2 px-3">LAST LAP</th>
                <th className="py-2 px-3">DEG / LAP</th>
                <th className="py-2 px-3">EST. PIT WINDOW</th>
                <th className="py-2 px-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d2b]">
              {drivers.map((d) => {
                const isTarget = d.driverCode === selectedDriver.driverCode;
                const compoundColor =
                  d.compound === 'SOFT'
                    ? 'text-red-400 bg-red-950/40 border-red-800'
                    : d.compound === 'MEDIUM'
                    ? 'text-yellow-400 bg-yellow-950/40 border-yellow-800'
                    : 'text-slate-200 bg-slate-800/60 border-slate-700';

                return (
                  <tr
                    key={d.position}
                    onClick={() => setSelectedDriverCode(d.driverCode)}
                    title={`Click to analyze #${d.driverNumber} ${d.driverName}`}
                    className={`transition-colors cursor-pointer ${
                      isTarget
                        ? 'bg-[#151f2d] text-white font-bold border-l-2 border-[#ff2a2a]'
                        : 'text-[#8da0b6] hover:bg-[#0e141f]'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isTarget ? 'bg-[#ff2a2a] text-white' : 'bg-[#172230] text-[#788ca2]'
                        }`}
                      >
                        P{d.position}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{d.driverName}</span>
                        <span className="text-[10px] text-[#5a6e84]">#{d.driverNumber}</span>
                        {isTarget && (
                          <span className="text-[9px] bg-[#ff2a2a]/20 text-[#ff4b4b] px-1 rounded border border-[#ff2a2a]/40 font-bold">
                            TARGET
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${compoundColor}`}>
                        {d.compound[0]} ({d.compoundCode})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#cbd5e1]">{d.tyreAge} L</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{d.interval}</td>
                    <td className="py-2.5 px-3">{d.lastLapTime}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={
                          d.degRatePerLap > 0.08
                            ? 'text-red-400 font-bold'
                            : d.degRatePerLap > 0.06
                            ? 'text-yellow-400'
                            : 'text-emerald-400'
                        }
                      >
                        +{d.degRatePerLap.toFixed(3)}s
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#38bdf8] font-semibold">{d.estPitWindow}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                          d.pitStatus === 'BOX WINDOW'
                            ? 'bg-[#1e2f1f] text-[#00e5a3] border border-[#2b653a]'
                            : 'bg-[#131b26] text-[#71859b] border border-[#1b2737]'
                        }`}
                      >
                        {d.pitStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4-Corner Wheel Thermal Telemetry */}
      <TyreThermalCard wheels={wheelTelemetry} />

      {/* Bottom Status Line */}
      <div className="p-3 bg-[#070b10] border border-[#151f2c] rounded font-mono text-[10px] text-[#55677d] flex flex-wrap items-center justify-between gap-2">
        <div>
          TRUEWEAR PIT WALL INTELLIGENCE • PIPELINE:{' '}
          <span className="text-[#00e5a3]">CONNECTED</span> • MODEL:{' '}
          <span className="text-[#889cb2]">v4.2.8 DEGRADATION ESTIMATOR</span> • CONFIDENCE:{' '}
          <span className="text-[#00e5a3]">87%</span> • FASTF1 PUBLIC DATA
        </div>
        <div className="text-[#435263]">DERIVED &amp; ESTIMATED RACE MODEL</div>
      </div>
    </div>
  );
};
