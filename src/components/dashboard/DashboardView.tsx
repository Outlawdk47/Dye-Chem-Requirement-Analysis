import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Boxes,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  PackageCheck,
  PackageX,
  Gauge,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Info,
  UploadCloud,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { MaterialAnalysisMetric } from '../../types';

interface DashboardViewProps {
  onNavigateToPurchasing: () => void;
  onNavigateToUpload: () => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const COVERAGE_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  Low: '#f97316',
  Normal: '#10b981',
  Excess: '#8b5cf6',
  'No Consumption': '#94a3b8',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToPurchasing,
  onNavigateToUpload,
}) => {
  const { metrics, summary, settings, setSelectedMaterial, selectedSheet, availableSheets } = useApp();

  // Chart 1: Year-wise Total Consumption
  const yearWiseData = useMemo(() => {
    const yearTotals: Record<number, number> = {};
    metrics.forEach((m) => {
      Object.entries(m.yearlyBreakdown).forEach(([yrStr, stats]) => {
        const yr = Number(yrStr);
        yearTotals[yr] = (yearTotals[yr] || 0) + stats.totalConsumption;
      });
    });
    return Object.entries(yearTotals)
      .map(([yr, total]) => ({
        year: yr,
        totalConsumption: Math.round(total),
      }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  }, [metrics]);

  // Chart 2: Top 10 Materials by Consumption
  const top10Consumption = useMemo(() => {
    return [...metrics]
      .sort((a, b) => b.totalHistoricalConsumption - a.totalHistoricalConsumption)
      .slice(0, 10)
      .map((m) => ({
        name: m.materialName.length > 18 ? m.materialName.slice(0, 16) + '...' : m.materialName,
        fullName: m.materialName,
        code: m.materialCode,
        consumption: Math.round(m.totalHistoricalConsumption),
        uom: m.uom,
      }));
  }, [metrics]);

  // Chart 3: Materials Requiring Highest Purchase Quantity
  const topPurchasingNeeds = useMemo(() => {
    return [...metrics]
      .filter((m) => m.netPurchasingRequirement > 0)
      .sort((a, b) => b.netPurchasingRequirement - a.netPurchasingRequirement)
      .slice(0, 8)
      .map((m) => ({
        name: m.materialName.length > 16 ? m.materialName.slice(0, 14) + '...' : m.materialName,
        fullName: m.materialName,
        code: m.materialCode,
        netRequirement: Math.round(m.netPurchasingRequirement),
        currentStock: Math.round(m.currentStock),
        uom: m.uom,
      }));
  }, [metrics]);

  // Chart 4: Monthly Consumption Trend (Recent aggregated across items)
  const monthlyTrendData = useMemo(() => {
    const monthAgg: Record<string, number> = {};
    metrics.forEach((m) => {
      m.monthlyHistory.forEach((hist) => {
        monthAgg[hist.period] = (monthAgg[hist.period] || 0) + hist.quantity;
      });
    });
    return Object.entries(monthAgg)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-18) // last 18 months
      .map(([period, qty]) => ({
        period,
        consumption: Math.round(qty),
      }));
  }, [metrics]);

  // Chart 5: Purchasing Requirement by Category
  const categoryReqData = useMemo(() => {
    const catMap: Record<string, number> = {};
    metrics.forEach((m) => {
      if (m.netPurchasingRequirement > 0) {
        catMap[m.category] = (catMap[m.category] || 0) + m.netPurchasingRequirement;
      }
    });
    return Object.entries(catMap).map(([category, requirement]) => ({
      category,
      requirement: Math.round(requirement),
    }));
  }, [metrics]);

  // Chart 6: Stock Coverage Distribution
  const coverageDistribution = useMemo(() => {
    const dist: Record<string, number> = {
      Critical: 0,
      Low: 0,
      Normal: 0,
      Excess: 0,
    };
    metrics.forEach((m) => {
      const cat = m.stockCoverageCategory;
      if (dist[cat] !== undefined) {
        dist[cat] += 1;
      }
    });
    return Object.entries(dist).map(([status, count]) => ({
      status,
      count,
    }));
  }, [metrics]);

  // Critical items needing immediate action
  const criticalItems = useMemo(() => {
    return metrics
      .filter((m) => m.purchasingPriority === 'Immediate' || m.purchasingPriority === 'High')
      .slice(0, 5);
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Empty State Banner if no data is loaded */}
      {metrics.length === 0 && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/5 border border-indigo-200/80 rounded-2xl p-6 text-center shadow-xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Excel Dataset Loaded</h3>
            <p className="text-xs text-slate-600">
              Please upload your factory consumption and stock Excel spreadsheets in Step 1 to generate complete purchasing requirements, executive inventory charts, and reports.
            </p>
            <button
              onClick={onNavigateToUpload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <span>Upload Excel File (Step 1)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToPurchasing}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg transition shadow-xs flex items-center gap-1.5"
          >
            <span>View Full Purchasing Table</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 tracking-wide">ITEMS NAME</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{summary.distinctMaterialsCount}</div>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            {selectedSheet && selectedSheet !== 'ALL'
              ? `Items in ${selectedSheet}`
              : `Total distinct items in ITEMS NAME (${availableSheets.length || 5} sheets)`}
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Requiring Purchase</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600">
            {summary.materialsRequiringPurchase}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Critical Priority</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {summary.criticalMaterialsCount}
          </div>
          <div className="mt-1 text-[11px] text-rose-600 font-medium">
            Coverage &lt; {settings.criticalStockDays} days
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Net Purchasing</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {Math.round(summary.totalPurchasingRequirement).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Recommended order units
          </div>
        </div>

        {/* KPI 5 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Forecast Demand</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {Math.round(summary.totalForecastRequirement).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {settings.planningPeriodMonths}-month planning horizon
          </div>
        </div>

        {/* KPI 6 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Current Stock On-Hand</span>
            <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {Math.round(summary.totalCurrentStock).toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Total active inventory units
          </div>
        </div>

        {/* KPI 7 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Excess Stock Items</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <PackageX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {summary.excessStockItemsCount}
          </div>
          <div className="mt-1 text-[11px] text-amber-700">
            Coverage &gt; {settings.excessStockDays} days
          </div>
        </div>

        {/* KPI 8 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Data Quality Flags</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700">
            {summary.dataQualityIssuesCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {summary.dataQualityIssuesCount === 0 ? 'Clean dataset' : 'Warnings or adjusted rows'}
          </div>
        </div>
      </div>

      {/* Critical Items Urgent Banner if any */}
      {criticalItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-rose-900 font-semibold text-xs uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Immediate Purchasing Attention Required ({criticalItems.length} Materials)</span>
            </div>
            <button
              onClick={onNavigateToPurchasing}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
            >
              View in Purchasing Plan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {criticalItems.map((item, index) => (
              <div
                key={`${item.materialCode}_${item.materialName}_${item.sheetName || item.category}_${index}`}
                onClick={() => setSelectedMaterial(item)}
                className="bg-white p-3 rounded-lg border border-rose-200 hover:border-rose-400 hover:shadow-xs cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[190px]">
                    {item.materialName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {item.materialCode} • {item.category}
                  </div>
                  <div className="text-[11px] font-semibold text-rose-600 mt-1">
                    Coverage: {item.stockCoverageDays !== null ? `${item.stockCoverageDays} days` : 'N/A'} • Stock: {item.currentStock} {item.uom}
                  </div>
                </div>
                <div className="text-right pl-2">
                  <div className="text-[11px] text-slate-500">Order Qty</div>
                  <div className="text-sm font-bold text-indigo-600">
                    {Math.round(item.netPurchasingRequirement)} {item.uom}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Items Master Analysis Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>All Items Inventory & Purchasing Analysis</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
                {metrics.length} Total SKUs
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Complete status breakdown for all inventory items (normal, low stock, overstock, and zero requirement)
            </p>
          </div>
          <button
            onClick={onNavigateToPurchasing}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
          >
            <span>Open Full Interactive Table</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-lg">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Item Code</th>
                <th className="py-2.5 px-3">ITEMS NAME</th>
                <th className="py-2.5 px-3 text-emerald-800 bg-emerald-50/60 font-semibold">Original Excel Item Name</th>
                <th className="py-2.5 px-3">Sheet / Dept</th>
                <th className="py-2.5 px-2 text-center">UOM</th>
                <th className="py-2.5 px-3 text-right">Current Stock</th>
                <th className="py-2.5 px-3 text-right">Forecast/Mo</th>
                <th className="py-2.5 px-3 text-right font-bold text-indigo-900">Net Purchase Req</th>
                <th className="py-2.5 px-3 text-center">Stock Coverage</th>
                <th className="py-2.5 px-3 text-center">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.slice(0, 15).map((m, index) => (
                <tr
                  key={`${m.materialCode}_${m.sheetName}_${index}`}
                  onClick={() => setSelectedMaterial(m)}
                  className="hover:bg-slate-50 cursor-pointer transition"
                >
                  <td className="py-2 px-3 font-semibold text-slate-900 font-mono">{m.materialCode}</td>
                  <td className="py-2 px-3 font-medium text-slate-800">{m.materialName}</td>
                  <td className="py-2 px-3 text-slate-700 font-mono text-[11px] max-w-[220px] truncate bg-emerald-50/20 font-medium" title={m.rawMaterialName || m.materialName}>
                    {m.rawMaterialName || m.materialName}
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                      {m.sheetName || m.department || 'General'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center text-slate-500 font-mono text-[10px]">{m.uom}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                    {Math.round(m.currentStock).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    {Math.round(m.forecastMonthlyConsumption).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold">
                    <span className={m.netPurchasingRequirement > 0 ? 'text-indigo-600 font-extrabold' : 'text-slate-400 font-normal'}>
                      {Math.round(m.netPurchasingRequirement).toLocaleString()} {m.uom}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold">
                    <span className={
                      m.stockCoverageCategory === 'Critical' ? 'text-rose-600' :
                      m.stockCoverageCategory === 'Low' ? 'text-orange-600' :
                      m.stockCoverageCategory === 'Excess' ? 'text-purple-600' : 'text-emerald-600'
                    }>
                      {m.stockCoverageDays !== null ? `${m.stockCoverageDays}d` : 'N/A'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      m.purchasingPriority === 'Immediate' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                      m.purchasingPriority === 'High' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                      m.purchasingPriority === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      m.purchasingPriority === 'Low' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {m.purchasingPriority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6 Analytic Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Year-wise Total Consumption */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Year-wise Total Consumption</h3>
              <p className="text-[11px] text-slate-500">Annual aggregate consumption across all materials</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearWiseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} Units`, 'Total Consumption']}
                />
                <Bar dataKey="totalConsumption" fill="#6366f1" radius={[4, 4, 0, 0]} name="Consumption" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top 10 Materials by Consumption */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top Consuming Materials</h3>
              <p className="text-[11px] text-slate-500">Materials with highest cumulative historical consumption</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top10Consumption}
                layout="vertical"
                margin={{ left: 20, right: 20, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${Number(val).toLocaleString()} ${item.payload.uom}`,
                    item.payload.fullName,
                  ]}
                />
                <Bar dataKey="consumption" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Highest Purchasing Requirements */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Highest Net Purchasing Requirements</h3>
              <p className="text-[11px] text-slate-500">Materials with largest calculated procurement volume</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPurchasingNeeds}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${Number(val).toLocaleString()} ${item.payload.uom}`,
                    item.payload.fullName,
                  ]}
                />
                <Bar dataKey="netRequirement" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Net Purchase Req" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Monthly Consumption Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Consumption Trend</h3>
              <p className="text-[11px] text-slate-500">Chronological total factory consumption pattern</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} Units`, 'Consumption']}
                />
                <Line
                  type="monotone"
                  dataKey="consumption"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Purchasing Requirement by Category */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Purchasing Requirement by Category</h3>
              <p className="text-[11px] text-slate-500">Distribution of required order volume by material group</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            {categoryReqData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryReqData}
                    dataKey="requirement"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry: any) => `${entry.category || entry.name}: ${entry.requirement || entry.value}`}
                    labelLine={false}
                  >
                    {categoryReqData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} Units`, 'Required']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No purchasing requirement needed for categories</div>
            )}
          </div>
        </div>

        {/* Chart 6: Stock Coverage Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Stock Coverage Distribution</h3>
              <p className="text-[11px] text-slate-500">Health of inventory buffers across active items</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={coverageDistribution}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  label={(entry: any) => `${entry.status || entry.name} (${entry.count || entry.value})`}
                >
                  {coverageDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-cov-${index}`}
                      fill={COVERAGE_COLORS[entry.status] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`${val} Materials`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
