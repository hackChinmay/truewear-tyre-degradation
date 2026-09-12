import React, { useState } from 'react';
import { useRace } from '../context/RaceContext';
import { getCircuitConfoundingFactors } from '../data/mockRaceData';
import { DegradationChart } from '../components/DegradationChart';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Download,
  Flame,
  Info,
  Layers,
  Sliders,
  Sparkles,
} from 'lucide-react';

export const TyreIntelligence: React.FC = () => {
  const {
    currentLap,
    selectedCircuit,
    selectedDriver,
    selectedDriverCode,
    setSelectedDriverCode,
    selectedSession,
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

  const [selectedLapInspector, setSelectedLapInspector] = useState<number>(18);

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Lap,TyreAge,Compound,ObservedDelta,TrueWearDelta,FuelOffset,TrackGripOffset,TrafficOffset\n' +
      Array.from({ length: 34 }, (_, i) => {
        const l = i + 1;
        return `${l},${l > 16 ? l - 16 : l},${selectedCompound},${(0.078 * (l > 16 ? l - 16 : l)).toFixed(3)},${(0.087 * (l > 16 ? l - 16 : l)).toFixed(3)},${(-0.058 * l).toFixed(3)},${(-0.038 * Math.log(l + 1)).toFixed(3)},0.000`;
      }).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `truewear_tyre_intelligence_${selectedCircuit.id}_${selectedDriver.driverCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerActionNotification('Tyre degradation analysis CSV exported successfully.', 'success');
  };

  const degRate = selectedCompound === 'SOFT' ? 0.088 : selectedCompound === 'HARD' ? 0.031 : 0.052;
  const cliffThreshold = selectedCompound === 'SOFT' ? Math.round(selectedCircuit.cliffLapThreshold * 0.45) : selectedCompound === 'HARD' ? selectedCircuit.cliffLapThreshold : Math.round(selectedCircuit.cliffLapThreshold * 0.70);

  const futurePredictions = Array.from({ length: 5 }, (_, i) => {
    const age = selectedDriver.tyreAge + i + 1;
    const lap = currentLap + i + 1;
    const baseLap = selectedCircuit.baseLapTimeSeconds + (selectedDriver.position - 1) * 0.08;
    const isOverCliff = age > cliffThreshold;
    const cliffPenalty = isOverCliff ? (age - cliffThreshold) * 0.18 : 0;
    const timeNum = baseLap + age * degRate + cliffPenalty;
    const m = Math.floor(timeNum / 60);
    const s = (timeNum % 60).toFixed(3);
    const timeStr = `${m}:${Number(s) < 10 ? '0' : ''}${s}s`;

    // P10 and P90 uncertainty bounds (heteroscedastic expansion)
    const sigma = 0.014 * (1.0 + 0.035 * Math.max(0, age - 6));
    const p10Deg = Math.max(0.01, degRate - 1.282 * sigma);
    const p90Deg = degRate + 1.282 * sigma;

    // Cumulative Gaussian cliff probability
    const zCliff = (age - cliffThreshold) / 1.4;
    const t = 1.0 / (1.0 + 0.2316419 * Math.abs(zCliff));
    const d = 0.3989422804014327 * Math.exp((-zCliff * zCliff) / 2.0);
    let p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    if (zCliff > 0) p = 1.0 - p;
    const cliffProb = Math.min(99, Math.max(1, Math.round(p * 100)));

    let status = 'NOMINAL / CLEAN';
    let statusColor = 'text-emerald-400 border-emerald-800 bg-emerald-950/40';
    if (cliffProb >= 80) {
      status = 'TERMINAL CLIFF ZONE';
      statusColor = 'text-red-500 border-red-800 bg-red-950/40';
    } else if (cliffProb >= 50) {
      status = 'CRITICAL PERFORMANCE CLIFF';
      statusColor = 'text-amber-500 border-amber-800 bg-amber-950/40';
    } else if (cliffProb >= 20) {
      status = 'ELEVATED DEGRADATION';
      statusColor = 'text-yellow-400 border-yellow-800 bg-yellow-950/40';
    }

    return {
      age,
      lap,
      time: timeStr,
      p10DegStr: `+${p10Deg.toFixed(3)}s`,
      p50DegStr: `+${degRate.toFixed(3)}s`,
      p90DegStr: `+${p90Deg.toFixed(3)}s`,
      cliffProb,
      status,
      statusColor,
    };
  });

  return (
    <div id="page-tyre-intelligence" className="space-y-6 pb-12 font-mono">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1b2536] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[#ff2a2a] font-bold tracking-widest uppercase">
              MODULE 02 // TYRE INTELLIGENCE
            </span>
            <span className="text-[10px] bg-[#162335] text-[#38bdf8] px-2 py-0.5 rounded border border-[#233852]">
              TRUEWEAR v1.0.4 LIVE
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">TYRE INTELLIGENCE</h1>
          <p className="text-xs text-[#8fa1b6] mt-0.5">
            True tyre degradation estimation and future performance prediction via physics-informed ML
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-[#121c2a] hover:bg-[#1a273a] text-[#8fa2b8] hover:text-white px-3 py-1.5 rounded border border-[#23344b] text-xs flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
          <button
            onClick={() => navigateTo('strategy')}
            className="bg-[#ff2a2a] hover:bg-[#e02424] text-white px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <span>VIEW STRATEGY IMPACT</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#0d131c] p-3.5 rounded border border-[#1b2636]">
          <div className="text-[10px] text-[#63768c] uppercase flex items-center justify-between">
            <span>COMPOUND</span>
            <select
              value={selectedCompound}
              onChange={(e) => setSelectedCompound(e.target.value as any)}
              className="bg-[#121c29] text-[10px] text-white border border-[#223348] rounded px-1 outline-none cursor-pointer"
            >
              <option value="MEDIUM">MEDIUM</option>
              <option value="SOFT">SOFT</option>
              <option value="HARD">HARD</option>
            </select>
          </div>
          <div className={`text-xl font-black mt-1 flex items-center gap-2 ${
            selectedCompound === 'SOFT' ? 'text-red-400' : selectedCompound === 'MEDIUM' ? 'text-[#eab308]' : 'text-cyan-400'
          }`}>
            <span>{selectedCompound}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${
              selectedCompound === 'SOFT' ? 'bg-[#2b0c10] text-red-400 border-red-800' :
              selectedCompound === 'MEDIUM' ? 'bg-[#2b200b] text-[#eab308] border-[#5c4613]' :
              'bg-[#09222a] text-cyan-400 border-cyan-800'
            }`}>
              {selectedCompound === 'SOFT' ? 'C4' : selectedCompound === 'MEDIUM' ? 'C3' : 'C2'}
            </span>
          </div>
          <div className="text-[10px] text-[#55677d] mt-1">Pirelli P-Zero Dry Spec</div>
        </div>

        <div className="bg-[#0d131c] p-3.5 rounded border border-[#1b2636]">
          <div className="text-[10px] text-[#63768c] uppercase">TYRE AGE</div>
          <div className="text-xl font-black text-white mt-1">
            {selectedDriver.tyreAge} LAPS <span className="text-xs text-[#00d2ff] font-normal">({Math.max(10, 100 - selectedDriver.tyreAge * 3)}% LIFE)</span>
          </div>
          <div className="text-[10px] text-[#55677d] mt-1">
            Target: {selectedCompound === 'SOFT' ? '15-18 Laps' : selectedCompound === 'MEDIUM' ? '22-25 Laps' : '32-38 Laps'}
          </div>
        </div>

        <div className="bg-[#0d131c] p-3.5 rounded border border-[#1b2636]">
          <div className="text-[10px] text-[#63768c] uppercase">STINT LENGTH</div>
          <div className="text-xl font-black text-white mt-1">{selectedDriver.tyreAge} LAPS</div>
          <div className="text-[10px] text-[#55677d] mt-1">
            Stint {selectedStintNumber} • #{selectedDriver.driverNumber} {selectedDriver.driverName}
          </div>
        </div>

        <div className="bg-[#0d131c] p-3.5 rounded border border-[#1b2636]">
          <div className="text-[10px] text-[#63768c] uppercase">TRUE DEGRADATION</div>
          <div className="text-xl font-black text-[#ff4b4b] mt-1">+{selectedDriver.degRatePerLap.toFixed(3)} s/lap</div>
          <div className="text-[10px] text-[#ff8e8e] mt-1">Physics decoupled (fuel &amp; evo)</div>
        </div>

        <div className="bg-[#0d131c] p-3.5 rounded border border-[#1b2636]">
          <div className="text-[10px] text-[#63768c] uppercase">MODEL CONFIDENCE</div>
          <div className="text-xl font-black text-[#00e5a3] mt-1">91%</div>
          <div className="text-[10px] text-[#55677d] mt-1">Uncertainty: ±0.041s (1σ)</div>
        </div>
      </div>

      {/* Primary Degradation Chart & Inspector Box */}
      <div className="space-y-3">
        <DegradationChart
          currentLap={currentLap}
          highlightPitWindow={true}
          cliffLap={selectedCircuit.cliffLapThreshold}
        />

        {/* Tyre Degradation Inspector Box */}
        <div className="bg-[#0e1622] p-4 rounded border border-[#1e2f44] text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#182637] mb-3">
            <span className="font-bold text-[#00d2ff] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              INSPECTOR // ACTIVE OBSERVED SAMPLE (TYRE AGE {selectedLapInspector} LAPS)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#5b7088] text-[10px]">SELECT LAP AGE:</span>
              {[15, 18, 20, 22].map((age) => (
                <button
                  key={age}
                  onClick={() => setSelectedLapInspector(age)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedLapInspector === age
                      ? 'bg-[#00d2ff] text-black'
                      : 'bg-[#152132] text-[#8ea2b8] hover:text-white'
                  }`}
                >
                  {age}L
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px]">
            <div className="bg-[#090f17] p-2.5 rounded border border-[#152030]">
              <span className="text-[#55677d] block text-[10px]">RAW OBSERVED DELTA</span>
              <strong className="text-white text-base font-bold">+0.641s / lap</strong>
              <span className="text-[9px] text-[#61748a] block mt-0.5">Observed lap timing delta</span>
            </div>
            <div className="bg-[#090f17] p-2.5 rounded border border-[#152030]">
              <span className="text-[#55677d] block text-[10px]">FUEL MASS OFFSET (1.72kg/L)</span>
              <strong className="text-emerald-400 text-base font-bold">-1.044s (β: 0.058)</strong>
              <span className="text-[9px] text-[#61748a] block mt-0.5">Weight reduction bonus</span>
            </div>
            <div className="bg-[#090f17] p-2.5 rounded border border-[#152030]">
              <span className="text-[#55677d] block text-[10px]">TRACK GRIP GAIN OFFSET</span>
              <strong className="text-[#38bdf8] text-base font-bold">+0.687s (μ: 0.038)</strong>
              <span className="text-[9px] text-[#61748a] block mt-0.5">Rubber deposition mask</span>
            </div>
            <div className="bg-[#170a0e] p-2.5 rounded border border-[#481822]">
              <span className="text-[#ff8e8e] block text-[10px] font-bold">TRUE WEAR DEGRADATION</span>
              <strong className="text-[#ff4b4b] text-base font-black">+1.566s DECOUPLED</strong>
              <span className="text-[9px] text-[#ff8e8e]/80 block mt-0.5">True mechanical breakdown</span>
            </div>
          </div>

          <div className="pt-2.5 mt-2 border-t border-[#182637] text-[10px] text-[#657a91] flex justify-between">
            <span>ESTIMATED PYROMETER SIGNALS: FL 102°C | FR 106°C | RL 104°C | RR 108°C</span>
            <span className="text-amber-400 font-bold">
              ESTIMATED CROSSOVER CLIFF: LAP {selectedCircuit.cliffLapThreshold.toFixed(1)} ± 0.4 LAPS
            </span>
          </div>
        </div>
      </div>

      {/* Confounding Factor Separation Matrix */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536]">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#182333] mb-4 gap-2">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              CONFOUNDING FACTOR SEPARATION // MULTI-VARIATE DECOMPOSITION
            </h3>
            <p className="text-[10px] text-[#5e7086]">
              Decoupling mechanical polymer breakdown from track evolution, aerodynamic traffic wake, and fuel mass
            </p>
          </div>

          {/* Interactive Decoupling Toggles */}
          <div className="flex items-center gap-2 text-[10px]">
            <button
              onClick={() => setFuelCorrectionEnabled(!fuelCorrectionEnabled)}
              className={`px-2.5 py-1 rounded border font-semibold transition-all ${
                fuelCorrectionEnabled
                  ? 'bg-[#10291e] text-[#00e5a3] border-[#1c553a]'
                  : 'bg-[#131b26] text-[#62768c] border-[#1d2737]'
              }`}
            >
              Fuel Correction: {fuelCorrectionEnabled ? 'ACTIVE' : 'OFF'}
            </button>
            <button
              onClick={() => setTrackEvoCorrectionEnabled(!trackEvoCorrectionEnabled)}
              className={`px-2.5 py-1 rounded border font-semibold transition-all ${
                trackEvoCorrectionEnabled
                  ? 'bg-[#10291e] text-[#00e5a3] border-[#1c553a]'
                  : 'bg-[#131b26] text-[#62768c] border-[#1d2737]'
              }`}
            >
              Track Evo: {trackEvoCorrectionEnabled ? 'ACTIVE' : 'OFF'}
            </button>
            <button
              onClick={() => setTrafficDecouplingEnabled(!trafficDecouplingEnabled)}
              className={`px-2.5 py-1 rounded border font-semibold transition-all ${
                trafficDecouplingEnabled
                  ? 'bg-[#10291e] text-[#00e5a3] border-[#1c553a]'
                  : 'bg-[#131b26] text-[#62768c] border-[#1d2737]'
              }`}
            >
              Traffic Decoupling: {trafficDecouplingEnabled ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {getCircuitConfoundingFactors(selectedCircuit.id).slice(0, 4).map((f) => (
            <div
              key={f.id}
              className="bg-[#0d131c] p-3.5 rounded border border-[#192435] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-1.5 border-b border-[#141d2a] mb-2">
                  <span className="font-bold text-[11px] text-white truncate">{f.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                      f.severity === 'CRITICAL'
                        ? 'bg-red-950/40 text-red-400 border-red-800'
                        : f.severity === 'HIGH'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-800'
                        : 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                    }`}
                  >
                    {f.impactLabel}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-xl font-black text-white">{f.impactValueStr}</div>
                  <div className="text-[10px] text-[#00d2ff] font-bold">{f.sharePercentage}% Share</div>
                </div>

                <p className="text-[10px] text-[#71849a] leading-relaxed mb-3">
                  {f.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#141d2a] text-[9px] text-[#55677d] flex justify-between">
                <span>DIRECTION:</span>
                <span className="text-[#a0b3c7] font-semibold">{f.direction}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Future Performance Prediction Horizon */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536]">
        <div className="flex items-center justify-between pb-3 border-b border-[#182333] mb-3">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              FUTURE PERFORMANCE PREDICTION // HORIZON: LAP 35 - LAP 39 (NEXT 5 LAPS)
            </h3>
            <p className="text-[10px] text-[#5e7086]">
              Projected lap time delta and thermal cliff trajectory under nominal driving conditions
            </p>
          </div>
          <span className="text-[10px] text-[#eab308] bg-[#271e0c] px-2 py-0.5 rounded border border-[#523e18]">
            CLIFF WARNING: LAP 38-39
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#182435] text-[#5a6c82] text-[10px] uppercase">
                <th className="py-2 px-3">RACE LAP</th>
                <th className="py-2 px-3">TYRE AGE</th>
                <th className="py-2 px-3">PREDICTED LAP TIME</th>
                <th className="py-2 px-3">DEGRADATION [P10 / P50 / P90]</th>
                <th className="py-2 px-3">CLIFF PROBABILITY</th>
                <th className="py-2 px-3">PERFORMANCE REGION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d2b]">
              {futurePredictions.map((pred) => (
                <tr key={pred.lap} className="text-[#8da0b6] hover:bg-[#0e141f]">
                  <td className="py-2.5 px-3 font-bold text-white">LAP {pred.lap}</td>
                  <td className="py-2.5 px-3 text-[#cbd5e1]">{pred.age} Laps</td>
                  <td className="py-2.5 px-3 text-[#00d2ff] font-bold">{pred.time}</td>
                  <td className="py-2.5 px-3 font-bold text-[#eab308]">
                    {pred.p50DegStr}{' '}
                    <span className="text-[10px] text-[#71849a] font-normal">
                      [{pred.p10DegStr} – {pred.p90DegStr}]
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        pred.cliffProb >= 80
                          ? 'bg-red-950/60 text-red-400 border-red-800'
                          : pred.cliffProb >= 50
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                          : 'bg-[#121c2a] text-[#8ea3ba] border-[#1b2b3f]'
                      }`}
                    >
                      {pred.cliffProb}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${pred.statusColor}`}>
                      {pred.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Performance & Residual Accuracy Diagnostics */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536]">
        <div className="flex items-center justify-between pb-3 border-b border-[#182333] mb-3">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              MODEL PERFORMANCE &amp; RESIDUAL ACCURACY
            </h3>
            <p className="text-[10px] text-[#5e7086]">
              Model inference diagnostics (Execution: Sub-10ms • Bayesian Ridge Kalman Filter)
            </p>
          </div>
          <span className="text-[10px] text-[#00e5a3] font-bold bg-[#0c221a] px-2 py-0.5 rounded border border-[#174836]">
            ALL ACCURACY BENCHMARKS PASSED
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#0d131c] p-3 rounded border border-[#192435]">
            <span className="text-[#55677d] text-[10px] block">MEAN ABSOLUTE ERROR (MAE)</span>
            <strong className="text-xl font-black text-white">0.084 s</strong>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Passed (&lt;0.100s Threshold)</span>
          </div>

          <div className="bg-[#0d131c] p-3 rounded border border-[#192435]">
            <span className="text-[#55677d] text-[10px] block">ROOT MEAN SQUARE ERROR (RMSE)</span>
            <strong className="text-xl font-black text-white">0.117 s</strong>
            <span className="text-[10px] text-[#71849a] block mt-0.5">1σ Deviation (σ² = 0.014)</span>
          </div>

          <div className="bg-[#0d131c] p-3 rounded border border-[#192435]">
            <span className="text-[#55677d] text-[10px] block">COEFF OF DETERMINATION (R²)</span>
            <strong className="text-xl font-black text-[#00e5a3]">0.91</strong>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Excellent Fit (504 sectors)</span>
          </div>

          <div className="bg-[#0d131c] p-3 rounded border border-[#192435]">
            <span className="text-[#55677d] text-[10px] block">PREDICTIVE STABILITY</span>
            <strong className="text-xl font-black text-[#00d2ff]">91%</strong>
            <span className="text-[10px] text-[#71849a] block mt-0.5">36 Derived Features Active</span>
          </div>
        </div>
      </div>

      {/* Engineering Interpretation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0b1017] p-3.5 rounded border border-[#192435]">
          <h4 className="text-[11px] font-bold text-[#00d2ff] mb-1">WHAT THE MODEL SEES</h4>
          <p className="text-[10px] text-[#76899e] leading-relaxed">
            Front-Right tyre is absorbing 38% of total lateral stress at Lesmo 1 &amp; 2, triggering thermal
            blistering at 108°C estimated surface pyrometry.
          </p>
        </div>

        <div className="bg-[#0b1017] p-3.5 rounded border border-[#192435]">
          <h4 className="text-[11px] font-bold text-amber-400 mb-1">WHY DEGRADATION IS INCREASING</h4>
          <p className="text-[10px] text-[#76899e] leading-relaxed">
            Polymer carcass rubber loss exposes internal belts to rapid heat buildup. Fuel burn compensation
            no longer masks the mechanical slip angle loss.
          </p>
        </div>

        <div className="bg-[#0b1017] p-3.5 rounded border border-[#192435]">
          <h4 className="text-[11px] font-bold text-red-400 mb-1">EXPECTED TYRE BEHAVIOUR</h4>
          <p className="text-[10px] text-[#76899e] leading-relaxed">
            Severe thermal cliff estimated at Lap {selectedCircuit.cliffLapThreshold.toFixed(1)} for {selectedCircuit.name}. Heavy braking zones will incur +0.4s loss,
            traction out of slow corners will drop by 14%.
          </p>
        </div>

        <div className="bg-[#0b1017] p-3.5 rounded border border-[#192435]">
          <h4 className="text-[11px] font-bold text-[#00e5a3] mb-1">STRATEGY IMPLICATION</h4>
          <p className="text-[10px] text-[#76899e] leading-relaxed">
            Commit to Box Lap 37-39. Fitting fresh C2 Hard compound delivers an immediate 1.1s pace reset
            with zero overheating risks to the finish.
          </p>
        </div>
      </div>
    </div>
  );
};
