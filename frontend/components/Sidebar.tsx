import React from 'react';
import { PageRoute } from '../types';
import { useRace } from '../context/RaceContext';
import {
  Activity,
  BarChart3,
  Cpu,
  FileText,
  Gauge,
  Layers,
  Radio,
  Sliders,
  Flame,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  id: PageRoute;
  number: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', number: '01', label: 'COMMAND CENTER', icon: Activity },
  { id: 'tyres', number: '02', label: 'TYRE INTELLIGENCE', icon: Flame },
  { id: 'strategy', number: '03', label: 'STRATEGY SIMULATOR', icon: Sliders },
  { id: 'live', number: '04', label: 'LIVE RACE MONITOR', icon: Radio },
  { id: 'stints', number: '05', label: 'STINT ANALYSIS', icon: Layers },
  { id: 'conditions', number: '06', label: 'TRACK & CONDITIONS', icon: Gauge },
  { id: 'reports', number: '07', label: 'REPORTS', icon: FileText },
  { id: 'model', number: '08', label: 'DATA & MODEL', icon: Cpu },
];

export const Sidebar: React.FC = () => {
  const { currentRoute, navigateTo, dataProvider, providerStatus } = useRace();

  const isFastF1Online = providerStatus?.status === 'ONLINE' || !dataProvider.isDemo;

  return (
    <aside
      id="sidebar-navigation"
      className="w-64 shrink-0 bg-[#090d13] border-r border-[#1b2432] flex flex-col h-screen sticky top-0 z-30 select-none"
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1b2432] bg-[#0b1017]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-[#ff2a2a] to-[#b91c1c] flex items-center justify-center shadow-lg shadow-red-950/40 border border-red-500/30">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-mono font-extrabold text-base tracking-wider text-white flex items-center gap-1.5">
              <span>TRUEWEAR</span>
            </div>
            <div className="text-[10px] font-mono tracking-widest text-[#7a889b] uppercase">
              PIT WALL // RACE ENGINEERING
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Nodes Subtitle */}
      <div className="px-5 pt-4 pb-2">
        <div className="text-[10px] font-mono tracking-widest text-[#52637a] uppercase font-semibold">
          TELEMETRY NODES
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-1">
        {NAV_ITEMS.map((item) => {
          const isActive = currentRoute === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              data-route={`/${item.id}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => navigateTo(item.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-sm flex items-center gap-3 transition-all font-mono group relative ${
                isActive
                  ? 'bg-[#151e2b] text-white border-l-2 border-[#ff2a2a] shadow-sm'
                  : 'text-[#8899ac] hover:bg-[#0f1622] hover:text-[#d1dce7]'
              }`}
            >
              <span
                className={`text-[11px] font-bold tracking-wider ${
                  isActive ? 'text-[#ff2a2a]' : 'text-[#48566a] group-hover:text-[#718296]'
                }`}
              >
                {item.number}
              </span>
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-[#ff2a2a]' : 'text-[#5d6f85] group-hover:text-[#94a3b8]'
                }`}
              />
              <span className="text-xs font-semibold tracking-wide flex-1 truncate">
                {item.label}
              </span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#ff2a2a] animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status / Data Pipeline Box */}
      <div className="p-3.5 m-3 rounded bg-[#0b1017] border border-[#1b2535] text-[11px] font-mono space-y-1.5">
        <div className="flex items-center justify-between text-[#5c6e84] font-semibold text-[10px] uppercase tracking-wider">
          <span>DATA PIPELINE</span>
          <ShieldCheck className="w-3.5 h-3.5 text-[#00e5a3]" />
        </div>
        <div className="flex items-center justify-between text-[#94a3b8]">
          <span>DATA SOURCE:</span>
          <span className="text-[#38bdf8] font-bold text-[10px]">
            {isFastF1Online ? 'FASTF1 REAL DATA' : 'FASTF1 LIVE PIPELINE'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[#94a3b8]">
          <span>MODEL:</span>
          <span className="text-[#00e5a3] font-bold">READY</span>
        </div>
        <div className="flex items-center justify-between text-[#94a3b8]">
          <span>PIPELINE:</span>
          <span className="text-[#00e5a3] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a3] inline-block animate-pulse" />
            CONNECTED
          </span>
        </div>
        <div className="text-[10px] text-[#55667c] pt-1 border-t border-[#182230] flex justify-between">
          <span>FEATURES: 36</span>
          <span>{isFastF1Online ? 'UPDATE: FASTF1 LIVE' : 'UPDATE: LIVE SYNC'}</span>
        </div>
        <div className="text-[9px] text-[#425265] text-center pt-0.5 tracking-tighter">
          FIA TELEMETRY &amp; PHYSICS ENGINE
        </div>
      </div>
    </aside>
  );
};
