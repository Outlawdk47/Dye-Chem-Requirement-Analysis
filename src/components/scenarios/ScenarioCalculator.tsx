import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sliders,
  Save,
  RotateCcw,
  Sparkles,
  TrendingUp,
  PackageCheck,
  ShoppingCart,
  Trash2,
  Check,
  CheckCircle2,
} from 'lucide-react';
import type { SavedScenario, PurchasingMethod } from '../../types';

export const ScenarioCalculator: React.FC = () => {
  const {
    settings,
    updateSettings,
    scenarios,
    saveScenario,
    applyScenario,
    deleteScenario,
    activeScenario,
    summary,
    metrics,
  } = useApp();

  const [planningMonths, setPlanningMonths] = useState(settings.planningPeriodMonths);
  const [safetyStockPct, setSafetyStockPct] = useState(settings.safetyStockPct);
  const [demandGrowthPct, setDemandGrowthPct] = useState(settings.demandGrowthPct);
  const [leadTimeDays, setLeadTimeDays] = useState(settings.defaultLeadTimeDays);
  const [method, setMethod] = useState<PurchasingMethod>(settings.purchasingMethod);

  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDesc, setScenarioDesc] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Apply immediately to settings
  const handleRecalculate = () => {
    updateSettings({
      planningPeriodMonths: planningMonths,
      safetyStockPct,
      demandGrowthPct,
      defaultLeadTimeDays: leadTimeDays,
      purchasingMethod: method,
    });
  };

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioName.trim()) return;

    await saveScenario(scenarioName.trim(), scenarioDesc.trim());
    setScenarioName('');
    setScenarioDesc('');
    setShowSaveModal(false);
  };

  const PRESET_SCENARIOS = [
    {
      name: 'Conservative Planning',
      months: 1,
      safety: 10,
      growth: 0,
      leadTime: 14,
      method: 'average' as PurchasingMethod,
      desc: 'Minimal working capital, just-in-time replenishment',
    },
    {
      name: 'Normal Operations (Default)',
      months: 2,
      safety: 20,
      growth: 5,
      leadTime: 15,
      method: 'safety_stock' as PurchasingMethod,
      desc: 'Standard factory planning buffer for steady operations',
    },
    {
      name: 'High Demand Surge (+15%)',
      months: 3,
      safety: 25,
      growth: 15,
      leadTime: 21,
      method: 'safety_stock' as PurchasingMethod,
      desc: 'Anticipates market demand peak or seasonal production uptick',
    },
    {
      name: 'Supply Chain Disruption Buffer',
      months: 4,
      safety: 40,
      growth: 10,
      leadTime: 35,
      method: 'maximum' as PurchasingMethod,
      desc: 'Extended lead times and safety cushions to prevent plant shutdown',
    },
  ];

  const handleApplyPreset = (p: typeof PRESET_SCENARIOS[0]) => {
    setPlanningMonths(p.months);
    setSafetyStockPct(p.safety);
    setDemandGrowthPct(p.growth);
    setLeadTimeDays(p.leadTime);
    setMethod(p.method);

    updateSettings({
      planningPeriodMonths: p.months,
      safetyStockPct: p.safety,
      demandGrowthPct: p.growth,
      defaultLeadTimeDays: p.leadTime,
      purchasingMethod: p.method,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Purchase Requirement Scenario Calculator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Test what-if simulation parameters without altering original data. Recalculates demand,
            safety buffers, and net orders instantly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeScenario && (
            <button
              onClick={() => applyScenario(null)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 flex items-center gap-1.5 bg-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Default
            </button>
          )}

          <button
            onClick={() => setShowSaveModal(true)}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3.5 py-1.5 flex items-center gap-1.5 shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            Save Current Scenario
          </button>
        </div>
      </div>

      {/* Preset Scenarios Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Industry Standard Simulation Presets
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_SCENARIOS.map((p) => (
            <div
              key={p.name}
              onClick={() => handleApplyPreset(p)}
              className="p-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition flex flex-col justify-between"
            >
              <div>
                <div className="font-bold text-xs text-slate-900">{p.name}</div>
                <div className="text-[11px] text-slate-500 mt-1">{p.desc}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-indigo-700 font-semibold">
                <span>{p.months}mo • {p.safety}% buffer</span>
                <span className="text-[10px] text-slate-400">Click to load</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Simulation Sliders Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Custom Scenario Parameters</h3>
          </div>
          <button
            onClick={handleRecalculate}
            className="text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-md transition"
          >
            Apply & Recalculate Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Slider 1: Planning Period */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-slate-700">
              <label>Planning Period (Horizon):</label>
              <span className="font-mono text-indigo-600 font-bold text-sm">
                {planningMonths} Months
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={planningMonths}
              onChange={(e) => setPlanningMonths(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1 Month (JIT)</span>
              <span>3 Months (Quarterly)</span>
              <span>6 Months</span>
              <span>12 Months (Annual)</span>
            </div>
          </div>

          {/* Slider 2: Safety Stock % */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-slate-700">
              <label>Safety Stock Buffer:</label>
              <span className="font-mono text-indigo-600 font-bold text-sm">
                {safetyStockPct}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={safetyStockPct}
              onChange={(e) => setSafetyStockPct(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0% (No buffer)</span>
              <span>20% (Standard)</span>
              <span>50% (High risk)</span>
              <span>100%</span>
            </div>
          </div>

          {/* Slider 3: Demand Surge % */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-slate-700">
              <label>Market Demand Growth / Surge:</label>
              <span className="font-mono text-indigo-600 font-bold text-sm">
                {demandGrowthPct > 0 ? `+${demandGrowthPct}%` : `${demandGrowthPct}%`}
              </span>
            </div>
            <input
              type="range"
              min={-50}
              max={100}
              step={5}
              value={demandGrowthPct}
              onChange={(e) => setDemandGrowthPct(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-50% (Contraction)</span>
              <span>0% (Neutral)</span>
              <span>+25% (Growth)</span>
              <span>+100% (Doubling)</span>
            </div>
          </div>

          {/* Slider 4: Supplier Lead Time */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-slate-700">
              <label>Default Supplier Lead Time:</label>
              <span className="font-mono text-indigo-600 font-bold text-sm">
                {leadTimeDays} Days
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={90}
              step={1}
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1 Day (Local)</span>
              <span>15 Days</span>
              <span>30 Days (Import)</span>
              <span>90 Days (Overseas)</span>
            </div>
          </div>
        </div>

        {/* Calculation Method Selection */}
        <div className="pt-4 border-t border-slate-100">
          <label className="text-xs font-semibold text-slate-700 block mb-2">
            Base Purchasing Method:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            {[
              { id: 'safety_stock', label: 'Safety Stock Weighted', sub: 'Recommended standard' },
              { id: 'average', label: 'Historical Average', sub: 'Active monthly mean' },
              { id: 'maximum', label: 'Historical Maximum', sub: 'Peak consumption capacity' },
              { id: 'trend', label: 'Regression Trend Extrapolated', sub: 'Dynamic momentum forecast' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMethod(opt.id as PurchasingMethod)}
                className={`p-2.5 rounded-lg border text-left transition ${
                  method === opt.id
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div>{opt.label}</div>
                <div className="text-[10px] text-slate-400 font-normal">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recalculated Output Impact KPI Cards */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-lg">
        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-4">
          Scenario Projected Impact vs On-Hand Inventory
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-400 text-[11px]">Materials Requiring Purchase</div>
            <div className="text-2xl font-bold mt-1 text-white">
              {summary.materialsRequiringPurchase}{' '}
              <span className="text-xs font-normal text-slate-400">/ {summary.totalMaterials}</span>
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Total Net Purchasing Volume</div>
            <div className="text-2xl font-bold mt-1 text-emerald-400">
              {Math.round(summary.totalPurchasingRequirement).toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">units</span>
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Total Forecast Demand</div>
            <div className="text-2xl font-bold mt-1 text-indigo-300">
              {Math.round(summary.totalForecastRequirement).toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">units</span>
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Critical Items (&lt;7d)</div>
            <div className="text-2xl font-bold mt-1 text-rose-400">
              {summary.criticalMaterialsCount}{' '}
              <span className="text-xs font-normal text-slate-400">materials</span>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Scenarios List */}
      {scenarios.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
            Saved What-If Scenarios in Firestore
          </div>
          <div className="divide-y divide-slate-100">
            {scenarios.map((scen) => (
              <div
                key={scen.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">{scen.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{scen.description}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    {scen.planningPeriodMonths}mo Planning • {scen.safetyStockPct}% Safety •{' '}
                    {scen.demandGrowthPct}% Growth
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => applyScenario(scen)}
                    className="text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 transition"
                  >
                    Apply Scenario
                  </button>
                  <button
                    onClick={() => deleteScenario(scen.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    title="Delete saved scenario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Scenario Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Save Scenario</h3>
            <form onSubmit={handleSaveScenario} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Scenario Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Peak Production"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional planning context..."
                  value={scenarioDesc}
                  onChange={(e) => setScenarioDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-3 py-1.5 rounded-lg border text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold"
                >
                  Save Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
