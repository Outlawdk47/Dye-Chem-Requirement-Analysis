import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  FileText,
  Sparkles,
  LogOut,
  LogIn,
  ChevronDown,
  Layers,
  Menu,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import { exportAnalysisToExcel, exportAnalysisToPDF } from '../../utils/exportUtils';

interface HeaderProps {
  currentTab: string;
  onToggleSidebarMobile: () => void;
  onToggleSidebarDesktop: () => void;
  isSidebarCollapsedDesktop: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onToggleSidebarMobile,
  onToggleSidebarDesktop,
  isSidebarCollapsedDesktop,
}) => {
  const {
    currentDataset,
    datasets,
    selectDataset,
    metrics,
    summary,
    settings,
    issues,
    user,
    signInWithGoogle,
    logOut,
    activeScenario,
    selectedSheet,
    setSelectedSheet,
    availableSheets,
  } = useApp();

  const handleExportExcel = () => {
    exportAnalysisToExcel(metrics, summary, settings, currentDataset, issues);
  };

  const handleExportPDF = () => {
    exportAnalysisToPDF(metrics, summary, settings, currentDataset);
  };

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
      {/* Zone 1: Sidebar Toggle & Contextual Breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Toggle Button */}
        <button
          onClick={onToggleSidebarMobile}
          className="p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 bg-slate-100/80 hover:bg-indigo-50 border border-slate-200 lg:hidden transition flex items-center gap-1 shrink-0"
          title="Sidebar Menu (Hide / Unhide)"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5 text-indigo-600" />
          <span className="text-[11px] font-bold text-slate-800 pr-1">Menu</span>
        </button>

        {/* Desktop Collapse Button */}
        <button
          onClick={onToggleSidebarDesktop}
          className="hidden lg:flex p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200 transition shrink-0"
          title={isSidebarCollapsedDesktop ? 'Expand Sidebar (Unhide)' : 'Collapse Sidebar (Hide)'}
        >
          {isSidebarCollapsedDesktop ? (
            <PanelLeftOpen className="w-4 h-4 text-indigo-600" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-slate-500" />
          )}
        </button>

        <div className="flex items-center gap-2 truncate">
          <span className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
            ProcurePlan
          </span>
          <span className="text-slate-300 font-light hidden sm:inline">/</span>
          <span className="text-xs text-slate-500 font-medium capitalize truncate hidden sm:inline">
            {currentTab.replace('-', ' ')}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Dataset selector pill */}
        <div className="flex items-center gap-2">
          <div className="relative inline-flex items-center">
            <select
              id="dataset-select"
              value={currentDataset?.id || ''}
              onChange={(e) => selectDataset(e.target.value)}
              className="appearance-none text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg pl-2.5 pr-7 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition max-w-[210px] truncate cursor-pointer"
            >
              {datasets.length === 0 && (
                <option value="">No dataset loaded</option>
              )}
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fileName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Worksheet / Sheet-wise Filter Pill */}
          {availableSheets.length > 0 && (
            <div className="relative inline-flex items-center">
              <Layers className="w-3.5 h-3.5 text-indigo-600 absolute left-2 pointer-events-none" />
              <select
                id="sheet-select"
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="appearance-none text-xs font-bold bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200 text-indigo-900 rounded-lg pl-7 pr-7 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition max-w-[210px] truncate cursor-pointer shadow-2xs"
                title="Filter analysis strictly by Excel Sheet / Worksheet"
              >
                <option value="ALL">🌐 All Sheets ({availableSheets.length})</option>
                {availableSheets.map((s) => (
                  <option key={s} value={s}>
                    📄 {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2 pointer-events-none" />
            </div>
          )}

          {activeScenario && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Scenario: {activeScenario.name}
            </span>
          )}
        </div>
      </div>

      {/* Zone 3: Actions & Auth */}
      <div className="flex items-center gap-2">

        <button
          onClick={handleExportExcel}
          className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition shadow-2xs"
          title="Export multi-sheet Excel workbook"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Export Excel</span>
        </button>

        <button
          onClick={handleExportPDF}
          className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition shadow-2xs"
          title="Generate management PDF report"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Export PDF</span>
        </button>

      </div>
    </header>
  );
};
