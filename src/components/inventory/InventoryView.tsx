import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Boxes,
  Clock,
  ShieldAlert,
  AlertTriangle,
  PackageCheck,
  TrendingDown,
  Info,
  Search,
  ExternalLink,
} from 'lucide-react';
import type { MaterialAnalysisMetric } from '../../types';

export const InventoryView: React.FC = () => {
  const { metrics, settings, setSelectedMaterial } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'critical' | 'low' | 'normal' | 'excess'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMetrics = useMemo(() => {
    let list = [...metrics];
    if (activeTab === 'critical') list = list.filter((m) => m.stockCoverageCategory === 'Critical');
    if (activeTab === 'low') list = list.filter((m) => m.stockCoverageCategory === 'Low');
    if (activeTab === 'normal') list = list.filter((m) => m.stockCoverageCategory === 'Normal');
    if (activeTab === 'excess') list = list.filter((m) => m.stockCoverageCategory === 'Excess');

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.materialCode.toLowerCase().includes(q) ||
          m.materialName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [metrics, activeTab, searchTerm]);

  const counts = useMemo(() => {
    return {
      all: metrics.length,
      critical: metrics.filter((m) => m.stockCoverageCategory === 'Critical').length,
      low: metrics.filter((m) => m.stockCoverageCategory === 'Low').length,
      normal: metrics.filter((m) => m.stockCoverageCategory === 'Normal').length,
      excess: metrics.filter((m) => m.stockCoverageCategory === 'Excess').length,
    };
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Top Inventory Diagnostics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical */}
        <div
          onClick={() => setActiveTab('critical')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === 'critical'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">Critical Stock (&lt;{settings.criticalStockDays}d)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2">{counts.critical}</div>
          <div className="text-[11px] text-rose-600 mt-0.5 font-medium">Risk of production stockout</div>
        </div>

        {/* Low */}
        <div
          onClick={() => setActiveTab('low')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === 'low'
              ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-500'
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-600">
              Low Buffer ({settings.criticalStockDays}–{settings.lowStockDays}d)
            </span>
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-700 mt-2">{counts.low}</div>
          <div className="text-[11px] text-orange-600 mt-0.5">Below optimal safety buffer</div>
        </div>

        {/* Normal */}
        <div
          onClick={() => setActiveTab('normal')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === 'normal'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600">
              Normal Buffer ({settings.lowStockDays}–{settings.normalStockDays}d)
            </span>
            <PackageCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{counts.normal}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Healthy inventory coverage</div>
        </div>

        {/* Excess */}
        <div
          onClick={() => setActiveTab('excess')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeTab === 'excess'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-600">Excess Stock (&gt;{settings.excessStockDays}d)</span>
            <Boxes className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2">{counts.excess}</div>
          <div className="text-[11px] text-purple-600 mt-0.5">Holding capital tied up</div>
        </div>
      </div>

      {/* Threshold Explanation Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Stock Coverage Days = <code className="bg-white px-1.5 py-0.5 rounded border font-mono">Current Stock / (Monthly Consumption ÷ 30)</code>.
            Lead-Time Demand = <code className="bg-white px-1.5 py-0.5 rounded border font-mono">Daily Consumption × Lead Time Days</code>.
          </span>
        </div>
        <span className="text-[11px] text-indigo-600 font-medium hidden sm:inline">
          Reorder Point = Lead Demand + Safety Stock
        </span>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Items ({counts.all})
          </button>
          <button
            onClick={() => setActiveTab('critical')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'critical'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Critical ({counts.critical})
          </button>
          <button
            onClick={() => setActiveTab('low')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'low'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Low ({counts.low})
          </button>
          <button
            onClick={() => setActiveTab('normal')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'normal'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Normal ({counts.normal})
          </button>
          <button
            onClick={() => setActiveTab('excess')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'excess'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Excess ({counts.excess})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Inventory & Lead Time Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Material Code</th>
                <th className="py-2.5 px-3">Material Name</th>
                <th className="py-2.5 px-3 text-emerald-800 bg-emerald-50/60 font-semibold">Original Excel Item Name</th>
                <th className="py-2.5 px-2 text-center">UOM</th>
                <th className="py-2.5 px-3 text-right">Current Stock</th>
                <th className="py-2.5 px-3 text-right">Daily Consumption</th>
                <th className="py-2.5 px-3 text-center">Stock Coverage</th>
                <th className="py-2.5 px-3 text-center">Coverage Status</th>
                <th className="py-2.5 px-3 text-center">Lead Time</th>
                <th className="py-2.5 px-3 text-right">Lead-Time Demand</th>
                <th className="py-2.5 px-3 text-right font-bold text-indigo-900">Reorder Point (ROP)</th>
                <th className="py-2.5 px-3 text-right">Incoming Open PO</th>
                <th className="py-2.5 px-3 text-right font-bold text-indigo-600">Net Purchase Req</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMetrics.map((m, index) => {
                const daily = m.forecastMonthlyConsumption / 30;
                const isBelowROP = m.currentStock < m.reorderPoint;

                return (
                  <tr
                    key={`${m.materialCode}_${m.materialName}_${m.sheetName || m.category}_${index}`}
                    onClick={() => setSelectedMaterial(m)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{m.materialCode}</td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium max-w-[200px] truncate" title={m.materialName}>
                      {m.materialName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px] max-w-[200px] truncate bg-emerald-50/20 font-medium" title={m.rawMaterialName || m.materialName}>
                      {m.rawMaterialName || m.materialName}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-500">
                      {m.uom}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {Math.round(m.currentStock).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {daily.toFixed(1)}/d
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {m.stockCoverageDays !== null ? (
                        <span
                          className={
                            m.stockCoverageCategory === 'Critical'
                              ? 'text-rose-600'
                              : m.stockCoverageCategory === 'Low'
                              ? 'text-orange-600'
                              : m.stockCoverageCategory === 'Normal'
                              ? 'text-emerald-600'
                              : 'text-purple-600'
                          }
                        >
                          {m.stockCoverageDays} Days
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.stockCoverageCategory === 'Critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : m.stockCoverageCategory === 'Low'
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : m.stockCoverageCategory === 'Normal'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}
                      >
                        {m.stockCoverageCategory}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                      {m.leadTimeDays}d
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {Math.round(m.leadTimeDemand)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      <span className={isBelowROP ? 'text-rose-600' : 'text-slate-800'}>
                        {Math.round(m.reorderPoint)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {m.incomingQuantity > 0 ? (
                        <span className="text-emerald-700 font-semibold">
                          +{m.incomingQuantity}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600">
                      {Math.round(m.netPurchasingRequirement).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedMaterial(m)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-[11px]"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
