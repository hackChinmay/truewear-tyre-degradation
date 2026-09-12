import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Wind,
  Thermometer,
  Flag,
  Radio,
  MapPin,
  Database,
  Cloud,
} from 'lucide-react';
import { CIRCUITS } from '../data/mockRaceData';

export const TopBar: React.FC = () => {
  const {
    selectedCircuit,
    setCircuitId,
    currentLap,
    totalLaps,
    isPlaying,
    togglePlay,
    nextLap,
    resetLap,
    selectedDriver,
    setSelectedDriverCode,
    selectedSession,
    setSelectedSession,
    drivers,
    navigateTo,
    dataProvider,
    providerStatus,
    weatherState,
    isRaceFinished,
  } = useRace();

  const [utcTime, setUtcTime] = useState<string>('14:32:18 UTC');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      const s = String(d.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const progressPercent = Math.min(100, Math.round((currentLap / totalLaps) * 100));

  return (
    <header
      id="top-telemetry-bar"
      className="bg-[#0a0e14] border-b border-[#1a2331] px-6 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-20 font-mono text-xs shadow-md"
    >
      {/* Left: Circuit Selection, Session Tag & Driver Selector */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-white font-bold bg-[#141d2a] px-3 py-1.5 rounded border border-[#223145]">
          <MapPin className="w-3.5 h-3.5 text-[#ff2a2a]" />
          <select
            id="circuit-selector"
            value={selectedCircuit.id}
            onChange={(e) => setCircuitId(e.target.value)}
            className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
          >
            {Object.values(CIRCUITS).map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0e141f] text-white">
                {c.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[#121924] text-[#8899ac] px-2.5 py-1 rounded border border-[#1b2535] flex items-center gap-1.5">
          <span className="text-[#5b6c80] text-[10px]">SESSION:</span>
          <select
            id="session-selector"
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
          >
            <option value="RACE" className="bg-[#0e141f] text-white">RACE</option>
            <option value="QUALIFYING" className="bg-[#0e141f] text-white">QUALIFYING</option>
            <option value="FP3" className="bg-[#0e141f] text-white">FP3</option>
            <option value="FP2" className="bg-[#0e141f] text-white">FP2</option>
            <option value="FP1" className="bg-[#0e141f] text-white">FP1</option>
          </select>
        </div>

        <div className="bg-[#121924] text-[#8899ac] px-2.5 py-1 rounded border border-[#1b2535] flex items-center gap-1.5">
          <span className="text-[#ff4b4b] text-[10px] font-bold">DRIVER:</span>
          <select
            id="topbar-driver-selector"
            value={selectedDriver.driverCode}
            onChange={(e) => setSelectedDriverCode(e.target.value)}
            className="bg-transparent text-white font-semibold outline-none cursor-pointer text-xs"
          >
            {drivers.map((d) => (
              <option key={d.driverCode} value={d.driverCode} className="bg-[#0e141f] text-white">
                #{d.driverNumber} {d.driverName} (P{d.position})
              </option>
            ))}
          </select>
        </div>

        {/* Lap counter with mini progress */}
        <div className="bg-[#121924] px-3 py-1 rounded border border-[#1b2535] flex items-center gap-2">
          <span className="text-[#64748b]">LAP:</span>
          <span className="text-white font-bold text-sm">
            {currentLap} <span className="text-[#475569] font-normal">/ {totalLaps}</span>
          </span>
          <div className="w-16 h-1.5 bg-[#1e293b] rounded-full overflow-hidden ml-1">
            <div
              className="h-full bg-gradient-to-r from-[#00d2ff] to-[#00e5a3] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-[#00d2ff]">{progressPercent}%</span>
        </div>

        {/* Step Controls */}
        <div className="flex items-center gap-1 bg-[#101722] p-0.5 rounded border border-[#1d2737]">
          <button
            id="btn-play-pause"
            onClick={togglePlay}
            title={isRaceFinished ? 'Replay simulation from start' : isPlaying ? 'Pause simulation' : 'Play live simulation'}
            className={`p-1.5 rounded transition-all ${
              isPlaying
                ? 'bg-[#ff2a2a] text-white shadow-sm'
                : isRaceFinished
                ? 'bg-purple-950 text-purple-200 hover:bg-purple-900'
                : 'text-[#8da0b6] hover:bg-[#1a2536] hover:text-white'
            }`}
          >
            {isRaceFinished ? (
              <RotateCcw className="w-3.5 h-3.5 text-purple-300" />
            ) : isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            id="btn-next-lap"
            onClick={nextLap}
            title="Step to next lap"
            className="p-1.5 rounded text-[#8da0b6] hover:bg-[#1a2536] hover:text-white transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-reset-lap"
            onClick={resetLap}
            title="Reset simulation to Lap 1"
            className="p-1.5 rounded text-[#8da0b6] hover:bg-[#1a2536] hover:text-white transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Environmental & System Status */}
      <div className="flex items-center gap-3">
        {/* Track Flag */}
        <div
          className={`px-2.5 py-1 rounded border flex items-center gap-1.5 text-[11px] font-bold ${
            weatherState.trackFlag === 'CHECKERED'
              ? 'bg-purple-950 text-purple-300 border-purple-800'
              : 'bg-[#0b1d16] text-[#00e5a3] border-[#13432f]'
          }`}
        >
          <Flag className={`w-3 h-3 ${weatherState.trackFlag === 'CHECKERED' ? 'fill-purple-300' : 'fill-[#00e5a3]'}`} />
          <span>TRACK: {weatherState.trackFlag}</span>
        </div>

        {/* Weather Readings */}
        <div className="hidden lg:flex items-center gap-2.5 text-[#8899ac] bg-[#121924] px-3 py-1 rounded border border-[#1b2535] text-[11px]">
          <div className="flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-[#38bdf8]" />
            <span>AIR: <strong className="text-white">{weatherState.airTemp.toFixed(1)}°C</strong></span>
          </div>
          <span className="text-[#334155]">|</span>
          <div className="flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-[#f59e0b]" />
            <span>TRACK: <strong className="text-[#f59e0b]">{weatherState.trackTemp.toFixed(1)}°C</strong></span>
          </div>
          <span className="text-[#334155]">|</span>
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3 text-[#94a3b8]" />
            <span>WIND: <strong className="text-white">{weatherState.windSpeed.toFixed(1)} km/h {weatherState.windDirection}</strong></span>
          </div>
        </div>

        {/* UTC Clock */}
        <div className="text-[#7d91a9] text-[11px] px-2 py-1 bg-[#0f1520] rounded border border-[#1c2636]">
          {utcTime}
        </div>

        {/* Target Driver Badge */}
        <div className="bg-[#172233] text-white px-2.5 py-1 rounded border border-[#2b3c54] flex items-center gap-1.5 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#ff2a2a]" />
          <span className="font-bold">{selectedDriver.driverName}</span>
          <span className="text-[#ff2a2a] font-black">#{selectedDriver.driverNumber}</span>
          <span className="bg-[#0d131d] text-[#00d2ff] px-1 rounded text-[10px]">
            P{selectedDriver.position}
          </span>
        </div>

        {/* Data Provider Pill */}
        <button
          onClick={() => navigateTo('model')}
          title="Configure RaceDataProvider / FastF1 Backend"
          className="hidden sm:flex items-center gap-1.5 bg-[#0e1622] hover:bg-[#142030] text-[#00d2ff] px-2.5 py-1 rounded border border-[#1d2d42] text-[10px] font-bold transition-all"
        >
          <Database className="w-3 h-3 text-[#00d2ff]" />
          <span>
            {providerStatus?.status === 'ONLINE' || !dataProvider?.isDemo
              ? 'FASTF1 REAL API'
              : 'FASTF1 PIPELINE'}
          </span>
        </button>

        {/* Firestore Cloud Status */}
        <div
          title="Google Cloud Firestore (Project: truewear-29356)"
          className="hidden md:flex items-center gap-1.5 bg-[#0d1825] text-[#38bdf8] px-2.5 py-1 rounded border border-[#1b3452] text-[10px] font-bold"
        >
          <Cloud className="w-3 h-3 text-[#38bdf8]" />
          <span>FIRESTORE: TRUEWEAR-29356</span>
        </div>

        {/* Data Pipeline Sync Indicator */}
        <div className="flex items-center gap-1.5 bg-[#0e1f18] text-[#00e5a3] px-2.5 py-1 rounded border border-[#174836] text-[11px] font-bold">
          <Radio className="w-3 h-3 text-[#00e5a3]" />
          <span>DATA PIPELINE SYNC</span>
        </div>
      </div>
    </header>
  );
};

