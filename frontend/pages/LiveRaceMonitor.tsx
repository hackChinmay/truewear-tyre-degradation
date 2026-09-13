import React from 'react';
import { useRace } from '../context/RaceContext';
import { InteractiveCircuitMap } from '../components/InteractiveCircuitMap';
import { TyreThermalCard } from '../components/TyreThermalCard';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Flag,
  Play,
  Pause,
  RotateCcw,
  Radio,
  Sliders,
  Zap,
} from 'lucide-react';

export const LiveRaceMonitor: React.FC = () => {
  const {
    currentLap,
    totalLaps,
    lapProgress,
    currentSector,
    simulationSpeed,
    setSimulationSpeed,
    isPlaying,
    isRaceFinished,
    simulationStatusText,
    carTelemetry,
    strategySignal,
    weatherState,
    togglePlay,
    nextLap,
    prevLap,
    resetLap,
    drivers,
    selectedDriver,
    setSelectedDriverCode,
    wheelTelemetry,
    events,
    triggerActionNotification,
    setActivePlan,
    navigateTo,
  } = useRace();

  const handleConfirmPlanA = () => {
    setActivePlan('A');
    triggerActionNotification(`BOX ${selectedDriver.estPitWindow} CONFIRMED: Radio alert dispatched to Car #${selectedDriver.driverNumber} [${selectedDriver.driverName}].`, 'success');
  };

  const handleExtendStint = () => {
    setActivePlan('B');
    triggerActionNotification('PLAN B SELECTED: Stint extended past Lap 40. Graining cliff alert active.', 'warning');
  };

  return (
    <div id="page-live-race-monitor" className="space-y-6 pb-12 font-mono">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1b2536] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] text-[#ff2a2a] font-bold tracking-widest uppercase">
              MODULE 04 // LIVE RACE SIMULATION
            </span>
            <span className="text-[10px] bg-[#162335] text-[#38bdf8] px-2 py-0.5 rounded border border-[#233852]">
              HISTORICAL RACE REPLAY // SIMULATION MODE
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                isPlaying
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : isRaceFinished
                  ? 'bg-purple-950 text-purple-300 border-purple-700'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {simulationStatusText}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">LIVE RACE SIMULATION</h1>
          <p className="text-xs text-[#8fa1b6] mt-0.5">
            Historical race replay, driver interval matrix, and strategic simulation monitoring
          </p>
        </div>

        {/* Live Simulation Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-[#0d131c] p-1 rounded border border-[#1b2636] text-[10px]">
            <span className="text-[#55677d] px-1 font-bold">SPEED:</span>
            {([0.5, 1, 2, 5] as const).map((spd) => (
              <button
                key={spd}
                id={`speed-btn-${spd}`}
                onClick={() => setSimulationSpeed(spd)}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  simulationSpeed === spd
                    ? 'bg-[#ff2a2a] text-white shadow-sm'
                    : 'text-[#8ea2b8] hover:text-white hover:bg-[#192435]'
                }`}
              >
                {spd}×
              </button>
            ))}
          </div>

          {/* Primary Controls */}
          <div className="flex items-center gap-2 bg-[#0d131c] p-1.5 rounded border border-[#1b2636]">
            <button
              id="live-btn-play"
              onClick={togglePlay}
              className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                isPlaying
                  ? 'bg-[#ff2a2a] text-white shadow-md shadow-red-950/40'
                  : isRaceFinished
                  ? 'bg-purple-950 text-purple-200 hover:bg-purple-900 border border-purple-700'
                  : 'bg-[#152132] hover:bg-[#1f2f45] text-white'
              }`}
            >
              {isRaceFinished ? (
                <RotateCcw className="w-3.5 h-3.5" />
              ) : isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{isRaceFinished ? 'REPLAY' : isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              id="live-btn-next"
              onClick={nextLap}
              className="px-2.5 py-1.5 rounded text-xs bg-[#152132] hover:bg-[#1f2f45] text-[#8ea2b8] hover:text-white flex items-center gap-1 transition-all"
            >
              <span>NEXT LAP</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              id="live-btn-reset"
              onClick={resetLap}
              className="p-1.5 rounded text-xs bg-[#152132] hover:bg-[#1f2f45] text-[#8ea2b8] hover:text-white transition-all"
              title="Reset simulation to Lap 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Flag / Neutralization Status Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        <div className="bg-[#0b1017] p-2 rounded border border-[#1b2536] flex items-center justify-between">
          <span className="text-[#55677d] text-[10px]">TRACK FLAG:</span>
          <span
            className={`font-bold flex items-center gap-1 ${
              weatherState.trackFlag === 'CHECKERED'
                ? 'text-purple-400'
                : 'text-emerald-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                weatherState.trackFlag === 'CHECKERED'
                  ? 'bg-purple-400'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            {weatherState.trackFlag}
          </span>
        </div>
        <div className="bg-[#0b1017] p-2 rounded border border-[#1b2536] flex items-center justify-between">
          <span className="text-[#55677d] text-[10px]">SAFETY CAR:</span>
          <span className="text-[#8899ac] font-bold">OFF</span>
        </div>
        <div className="bg-[#0b1017] p-2 rounded border border-[#1b2536] flex items-center justify-between">
          <span className="text-[#55677d] text-[10px]">VSC STATUS:</span>
          <span className="text-[#8899ac] font-bold">OFF</span>
        </div>
        <div className="bg-[#0b1017] p-2 rounded border border-[#1b2536] flex items-center justify-between">
          <span className="text-[#55677d] text-[10px]">PRECIPITATION:</span>
          <span className="text-cyan-400 font-bold">0% (DRY)</span>
        </div>
        <div className="bg-[#0b1017] p-2 rounded border border-[#1b2536] flex items-center justify-between">
          <span className="text-[#55677d] text-[10px]">RACE LAP:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold">{currentLap} / {totalLaps}</span>
            <span className="text-[10px] bg-[#162335] text-[#38bdf8] px-1 rounded font-bold">
              S{currentSector}
            </span>
          </div>
        </div>
      </div>

      {/* AI Strategy Signal Alert Banner */}
      <div className="bg-gradient-to-r from-[#0c241b] via-[#0f1d28] to-[#141822] p-4 rounded border border-[#1b4d38] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1.5 rounded bg-[#00e5a3] text-black flex items-center justify-center font-black text-xs uppercase tracking-wider">
            {strategySignal.badge}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#00e5a3]">
                {strategySignal.title}
              </span>
              <span className="text-[9px] bg-[#072418] text-[#00e5a3] px-1.5 py-0.2 rounded border border-[#145336]">
                CONFIDENCE: {strategySignal.confidence}%
              </span>
            </div>
            <p className="text-[11px] text-[#90a6bc] mt-0.5">
              Net Advantage: <strong className="text-white">{strategySignal.netAdvantage}</strong> • Rejoin Prediction:{' '}
              <strong className="text-[#00d2ff]">{strategySignal.rejoinPrediction}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirmPlanA}
            className="bg-[#ff2a2a] hover:bg-[#e02424] text-white px-3.5 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-red-950/40"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>CONFIRM PLAN A </span>
          </button>
          <button
            onClick={handleExtendStint}
            className="bg-[#121c2a] hover:bg-[#1a293c] text-[#8fa2b8] hover:text-white px-3 py-1.5 rounded text-xs border border-[#23354b] flex items-center gap-1.5 transition-all"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>EXTEND TO PLAN B</span>
          </button>
        </div>
      </div>

      {/* Dynamic Interactive Circuit Map (Monza / Silverstone / Spa) */}
      <InteractiveCircuitMap />

      {/* Live Timing Tower // Driver Interval Matrix */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536]">
        <div className="flex items-center justify-between pb-3 border-b border-[#182333] mb-3">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              LIVE TIMING TOWER // DRIVER INTERVAL &amp; SECTOR PACING MATRIX
            </h3>
            <p className="text-[10px] text-[#5e7086]">
              Simulated sector splits and tyre degradation velocities across the field
            </p>
          </div>
          <span className="text-[10px] text-[#00e5a3] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a3] animate-pulse" />
            SIMULATED TIMING
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
                <th className="py-2 px-3">S1</th>
                <th className="py-2 px-3">S2</th>
                <th className="py-2 px-3">S3</th>
                <th className="py-2 px-3">DEG / LAP</th>
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
                    title={`Select #${d.driverNumber} ${d.driverName} across all analysis pages`}
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
                    <td className="py-2.5 px-3 text-[#798da2]">{d.s1 ? d.s1.toFixed(3) : '26.812'}</td>
                    <td className="py-2.5 px-3 text-[#798da2]">{d.s2 ? d.s2.toFixed(3) : '26.940'}</td>
                    <td className="py-2.5 px-3 text-[#798da2]">{d.s3 ? d.s3.toFixed(3) : '29.660'}</td>
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
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                          d.pitStatus === 'IN PIT'
                            ? 'bg-amber-950 text-amber-300 border border-amber-600 animate-pulse'
                            : d.pitStatus === 'BOX WINDOW'
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

      {/* Target Car #14 Simulated Telemetry Cluster */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs bg-[#0b1017] p-3 rounded border border-[#1b2536]">
        <div className="bg-[#0e1520] p-2 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">SPEED TRAP</span>
          <strong className="text-white text-base">{carTelemetry.speed.toFixed(1)} km/h</strong>
        </div>
        <div className="bg-[#0e1520] p-2 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">GEAR</span>
          <strong className="text-white text-base">
            {carTelemetry.gear}{carTelemetry.gear === 1 ? 'st' : carTelemetry.gear === 2 ? 'nd' : carTelemetry.gear === 3 ? 'rd' : 'th'} Gear
          </strong>
        </div>
        <div className="bg-[#0e1520] p-2 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">THROTTLE</span>
          <strong className="text-emerald-400 text-base">{carTelemetry.throttle}%</strong>
        </div>
        <div className="bg-[#0e1520] p-2 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">BRAKE</span>
          <strong className={carTelemetry.brake > 0 ? "text-red-400 text-base font-bold" : "text-white text-base"}>
            {carTelemetry.brake}%
          </strong>
        </div>
        <div className="bg-[#0e1520] p-2 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">DRS STATUS</span>
          <strong className={carTelemetry.drs ? "text-[#00e5a3] text-base font-bold" : "text-[#708298] text-base"}>
            {carTelemetry.drs ? 'ACTIVE' : 'INACTIVE'}
          </strong>
        </div>
        <div className="bg-[#0e1520] p-2 rounded border border-[#192435]">
          <span className="text-[#55677d] text-[10px] block">STEERING ANGLE</span>
          <strong className="text-white text-base">
            {carTelemetry.steeringAngle > 0 ? `+${carTelemetry.steeringAngle.toFixed(1)}°` : `${carTelemetry.steeringAngle.toFixed(1)}°`}
          </strong>
        </div>
      </div>

      {/* 4-Corner Wheel Thermal Telemetry */}
      <TyreThermalCard wheels={wheelTelemetry} />

      {/* Race Event Timeline & Incident Feed */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536]">
        <div className="flex items-center justify-between pb-3 border-b border-[#182333] mb-3">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            RACE EVENT TIMELINE &amp; INCIDENT FEED
          </h3>
          <span className="text-[10px] text-[#71849a]">CHRONOLOGICAL EVENT AUDIT</span>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="p-2.5 rounded bg-[#0e141f] border border-[#172232] flex items-start gap-3 text-xs"
            >
              <span className="text-[10px] font-bold text-[#00d2ff] bg-[#111f30] px-1.5 py-0.5 rounded border border-[#1d3550] shrink-0">
                LAP {ev.lap}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-[11px]">{ev.title}</span>
                  <span className="text-[10px] text-[#55677d]">{ev.timeStr} UTC</span>
                </div>
                <p className="text-[10px] text-[#7d91a7] mt-0.5">{ev.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
