import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Shield,
  Clock,
  Layers,
} from 'lucide-react';
import { DEFAULT_SETTINGS } from '../../utils/calculations';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, showToast } = useApp();

  const [form, setForm] = useState(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    showToast('Application configuration settings saved successfully!');
  };

  const handleReset = () => {
    setForm(DEFAULT_SETTINGS);
    updateSettings(DEFAULT_SETTINGS);
    showToast('Reset settings to factory default.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Settings & Assumptions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure default planning horizon, safety stock ratios, inventory health thresholds, and ABC classification parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 flex items-center gap-1.5 bg-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-1.5 flex items-center gap-1.5 shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* 1. Forecasting & Demand Engine */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-2.5 border-slate-100">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Demand Forecasting Engine
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Default Planning Period (Months)
              </label>
              <input
                type="number"
                min={1}
                max={24}
                value={form.planningPeriodMonths}
                onChange={(e) =>
                  setForm({ ...form, planningPeriodMonths: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">
                Number of forward months demand to purchase for
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Zero Consumption Months Handling
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="ignoreZero"
                    checked={form.ignoreZeroConsumption}
                    onChange={() => setForm({ ...form, ignoreZeroConsumption: true })}
                    className="text-indigo-600"
                  />
                  <span>Ignore zero months (Active months only)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="ignoreZero"
                    checked={!form.ignoreZeroConsumption}
                    onChange={() => setForm({ ...form, ignoreZeroConsumption: false })}
                    className="text-indigo-600"
                  />
                  <span>Include all 12 calendar months</span>
                </label>
              </div>
            </div>
          </div>

          {/* Historical Multi-Year Weights */}
          <div className="pt-2">
            <label className="font-semibold text-slate-700 block mb-1.5">
              Historical Year Forecast Weights (%)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-500">Latest Year:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.weightLatestYear}
                  onChange={(e) =>
                    setForm({ ...form, weightLatestYear: Number(e.target.value) })
                  }
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500">Previous Year:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.weightPrevYear}
                  onChange={(e) =>
                    setForm({ ...form, weightPrevYear: Number(e.target.value) })
                  }
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500">Older Years:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.weightOlderYears}
                  onChange={(e) =>
                    setForm({ ...form, weightOlderYears: Number(e.target.value) })
                  }
                  className="w-full mt-1 px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Weights are automatically normalized if fewer years are available in the dataset.
            </p>
          </div>
        </div>

        {/* 2. Safety Stock & Lead Time */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-2.5 border-slate-100">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Safety Stock & Procurement Buffers
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Safety Stock Buffer (%)
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={form.safetyStockPct}
                onChange={(e) =>
                  setForm({ ...form, safetyStockPct: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">
                Percentage of monthly forecast added as reserve buffer
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Default Supplier Lead Time (Days)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={form.defaultLeadTimeDays}
                onChange={(e) =>
                  setForm({ ...form, defaultLeadTimeDays: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">
                Used when item does not have an explicit lead time column
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Order Rounding Increment
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={form.roundingIncrement}
                onChange={(e) =>
                  setForm({ ...form, roundingIncrement: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400">
                Round up net purchasing requirement to nearest multiple
              </span>
            </div>
          </div>
        </div>

        {/* 3. Stock Coverage Classification Thresholds */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-2.5 border-slate-100">
            <Clock className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Stock Coverage Health Boundaries (Days)
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="font-semibold text-rose-700 block mb-1">
                Critical Level (&lt; Days)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={form.criticalStockDays}
                onChange={(e) =>
                  setForm({ ...form, criticalStockDays: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 border border-rose-200 bg-rose-50/40 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-orange-700 block mb-1">
                Low Level (Upper Days)
              </label>
              <input
                type="number"
                min={form.criticalStockDays + 1}
                max={45}
                value={form.lowStockDays}
                onChange={(e) => setForm({ ...form, lowStockDays: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-orange-200 bg-orange-50/40 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-emerald-700 block mb-1">
                Normal Level (Upper Days)
              </label>
              <input
                type="number"
                min={form.lowStockDays + 1}
                max={90}
                value={form.normalStockDays}
                onChange={(e) =>
                  setForm({ ...form, normalStockDays: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 border border-emerald-200 bg-emerald-50/40 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-purple-700 block mb-1">
                Excess Level (&gt; Days)
              </label>
              <input
                type="number"
                min={form.normalStockDays + 1}
                max={180}
                value={form.excessStockDays}
                onChange={(e) =>
                  setForm({ ...form, excessStockDays: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 border border-purple-200 bg-purple-50/40 rounded-lg font-bold"
              />
            </div>
          </div>
        </div>

        {/* 4. ABC Analysis Pareto Parameters */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b pb-2.5 border-slate-100">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              ABC Classification Cutoffs (%)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Class A Cumulative Threshold (%)
              </label>
              <input
                type="number"
                min={50}
                max={85}
                value={form.abcThresholdA}
                onChange={(e) =>
                  setForm({ ...form, abcThresholdA: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
              />
              <span className="text-[10px] text-slate-400">
                Top materials representing up to {form.abcThresholdA}% of cumulative volume/value
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Class B Cumulative Threshold (%)
              </label>
              <input
                type="number"
                min={form.abcThresholdA + 5}
                max={98}
                value={form.abcThresholdB}
                onChange={(e) =>
                  setForm({ ...form, abcThresholdB: Number(e.target.value) })
                }
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
              />
              <span className="text-[10px] text-slate-400">
                Next materials representing up to {form.abcThresholdB}% (remaining are Class C)
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 shadow-xs transition"
          >
            Save All Settings
          </button>
        </div>
      </form>
    </div>
  );
};
