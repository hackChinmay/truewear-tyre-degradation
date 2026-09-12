import React from 'react';
import { useRace } from '../context/RaceContext';
import { getCircuitConfoundingFactors } from '../data/mockRaceData';
import {
  Activity,
  ArrowRight,
  CloudSun,
  Droplets,
  Flame,
  Gauge,
  Layers,
  Thermometer,
  Wind,
} from 'lucide-react';

export const TrackConditions: React.FC = () => {
  const { currentLap, selectedCircuit, weatherState, navigateTo } = useRace();

  const confoundingFactors = getCircuitConfoundingFactors(selectedCircuit.id);

  const airTempStr = `${weatherState.airTemp.toFixed(1)}°C`;
  const trackTempStr = `${weatherState.trackTemp.toFixed(1)}°C`;
  const windStr = `${weatherState.windSpeed.toFixed(1)} km/h`;
  const windDirStr = weatherState.windDirection || 'NE';
  const humidityStr = `${weatherState.humidity ?? 48}%`;
  const gripIndexStr = `${(1.0 + (weatherState.trackTemp / 100) * 0.1).toFixed(3)} μ`;

  return (
    <div id="page-track-conditions" className="space-y-6 pb-12 font-mono">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1b2536] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[#ff2a2a] font-bold tracking-widest uppercase">
              MODULE 06 // TRACK &amp; CONDITIONS
            </span>
            <span className="text-[10px] bg-[#162335] text-[#38bdf8] px-2 py-0.5 rounded border border-[#233852]">
              FASTF1 LIVE SENSORS: {selectedCircuit.name.toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{selectedCircuit.name.toUpperCase()}</h1>
          <p className="text-xs text-[#8fa1b6] mt-0.5">
            Real-time track micro-climate, asphalt temperature, and tyre thermal hysteresis at {selectedCircuit.location}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8fa2b8] bg-[#0d131c] px-3 py-1.5 rounded border border-[#1a2536]">
            Circuit: <strong className="text-white">{selectedCircuit.name}</strong> ({selectedCircuit.totalLaps} Laps)
          </span>
          <button
            onClick={() => navigateTo('tyres')}
            className="bg-[#ff2a2a] hover:bg-[#e02424] text-white px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <span>VIEW TYRE IMPACT</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Environmental Readings Strip (5 Prominent Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#0d131c] p-3.5 rounded border border-[#1b2636]">
          <div className="text-[10px] text-[#63768c] flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>AIR TEMPERATURE</span>
          </div>
          <div className="text-2xl font-black text-white mt-1">{airTempStr}</div>
          <div className="text-[10px] text-[#00e5a3] mt-1">Live FastF1 Ambient Telemetry</div>
        </div>

        <div className="bg-[#0d131c] p-3.5 rounded border border-[#1b2636]">
          <div className="text-[10px] text-[#63768c] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>TRACK TEMPERATURE</span>
          </div>
          <div className="text-2xl font-black text-[#f59e0b] mt-1">{trackTempStr}</div>
          <div className="text-[10px] text-amber-300 mt-1">
            {weatherState.trackTemp > 35 ? 'High Thermal Hysteresis' : 'Nominal Surface'} • FastF1 Sensor
          </div>
        </div>

        <div className="bg-[#0d131c] p-3.5 rounded border border-[#1b2636]">
          <div className="text-[10px] text-[#63768c] flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>HUMIDITY &amp; DENSITY</span>
          </div>
          <div className="text-2xl font-black text-white mt-1">{humidityStr}</div>
          <div className="text-[10px] text-[#788ca2] mt-1">{weatherState.rainfall ? 'WET TRACK' : 'DRY SURFACE'} • 1.176 kg/m³</div>
        </div>

        <div className="bg-[#0d131c] p-3.5 rounded border border-[#1b2636]">
          <div className="text-[10px] text-[#63768c] flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-[#94a3b8]" />
            <span>WIND VECTOR</span>
          </div>
          <div className="text-2xl font-black text-white mt-1">{windStr}</div>
          <div className="text-[10px] text-[#788ca2] mt-1">Bearing {windDirStr} • Pit Straight Anemometer</div>
        </div>

        <div className="bg-[#0d131c] p-3.5 rounded border border-[#1b2636]">
          <div className="text-[10px] text-[#63768c] flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-[#00e5a3]" />
            <span>TRACK GRIP INDEX</span>
          </div>
          <div className="text-2xl font-black text-[#00e5a3] mt-1">{gripIndexStr}</div>
          <div className="text-[10px] text-emerald-400 mt-1">Evolving +0.0024 / lap</div>
        </div>
      </div>

      {/* Two Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 01: Track Evolution & Grip Performance Index */}
        <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#182333]">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                CHART 01 // TRACK EVOLUTION &amp; GRIP INDEX (μ)
              </h3>
              <p className="text-[10px] text-[#5e7086]">
                Deposition Rate: +0.0024 index/lap • Est. Grip Saturation: Lap 42 (~1.051 μ)
              </p>
            </div>
            <span className="text-[10px] text-[#00d2ff]">RUBBERING-IN</span>
          </div>

          <div className="h-52 bg-[#070b10] rounded border border-[#141d2a] p-2 flex items-center justify-center">
            <svg viewBox="0 0 400 160" className="w-full h-full" preserveAspectRatio="none">
              <line x1="40" y1="30" x2="380" y2="30" stroke="#162334" strokeWidth="1" strokeDasharray="2 2" />
              <text x="35" y="33" textAnchor="end" fill="#55677d" fontSize="8">1.050μ</text>

              <line x1="40" y1="80" x2="380" y2="80" stroke="#162334" strokeWidth="1" strokeDasharray="2 2" />
              <text x="35" y="83" textAnchor="end" fill="#55677d" fontSize="8">1.030μ</text>

              <line x1="40" y1="130" x2="380" y2="130" stroke="#162334" strokeWidth="1" strokeDasharray="2 2" />
              <text x="35" y="133" textAnchor="end" fill="#55677d" fontSize="8">1.010μ</text>

              {/* Current Lap 34 marker */}
              <line x1="260" y1="20" x2="260" y2="140" stroke="#00d2ff" strokeWidth="1.5" strokeDasharray="2 2" />
              <text x="260" y="152" textAnchor="middle" fill="#00d2ff" fontSize="8">L34 (NOW)</text>

              {/* Grip evolution logarithmic curve */}
              <path
                d="M 50 140 Q 150 70 260 50 T 380 40"
                fill="none"
                stroke="#00e5a3"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>

        {/* Chart 02: Surface Thermal Gradient vs Degradation Rate */}
        <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#182333]">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                CHART 02 // THERMAL GRADIENT VS DEGRADATION MULTIPLIER
              </h3>
              <p className="text-[10px] text-[#5e7086]">
                Pearson Correlation: r = 0.884 • Thermal Multiplier: 1.18x (Elevated above 38°C)
              </p>
            </div>
            <span className="text-[10px] text-amber-400">THERMAL COUPLING</span>
          </div>

          <div className="h-52 bg-[#070b10] rounded border border-[#141d2a] p-2 flex items-center justify-center">
            <svg viewBox="0 0 400 160" className="w-full h-full" preserveAspectRatio="none">
              <line x1="40" y1="30" x2="380" y2="30" stroke="#162334" strokeWidth="1" strokeDasharray="2 2" />
              <text x="35" y="33" textAnchor="end" fill="#55677d" fontSize="8">1.3x</text>

              <line x1="40" y1="80" x2="380" y2="80" stroke="#162334" strokeWidth="1" strokeDasharray="2 2" />
              <text x="35" y="83" textAnchor="end" fill="#55677d" fontSize="8">1.15x</text>

              <line x1="40" y1="130" x2="380" y2="130" stroke="#162334" strokeWidth="1" strokeDasharray="2 2" />
              <text x="35" y="133" textAnchor="end" fill="#55677d" fontSize="8">1.0x</text>

              {/* Optimal window shaded */}
              <rect x="150" y="30" width="100" height="100" fill="#00e5a3" opacity="0.1" />
              <text x="200" y="45" textAnchor="middle" fill="#00e5a3" fontSize="8">OPTIMAL (35-38°C)</text>

              {/* Rising thermal slope */}
              <path
                d="M 50 135 L 150 130 L 250 110 L 320 60 L 380 35"
                fill="none"
                stroke="#ff4b4b"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Decoupled Confounding Factor Shares */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536]">
        <div className="flex items-center justify-between pb-3 border-b border-[#182333] mb-4">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">
            CONFOUNDING FACTORS SEPARATION // 5 LATENT VARIABLES DECOUPLED
          </h3>
          <span className="text-[10px] text-[#00e5a3]">KALMAN MULTI-VARIATE FILTER</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {confoundingFactors.map((factor) => (
            <div key={factor.id} className="bg-[#0d131c] p-3 rounded border border-[#182333]">
              <span className="text-[10px] text-[#55677d] block font-bold truncate">{factor.name}</span>
              <div className="text-lg font-black text-white mt-1">{factor.sharePercentage}%</div>
              <span className="text-[10px] text-[#00d2ff] block mt-0.5">{factor.impactValueStr}</span>
              <p className="text-[9px] text-[#718296] mt-2 leading-relaxed">{factor.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Engineering Interpretation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0b1017] p-4 rounded border border-[#192435]">
          <h4 className="text-xs font-bold text-[#00d2ff] mb-2">HOW TRACK EVOLUTION MASKS DEGRADATION</h4>
          <p className="text-xs text-[#7d91a6] leading-relaxed">
            As more rubber is laid down into the racing line, cornering grip improves by up to +0.038s/lap.
            Without TrueWear, a race engineer looking only at raw lap times would believe tyres are
            not degrading, leading to sudden unexpected drop-offs.
          </p>
        </div>

        <div className="bg-[#0b1017] p-4 rounded border border-[#192435]">
          <h4 className="text-xs font-bold text-amber-400 mb-2">THERMAL EXPONENT AT {selectedCircuit.name.toUpperCase()}</h4>
          <p className="text-xs text-[#7d91a6] leading-relaxed">
            Surface temperatures at {trackTempStr} create high heat hysteresis across high-load sectors. The critical
            loaded tyre runs 4°C hotter than the other corners, making Lap {selectedCircuit.cliffLapThreshold} the target crossover before blistering occurs.
          </p>
        </div>

        <div className="bg-[#0b1017] p-4 rounded border border-[#192435]">
          <h4 className="text-xs font-bold text-[#00e5a3] mb-2">STRATEGY VERDICT</h4>
          <p className="text-xs text-[#7d91a6] leading-relaxed">
            With ambient track grip saturating at Lap 42 and tyre graining accelerating, pitting on Lap 38
            allows the driver to maximize the high grip surface with clean new rubber without suffering the
            cliff.
          </p>
        </div>
      </div>
    </div>
  );
};
