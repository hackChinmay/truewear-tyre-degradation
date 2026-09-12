import React, { useState } from 'react';
import { HISTORICAL_LAPS } from '../data/mockRaceData';

interface DegradationChartProps {
  currentLap?: number;
  highlightPitWindow?: boolean;
  cliffLap?: number;
}

export const DegradationChart: React.FC<DegradationChartProps> = ({
  currentLap = 34,
  highlightPitWindow = true,
  cliffLap = 39.4,
}) => {
  const [hoveredLap, setHoveredLap] = useState<number | null>(null);

  // We map laps 15 to 48 for detailed high-resolution view of Stint 2 & 3
  const laps = HISTORICAL_LAPS.filter((l) => l.lapNumber >= 16 && l.lapNumber <= 48);

  const minLap = 16;
  const maxLap = 48;
  const minDelta = -0.2;
  const maxDelta = 2.4;

  const width = 840;
  const height = 280;
  const padding = { top: 30, right: 30, bottom: 40, left: 55 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const getX = (lapNum: number) => {
    return padding.left + ((lapNum - minLap) / (maxLap - minLap)) * plotWidth;
  };

  const getY = (delta: number) => {
    const clamped = Math.max(minDelta, Math.min(maxDelta, delta));
    return padding.top + plotHeight - ((clamped - minDelta) / (maxDelta - minDelta)) * plotHeight;
  };

  // Build SVG Paths
  // 1. Observed Pace points (for lap <= 34)
  const observedLaps = laps.filter((l) => l.lapNumber <= currentLap);
  const observedPoints = observedLaps.map((l) => `${getX(l.lapNumber)},${getY(l.observedDelta)}`).join(' ');

  // 2. Baseline Model line (linear +0.052s/lap)
  const baselinePath = `M ${getX(16)} ${getY(0.0)} L ${getX(48)} ${getY(1.664)}`;

  // 3. Predicted ML Pace curve
  const predictedPoints = laps.map((l) => `${getX(l.lapNumber)},${getY(l.modelPredictedDelta)}`).join(' ');

  // 4. Confidence Band polygon (upper and lower bounds)
  const upperPoints = laps.map((l) => `${getX(l.lapNumber)},${getY(l.modelPredictedDelta + 0.12)}`);
  const lowerPoints = laps
    .slice()
    .reverse()
    .map((l) => `${getX(l.lapNumber)},${getY(Math.max(-0.1, l.modelPredictedDelta - 0.12))}`);
  const confidenceArea = `M ${upperPoints[0]} L ${upperPoints.join(' L ')} L ${lowerPoints.join(' L ')} Z`;

  const hoveredData = hoveredLap ? HISTORICAL_LAPS.find((l) => l.lapNumber === hoveredLap) : null;

  return (
    <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536] font-mono select-none">
      {/* Chart Header & Legend */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#182333] mb-3 gap-2">
        <div>
          <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2">
            TYRE DEGRADATION FORECAST &amp; CLIFF PROJECTION
            <span className="text-[10px] text-[#00e5a3] font-normal bg-[#0e2118] px-2 py-0.5 rounded border border-[#174630]">
              ONLINE ADAPTIVE KALMAN STATE ESTIMATOR (INNOVATION RESIDUAL COV: 0.0034)
            </span>
          </h3>
          <p className="text-[10px] text-[#5e7087]">
            Isolating mechanical tyre wear via physics-informed latent decomposition: Fuel-burn correction (-0.058s/lap) and track grip evolution (+0.038s/lap)
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#00d2ff]" />
            <span className="text-[#8ba0b7]">Observed Pace</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-[#64748b] border-t border-dashed" />
            <span className="text-[#8ba0b7]">Baseline Model</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-1 bg-[#eab308] rounded-full" />
            <span className="text-[#eab308]">Predicted ML Pace</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2 bg-[#00e5a3]/30 border border-[#00e5a3] rounded-xs" />
            <span className="text-[#00e5a3]">P10 – P90 Uncertainty Interval</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-[#ff2a2a] rounded-full" />
            <span className="text-[#ff2a2a]">Thermal Cliff</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden bg-[#070b10] rounded border border-[#141d2a]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => setHoveredLap(null)}
        >
          {/* Horizontal Grid lines */}
          {[0.0, 0.5, 1.0, 1.5, 2.0].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#141d2a"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#4c5d72"
                  fontSize="9"
                >
                  +{val.toFixed(1)}s
                </text>
              </g>
            );
          })}

          {/* Vertical Lap Grid lines */}
          {[20, 25, 30, 35, 40, 45].map((lapNum) => {
            const x = getX(lapNum);
            return (
              <g key={lapNum}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#141d2a"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 14}
                  textAnchor="middle"
                  fill="#4c5d72"
                  fontSize="9"
                >
                  L{lapNum}
                </text>
              </g>
            );
          })}

          {/* Pit Box Window Shaded Area (L37 - L39) */}
          {highlightPitWindow && (
            <g>
              <rect
                x={getX(37)}
                y={padding.top}
                width={getX(39) - getX(37)}
                height={plotHeight}
                fill="#00e5a3"
                opacity="0.12"
              />
              <rect
                x={getX(37)}
                y={padding.top + 2}
                width={getX(39) - getX(37)}
                height="16"
                fill="#004b33"
                stroke="#00e5a3"
                strokeWidth="1"
                rx="2"
              />
              <text
                x={(getX(37) + getX(39)) / 2}
                y={padding.top + 13}
                textAnchor="middle"
                fill="#00e5a3"
                fontSize="8"
                fontWeight="bold"
              >
                PIT WINDOW L37-39
              </text>
            </g>
          )}

          {/* Thermal Cliff Boundary (Dynamic per circuit) */}
          <g>
            <line
              x1={getX(cliffLap)}
              y1={padding.top}
              x2={getX(cliffLap)}
              y2={height - padding.bottom}
              stroke="#ff2a2a"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <rect
              x={getX(cliffLap) - 40}
              y={padding.top + 25}
              width="80"
              height="15"
              fill="#2c0c10"
              stroke="#ff2a2a"
              strokeWidth="1"
              rx="2"
            />
            <text
              x={getX(cliffLap)}
              y={padding.top + 35}
              textAnchor="middle"
              fill="#ff4b4b"
              fontSize="7.5"
              fontWeight="bold"
            >
              THERMAL CLIFF L{cliffLap.toFixed(1)}
            </text>
          </g>

          {/* Current Lap Marker (Lap 34) */}
          <g>
            <line
              x1={getX(currentLap)}
              y1={padding.top}
              x2={getX(currentLap)}
              y2={height - padding.bottom}
              stroke="#00d2ff"
              strokeWidth="2"
            />
            <rect
              x={getX(currentLap) - 30}
              y={height - padding.bottom - 20}
              width="60"
              height="14"
              fill="#082333"
              stroke="#00d2ff"
              strokeWidth="1"
              rx="2"
            />
            <text
              x={getX(currentLap)}
              y={height - padding.bottom - 10}
              textAnchor="middle"
              fill="#00d2ff"
              fontSize="8"
              fontWeight="bold"
            >
              NOW: L{currentLap}
            </text>
          </g>

          {/* 95% Confidence Band */}
          <path d={confidenceArea} fill="#00e5a3" opacity="0.08" />

          {/* Baseline Model Line */}
          <path
            d={baselinePath}
            fill="none"
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          {/* Predicted ML Pace Curve */}
          <path
            d={`M ${predictedPoints.split(' ')[0]} L ${predictedPoints}`}
            fill="none"
            stroke="#eab308"
            strokeWidth="2.5"
          />

          {/* Observed Pace Line */}
          <path
            d={`M ${observedPoints.split(' ')[0]} L ${observedPoints}`}
            fill="none"
            stroke="#00d2ff"
            strokeWidth="1.5"
            opacity="0.85"
          />

          {/* Observed Pace Dots */}
          {observedLaps.map((l) => (
            <circle
              key={l.lapNumber}
              cx={getX(l.lapNumber)}
              cy={getY(l.observedDelta)}
              r={hoveredLap === l.lapNumber ? 5 : 3}
              fill="#00d2ff"
              stroke="#090d13"
              strokeWidth="1"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredLap(l.lapNumber)}
            />
          ))}

          {/* Hover interactive bars */}
          {laps.map((l) => (
            <rect
              key={l.lapNumber}
              x={getX(l.lapNumber) - 8}
              y={padding.top}
              width="16"
              height={plotHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredLap(l.lapNumber)}
            />
          ))}
        </svg>

        {/* Dynamic Telemetry Hover Tooltip */}
        {hoveredData && (
          <div className="absolute top-2 right-3 bg-[#0d1521]/95 border border-[#23354b] p-2.5 rounded shadow-xl font-mono text-[11px] text-white pointer-events-none z-10 space-y-1">
            <div className="flex items-center justify-between gap-4 font-bold border-b border-[#1b293c] pb-1 text-[#00d2ff]">
              <span>LAP {hoveredData.lapNumber} ({hoveredData.compound})</span>
              <span>TIME: {hoveredData.lapTimeStr}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[#94a3b8] text-[10px]">
              <div>Observed Pace: <strong className="text-white">+{hoveredData.observedDelta}s</strong></div>
              <div>ML Predicted: <strong className="text-[#eab308]">+{hoveredData.modelPredictedDelta}s</strong></div>
              <div>Fuel Offset: <strong className="text-emerald-400">{hoveredData.fuelOffset}s</strong></div>
              <div>True Wear Delta: <strong className="text-red-400">+{hoveredData.trueWearDelta}s</strong></div>
              <div>Tyre Age: <strong className="text-white">{hoveredData.tyreAge} Laps</strong></div>
              <div>Track Temp: <strong className="text-amber-400">{hoveredData.trackTemp}°C</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Footer Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 mt-2 border-t border-[#162130] text-[11px]">
        <div className="bg-[#0e1520] p-2 rounded border border-[#1a2638]">
          <span className="text-[#55677d] block text-[9px]">MODEL ERROR RATE</span>
          <strong className="text-white font-bold">±0.038s MAE</strong>
        </div>
        <div className="bg-[#0e1520] p-2 rounded border border-[#1a2638]">
          <span className="text-[#55677d] block text-[9px]">EST. PACE AT LAP 38</span>
          <strong className="text-[#eab308] font-bold">1:24.180 (+0.901s)</strong>
        </div>
        <div className="bg-[#0e1520] p-2 rounded border border-[#1a2638]">
          <span className="text-[#55677d] block text-[9px]">EST. PACE POST-CLIFF (L41)</span>
          <strong className="text-[#ff4b4b] font-bold">1:25.420 (+1.24s loss)</strong>
        </div>
        <div className="bg-[#0e1520] p-2 rounded border border-[#1a2638]">
          <span className="text-[#55677d] block text-[9px]">DEGRADATION VELOCITY</span>
          <strong className="text-[#00e5a3] font-bold">+0.078s / Lap</strong>
        </div>
      </div>
    </div>
  );
};
