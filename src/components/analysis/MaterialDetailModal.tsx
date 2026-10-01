import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  TrendingUp,
  Boxes,
  ShoppingCart,
  ShieldCheck,
  Calendar,
  Building,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

export const MaterialDetailModal: React.FC = () => {
  const { selectedMaterial, setSelectedMaterial, settings } = useApp();

  if (!selectedMaterial) return null;
  const m = selectedMaterial;

  const chartData = m.monthlyHistory.map((item) => ({
    period: item.period,
    quantity: item.quantity,
  }));

  const yearlyRows = Object.values(m.yearlyBreakdown).sort((a, b) => a.year - b.year);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm">
              {m.materialCode.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{m.materialName}</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                  {m.materialCode}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    m.purchasingPriority === 'Immediate'
                      ? 'bg-rose-100 text-rose-800'
                      : m.purchasingPriority === 'High'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  Priority: {m.purchasingPriority}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Category: <span className="font-medium text-slate-700">{m.category}</span> • UOM:{' '}
                <span className="font-medium text-slate-700">{m.uom}</span> • Supplier:{' '}
                <span className="font-medium text-slate-700">{m.supplier}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedMaterial(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Section 1: Transparent Purchasing Calculation Breakdown */}
          <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/40 p-4 rounded-xl border border-indigo-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
                Purchasing Requirement Formula Breakdown
              </span>
              <span className="text-[11px] font-semibold text-indigo-700">
                Method: {settings.purchasingMethod.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[11px]">Forecast Monthly Demand</div>
                <div className="text-base font-bold text-slate-900">
                  {Math.round(m.forecastMonthlyConsumption * 10) / 10} {m.uom}
                </div>
                <div className="text-[10px] text-slate-400">Reliability: {m.forecastReliability}</div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[11px]">Planning Req ({settings.planningPeriodMonths}mo)</div>
                <div className="text-base font-bold text-slate-900">
                  {Math.round(m.planningRequirement * 10) / 10} {m.uom}
                </div>
                <div className="text-[10px] text-slate-400">Forecast × {settings.planningPeriodMonths} months</div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-[11px]">Safety Stock (+{settings.safetyStockPct}%)</div>
                <div className="text-base font-bold text-slate-900">
                  {Math.round(m.safetyStock * 10) / 10} {m.uom}
                </div>
                <div className="text-[10px] text-slate-400">{settings.safetyStockPct}% of 1mo demand</div>
              </div>

              <div className="bg-indigo-600 text-white p-2.5 rounded-lg shadow-xs">
                <div className="text-indigo-200 text-[11px]">Net Purchasing Requirement</div>
                <div className="text-base font-bold">
                  {Math.round(m.netPurchasingRequirement * 10) / 10} {m.uom}
                </div>
                <div className="text-[10px] text-indigo-200">Recommended order</div>
              </div>
            </div>

            {/* Visual Formula Line */}
            <div className="bg-white p-3 rounded-lg border border-indigo-100 font-mono text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-400 font-sans text-[11px]">Mathematical formula:</span>
              <span className="font-semibold text-indigo-900">
                [Planning ({Math.round(m.planningRequirement)}) + Safety ({Math.round(m.safetyStock)})]
                - Current Stock ({Math.round(m.currentStock)}) - Incoming Open PO (
                {Math.round(m.incomingQuantity)}) ={' '}
                <span className="text-indigo-600 font-bold">
                  {Math.round(m.netPurchasingRequirement)} {m.uom}
                </span>
              </span>
            </div>
          </div>

          {/* Section 2: Historical Consumption Chart */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Historical Monthly Consumption Curve
                </h4>
                <p className="text-[11px] text-slate-500">
                  Chronological usage across all detected months
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-500">Trend: </span>
                <span className="font-bold text-slate-800">{m.trend}</span>
                <span className="text-slate-400 text-[11px] ml-1">
                  (CV: {(m.coefficientOfVariation * 100).toFixed(0)}% • {m.volatility} Volatility)
                </span>
              </div>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} ${m.uom}`, 'Consumption']}
                  />
                  <Bar dataKey="quantity" fill="#6366f1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 3: Yearly Performance Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800">
              Year-by-Year Consumption Breakdown
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Year</th>
                  <th className="py-2 px-3 text-right">Total Annual ({m.uom})</th>
                  <th className="py-2 px-3 text-right">Monthly Avg (Active)</th>
                  <th className="py-2 px-3 text-right">Monthly Avg (Calendar)</th>
                  <th className="py-2 px-3 text-right">Maximum Month</th>
                  <th className="py-2 px-3 text-right">Minimum Month</th>
                  <th className="py-2 px-3 text-center">Active Months</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {yearlyRows.map((yr) => (
                  <tr key={yr.year} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-800">{yr.year}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                      {Math.round(yr.totalConsumption).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {Math.round(yr.monthlyAverageActive * 10) / 10}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">
                      {Math.round(yr.monthlyAverageCalendar * 10) / 10}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-600 font-medium">
                      {Math.round(yr.maximumMonthly)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">
                      {Math.round(yr.minimumMonthly)}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-600">
                      {yr.activeMonthsCount} / 12
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: Inventory & Reorder Point Diagnostic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-2">
                <Boxes className="w-4 h-4 text-slate-600" />
                <span>Stock Coverage</span>
              </div>
              <div className="text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Current Stock:</span>
                  <span className="font-semibold text-slate-900">
                    {m.currentStock} {m.uom}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Stock Coverage:</span>
                  <span className="font-bold text-indigo-600">
                    {m.stockCoverageDays !== null ? `${m.stockCoverageDays} Days` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Coverage Status:</span>
                  <span className="font-semibold">{m.stockCoverageCategory}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Lead Time Demand</span>
              </div>
              <div className="text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Supplier Lead Time:</span>
                  <span className="font-semibold text-slate-900">{m.leadTimeDays} Days</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Consumption:</span>
                  <span className="font-mono text-slate-900">
                    {(m.forecastMonthlyConsumption / 30).toFixed(1)} {m.uom}/day
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Lead Time Demand:</span>
                  <span className="font-bold text-slate-900">
                    {Math.round(m.leadTimeDemand)} {m.uom}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-2">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                <span>Reorder Point (ROP)</span>
              </div>
              <div className="text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Reorder Point:</span>
                  <span className="font-bold text-indigo-600">
                    {Math.round(m.reorderPoint)} {m.uom}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Confirmed Open PO:</span>
                  <span className="font-semibold text-slate-900">
                    {m.incomingQuantity} {m.uom}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Reorder Trigger:</span>
                  <span
                    className={`font-semibold ${
                      m.currentStock < m.reorderPoint ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {m.currentStock < m.reorderPoint ? 'Stock Below ROP' : 'Stock Above ROP'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={() => setSelectedMaterial(null)}
            className="text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
