/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { RaceProvider, useRace } from './context/RaceContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CommandCenter } from './pages/CommandCenter';
import { TyreIntelligence } from './pages/TyreIntelligence';
import { StrategySimulator } from './pages/StrategySimulator';
import { LiveRaceMonitor } from './pages/LiveRaceMonitor';
import { StintAnalysis } from './pages/StintAnalysis';
import { TrackConditions } from './pages/TrackConditions';
import { Reports } from './pages/Reports';
import { ModelDiagnostics } from './pages/ModelDiagnostics';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentRoute, notification } = useRace();

  // Ensure scroll-to-top whenever the active page changes
  useEffect(() => {
    const mainContainer = document.getElementById('main-scrollable-content');
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentRoute]);

  const renderActivePage = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <CommandCenter />;
      case 'tyres':
        return <TyreIntelligence />;
      case 'strategy':
        return <StrategySimulator />;
      case 'live':
        return <LiveRaceMonitor />;
      case 'stints':
        return <StintAnalysis />;
      case 'conditions':
        return <TrackConditions />;
      case 'reports':
        return <Reports />;
      case 'model':
        return <ModelDiagnostics />;
      default:
        return <CommandCenter />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070b10] text-[#e1e7ec] antialiased select-none font-mono">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Sticky Top Bar */}
        <TopBar />

        {/* Global Action Notification Toast */}
        {notification && (
          <div
            className={`mx-6 mt-3 px-4 py-2.5 rounded border text-xs flex items-center gap-2.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 z-50 ${
              notification.type === 'success'
                ? 'bg-[#0a2318] border-[#185c3b] text-[#00e5a3]'
                : notification.type === 'warning'
                ? 'bg-[#291807] border-[#6b4112] text-amber-400'
                : 'bg-[#0e1d2e] border-[#1f4268] text-[#38bdf8]'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : notification.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <Info className="w-4 h-4 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
        )}

        {/* Vertically Scrollable Content Pane */}
        <main
          id="main-scrollable-content"
          className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-[#1e2a3a] scrollbar-track-transparent"
        >
          <div className="max-w-[1600px] mx-auto">{renderActivePage()}</div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <RaceProvider>
      <AppContent />
    </RaceProvider>
  );
}
