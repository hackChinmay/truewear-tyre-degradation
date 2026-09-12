import React, { useState, useEffect, useRef } from 'react';
import { useRace } from '../context/RaceContext';
import { getCircuitConfig, getCircuitTrackTelemetry } from '../utils/circuitTrackData';
import {
  Activity,
  Compass,
  Eye,
  Flag,
  Gauge,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  Wind,
  Zap,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  Info
} from 'lucide-react';

export const InteractiveCircuitMap: React.FC = () => {
  const {
    selectedCircuit,
    currentLap,
    lapProgress,
    carTelemetry,
    strategySignal,
    currentSector,
    setCircuitId,
    drivers,
    selectedDriver,
    setSelectedDriverCode,
  } = useRace();

  const [hoveredCorner, setHoveredCorner] = useState<{
    name: string;
    turnNumber?: string;
    note: string;
    x: number;
    y: number;
  } | null>(null);

  const [viewMode, setViewMode] = useState<'broadcast' | 'sectors' | 'speed'>('broadcast');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<'all' | 's1' | 's2' | 's3'>('all');
  const [showCornerLabels, setShowCornerLabels] = useState<boolean>(true);
  const [showDrsZones, setShowDrsZones] = useState<boolean>(true);
  const [showApexMarkers, setShowApexMarkers] = useState<boolean>(true);
  const [showDriverTags, setShowDriverTags] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [customZoom, setCustomZoom] = useState<number>(1.0);

  const config = getCircuitConfig(selectedCircuit.id);

  // Close fullscreen on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Reset sector filter on circuit change
  useEffect(() => {
    setSelectedSectorFilter('all');
    setCustomZoom(1.0);
    setHoveredCorner(null);
  }, [selectedCircuit.id]);

  // Determine dynamic viewBox based on sector zoom or full track
  const baseViewBox = (() => {
    if (selectedSectorFilter === 's1') {
      if (selectedCircuit.id === 'monza') return '75 10 220 405';
      if (selectedCircuit.id === 'silverstone') return '100 30 285 330';
      if (selectedCircuit.id === 'spa') return '135 -20 290 425';
    }
    if (selectedSectorFilter === 's2') {
      if (selectedCircuit.id === 'monza') return '170 -20 255 275';
      if (selectedCircuit.id === 'silverstone') return '120 -20 310 320';
      if (selectedCircuit.id === 'spa') return '155 280 280 245';
    }
    if (selectedSectorFilter === 's3') {
      if (selectedCircuit.id === 'monza') return '75 175 175 345';
      if (selectedCircuit.id === 'silverstone') return '70 215 360 305';
      if (selectedCircuit.id === 'spa') return '65 60 215 435';
    }
    return config.viewBox;
  })();

  // Parse and scale viewBox for zoom
  const currentViewBox = (() => {
    const parts = baseViewBox.split(' ').map(Number);
    if (parts.length !== 4 || customZoom === 1.0) return baseViewBox;
    const [minX, minY, width, height] = parts;
    const newWidth = width / customZoom;
    const newHeight = height / customZoom;
    const newMinX = minX + (width - newWidth) / 2;
    const newMinY = minY + (height - newHeight) / 2;
    return `${newMinX} ${newMinY} ${newWidth} ${newHeight}`;
  })();

  // Dynamic positions around the track for active drivers spaced along racing intervals
  const isPitLane = strategySignal.pitStatus === 'PIT LANE';
  const colors = ['#38bdf8', '#a78bfa', '#f43f5e', '#ff2a2a', '#eab308', '#94a3b8', '#10b981', '#f97316', '#06b6d4', '#ec4899'];
  const offsets = [0.0, 0.18, 0.11, 0.05, 0.93, 0.86, 0.79, 0.72, 0.65, 0.58];

  const driverTrackPositions = drivers.slice(0, 8).map((d, idx) => {
    const isTarget = d.driverCode === selectedDriver.driverCode;
    const pos = isTarget
      ? (isPitLane ? { x: config.pitBoxCoord.x, y: config.pitBoxCoord.y } : { x: carTelemetry.x, y: carTelemetry.y })
      : getCircuitTrackTelemetry(selectedCircuit.id, (lapProgress + (offsets[idx] ?? (0.1 * idx))) % 1.0);

    return {
      pos: d.position,
      code: isTarget ? `${d.driverCode} #${d.driverNumber}` : d.driverCode,
      x: pos.x,
      y: pos.y,
      color: isTarget ? '#ff2a2a' : (colors[idx] || '#38bdf8'),
      isTarget,
      inPit: isTarget ? isPitLane : false,
    };
  });

  // Helper for speed heatmap styling
  const getSpeedStrokeColor = (speed: number) => {
    if (speed < 120) return '#ef4444'; // Red for heavy braking / low speed
    if (speed < 200) return '#f59e0b'; // Amber for mid-speed cornering
    if (speed < 280) return '#06b6d4'; // Cyan for high speed transition
    return '#10b981'; // Emerald for full throttle / straights
  };

  return (
    <div
      id="interactive-circuit-map-container"
      className={`font-mono transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#070c14]/98 backdrop-blur-xl p-4 md:p-6 flex flex-col justify-between overflow-hidden shadow-2xl'
          : 'bg-[#0b1017] p-4 rounded border border-[#1b2536]'
      }`}
    >
      {/* Top Header & Interactive Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#182333]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#16202e] border border-[#233349] flex items-center justify-center text-[#ff2a2a]">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-white tracking-wider uppercase">
                {config.name}
              </h3>
              <span className="text-[10px] font-bold bg-[#141d2a] text-[#38bdf8] px-2 py-0.5 rounded border border-[#233852]">
                {config.country.toUpperCase()}
              </span>
              <span className="text-[10px] font-bold bg-[#1c1215] text-[#ff4b4b] px-2 py-0.5 rounded border border-[#44181c]">
                {config.totalLaps} LAPS • {config.lengthKm.toFixed(3)} KM
              </span>
            </div>
            <p className="text-[11px] text-[#71849a] flex items-center gap-2 mt-0.5">
              <span>{config.formalName}</span>
              <span>•</span>
              <span className="text-white font-semibold">Lap {currentLap}</span>
              <span>•</span>
              <span className="text-[#38bdf8] font-bold">Sector {currentSector}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{carTelemetry.name}</span>
            </p>
          </div>
        </div>

        {/* Quick Circuit Switcher, Mode Toggles, and Zoom Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Circuit Switcher */}
          <div className="flex items-center bg-[#070b10] p-0.5 rounded border border-[#1a2536] text-[10px]">
            <button
              id="circuit-switch-monza"
              onClick={() => setCircuitId('monza')}
              className={`px-2.5 py-1 rounded transition-all font-bold ${
                selectedCircuit.id === 'monza'
                  ? 'bg-[#ff2a2a] text-white shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
            >
              MONZA
            </button>
            <button
              id="circuit-switch-silverstone"
              onClick={() => setCircuitId('silverstone')}
              className={`px-2.5 py-1 rounded transition-all font-bold ${
                selectedCircuit.id === 'silverstone'
                  ? 'bg-[#ff2a2a] text-white shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
            >
              SILVERSTONE
            </button>
            <button
              id="circuit-switch-spa"
              onClick={() => setCircuitId('spa')}
              className={`px-2.5 py-1 rounded transition-all font-bold ${
                selectedCircuit.id === 'spa'
                  ? 'bg-[#ff2a2a] text-white shadow-sm'
                  : 'text-[#64748b] hover:text-white'
              }`}
            >
              SPA
            </button>
          </div>

          {/* View Mode Dropdown / Button Group */}
          <div className="flex items-center bg-[#070b10] p-0.5 rounded border border-[#1a2536] text-[10px]">
            <button
              onClick={() => setViewMode('broadcast')}
              className={`px-2 py-1 rounded font-bold transition-all flex items-center gap-1 ${
                viewMode === 'broadcast'
                  ? 'bg-[#152538] text-[#38bdf8] border border-[#234263]'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Clean F1 Broadcast racing line and driver beacons"
            >
              <Eye className="w-3 h-3" />
              <span>BROADCAST</span>
            </button>
            <button
              onClick={() => setViewMode('sectors')}
              className={`px-2 py-1 rounded font-bold transition-all flex items-center gap-1 ${
                viewMode === 'sectors'
                  ? 'bg-[#152538] text-[#38bdf8] border border-[#234263]'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Color-coded FIA Sectors 1, 2, and 3"
            >
              <Layers className="w-3 h-3" />
              <span>SECTORS</span>
            </button>
            <button
              onClick={() => setViewMode('speed')}
              className={`px-2 py-1 rounded font-bold transition-all flex items-center gap-1 ${
                viewMode === 'speed'
                  ? 'bg-[#152538] text-[#38bdf8] border border-[#234263]'
                  : 'text-[#64748b] hover:text-white'
              }`}
              title="Telemetry speed heatmap along track surface"
            >
              <Gauge className="w-3 h-3" />
              <span>HEATMAP</span>
            </button>
          </div>

          {/* Sector Focus Buttons */}
          <div className="hidden sm:flex items-center bg-[#070b10] p-0.5 rounded border border-[#1a2536] text-[10px]">
            <button
              onClick={() => { setSelectedSectorFilter('all'); setCustomZoom(1.0); }}
              className={`px-2 py-1 rounded font-bold transition-all ${
                selectedSectorFilter === 'all'
                  ? 'bg-[#182333] text-white'
                  : 'text-[#64748b] hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => { setSelectedSectorFilter('s1'); setCustomZoom(1.0); }}
              className={`px-2 py-1 rounded font-bold transition-all ${
                selectedSectorFilter === 's1'
                  ? 'bg-[#0e2738] text-[#00d2ff]'
                  : 'text-[#64748b] hover:text-[#00d2ff]'
              }`}
            >
              S1
            </button>
            <button
              onClick={() => { setSelectedSectorFilter('s2'); setCustomZoom(1.0); }}
              className={`px-2 py-1 rounded font-bold transition-all ${
                selectedSectorFilter === 's2'
                  ? 'bg-[#291f0c] text-[#f59e0b]'
                  : 'text-[#64748b] hover:text-[#f59e0b]'
              }`}
            >
              S2
            </button>
            <button
              onClick={() => { setSelectedSectorFilter('s3'); setCustomZoom(1.0); }}
              className={`px-2 py-1 rounded font-bold transition-all ${
                selectedSectorFilter === 's3'
                  ? 'bg-[#261230] text-[#c084fc]'
                  : 'text-[#64748b] hover:text-[#c084fc]'
              }`}
            >
              S3
            </button>
          </div>

          {/* Zoom Buttons & Fullscreen Toggle */}
          <div className="flex items-center gap-1 bg-[#070b10] p-0.5 rounded border border-[#1a2536] text-[10px]">
            <button
              onClick={() => setCustomZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
              className="p-1 hover:bg-[#192435] text-[#8fa2b8] hover:text-white rounded transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCustomZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
              className="p-1 hover:bg-[#192435] text-[#8fa2b8] hover:text-white rounded transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setCustomZoom(1.0); setSelectedSectorFilter('all'); }}
              className="p-1 hover:bg-[#192435] text-[#8fa2b8] hover:text-white rounded transition-all"
              title="Reset Zoom & Fit"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1 rounded transition-all ${
                isFullscreen
                  ? 'bg-[#ff2a2a] text-white'
                  : 'hover:bg-[#192435] text-[#8fa2b8] hover:text-white'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen Expanded View'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Primary SVG Track Display Viewport */}
      <div
        className={`relative w-full rounded border border-[#151e2b] bg-[#070b11] overflow-hidden flex items-center justify-center my-3 transition-all ${
          isFullscreen ? 'flex-1 min-h-[580px]' : 'h-[500px] md:h-[580px] lg:h-[620px]'
        }`}
      >
        <svg
          viewBox={currentViewBox}
          className="w-full h-full p-2 select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Shaders and Glow Filters */}
          <defs>
            <pattern id="track-subgrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#0e1724" strokeWidth="0.6" />
            </pattern>
            <filter id="glow-target-red" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ff2a2a" floodOpacity="0.8" />
            </filter>
            <filter id="glow-circuit-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#00d2ff" floodOpacity="0.65" />
            </filter>
            <filter id="glow-drs" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#00e5a3" floodOpacity="0.75" />
            </filter>
            <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#f59e0b" floodOpacity="0.65" />
            </filter>
            <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#c084fc" floodOpacity="0.65" />
            </filter>
          </defs>

          {/* Subgrid Canvas Floor */}
          <rect x="-400" y="-400" width="1600" height="1600" fill="url(#track-subgrid)" opacity="0.6" />

          {/* Pit Lane Path (Dashed Amber) */}
          <path
            d={config.pitLanePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3.5"
            strokeDasharray="6 4"
            opacity="0.85"
          />

          {/* Pit Stop Marker */}
          <g transform={`translate(${config.pitBoxCoord.x}, ${config.pitBoxCoord.y})`}>
            <rect x="-14" y="-7" width="28" height="14" rx="2" fill="#1e1308" stroke="#f59e0b" strokeWidth="1" />
            <text x="0" y="3" textAnchor="middle" fill="#f59e0b" fontSize="6" fontWeight="bold">
              PIT
            </text>
          </g>

          {/* DRS Zones */}
          {showDrsZones &&
            config.drsZones.map((drs) => (
              <g key={drs.id} className="pointer-events-none">
                <path
                  d={drs.path}
                  fill="none"
                  stroke="#00e5a3"
                  strokeWidth="15"
                  opacity="0.3"
                  strokeLinecap="round"
                  filter="url(#glow-drs)"
                />
                <path
                  d={drs.path}
                  fill="none"
                  stroke="#00e5a3"
                  strokeWidth="3"
                  opacity="0.9"
                  strokeLinecap="round"
                />
                <rect
                  x={drs.labelX - 35}
                  y={drs.labelY - 8}
                  width="70"
                  height="14"
                  rx="3"
                  fill="#071b12"
                  stroke="#00e5a3"
                  strokeWidth="1"
                  opacity="0.9"
                />
                <text
                  x={drs.labelX}
                  y={drs.labelY + 2}
                  fill="#00e5a3"
                  fontSize="6.5"
                  fontWeight="bold"
                  letterSpacing="0.5"
                  textAnchor="middle"
                >
                  {drs.label}
                </text>
              </g>
            ))}

          {/* Outer Track Base Layer (Runoff / Gravel Margin) */}
          <path
            d={config.trackPath}
            fill="none"
            stroke="#101824"
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Kerb / Edge Boundary Layer */}
          <path
            d={config.trackPath}
            fill="none"
            stroke="#1b2838"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Main Asphalt Surface */}
          <path
            d={config.trackPath}
            fill="none"
            stroke="#0b1017"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Racing Line / View Mode Layer */}
          {viewMode === 'broadcast' && (
            <path
              d={config.trackPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
              filter="url(#glow-circuit-cyan)"
            />
          )}

          {viewMode === 'sectors' && (
            <g>
              {/* Sector 1 path */}
              <path
                d={config.trackPath}
                fill="none"
                stroke="#00d2ff"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1400"
                strokeDashoffset="933"
                opacity="0.95"
                filter="url(#glow-circuit-cyan)"
              />
              {/* Sector 2 path */}
              <path
                d={config.trackPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="1400"
                strokeDashoffset="466"
                opacity="0.95"
                filter="url(#glow-gold)"
              />
              {/* Sector 3 path */}
              <path
                d={config.trackPath}
                fill="none"
                stroke="#c084fc"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
                filter="url(#glow-purple)"
              />
            </g>
          )}

          {viewMode === 'speed' && (
            <g>
              {config.waypoints.map((wp, idx) => {
                if (idx % 2 !== 0) return null;
                const nextWp = config.waypoints[(idx + 2) % config.waypoints.length];
                return (
                  <line
                    key={idx}
                    x1={wp.x}
                    y1={wp.y}
                    x2={nextWp.x}
                    y2={nextWp.y}
                    stroke={getSpeedStrokeColor(wp.speed)}
                    strokeWidth="5"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                );
              })}
            </g>
          )}

          {/* Start / Finish Line Banner */}
          <g>
            <line
              x1={config.startFinishLine.x1}
              y1={config.startFinishLine.y1}
              x2={config.startFinishLine.x2}
              y2={config.startFinishLine.y2}
              stroke="#ffffff"
              strokeWidth="5"
            />
            <rect
              x={config.startFinishLine.labelX - 30}
              y={config.startFinishLine.labelY - 6}
              width="60"
              height="12"
              rx="2"
              fill="#0f172a"
              stroke="#ffffff"
              strokeWidth="1"
            />
            <text
              x={config.startFinishLine.labelX}
              y={config.startFinishLine.labelY + 2.5}
              fill="#ffffff"
              fontSize="6.5"
              fontWeight="black"
              letterSpacing="0.5"
              textAnchor="middle"
            >
              FINISH / START
            </text>
          </g>

          {/* Official Corner Badges and Apex Annotations */}
          {showApexMarkers &&
            config.corners.map((c, i) => {
              const dx = c.labelDx ?? 12;
              const dy = c.labelDy ?? 0;
              const isHovered = hoveredCorner?.name === c.name;

              return (
                <g
                  key={i}
                  className="cursor-pointer group"
                  onMouseEnter={() =>
                    setHoveredCorner({
                      name: c.name,
                      turnNumber: c.turnNumber,
                      note: c.note,
                      x: c.x,
                      y: c.y,
                    })
                  }
                  onMouseLeave={() => setHoveredCorner(null)}
                  onClick={() =>
                    setHoveredCorner({
                      name: c.name,
                      turnNumber: c.turnNumber,
                      note: c.note,
                      x: c.x,
                      y: c.y,
                    })
                  }
                >
                  {/* Apex Pulsing Ring on Hover */}
                  {isHovered && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="12"
                      fill="#00d2ff"
                      opacity="0.3"
                      className="animate-ping"
                    />
                  )}

                  {/* Corner Dot */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="4"
                    fill={isHovered ? '#ffffff' : '#080d14'}
                    stroke={isHovered ? '#00d2ff' : '#38bdf8'}
                    strokeWidth="1.5"
                    className="transition-all"
                  />

                  {/* Corner Turn Badge (e.g., T1, T2, T3) */}
                  {showCornerLabels && (
                    <g transform={`translate(${c.x + dx}, ${c.y + dy})`}>
                      <rect
                        x="-10"
                        y="-7"
                        width="20"
                        height="14"
                        rx="3"
                        fill={isHovered ? '#00d2ff' : '#0e1622'}
                        stroke={isHovered ? '#ffffff' : '#22354c'}
                        strokeWidth="1"
                        className="transition-all"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill={isHovered ? '#000000' : '#889eb8'}
                        fontSize="7"
                        fontWeight="black"
                        className="pointer-events-none transition-all"
                      >
                        {c.turnNumber || `T${i + 1}`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

          {/* Driver Position Markers on Circuit */}
          {showDriverTags &&
            driverTrackPositions.map((d) => {
              const isNearBottom = d.y > 450;
              const isNearRight = d.x > 320;
              const badgeX = isNearRight ? d.x - 38 : d.x + 6;
              const badgeY = isNearBottom ? d.y - 18 : d.y - 6;
              const textX = isNearRight ? d.x - 22 : d.x + 22;
              const textY = isNearBottom ? d.y - 9.5 : d.y + 2.5;
              const targetLabelY = isNearBottom ? d.y - 28 : d.y - 24;
              const targetTextY = isNearBottom ? d.y - 17 : d.y - 13;

              return (
                <g
                  key={d.pos}
                  className="cursor-pointer transition-all"
                  onClick={() => {
                    const matched = drivers.find((drv) => drv.driverCode === d.code.split(' ')[0]);
                    if (matched) setSelectedDriverCode(matched.driverCode);
                  }}
                >
                  {d.isTarget ? (
                    /* Primary Target Driver: RAO #14 */
                    <g filter="url(#glow-target-red)">
                      <circle cx={d.x} cy={d.y} r="14" fill="#ff2a2a" opacity="0.25" className="animate-ping" />
                      <circle cx={d.x} cy={d.y} r="8" fill="#ff2a2a" stroke="#ffffff" strokeWidth="2" />
                      <rect
                        x={d.x - 30}
                        y={targetLabelY}
                        width="60"
                        height="16"
                        rx="3"
                        fill="#150809"
                        stroke="#ff2a2a"
                        strokeWidth="1.5"
                      />
                      <text
                        x={d.x}
                        y={targetTextY}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="7.5"
                        fontWeight="black"
                      >
                        P{d.pos} {d.code}
                      </text>
                    </g>
                  ) : (
                    /* Other Competitor Drivers (KEL, MOR, TAN, NOV, LIN) */
                    <g>
                      <circle cx={d.x} cy={d.y} r="5" fill={d.color} stroke="#090d13" strokeWidth="1.5" />
                      <rect
                        x={badgeX}
                        y={badgeY}
                        width="32"
                        height="12"
                        rx="2"
                        fill="#0b1017"
                        stroke={d.color}
                        strokeWidth="1"
                        opacity="0.9"
                      />
                      <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        fill={d.color}
                        fontSize="6.5"
                        fontWeight="bold"
                      >
                        P{d.pos} {d.code}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
        </svg>

        {/* Floating Apex Tooltip Card on Hover */}
        {hoveredCorner && (
          <div className="absolute top-3 right-3 bg-[#0d1522]/95 backdrop-blur-md border border-[#2b3c53] p-3 rounded shadow-xl text-left max-w-xs pointer-events-none animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-1.5 py-0.5 rounded bg-[#00d2ff] text-black font-black text-[10px]">
                {hoveredCorner.turnNumber || 'APEX'}
              </span>
              <h4 className="text-xs font-bold text-white uppercase">{hoveredCorner.name}</h4>
            </div>
            <p className="text-[11px] text-[#93a6be] leading-relaxed mb-2">{hoveredCorner.note}</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#070b10] p-1.5 rounded border border-[#162233]">
              <div>
                <span className="text-[#55677d]">APEX SPEED:</span>
                <span className="ml-1 text-white font-bold">~115 km/h</span>
              </div>
              <div>
                <span className="text-[#55677d]">GEAR SELECTION:</span>
                <span className="ml-1 text-[#00d2ff] font-bold">GEAR 3</span>
              </div>
            </div>
          </div>
        )}

        {/* View Controls Overlay Strip in Top-Left */}
        <div className="absolute top-3 left-3 bg-[#090e15]/85 backdrop-blur-sm border border-[#1a2536] p-1.5 rounded flex items-center gap-2 text-[10px]">
          <label className="flex items-center gap-1 text-[#8ea2b8] hover:text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCornerLabels}
              onChange={(e) => setShowCornerLabels(e.target.checked)}
              className="accent-[#38bdf8] rounded"
            />
            <span>CORNERS</span>
          </label>
          <span className="text-[#334155]">|</span>
          <label className="flex items-center gap-1 text-[#8ea2b8] hover:text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDrsZones}
              onChange={(e) => setShowDrsZones(e.target.checked)}
              className="accent-[#00e5a3] rounded"
            />
            <span>DRS</span>
          </label>
          <span className="text-[#334155]">|</span>
          <label className="flex items-center gap-1 text-[#8ea2b8] hover:text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDriverTags}
              onChange={(e) => setShowDriverTags(e.target.checked)}
              className="accent-[#ff2a2a] rounded"
            />
            <span>DRIVERS</span>
          </label>
          <span className="text-[#334155]">|</span>
          <span className="text-[#00d2ff] font-bold">
            ZOOM: {(customZoom * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Docked Telemetry HUD Bar (Sits Cleanly Below SVG Map) */}
      <div className="bg-[#070b10] p-3 rounded border border-[#162233] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Car & Speedometer Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff2a2a] animate-pulse" />
            <span className="font-bold text-white text-xs">
              CAR #{selectedDriver.driverNumber} [{selectedDriver.driverName.toUpperCase()}]
            </span>
          </div>

          <span className="text-[#334155]">|</span>

          {/* Digital Speedometer */}
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-white tabular-nums tracking-tight">
              {carTelemetry.speed}
            </span>
            <span className="text-[10px] text-[#55677d] font-bold">KM/H</span>
          </div>

          {/* Gear Indicator */}
          <div className="flex items-center gap-1 bg-[#101926] px-2 py-0.5 rounded border border-[#1b2b40]">
            <span className="text-[10px] text-[#55677d]">GEAR</span>
            <span className="text-sm font-black text-[#00d2ff]">D{carTelemetry.gear}</span>
          </div>

          {/* Throttle Gauge */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#55677d]">THR:</span>
            <div className="w-16 h-2 bg-[#121c27] rounded-sm overflow-hidden border border-[#1f3042]">
              <div
                className="h-full bg-emerald-400 transition-all duration-75"
                style={{ width: `${carTelemetry.throttle}%` }}
              />
            </div>
            <span className="text-[10px] text-emerald-400 font-bold tabular-nums">
              {carTelemetry.throttle}%
            </span>
          </div>

          {/* Brake Gauge */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#55677d]">BRK:</span>
            <div className="w-16 h-2 bg-[#121c27] rounded-sm overflow-hidden border border-[#1f3042]">
              <div
                className="h-full bg-[#ff3b3b] transition-all duration-75"
                style={{ width: `${carTelemetry.brake}%` }}
              />
            </div>
            <span className="text-[10px] text-[#ff4b4b] font-bold tabular-nums">
              {carTelemetry.brake}%
            </span>
          </div>
        </div>

        {/* DRS, Steering Angle & Sector Status */}
        <div className="flex items-center gap-3 text-[11px]">
          {/* Steering Angle */}
          <div className="flex items-center gap-1">
            <span className="text-[#55677d]">STEER:</span>
            <span className="text-white font-bold tabular-nums">
              {carTelemetry.steeringAngle > 0 ? `+${carTelemetry.steeringAngle}°` : `${carTelemetry.steeringAngle}°`}
            </span>
          </div>

          <span className="text-[#334155]">|</span>

          {/* DRS Badge */}
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded border font-bold text-[10px] ${
              carTelemetry.drs
                ? 'text-[#00e5a3] bg-[#0c1f17] border-[#164430] shadow-sm'
                : 'text-[#526377] bg-[#0c1219] border-[#182333]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-sm ${carTelemetry.drs ? 'bg-[#00e5a3]' : 'bg-[#3b4756]'}`}
            />
            DRS {carTelemetry.drs ? 'ACTIVE' : 'READY'}
          </span>

          {/* Pit Status */}
          {isPitLane && (
            <span className="flex items-center gap-1 text-[#f59e0b] bg-[#221808] px-2 py-0.5 rounded border border-[#443110] animate-pulse font-bold text-[10px]">
              <span className="w-2 h-2 rounded-sm bg-[#f59e0b]" />
              PIT LANE
            </span>
          )}

          {/* Current Location Note */}
          <span className="text-[#38bdf8] font-bold">
            {carTelemetry.name}
          </span>
        </div>
      </div>
    </div>
  );
};
