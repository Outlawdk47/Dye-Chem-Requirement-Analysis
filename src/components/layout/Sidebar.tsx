import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  ShoppingCart,
  TrendingUp,
  Boxes,
  Sliders,
  FileCheck2,
  AlertCircle,
  History,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export type NavigationTab =
  | 'dashboard'
  | 'upload'
  | 'purchasing'
  | 'consumption'
  | 'inventory'
  | 'scenarios'
  | 'reports'
  | 'data-quality'
  | 'history'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleCollapseDesktop: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleCollapseDesktop,
}) => {
  const { summary, issues } = useApp();

  const navItems = [
    {
      id: 'upload' as NavigationTab,
      label: 'Upload Excel File',
      icon: UploadCloud,
      badge: 'Step 1',
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'purchasing' as NavigationTab,
      label: 'Purchasing Requirements',
      icon: ShoppingCart,
      badge: summary.materialsRequiringPurchase > 0 ? summary.materialsRequiringPurchase : null,
      badgeColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'consumption' as NavigationTab,
      label: 'Consumption Analysis',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'inventory' as NavigationTab,
      label: 'Inventory & Lead Time',
      icon: Boxes,
      badge: summary.criticalMaterialsCount > 0 ? `${summary.criticalMaterialsCount} crit` : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'scenarios' as NavigationTab,
      label: 'Scenario Calculator',
      icon: Sliders,
      badge: null,
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Reports & Export',
      icon: FileCheck2,
      badge: null,
    },
    {
      id: 'data-quality' as NavigationTab,
      label: 'Data Quality',
      icon: AlertCircle,
      badge: issues.length > 0 ? issues.length : null,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'history' as NavigationTab,
      label: 'Upload History',
      icon: History,
      badge: null,
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Settings',
      icon: SettingsIcon,
      badge: null,
    },
  ];

  const handleNavClick = (id: NavigationTab) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Dark Backdrop Overlay for Mobile when open */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen z-50 transition-all duration-300 ${
          /* Mobile Drawer Positioning */
          isOpenMobile ? 'fixed inset-y-0 left-0 w-64 shadow-2xl translate-x-0' : 'fixed inset-y-0 left-0 w-64 -translate-x-full lg:static lg:translate-x-0'
        } ${
          /* Desktop Width Control */
          isCollapsedDesktop ? 'lg:w-18' : 'lg:w-64'
        }`}
      >
        {/* Brand Header & Toggle Buttons */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
              PR
            </div>
            {(!isCollapsedDesktop || isOpenMobile) && (
              <div className="truncate">
                <h1 className="text-sm font-semibold text-white tracking-wide truncate">ProcurePlan ERP</h1>
                <p className="text-[11px] text-slate-400 truncate">Purchasing Engine</p>
              </div>
            )}
          </div>

          {/* Mobile Close X Button */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition"
            title="Hide / Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse / Expand Arrow Button */}
          <button
            onClick={onToggleCollapseDesktop}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isCollapsedDesktop ? 'Unhide / Expand Sidebar' : 'Hide / Collapse Sidebar'}
          >
            {isCollapsedDesktop ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Menu Items */}
        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isCompact = isCollapsedDesktop && !isOpenMobile;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={isCompact ? item.label : undefined}
                className={`w-full flex items-center ${
                  isCompact ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                } rounded-lg text-xs font-medium transition text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isCompact && <span className="truncate">{item.label}</span>}
                </div>

                {!isCompact && item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status Box */}
        {(!isCollapsedDesktop || isOpenMobile) && (
          <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
            <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1">
              <span>Database Status</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Cloud Firestore synced with Zero-Trust Security.
            </p>
          </div>
        )}
      </aside>
    </>
  );
};
