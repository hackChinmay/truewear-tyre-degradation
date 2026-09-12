import React from 'react';
import { WheelTelemetry } from '../types';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TyreThermalCardProps {
  wheels: WheelTelemetry[];
}

export const TyreThermalCard: React.FC<TyreThermalCardProps> = ({ wheels }) => {
  return (
    <div id="tyre-thermal-section" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-xs font-bold text-white tracking-wider uppercase">
            4-CORNER TYRE THERMAL &amp; WEAR ESTIMATION
          </h3>
          <span className="text-[10px] font-mono text-[#4e5f73] bg-[#0f1622] px-2 py-0.5 rounded border border-[#1b2737]">
            DERIVED THERMAL MODEL • NOMINAL WINDOW: 95°C - 105°C
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#00e5a3] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a3]" />
          SIGNALS SYNCED
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {wheels.map((wheel) => {
          const isPeak = wheel.status === 'THERMAL PEAK' || wheel.surfaceTemp > 106;
          const isStress = wheel.status === 'MODERATE STRESS' || wheel.surfaceTemp > 103;

          const badgeBg = isPeak
            ? 'bg-[#291013] text-[#ff4b4b] border-[#5e1d24]'
            : isStress
            ? 'bg-[#2a1d0d] text-[#f59e0b] border-[#5e3e18]'
            : 'bg-[#0d1d17] text-[#00e5a3] border-[#184936]';

          return (
            <div
              key={wheel.corner}
              id={`wheel-telemetry-${wheel.corner.toLowerCase()}`}
              className={`p-3.5 rounded bg-[#0d131b] border font-mono transition-all ${
                isPeak
                  ? 'border-[#7a222b] shadow-sm shadow-red-950/30'
                  : 'border-[#1a2536] hover:border-[#27384f]'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#16202e] mb-2.5">
                <span className="font-bold text-xs text-[#e1e7ec]">
                  {wheel.corner} <span className="text-[#55677d]">{'// ' + (wheel.corner.startsWith('F') ? 'FRONT' : 'REAR')}</span>
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeBg}`}>
                  {wheel.status}
                </span>
              </div>

              {/* Surface & Carcass Temperatures */}
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <div className="text-[9px] text-[#55677d] uppercase tracking-wider">SURFACE TEMP</div>
                  <div className={`text-2xl font-black ${isPeak ? 'text-[#ff4b4b]' : 'text-white'}`}>
                    {wheel.surfaceTemp}°C
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-[#55677d] uppercase tracking-wider">CARCASS CORE</div>
                  <div className="text-sm font-bold text-[#8fa0b5]">{wheel.carcassTemp}°C</div>
                </div>
              </div>

              {/* Wear Progress Bar */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#55677d]">TYRE WEAR</span>
                  <span className={`font-bold ${wheel.wearPercent > 70 ? 'text-[#f59e0b]' : 'text-[#8fa0b5]'}`}>
                    {wheel.wearPercent}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#172231] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      wheel.wearPercent > 75
                        ? 'bg-gradient-to-r from-yellow-500 to-red-500'
                        : 'bg-gradient-to-r from-emerald-500 to-yellow-500'
                    }`}
                    style={{ width: `${wheel.wearPercent}%` }}
                  />
                </div>
              </div>

              {/* Sub-metrics */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-2 border-t border-[#16202e] text-[#718296]">
                <div>
                  <span>PRESSURE: </span>
                  <strong className="text-white">{wheel.pressure} PSI</strong>
                </div>
                <div className="text-right">
                  {wheel.corner === 'FR' ? (
                    <span className="text-[#ff4b4b] font-bold flex items-center justify-end gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      BLISTER: 38%
                    </span>
                  ) : (
                    <span className="text-[#00e5a3] font-semibold flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {wheel.tractionStatus || 'OPTIMAL'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
