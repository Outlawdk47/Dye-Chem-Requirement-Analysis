import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { UploadView } from './components/upload/UploadView';
import { MaterialAnalysisTable } from './components/analysis/MaterialAnalysisTable';
import { MaterialDetailModal } from './components/analysis/MaterialDetailModal';
import { ConsumptionAnalysisWrapper } from './components/analysis/ConsumptionAnalysisWrapper';
import { InventoryView } from './components/inventory/InventoryView';
import { ScenarioCalculator } from './components/scenarios/ScenarioCalculator';
import { ReportView } from './components/reports/ReportView';
import { DataQualityView } from './components/dataQuality/DataQualityView';
import { UploadHistoryView } from './components/history/UploadHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { testConnection } from './firebase/config';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('upload');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsedDesktop, setIsSidebarCollapsedDesktop] = useState<boolean>(false);
  const { toastMessage, isLoading, isUploading, uploadMessage } = useApp();

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Global Blocking Upload Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 text-center max-w-sm space-y-4">
            <div className="relative w-12 h-12 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-pulse" />
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin absolute inset-0" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Uploading & Analyzing Dataset</h3>
              <p className="text-xs text-indigo-600 font-bold">{uploadMessage || 'Processing records...'}</p>
            </div>
            <p className="text-[10px] text-slate-500">
              Please do not close or switch pages. Your Excel rows are being unpivoted, normalized, and securely saved to your secure Cloud database.
            </p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsedDesktop={isSidebarCollapsedDesktop}
        onToggleCollapseDesktop={() => setIsSidebarCollapsedDesktop(!isSidebarCollapsedDesktop)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky Header */}
        <Header
          currentTab={currentTab}
          onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onToggleSidebarDesktop={() => setIsSidebarCollapsedDesktop(!isSidebarCollapsedDesktop)}
          isSidebarCollapsedDesktop={isSidebarCollapsedDesktop}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {isLoading && (
            <div className="fixed inset-0 z-40 bg-white/60 backdrop-blur-xs flex items-center justify-center">
              <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 flex items-center gap-3 text-xs font-semibold text-slate-800">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                <span>Processing data calculations...</span>
              </div>
            </div>
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateToPurchasing={() => setCurrentTab('purchasing')}
              onNavigateToUpload={() => setCurrentTab('upload')}
            />
          )}

          {currentTab === 'upload' && (
            <UploadView onImportComplete={() => setCurrentTab('purchasing')} />
          )}

          {currentTab === 'purchasing' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Purchasing Requirement Analysis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Analytical 20-column matrix determining order requirements, safety stock buffers, and reorder triggers.
                </p>
              </div>
              <MaterialAnalysisTable />
            </div>
          )}

          {currentTab === 'consumption' && <ConsumptionAnalysisWrapper />}

          {currentTab === 'inventory' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Inventory Diagnostics & Lead Time Analysis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stock coverage days classification, supplier lead-time demand, and reorder point monitoring.
                </p>
              </div>
              <InventoryView />
            </div>
          )}

          {currentTab === 'scenarios' && <ScenarioCalculator />}

          {currentTab === 'reports' && <ReportView />}

          {currentTab === 'data-quality' && <DataQualityView />}

          {currentTab === 'history' && <UploadHistoryView />}

          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global In-Depth Material Modal */}
      <MaterialDetailModal />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
