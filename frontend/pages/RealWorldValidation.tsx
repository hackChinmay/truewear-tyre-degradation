import React, { useState, useMemo } from 'react';
import { useRace } from '../context/RaceContext';
import {
  runHistoricalRaceValidation,
  evaluateLeaveOneRaceOut,
} from '../services/historicalValidationEngine';
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  Cpu,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  BarChart2,
  Sliders,
  Database,
  Search,
  ExternalLink,
} from 'lucide-react';

export const RealWorldValidation: React.FC = () => {
  const {
    selectedCircuit,
    setCircuitId,
    selectedDriver,
    selectedDriverCode: globalDriverCode,
    setSelectedDriverCode: setGlobalDriverCode,
    triggerActionNotification,
  } = useRace();

  // Active validation circuit and driver (tied directly to global context)
  const selectedCircuitId = selectedCircuit?.id || 'bahrain';
  const selectedDriverCode = globalDriverCode || selectedDriver?.driverCode || 'SAI';

  const [activeChartTab, setActiveChartTab] = useState<
    'trajectory' | 'residuals' | 'degradation' | 'cliff' | 'interval' | 'comparison'
  >('trajectory');
  const [filterCompound, setFilterCompound] = useState<string>('ALL');

  const handleCircuitChange = (newCircuitId: string) => {
    setCircuitId(newCircuitId);
    triggerActionNotification(`Loaded blind validation replay: ${newCircuitId.toUpperCase()}`, 'info');
  };

  const handleDriverChange = (newDriverCode: string) => {
    setGlobalDriverCode(newDriverCode);
    triggerActionNotification(`Switched validation driver: #${newDriverCode}`, 'info');
  };

  // Run the blind chronological validation replay
  const validationResult = useMemo(() => {
    return runHistoricalRaceValidation(selectedCircuitId, selectedDriverCode);
  }, [selectedCircuitId, selectedDriverCode]);

  // Leave-One-Race-Out (LORO) Multi-Race Cross Validation
  const loroResults = useMemo(() => {
    return evaluateLeaveOneRaceOut();
  }, []);

  const { metrics, lapRecords, topFailureCases, measuredReplayLatencyMs } = validationResult;

  const filteredRecords = useMemo(() => {
    if (filterCompound === 'ALL') return lapRecords;
    return lapRecords.filter((r) => r.compound === filterCompound);
  }, [lapRecords, filterCompound]);

  // Chart coordinate helpers
  const minLap = 1;
  const maxLap = validationResult.totalLaps;
  const chartWidth = 780;
  const chartHeight = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };
  const plotW = chartWidth - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;

  const getX = (lap: number) => padding.left + ((lap - minLap) / Math.max(1, maxLap - minLap)) * plotW;

  // Trajectory SVG Bounds (dynamically computed from current race lap times)
  const validLapTimes = lapRecords.filter(r => !r.isExcluded && r.actualLapSeconds > 0).map(r => r.actualLapSeconds);
  const minTime = validLapTimes.length > 0 ? Math.floor(Math.min(...validLapTimes)) - 1.0 : 80.5;
  const maxTime = validLapTimes.length > 0 ? Math.ceil(Math.max(...validLapTimes)) + 1.0 : 85.5;
  const getYTime = (sec: number) => {
    const clamped = Math.max(minTime, Math.min(maxTime, sec));
    return padding.top + plotH - ((clamped - minTime) / (maxTime - minTime)) * plotH;
  };

  // Residual SVG Bounds (-0.4s to +1.6s)
  const minRes = -0.4;
  const maxRes = 1.6;
  const getYRes = (sec: number) => {
    const clamped = Math.max(minRes, Math.min(maxRes, sec));
    return padding.top + plotH - ((clamped - minRes) / (maxRes - minRes)) * plotH;
  };

  // Degradation SVG Bounds (0.00 to 0.16 s/lap)
  const minDeg = 0.0;
  const maxDeg = 0.16;
  const getYDeg = (rate: number) => {
    const clamped = Math.max(minDeg, Math.min(maxDeg, rate));
    return padding.top + plotH - ((clamped - minDeg) / (maxDeg - minDeg)) * plotH;
  };

  // Cliff Probability SVG Bounds (0 to 100%)
  const getYCliff = (pct: number) => padding.top + plotH - (pct / 100) * plotH;

  return (
    <div id="page-real-world-validation" className="space-y-6 pb-12 font-mono select-none">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1b2536] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[#00e5a3] font-bold tracking-widest uppercase">
              MODULE 09 // SCIENTIFIC RIGOR &amp; REPRODUCIBILITY
            </span>
            <span className="text-[10px] bg-[#0c2419] text-[#00e5a3] px-2 py-0.5 rounded border border-[#174836] font-bold">
              ZERO-LEAKAGE BLIND REPLAY
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            REAL-WORLD HISTORICAL RACE VALIDATION
          </h1>
          <p className="text-xs text-[#8ea2b8] mt-0.5">
            Pillar B: Chronological step-by-step validation on unseen historical Grand Prix data denied future information
          </p>
        </div>

        {/* Controls: Select Validation Circuit & Driver */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#0e1622] px-2.5 py-1.5 rounded border border-[#1b2838] flex items-center gap-2 text-xs">
            <span className="text-[#64798e] text-[10px]">UNSEEN RACE:</span>
            <select
              value={selectedCircuitId}
              onChange={(e) => handleCircuitChange(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              <option value="bahrain" className="bg-[#0e1622]">2024 Bahrain GP (Real FastF1 Telemetry - Unseen Test)</option>
              <option value="monza" className="bg-[#0e1622]">2024 Italian GP (Monza Replay)</option>
              <option value="silverstone" className="bg-[#0e1622]">2024 British GP (Silverstone)</option>
              <option value="spa" className="bg-[#0e1622]">2024 Belgian GP (Spa)</option>
            </select>
          </div>

          <div className="bg-[#0e1622] px-2.5 py-1.5 rounded border border-[#1b2838] flex items-center gap-2 text-xs">
            <span className="text-[#64798e] text-[10px]">DRIVER:</span>
            <select
              value={selectedDriverCode}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              <option value="SAI" className="bg-[#0e1622]">#55 Sainz (Ferrari - P3 Podium)</option>
              <option value="VER" className="bg-[#0e1622]">#01 Verstappen (Red Bull - P1)</option>
              <option value="LEC" className="bg-[#0e1622]">#16 Leclerc (Ferrari - P4)</option>
              <option value="NOR" className="bg-[#0e1622]">#04 Norris (McLaren - P6)</option>
              <option value="HAM" className="bg-[#0e1622]">#44 Hamilton (Mercedes)</option>
              <option value="PIA" className="bg-[#0e1622]">#81 Piastri (McLaren)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top 6 Dynamically Computed Validation Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Metric 1: Lap-Time MAE */}
        <div className="bg-[#0b1017] p-3 rounded border border-[#1b2536]">
          <div className="text-[10px] text-[#6b7d92] uppercase">LAP-TIME MAE</div>
          <div className="text-2xl font-black text-[#00e5a3] mt-1">{metrics.lapTimeMae.toFixed(3)}s</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Mean Absolute Error</div>
        </div>

        {/* Metric 2: Lap-Time RMSE */}
        <div className="bg-[#0b1017] p-3 rounded border border-[#1b2536]">
          <div className="text-[10px] text-[#6b7d92] uppercase">LAP-TIME RMSE</div>
          <div className="text-2xl font-black text-white mt-1">{metrics.lapTimeRmse.toFixed(3)}s</div>
          <div className="text-[10px] text-[#71849a] mt-0.5">Root Mean Squared</div>
        </div>

        {/* Metric 3: R-Squared */}
        <div className="bg-[#0b1017] p-3 rounded border border-[#1b2536]">
          <div className="text-[10px] text-[#6b7d92] uppercase">COEFF OF DETERM (R²)</div>
          <div className="text-2xl font-black text-[#38bdf8] mt-1">{metrics.rSquared.toFixed(3)}</div>
          <div className="text-[10px] text-cyan-400 mt-0.5">Variance Explained</div>
        </div>

        {/* Metric 4: Median Error */}
        <div className="bg-[#0b1017] p-3 rounded border border-[#1b2536]">
          <div className="text-[10px] text-[#6b7d92] uppercase">MEDIAN ABS ERROR</div>
          <div className="text-2xl font-black text-white mt-1">{metrics.medianAbsoluteError.toFixed(3)}s</div>
          <div className="text-[10px] text-[#71849a] mt-0.5">50th Percentile Error</div>
        </div>

        {/* Metric 5: Online Adaptation Gain */}
        <div className="bg-[#0b1017] p-3 rounded border border-[#1b2536]">
          <div className="text-[10px] text-[#6b7d92] uppercase">ONLINE KALMAN GAIN</div>
          <div className="text-2xl font-black text-[#00e5a3] mt-1">+{metrics.adaptiveImprovementPercent}%</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">vs Offline Model A ({metrics.offlineMae.toFixed(3)}s)</div>
        </div>

        {/* Metric 6: Cliff Prediction Error */}
        <div className="bg-[#0b1017] p-3 rounded border border-[#1b2536]">
          <div className="text-[10px] text-[#6b7d92] uppercase">CLIFF ERROR</div>
          <div className="text-2xl font-black text-amber-400 mt-1">±{metrics.cliffErrorLaps} LAP</div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">Pred L{metrics.predictedCliffLap} vs Obs L{metrics.observedCliffOnsetLap}</div>
        </div>
      </div>

      {/* Methodology Guarantee Alert Box */}
      <div className="bg-[#08121a] p-3.5 rounded border border-[#153448] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#00d2ff] shrink-0 mt-0.5" />
        <div className="text-xs text-[#8ea3bc] space-y-1">
          <strong className="text-white">Strict Anti-Leakage &amp; Chronological Isolation Protocol:</strong>
          <p>
            At each lap <span className="text-[#38bdf8] font-bold">N</span>, all future laps (&gt; N), future pit stops, stint lengths, and race outcomes are strictly inaccessible. Model A predicts using frozen offline weights; Model B incorporates recursive Bayesian state innovation. Ground truth is only revealed post-prediction to record residual error.
          </p>
        </div>
      </div>

      {/* Interactive Visualizations Container */}
      <div className="bg-[#0b1017] p-5 rounded border border-[#1b2536] space-y-4">
        {/* Chart Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#182333] gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveChartTab('trajectory')}
              className={`px-3 py-1.5 rounded font-bold transition-all ${
                activeChartTab === 'trajectory'
                  ? 'bg-[#16273c] text-[#38bdf8] border border-[#234267]'
                  : 'text-[#6b7d93] hover:text-white'
              }`}
            >
              1. PREDICTED VS ACTUAL LAP TIME
            </button>
            <button
              onClick={() => setActiveChartTab('residuals')}
              className={`px-3 py-1.5 rounded font-bold transition-all ${
                activeChartTab === 'residuals'
                  ? 'bg-[#16273c] text-[#38bdf8] border border-[#234267]'
                  : 'text-[#6b7d93] hover:text-white'
              }`}
            >
              2. LAP RESIDUAL ERRORS
            </button>
            <button
              onClick={() => setActiveChartTab('degradation')}
              className={`px-3 py-1.5 rounded font-bold transition-all ${
                activeChartTab === 'degradation'
                  ? 'bg-[#16273c] text-[#38bdf8] border border-[#234267]'
                  : 'text-[#6b7d93] hover:text-white'
              }`}
            >
              3. DEGRADATION RATE TRACE
            </button>
            <button
              onClick={() => setActiveChartTab('cliff')}
              className={`px-3 py-1.5 rounded font-bold transition-all ${
                activeChartTab === 'cliff'
                  ? 'bg-[#16273c] text-[#38bdf8] border border-[#234267]'
                  : 'text-[#6b7d93] hover:text-white'
              }`}
            >
              4. TYRE CLIFF PROBABILITY
            </button>
            <button
              onClick={() => setActiveChartTab('interval')}
              className={`px-3 py-1.5 rounded font-bold transition-all ${
                activeChartTab === 'interval'
                  ? 'bg-[#16273c] text-[#38bdf8] border border-[#234267]'
                  : 'text-[#6b7d93] hover:text-white'
              }`}
            >
              5. P10–P90 UNCERTAINTY RIBBON
            </button>
            <button
              onClick={() => setActiveChartTab('comparison')}
              className={`px-3 py-1.5 rounded font-bold transition-all ${
                activeChartTab === 'comparison'
                  ? 'bg-[#16273c] text-[#38bdf8] border border-[#234267]'
                  : 'text-[#6b7d93] hover:text-white'
              }`}
            >
              6. OFFLINE VS ADAPTIVE (MODEL A VS B)
            </button>
          </div>

          <span className="text-[10px] text-[#55677d] bg-[#0f1722] px-2 py-0.5 rounded border border-[#1b2636]">
            {validationResult.metrics.validLapsCount} Clean Laps • Replay: {measuredReplayLatencyMs} ms
          </span>
        </div>

        {/* Dynamic SVG Visualizer */}
        <div className="overflow-x-auto bg-[#070b10] p-3 rounded border border-[#162232]">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto min-w-[680px]">
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => (
              <line
                key={idx}
                x1={padding.left}
                y1={padding.top + frac * plotH}
                x2={chartWidth - padding.right}
                y2={padding.top + frac * plotH}
                stroke="#15202e"
                strokeDasharray="2,3"
              />
            ))}

            {/* TAB 1: PREDICTED VS ACTUAL LAP TIME */}
            {activeChartTab === 'trajectory' && (
              <>
                {/* Predicted trajectory curve (Model B Adaptive) */}
                <path
                  d={lapRecords
                    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(r.lapNumber).toFixed(1)} ${getYTime(r.predictedLapSeconds).toFixed(1)}`)
                    .join(' ')}
                  fill="none"
                  stroke="#00e5a3"
                  strokeWidth="2"
                />

                {/* Actual Lap Times (Points) */}
                {lapRecords.map((r) => (
                  <circle
                    key={r.lapNumber}
                    cx={getX(r.lapNumber)}
                    cy={getYTime(r.actualLapSeconds)}
                    r={r.isExcluded ? 2 : 2.5}
                    fill={r.isExcluded ? '#ff4b4b' : '#38bdf8'}
                    opacity={r.isExcluded ? 0.6 : 0.9}
                  />
                ))}
              </>
            )}

            {/* TAB 2: RESIDUAL ERRORS (BARS) */}
            {activeChartTab === 'residuals' && (
              <>
                <line
                  x1={padding.left}
                  y1={getYRes(0)}
                  x2={chartWidth - padding.right}
                  y2={getYRes(0)}
                  stroke="#55677d"
                  strokeWidth="1"
                />
                {lapRecords.map((r) => {
                  const x = getX(r.lapNumber);
                  const yZero = getYRes(0);
                  const yVal = getYRes(r.signedError);
                  const height = Math.abs(yVal - yZero);
                  const y = Math.min(yVal, yZero);
                  const color =
                    r.absoluteError < 0.1 ? '#00e5a3' : r.absoluteError < 0.25 ? '#eab308' : '#ff4b4b';

                  return (
                    <rect
                      key={r.lapNumber}
                      x={x - 2.5}
                      y={y}
                      width={5}
                      height={Math.max(1, height)}
                      fill={color}
                      opacity={0.85}
                    />
                  );
                })}
              </>
            )}

            {/* TAB 3: DEGRADATION RATE */}
            {activeChartTab === 'degradation' && (
              <>
                {/* Predicted Degradation Curve */}
                <path
                  d={lapRecords
                    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(r.lapNumber).toFixed(1)} ${getYDeg(r.predictedDegRate).toFixed(1)}`)
                    .join(' ')}
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2"
                />
                {/* Observed Degradation Points */}
                {lapRecords.map((r) => (
                  <circle
                    key={r.lapNumber}
                    cx={getX(r.lapNumber)}
                    cy={getYDeg(r.observedDegRate)}
                    r="2"
                    fill="#38bdf8"
                  />
                ))}
              </>
            )}

            {/* TAB 4: CLIFF PROBABILITY CURVE */}
            {activeChartTab === 'cliff' && (
              <>
                {/* 50% Threshold line */}
                <line
                  x1={padding.left}
                  y1={getYCliff(50)}
                  x2={chartWidth - padding.right}
                  y2={getYCliff(50)}
                  stroke="#ff4b4b"
                  strokeDasharray="4,4"
                  strokeWidth="1"
                />
                {/* Probability S-curve */}
                <path
                  d={lapRecords
                    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(r.lapNumber).toFixed(1)} ${getYCliff(r.cliffProbability).toFixed(1)}`)
                    .join(' ')}
                  fill="none"
                  stroke="#ff4b4b"
                  strokeWidth="2"
                />
              </>
            )}

            {/* TAB 5: P10-P90 UNCERTAINTY INTERVAL */}
            {activeChartTab === 'interval' && (
              <>
                {/* Shaded confidence ribbon */}
                <path
                  d={`M ${lapRecords.map((r) => `${getX(r.lapNumber).toFixed(1)} ${getYTime(r.p10LapSeconds).toFixed(1)}`).join(' L ')} L ${lapRecords
                    .slice()
                    .reverse()
                    .map((r) => `${getX(r.lapNumber).toFixed(1)} ${getYTime(r.p90LapSeconds).toFixed(1)}`)
                    .join(' L ')} Z`}
                  fill="#00e5a3"
                  fillOpacity="0.15"
                />
                {/* Actual laps plotted inside/outside */}
                {lapRecords.map((r) => (
                  <circle
                    key={r.lapNumber}
                    cx={getX(r.lapNumber)}
                    cy={getYTime(r.actualLapSeconds)}
                    r="2"
                    fill={r.insideInterval ? '#00e5a3' : '#ff4b4b'}
                  />
                ))}
              </>
            )}

            {/* TAB 6: OFFLINE MODEL A VS ADAPTIVE MODEL B */}
            {activeChartTab === 'comparison' && (
              <>
                {/* Model A (Offline) error path */}
                <path
                  d={lapRecords
                    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(r.lapNumber).toFixed(1)} ${getYRes(r.offlineAbsoluteError).toFixed(1)}`)
                    .join(' ')}
                  fill="none"
                  stroke="#ff4b4b"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />
                {/* Model B (Adaptive) error path */}
                <path
                  d={lapRecords
                    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(r.lapNumber).toFixed(1)} ${getYRes(r.absoluteError).toFixed(1)}`)
                    .join(' ')}
                  fill="none"
                  stroke="#00e5a3"
                  strokeWidth="2"
                />
              </>
            )}

            {/* Axis Labels */}
            <text x={padding.left} y={chartHeight - 10} fill="#55677d" fontSize="10">
              LAP 01
            </text>
            <text x={chartWidth / 2} y={chartHeight - 10} fill="#55677d" fontSize="10" textAnchor="middle">
              RACE PROGRESSION (LAPS)
            </text>
            <text x={chartWidth - padding.right} y={chartHeight - 10} fill="#55677d" fontSize="10" textAnchor="end">
              LAP {maxLap} [FINISH]
            </text>
          </svg>
        </div>

        {/* Visual Legend */}
        <div className="flex flex-wrap items-center justify-between text-[11px] pt-1 text-[#788ca2] gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
              <span>Observed Historical Telemetry</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#00e5a3] rounded" />
              <span>Model B (Adaptive Prediction)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#ff4b4b] border-t border-dashed" />
              <span>Model A (Offline Baseline)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 bg-[#00e5a3]/20 border border-[#00e5a3] rounded-xs" />
              <span>P10–P90 Prediction Interval ({metrics.predictionIntervalCoverage}% Coverage)</span>
            </span>
          </div>

          <span className="text-[10px] text-[#4b5e75]">
            Mean Signed Error (Bias): {metrics.meanSignedError > 0 ? '+' : ''}{metrics.meanSignedError.toFixed(3)}s
          </span>
        </div>
      </div>

      {/* Multi-Race Leave-One-Race-Out (LORO) Generalization Table */}
      <div className="bg-[#0b1017] p-5 rounded border border-[#1b2536] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#182333]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#38bdf8]" />
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              MULTI-RACE LEAVE-ONE-RACE-OUT (LORO) GENERALIZATION
            </h3>
          </div>
          <span className="text-[10px] text-[#00e5a3] font-bold">
            Average LORO Accuracy Improvement: +{loroResults.overallSummary.meanImprovementPercent}%
          </span>
        </div>

        <p className="text-xs text-[#8ea2b8] leading-relaxed">
          To prevent temporal and intra-race data leakage, models are evaluated by strictly withholding an entire race during calibration, then testing exclusively on the unseen circuit:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#182435] text-[#5a6c82] text-[10px] uppercase">
                <th className="py-2 px-3">EVALUATION FOLD</th>
                <th className="py-2 px-3">HELD-OUT UNSEEN RACE</th>
                <th className="py-2 px-3">TRAINING DATASET</th>
                <th className="py-2 px-3">OFFLINE MAE</th>
                <th className="py-2 px-3">ADAPTIVE MAE</th>
                <th className="py-2 px-3">RMSE</th>
                <th className="py-2 px-3">R²</th>
                <th className="py-2 px-3">ACCURACY GAIN</th>
                <th className="py-2 px-3">CLIFF ERROR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d2a]">
              {loroResults.folds.map((f, i) => (
                <tr key={i} className="hover:bg-[#0f1722]/50">
                  <td className="py-2.5 px-3 font-bold text-white">{f.foldId}</td>
                  <td className="py-2.5 px-3 text-[#38bdf8]">{f.heldOutCircuitName}</td>
                  <td className="py-2.5 px-3 text-[#788da4]">{f.trainingCircuits.join(', ').toUpperCase()}</td>
                  <td className="py-2.5 px-3 text-[#ff8f8f]">{f.offlineMae.toFixed(3)}s</td>
                  <td className="py-2.5 px-3 text-[#00e5a3] font-bold">{f.adaptiveMae.toFixed(3)}s</td>
                  <td className="py-2.5 px-3 text-white">{f.adaptiveRmse.toFixed(3)}s</td>
                  <td className="py-2.5 px-3 text-cyan-300">{f.adaptiveRSquared.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">+{f.improvementPercent}%</td>
                  <td className="py-2.5 px-3 text-amber-300">±{f.cliffErrorLaps} Laps</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 Failure Case Analysis (Largest Prediction Errors) */}
      <div className="bg-[#0b1017] p-5 rounded border border-[#1b2536] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#182333]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              TOP 10 FAILURE CASE ANALYSIS // RESIDUAL ERROR AUDIT
            </h3>
          </div>
          <span className="text-[10px] text-[#71849a]">Physical Root-Cause Attribution</span>
        </div>

        <p className="text-xs text-[#8ea2b8] leading-relaxed">
          Engineering transparency requires reporting where and why the model diverged. The 10 largest residual errors are classified below:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#182435] text-[#5a6c82] text-[10px] uppercase">
                <th className="py-2 px-3">RANK</th>
                <th className="py-2 px-3">LAP</th>
                <th className="py-2 px-3">COMPOUND</th>
                <th className="py-2 px-3">TYRE AGE</th>
                <th className="py-2 px-3">PREDICTED</th>
                <th className="py-2 px-3">ACTUAL</th>
                <th className="py-2 px-3">ERROR</th>
                <th className="py-2 px-3">DIAGNOSED REASON</th>
                <th className="py-2 px-3">TELEMETRY CONTEXT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d2a]">
              {topFailureCases.map((fc) => (
                <tr key={fc.rank} className="hover:bg-[#0f1722]/50">
                  <td className="py-2 px-3 font-bold text-[#eab308]">#{fc.rank}</td>
                  <td className="py-2 px-3 text-white font-bold">L{fc.lap}</td>
                  <td className="py-2 px-3 text-[#38bdf8]">{fc.compound}</td>
                  <td className="py-2 px-3 text-[#8ba0b5]">{fc.tyreAge} Laps</td>
                  <td className="py-2 px-3 text-[#00e5a3]">{fc.predictedTimeStr}</td>
                  <td className="py-2 px-3 text-white">{fc.actualTimeStr}</td>
                  <td className="py-2 px-3 text-[#ff4b4b] font-bold">+{fc.absoluteErrorSeconds.toFixed(3)}s</td>
                  <td className="py-2 px-3">
                    <span className="text-[10px] bg-[#1a1712] text-amber-300 px-2 py-0.5 rounded border border-[#42311b] font-bold">
                      {fc.diagnosedReason}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[#798ea6] text-[11px]">{fc.telemetryContext}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chronological Validation Data Table */}
      <div className="bg-[#0b1017] p-5 rounded border border-[#1b2536] space-y-3">
        <div className="flex flex-wrap items-center justify-between pb-2 border-b border-[#182333] gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#00e5a3]" />
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              CHRONOLOGICAL REPLAY DATA MATRIX ({filteredRecords.length} LAPS)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#55677d]">COMPOUND FILTER:</span>
            {['ALL', 'SOFT', 'MEDIUM', 'HARD'].map((comp) => (
              <button
                key={comp}
                onClick={() => setFilterCompound(comp)}
                className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                  filterCompound === comp
                    ? 'bg-[#152336] text-[#38bdf8] border-[#254063]'
                    : 'text-[#55677d] border-[#182332] hover:text-white'
                }`}
              >
                {comp}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#070b10] border-b border-[#182435] text-[#5a6c82] text-[10px] uppercase">
              <tr>
                <th className="py-2 px-3">LAP</th>
                <th className="py-2 px-3">TYRE</th>
                <th className="py-2 px-3">AGE</th>
                <th className="py-2 px-3">PREDICTED</th>
                <th className="py-2 px-3">ACTUAL</th>
                <th className="py-2 px-3">ERROR</th>
                <th className="py-2 px-3">PRED DEG</th>
                <th className="py-2 px-3">OBS DEG</th>
                <th className="py-2 px-3">P10 – P90 INTERVAL</th>
                <th className="py-2 px-3">CLIFF PROB</th>
                <th className="py-2 px-3">KALMAN GAIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d2a]">
              {filteredRecords.map((r) => {
                const pMin = Math.floor(r.predictedLapSeconds / 60);
                const pSec = (r.predictedLapSeconds % 60).toFixed(3);
                const aMin = Math.floor(r.actualLapSeconds / 60);
                const aSec = (r.actualLapSeconds % 60).toFixed(3);
                const p10Sec = (r.p10LapSeconds % 60).toFixed(2);
                const p90Sec = (r.p90LapSeconds % 60).toFixed(2);

                return (
                  <tr key={r.lapNumber} className="hover:bg-[#0f1722]/50 font-mono">
                    <td className="py-1.5 px-3 font-bold text-white">L{r.lapNumber}</td>
                    <td className="py-1.5 px-3 text-[#38bdf8]">{r.compound}</td>
                    <td className="py-1.5 px-3 text-[#788ca2]">{r.tyreAge}L</td>
                    <td className="py-1.5 px-3 text-[#00e5a3]">{`${pMin}:${Number(pSec) < 10 ? '0' : ''}${pSec}`}</td>
                    <td className="py-1.5 px-3 text-white">{`${aMin}:${Number(aSec) < 10 ? '0' : ''}${aSec}`}</td>
                    <td className="py-1.5 px-3 font-bold text-[#ff4b4b]">
                      +{r.absoluteError.toFixed(3)}s
                    </td>
                    <td className="py-1.5 px-3 text-[#eab308]">+{r.predictedDegRate.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-[#38bdf8]">+{r.observedDegRate.toFixed(3)}</td>
                    <td className="py-1.5 px-3 text-[#788ca2] text-[10px]">
                      [{p10Sec}s – {p90Sec}s]
                    </td>
                    <td className="py-1.5 px-3">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          r.cliffProbability >= 80
                            ? 'bg-red-950/60 text-red-400 border border-red-800'
                            : r.cliffProbability >= 50
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                            : 'text-[#64798e]'
                        }`}
                      >
                        {r.cliffProbability}%
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-cyan-300 text-[10px]">{r.kalmanGain.toFixed(3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data & Model Provenance Box */}
      <div className="bg-[#0b1017] p-4 rounded border border-[#1b2536] space-y-2 text-xs">
        <h4 className="text-white font-bold uppercase text-xs flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[#00d2ff]" />
          DATA &amp; MODEL PROVENANCE SPECIFICATION
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#080d14] p-2.5 rounded border border-[#162232]">
            <span className="text-[10px] text-[#00d2ff] font-bold block uppercase">DIRECTLY OBSERVED</span>
            <p className="text-[11px] text-[#788da3] mt-1">
              Public F1 timing and telemetry data (lap times, sector times, car speed, throttle, brake, gear, DRS, track and ambient weather).
            </p>
          </div>
          <div className="bg-[#080d14] p-2.5 rounded border border-[#162232]">
            <span className="text-[10px] text-[#00e5a3] font-bold block uppercase">DERIVED</span>
            <p className="text-[11px] text-[#788da3] mt-1">
              Calculated from available telemetry: fuel mass shed acceleration, track rubber evolution index, and dirty air wake interval.
            </p>
          </div>
          <div className="bg-[#080d14] p-2.5 rounded border border-[#162232]">
            <span className="text-[10px] text-amber-400 font-bold block uppercase">ESTIMATED</span>
            <p className="text-[11px] text-[#788da3] mt-1">
              Inferred by model: latent tyre wear state, P10/P50/P90 prediction intervals, and estimated critical cliff probability.
            </p>
          </div>
          <div className="bg-[#080d14] p-2.5 rounded border border-[#162232]">
            <span className="text-[10px] text-purple-400 font-bold block uppercase">SIMULATED</span>
            <p className="text-[11px] text-[#788da3] mt-1">
              Candidate pit strategies (Plan A, B, C), Monte Carlo race-time distributions, and traffic re-entry position buffers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
