import React, { useState, useEffect } from 'react';
import { useRace } from '../context/RaceContext';
import { ReportItem } from '../types';
import { CIRCUITS } from '../data/mockRaceData';
import {
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  Filter,
  Plus,
  Printer,
  Search,
  Sliders,
  Sparkles,
  X,
  Maximize2,
  ExternalLink,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const {
    reports,
    addReport,
    selectedDriver,
    setSelectedDriverCode,
    selectedCircuit,
    setCircuitId,
    selectedSession,
    weatherState,
    drivers,
    triggerActionNotification,
  } = useRace();

  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || 'rpt-1');
  const [isDossierModalOpen, setIsDossierModalOpen] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Report Generator Form State
  const [genGp, setGenGp] = useState<string>(`${selectedCircuit?.name || 'Monza'} Grand Prix`);
  const [genType, setGenType] = useState<ReportItem['type']>('FULL_RACE');
  const [genDriver, setGenDriver] = useState<string>(
    selectedDriver ? `${selectedDriver.driverName} (#${selectedDriver.driverNumber})` : 'C. Leclerc (#16)'
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Sync with global circuit
  useEffect(() => {
    if (selectedCircuit) {
      setGenGp(`${selectedCircuit.name} Grand Prix`);
    }
  }, [selectedCircuit?.name]);

  // Sync with global selected driver
  useEffect(() => {
    if (selectedDriver) {
      setGenDriver(`${selectedDriver.driverName} (#${selectedDriver.driverNumber})`);
    }
  }, [selectedDriver?.driverCode, selectedDriver?.driverName, selectedDriver?.driverNumber]);

  const filteredReports = reports.filter((r) => {
    const matchesFilter =
      activeFilter === 'ALL' ||
      (activeFilter === 'FULL_RACE' && r.type === 'FULL_RACE') ||
      (activeFilter === 'TYRE_DEG' && r.type === 'TYRE_DEG') ||
      (activeFilter === 'STRATEGY' && r.type === 'STRATEGY');

    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reportCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.driver.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      const newCodeNum = Math.floor(10 + Math.random() * 90);
      const matchedDriver =
        drivers.find(
          (d) =>
            genDriver.includes(d.driverName) ||
            genDriver.includes(d.driverCode) ||
            genDriver.includes(String(d.driverNumber))
        ) || selectedDriver;

      const newReport: ReportItem = {
        id: `rpt-gen-${Date.now()}`,
        reportCode: `#RPT-${selectedCircuit.id.toUpperCase().slice(0, 3)}-0926-${newCodeNum}`,
        title: `${genGp.toUpperCase()} // ${genType.replace('_', ' ')} PERFORMANCE AUDIT`,
        grandPrix: genGp,
        circuit: selectedCircuit.name,
        session: `${selectedSession} Session (FastF1 Data Sync)`,
        driver: matchedDriver.driverName,
        driverNumber: `#${matchedDriver.driverNumber}`,
        type: genType,
        dateStr: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        status: 'READY',
        recommendedPitWindow: matchedDriver.estPitWindow,
        estDegradation: `+${matchedDriver.degRatePerLap.toFixed(3)} s/lap`,
        confidence: 93,
        netRaceTimeGain: matchedDriver.compound === 'SOFT' ? '+3.4 SEC' : '+2.8 SEC',
        summary: `Automated race strategy & tyre degradation report compiled for #${matchedDriver.driverNumber} ${matchedDriver.driverName} at ${selectedCircuit.name}. Multi-variate confounding factors decoupled with physics degradation estimation.`,
        sections: {
          tyreAnalysis: {
            wearRate: matchedDriver.compound === 'SOFT' ? '0.038 mm/lap' : '0.024 mm/lap',
            thermalHysteresis: `${selectedCircuit.name} High-G Lateral Peak`,
            blisteringIndex: `${(10 + matchedDriver.tyreAge * 0.4).toFixed(1)}%`,
            carcassCoreTemp: matchedDriver.compound === 'SOFT' ? '112°C' : '105°C',
          },
          strategyAnalysis: {
            undercutVulnerability: 'PROTECTED (+11.2s gap)',
            overcutDelta: '+1.3s Deficit',
            trafficExitCleanAir: '94% Probability',
            expectedPositionReentry: `P${matchedDriver.position}`,
          },
          trackConditions: {
            surfaceGripEvolution: '+0.0024 index/lap',
            trackTempDelta: `${weatherState.trackTemp.toFixed(1)}°C Peak`,
            rubberingIn: `${(1.0 + (weatherState.trackTemp / 100) * 0.1).toFixed(3)}μ`,
            wind: `${weatherState.windSpeed.toFixed(1)} km/h ${weatherState.windDirection || 'NE'}`,
          },
          modelPerformance: {
            mae: '0.084s',
            rmse: '0.117s',
            fiaSync: 'FastF1 Public Data',
            inferenceLatency: '< 10ms',
          },
        },
      };

      addReport(newReport);
      setSelectedReportId(newReport.id);
      setIsDossierModalOpen(true);
      setIsGenerating(false);
      triggerActionNotification(
        `Generated race report for #${matchedDriver.driverNumber} ${matchedDriver.driverName}: ${newReport.reportCode}`,
        'success'
      );
      setTimeout(() => {
        document.getElementById('selected-report-dossier')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 500);
  };

  const handleOpenDossier = (reportId: string) => {
    setSelectedReportId(reportId);
    setIsDossierModalOpen(true);
    setTimeout(() => {
      document.getElementById('selected-report-dossier')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDownloadPDF = () => {
    window.print();
    triggerActionNotification('Printing or exporting report to PDF.', 'info');
  };

  const handleExportCSV = () => {
    if (!selectedReport) return;
    const csv = `ReportCode,Title,GrandPrix,Driver,Date,PitWindow,EstDegradation,Confidence,NetGain
"${selectedReport.reportCode}","${selectedReport.title}","${selectedReport.grandPrix}","${selectedReport.driver}","${selectedReport.dateStr}","${selectedReport.recommendedPitWindow}","${selectedReport.estDegradation}","${selectedReport.confidence}%","${selectedReport.netRaceTimeGain}"`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport.reportCode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerActionNotification(`Exported CSV for ${selectedReport.reportCode}`, 'success');
  };

  return (
    <div id="page-reports" className="space-y-6 pb-12 font-mono">
      {/* Header Banner */}
      <div id="reports-page-header" className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1b2536] pb-4 no-print">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] text-[#ff2a2a] font-bold tracking-widest uppercase">
              MODULE 07 // REPORTS
            </span>
            <span className="text-[10px] bg-[#162335] text-[#38bdf8] px-2 py-0.5 rounded border border-[#233852]">
              PROCESSED DATA STREAM
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">RACE REPORTS</h1>
          <p className="text-xs text-[#8fa1b6] mt-0.5">
            Generate, audit, and export TrueWear race engineering dossiers and strategy debriefs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="bg-[#121c2a] hover:bg-[#1a273a] text-[#8fa2b8] hover:text-white px-3 py-1.5 rounded border border-[#23344b] text-xs flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT / SAVE PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-[#ff2a2a] hover:bg-[#e02424] text-white px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Report Generator Panel */}
      <form
        id="report-generator-form"
        onSubmit={handleGenerateReport}
        className="bg-[#0b1017] p-4 rounded border border-[#1b2536] space-y-3 no-print"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#182333]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ff2a2a]" />
            <h3 className="text-xs font-bold text-white tracking-wider uppercase">
              REPORT GENERATOR // CONFIGURATION PANEL
            </h3>
          </div>
          <span className="text-[10px] text-[#55677d]">AUTOMATED RACE STRATEGY DIGEST</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] text-[#55677d] block mb-1">GRAND PRIX</label>
            <select
              value={genGp}
              onChange={(e) => {
                setGenGp(e.target.value);
                const foundCircuit = Object.values(CIRCUITS).find((c) =>
                  e.target.value.toLowerCase().includes(c.name.toLowerCase())
                );
                if (foundCircuit) setCircuitId(foundCircuit.id);
              }}
              className="w-full bg-[#101722] text-white p-2 rounded border border-[#1d2737] outline-none cursor-pointer"
            >
              {Object.values(CIRCUITS).map((c) => (
                <option key={c.id} value={`${c.name} Grand Prix`}>
                  {c.name} Grand Prix 2026 ({c.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#55677d] block mb-1">ANALYSIS TYPE</label>
            <select
              value={genType}
              onChange={(e) => setGenType(e.target.value as any)}
              className="w-full bg-[#101722] text-white p-2 rounded border border-[#1d2737] outline-none cursor-pointer"
            >
              <option value="FULL_RACE">Full Race Analysis</option>
              <option value="TYRE_DEG">Tyre Degradation Focus</option>
              <option value="STRATEGY">Pit Strategy &amp; Windows</option>
              <option value="STINT">Stint Breakdown</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#55677d] block mb-1">CHASSIS &amp; DRIVER</label>
            <select
              value={genDriver}
              onChange={(e) => {
                setGenDriver(e.target.value);
                const foundDriver = drivers.find(
                  (d) =>
                    e.target.value.includes(d.driverName) ||
                    e.target.value.includes(d.driverCode) ||
                    e.target.value.includes(String(d.driverNumber))
                );
                if (foundDriver) setSelectedDriverCode(foundDriver.driverCode);
              }}
              className="w-full bg-[#101722] text-white p-2 rounded border border-[#1d2737] outline-none cursor-pointer"
            >
              {drivers.map((d) => (
                <option key={d.driverCode} value={`${d.driverName} (#${d.driverNumber})`}>
                  {d.driverName} (#{d.driverNumber}) - P{d.position} ({d.compound})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full bg-[#ff2a2a] hover:bg-[#e02424] text-white py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'COMPILING REPORT...' : 'GENERATE REPORT'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 text-[10px] text-[#61748a] flex flex-wrap gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" defaultChecked className="accent-[#ff2a2a]" />
            <span>Confounding Factor Correction</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" defaultChecked className="accent-[#ff2a2a]" />
            <span>FastF1 Public Telemetry Verification</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" defaultChecked className="accent-[#ff2a2a]" />
            <span>Neural Wear Correlation</span>
          </label>
        </div>
      </form>

      {/* Reports Audit Table & Filter */}
      <div id="reports-audit-table" className="bg-[#0b1017] p-4 rounded border border-[#1b2536] space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {['ALL', 'FULL_RACE', 'TYRE_DEG', 'STRATEGY'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-2.5 py-1 rounded font-bold text-[10px] transition-all ${
                  activeFilter === tab
                    ? 'bg-[#ff2a2a] text-white'
                    : 'bg-[#101722] text-[#8ea2b8] hover:text-white'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-[#55677d] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search reports or driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#101722] text-white text-xs pl-8 pr-3 py-1.5 rounded border border-[#1b2536] outline-none placeholder-[#4f6074]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#182435] text-[#5a6c82] text-[10px] uppercase">
                <th className="py-2 px-3">REPORT CODE</th>
                <th className="py-2 px-3">REPORT TITLE</th>
                <th className="py-2 px-3">GRAND PRIX</th>
                <th className="py-2 px-3">DRIVER</th>
                <th className="py-2 px-3">TYPE</th>
                <th className="py-2 px-3">DATE</th>
                <th className="py-2 px-3">STATUS</th>
                <th className="py-2 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d2b]">
              {filteredReports.map((r) => {
                const isSelected = r.id === selectedReportId;
                return (
                  <tr
                    key={r.id}
                    onClick={() => handleOpenDossier(r.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#141f2d] text-white font-bold border-l-2 border-[#ff2a2a]'
                        : 'text-[#8da0b6] hover:bg-[#0e141f]'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-[#38bdf8] font-bold">{r.reportCode}</td>
                    <td className="py-2.5 px-3 text-white truncate max-w-xs">{r.title}</td>
                    <td className="py-2.5 px-3">{r.grandPrix}</td>
                    <td className="py-2.5 px-3">{r.driver}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[9px] bg-[#121b27] px-1.5 py-0.5 rounded border border-[#1e2d40]">
                        {r.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#55677d]">{r.dateStr.split(' ')[0]}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDossier(r.id);
                        }}
                        className="text-[#00d2ff] hover:text-cyan-300 hover:underline text-[11px] font-bold inline-flex items-center gap-1 bg-[#101b2b] hover:bg-[#16273d] px-2.5 py-1 rounded border border-[#1e344e] transition-all ml-auto"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>VIEW DOSSIER</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Report Dossier Preview */}
      {selectedReport && (
        <div
          id="selected-report-dossier"
          className="bg-[#0b1017] p-5 rounded border border-[#1f2f44] space-y-4 printable-dossier"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#182638]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-[#00d2ff]">{selectedReport.reportCode}</span>
                <span className="text-[10px] bg-[#10241b] text-[#00e5a3] px-2 py-0.5 rounded border border-[#174836] font-bold">
                  FASTF1 VERIFIED
                </span>
                <span className="text-[10px] bg-[#1f1624] text-[#d946ef] px-2 py-0.5 rounded border border-[#3b1c47] font-bold">
                  {selectedReport.type.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-base font-black text-white">{selectedReport.title}</h2>
              <p className="text-[11px] text-[#71849a] mt-0.5">
                {selectedReport.grandPrix} • Chassis #{selectedReport.driverNumber} ({selectedReport.driver}) •
                Session: {selectedReport.session} • {selectedReport.dateStr}
              </p>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                onClick={() => setIsDossierModalOpen(true)}
                className="bg-[#162232] hover:bg-[#203147] text-[#38bdf8] px-3 py-1.5 rounded border border-[#233f5d] text-xs flex items-center gap-1.5 font-bold transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>EXPAND MODAL</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-[#101722] hover:bg-[#182335] text-white px-3 py-1.5 rounded border border-[#223145] text-xs flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-[#ff2a2a]" />
                <span>PRINT / SAVE PDF</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-[#101722] hover:bg-[#182335] text-white px-3 py-1.5 rounded border border-[#223145] text-xs flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Dossier Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#0d131c] p-3 rounded border border-[#192435]">
              <span className="text-[#55677d] text-[10px] block font-bold">RECOMMENDED PIT WINDOW</span>
              <strong className="text-emerald-400 text-base font-bold">
                {selectedReport.recommendedPitWindow}
              </strong>
              <span className="text-[9px] text-[#718398] block mt-0.5">Target Lap: 38</span>
            </div>

            <div className="bg-[#0d131c] p-3 rounded border border-[#192435]">
              <span className="text-[#55677d] text-[10px] block font-bold">ESTIMATED DEGRADATION</span>
              <strong className="text-yellow-400 text-base font-bold">
                {selectedReport.estDegradation}
              </strong>
              <span className="text-[9px] text-[#718398] block mt-0.5">Decoupled mechanical</span>
            </div>

            <div className="bg-[#0d131c] p-3 rounded border border-[#192435]">
              <span className="text-[#55677d] text-[10px] block font-bold">STRATEGY CONFIDENCE</span>
              <strong className="text-[#00d2ff] text-base font-bold">{selectedReport.confidence}%</strong>
              <span className="text-[9px] text-[#718398] block mt-0.5">Monte Carlo validated</span>
            </div>

            <div className="bg-[#0d131c] p-3 rounded border border-[#192435]">
              <span className="text-[#55677d] text-[10px] block font-bold">EXPECTED RACE-TIME GAIN</span>
              <strong className="text-white text-base font-bold">
                {selectedReport.netRaceTimeGain}
              </strong>
              <span className="text-[9px] text-[#718398] block mt-0.5">Clear air projection</span>
            </div>
          </div>

          <p className="text-xs text-[#9cb0c5] bg-[#070d14] p-3 rounded border border-[#141e2c] leading-relaxed">
            {selectedReport.summary}
          </p>

          {/* Detailed Sections (A, B, C, D) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#090f17] p-3 rounded border border-[#152030] space-y-1.5">
              <h4 className="text-[11px] font-bold pb-1 text-[#ff8f8f] border-b border-[#152030]">
                SECTION A: TYRE WEAR
              </h4>
              <div className="text-[10px] text-[#718398]">
                Wear Rate: <strong className="text-white">{selectedReport.sections.tyreAnalysis.wearRate}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                Hysteresis: <strong className="text-white">{selectedReport.sections.tyreAnalysis.thermalHysteresis}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                Blister Index: <strong className="text-white">{selectedReport.sections.tyreAnalysis.blisteringIndex}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                Carcass Temp: <strong className="text-white">{selectedReport.sections.tyreAnalysis.carcassCoreTemp}</strong>
              </div>
            </div>

            <div className="bg-[#090f17] p-3 rounded border border-[#152030] space-y-1.5">
              <h4 className="text-[11px] font-bold pb-1 text-emerald-400 border-b border-[#152030]">
                SECTION B: STRATEGY
              </h4>
              <div className="text-[10px] text-[#718398]">
                Undercut Risk: <strong className="text-white">{selectedReport.sections.strategyAnalysis.undercutVulnerability}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                Overcut Delta: <strong className="text-white">{selectedReport.sections.strategyAnalysis.overcutDelta}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                Traffic Exit: <strong className="text-white">{selectedReport.sections.strategyAnalysis.trafficExitCleanAir}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                Re-entry Pos: <strong className="text-white">{selectedReport.sections.strategyAnalysis.expectedPositionReentry}</strong>
              </div>
            </div>

            <div className="bg-[#090f17] p-3 rounded border border-[#152030] space-y-1.5">
              <h4 className="text-[11px] font-bold pb-1 text-amber-400 border-b border-[#152030]">
                SECTION C: CONDITIONS
              </h4>
              <div className="text-[10px] text-[#718398]">
                Grip Evolution: <strong className="text-white">{selectedReport.sections.trackConditions.surfaceGripEvolution}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                Track Temp: <strong className="text-white">{selectedReport.sections.trackConditions.trackTempDelta}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                Rubbering: <strong className="text-white">{selectedReport.sections.trackConditions.rubberingIn}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                Wind: <strong className="text-white">{selectedReport.sections.trackConditions.wind}</strong>
              </div>
            </div>

            <div className="bg-[#090f17] p-3 rounded border border-[#152030] space-y-1.5">
              <h4 className="text-[11px] font-bold pb-1 text-[#00d2ff] border-b border-[#152030]">
                SECTION D: MODEL DIAGNOSTICS
              </h4>
              <div className="text-[10px] text-[#718398]">
                MAE: <strong className="text-white">{selectedReport.sections.modelPerformance.mae}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                RMSE: <strong className="text-white">{selectedReport.sections.modelPerformance.rmse}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                FIA Sync: <strong className="text-white">{selectedReport.sections.modelPerformance.fiaSync}</strong>
              </div>
              <div className="text-[10px] text-[#718398]">
                Latency: <strong className="text-white">{selectedReport.sections.modelPerformance.inferenceLatency}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Dossier Modal Dialog */}
      {isDossierModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm no-print">
          <div className="bg-[#0b1017] border border-[#24354c] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#182638] bg-[#0e1520] sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#ff2a2a]" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#00d2ff]">{selectedReport.reportCode}</span>
                    <span className="text-[10px] bg-[#10241b] text-[#00e5a3] px-2 py-0.5 rounded border border-[#174836] font-bold">
                      FASTF1 LIVE VERIFIED
                    </span>
                    <span className="text-[10px] bg-[#221711] text-[#f97316] px-2 py-0.5 rounded border border-[#442718] font-bold">
                      {selectedReport.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white mt-0.5">{selectedReport.title}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="bg-[#152233] hover:bg-[#1e3048] text-[#93c5fd] hover:text-white px-3 py-1.5 rounded border border-[#253e5e] text-xs flex items-center gap-1.5 transition-all font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PRINT / SAVE PDF</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="bg-[#152233] hover:bg-[#1e3048] text-[#8fa2b8] hover:text-white px-3 py-1.5 rounded border border-[#23344b] text-xs flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => setIsDossierModalOpen(false)}
                  className="p-1.5 text-[#8fa2b8] hover:text-white hover:bg-[#1c2738] rounded-lg transition-colors ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between text-xs text-[#8da1b7] border-b border-[#182333] pb-3 gap-2">
                <div>
                  <span className="text-[#55677d]">GRAND PRIX:</span>{' '}
                  <strong className="text-white">{selectedReport.grandPrix}</strong>
                </div>
                <div>
                  <span className="text-[#55677d]">DRIVER &amp; CAR:</span>{' '}
                  <strong className="text-white">#{selectedReport.driverNumber} {selectedReport.driver}</strong>
                </div>
                <div>
                  <span className="text-[#55677d]">SESSION:</span>{' '}
                  <strong className="text-white">{selectedReport.session}</strong>
                </div>
                <div>
                  <span className="text-[#55677d]">TIMESTAMP:</span>{' '}
                  <strong className="text-white">{selectedReport.dateStr}</strong>
                </div>
              </div>

              {/* Key Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#0d141e] p-3.5 rounded border border-[#1d2d42]">
                  <span className="text-[#657a94] text-[10px] block font-bold">RECOMMENDED PIT WINDOW</span>
                  <strong className="text-emerald-400 text-lg font-black block mt-0.5">
                    {selectedReport.recommendedPitWindow}
                  </strong>
                  <span className="text-[10px] text-[#7d91a8]">Optimal undercut window</span>
                </div>

                <div className="bg-[#0d141e] p-3.5 rounded border border-[#1d2d42]">
                  <span className="text-[#657a94] text-[10px] block font-bold">ESTIMATED DEGRADATION</span>
                  <strong className="text-amber-400 text-lg font-black block mt-0.5">
                    {selectedReport.estDegradation}
                  </strong>
                  <span className="text-[10px] text-[#7d91a8]">Thermal &amp; mechanical loss</span>
                </div>

                <div className="bg-[#0d141e] p-3.5 rounded border border-[#1d2d42]">
                  <span className="text-[#657a94] text-[10px] block font-bold">STRATEGY CONFIDENCE</span>
                  <strong className="text-[#38bdf8] text-lg font-black block mt-0.5">
                    {selectedReport.confidence}%
                  </strong>
                  <span className="text-[10px] text-[#7d91a8]">Monte Carlo validated</span>
                </div>

                <div className="bg-[#0d141e] p-3.5 rounded border border-[#1d2d42]">
                  <span className="text-[#657a94] text-[10px] block font-bold">NET RACE TIME GAIN</span>
                  <strong className="text-white text-lg font-black block mt-0.5">
                    {selectedReport.netRaceTimeGain}
                  </strong>
                  <span className="text-[10px] text-[#7d91a8]">Clean air projection</span>
                </div>
              </div>

              {/* Executive Summary */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff2a2a]" />
                  <span>AI STRATEGY &amp; DEGRADATION EXECUTIVE SUMMARY</span>
                </h4>
                <div className="p-4 bg-[#070d14] rounded-lg border border-[#182536] text-xs text-[#a3b6cc] leading-relaxed">
                  {selectedReport.summary}
                </div>
              </div>

              {/* Detailed Breakdown Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Section A */}
                <div className="bg-[#080e16] p-4 rounded-lg border border-[#1a283b] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1b2a3d] pb-2">
                    <h5 className="font-bold text-[#ff6b6b]">SECTION A // TYRE WEAR DYNAMICS</h5>
                    <span className="text-[10px] text-[#5b7088]">PHYSICAL + ML</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Wear Rate</span>
                      <strong className="text-white">{selectedReport.sections.tyreAnalysis.wearRate}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Thermal Hysteresis</span>
                      <strong className="text-white">{selectedReport.sections.tyreAnalysis.thermalHysteresis}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Blistering Index</span>
                      <strong className="text-white">{selectedReport.sections.tyreAnalysis.blisteringIndex}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Carcass Core Temp</span>
                      <strong className="text-white">{selectedReport.sections.tyreAnalysis.carcassCoreTemp}</strong>
                    </div>
                  </div>
                </div>

                {/* Section B */}
                <div className="bg-[#080e16] p-4 rounded-lg border border-[#1a283b] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1b2a3d] pb-2">
                    <h5 className="font-bold text-emerald-400">SECTION B // PIT STRATEGY &amp; DELTAS</h5>
                    <span className="text-[10px] text-[#5b7088]">PIT WALL TELEMETRY</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Undercut Vulnerability</span>
                      <strong className="text-white">{selectedReport.sections.strategyAnalysis.undercutVulnerability}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Overcut Delta</span>
                      <strong className="text-white">{selectedReport.sections.strategyAnalysis.overcutDelta}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Traffic Exit Clean Air</span>
                      <strong className="text-white">{selectedReport.sections.strategyAnalysis.trafficExitCleanAir}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Re-entry Track Position</span>
                      <strong className="text-white">{selectedReport.sections.strategyAnalysis.expectedPositionReentry}</strong>
                    </div>
                  </div>
                </div>

                {/* Section C */}
                <div className="bg-[#080e16] p-4 rounded-lg border border-[#1a283b] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1b2a3d] pb-2">
                    <h5 className="font-bold text-amber-400">SECTION C // TRACK CONDITIONS</h5>
                    <span className="text-[10px] text-[#5b7088]">MICRO-CLIMATE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Surface Grip Evolution</span>
                      <strong className="text-white">{selectedReport.sections.trackConditions.surfaceGripEvolution}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Track Temp Delta</span>
                      <strong className="text-white">{selectedReport.sections.trackConditions.trackTempDelta}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Rubbering In Index</span>
                      <strong className="text-white">{selectedReport.sections.trackConditions.rubberingIn}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Trackside Wind</span>
                      <strong className="text-white">{selectedReport.sections.trackConditions.wind}</strong>
                    </div>
                  </div>
                </div>

                {/* Section D */}
                <div className="bg-[#080e16] p-4 rounded-lg border border-[#1a283b] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#1b2a3d] pb-2">
                    <h5 className="font-bold text-[#38bdf8]">SECTION D // MODEL DIAGNOSTICS</h5>
                    <span className="text-[10px] text-[#5b7088]">PRECISION AUDIT</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">MAE (Lap Time error)</span>
                      <strong className="text-white">{selectedReport.sections.modelPerformance.mae}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">RMSE (Decoupled loss)</span>
                      <strong className="text-white">{selectedReport.sections.modelPerformance.rmse}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">FIA Telemetry Sync</span>
                      <strong className="text-white">{selectedReport.sections.modelPerformance.fiaSync}</strong>
                    </div>
                    <div className="bg-[#0e1622] p-2 rounded">
                      <span className="text-[#647890] block text-[10px]">Inference Latency</span>
                      <strong className="text-white">{selectedReport.sections.modelPerformance.inferenceLatency}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#182638] bg-[#0e1520] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-[#697e96]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>TrueWear Race Engineering AI • FastF1 Verified Session</span>
              </div>
              <button
                onClick={() => setIsDossierModalOpen(false)}
                className="bg-[#1b2839] hover:bg-[#25384e] text-white px-4 py-1.5 rounded text-xs font-bold transition-all"
              >
                CLOSE DOSSIER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
