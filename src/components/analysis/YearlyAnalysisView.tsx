import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Layers,
  Award,
  ArrowUpDown,
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
} from 'recharts';

export const YearlyAnalysisView: React.FC = () => {
  const { metrics } = useApp();

  // Extract all distinct years
  const allYears = useMemo(() => {
    const yrSet = new Set<number>();
    metrics.forEach((m) => {
      Object.keys(m.yearlyBreakdown).forEach((y) => yrSet.add(Number(y)));
    });
    return Array.from(yrSet).sort((a, b) => a - b);
  }, [metrics]);

  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Total company consumption by year
  const companyYearlySummary = useMemo(() => {
    return allYears.map((yr) => {
      let total = 0;
      metrics.forEach((m) => {
        total += m.yearlyBreakdown[yr]?.totalConsumption || 0;
      });
      return {
        year: yr,
        totalConsumption: Math.round(total),
      };
    });
  }, [allYears, metrics]);

  // Category-wise consumption by year
  const categoryYearlyData = useMemo(() => {
    const cats = Array.from(new Set(metrics.map((m) => m.category)));
    return allYears.map((yr) => {
      const entry: Record<string, any> = { year: yr };
      cats.forEach((cat) => {
        const catTotal = metrics
          .filter((m) => m.category === cat)
          .reduce((sum, m) => sum + (m.yearlyBreakdown[yr]?.totalConsumption || 0), 0);
        entry[cat] = Math.round(catTotal);
      });
      return entry;
    });
  }, [allYears, metrics]);

  const categories = useMemo(() => {
    return Array.from(new Set(metrics.map((m) => m.category)));
  }, [metrics]);

  // Highest and lowest consuming materials
  const sortedByLatestConsumption = useMemo(() => {
    return [...metrics].sort((a, b) => b.latestYearConsumption - a.latestYearConsumption);
  }, [metrics]);

  const highestConsuming = sortedByLatestConsumption.slice(0, 5);
  const lowestConsuming = [...sortedByLatestConsumption].reverse().slice(0, 5);

  const filteredMetrics = useMemo(() => {
    if (selectedCategory === 'ALL') return metrics;
    return metrics.filter((m) => m.category === selectedCategory);
  }, [metrics, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {companyYearlySummary.map((item, idx) => {
          const prev = idx > 0 ? companyYearlySummary[idx - 1] : null;
          const yoy =
            prev && prev.totalConsumption > 0
              ? ((item.totalConsumption - prev.totalConsumption) / prev.totalConsumption) * 100
              : null;

          return (
            <div key={item.year} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{item.year} Annual Total</span>
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Calendar className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {item.totalConsumption.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">units</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {yoy !== null ? (
                  <span
                    className={`font-semibold inline-flex items-center gap-0.5 ${
                      yoy > 0 ? 'text-emerald-600' : yoy < 0 ? 'text-rose-600' : 'text-slate-600'
                    }`}
                  >
                    {yoy > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {yoy.toFixed(1)}% vs previous year
                  </span>
                ) : (
                  <span>Baseline historical year</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Yearly Multi-Bar Comparison Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Total Factory Consumption by Year</h3>
            <p className="text-[11px] text-slate-500">
              Aggregated historical consumption across all registered plant materials
            </p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={companyYearlySummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} units`, 'Total']} />
              <Bar dataKey="totalConsumption" fill="#6366f1" radius={[4, 4, 0, 0]} name="Consumption" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Highest & Lowest Consuming Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Top 5 Consuming Materials (Latest Year)
            </h4>
          </div>
          <div className="space-y-2">
            {highestConsuming.map((m, idx) => (
              <div
                key={m.materialCode}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900">{m.materialName}</div>
                    <div className="text-[10px] text-slate-400">{m.materialCode}</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-slate-900">
                  {Math.round(m.latestYearConsumption).toLocaleString()} {m.uom}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Lowest Consuming Materials
            </h4>
          </div>
          <div className="space-y-2">
            {lowestConsuming.map((m, idx) => (
              <div
                key={m.materialCode}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900">{m.materialName}</div>
                    <div className="text-[10px] text-slate-400">{m.materialCode}</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-slate-700">
                  {Math.round(m.latestYearConsumption).toLocaleString()} {m.uom}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Year Material Comparative Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Multi-Year Material Consumption Matrix
            </h3>
            <p className="text-[11px] text-slate-500">
              Comparative annual consumption, active monthly average, and maximum monthly usage
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-medium"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Material</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">UOM</th>
                {allYears.map((yr) => (
                  <th key={yr} colSpan={3} className="py-2.5 px-3 text-center border-l border-slate-200 bg-slate-100/70">
                    {yr} Statistics
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right">YoY Growth %</th>
              </tr>
              <tr className="bg-slate-50 text-slate-500 text-[10px] border-b border-slate-200">
                <th colSpan={3}></th>
                {allYears.map((yr) => (
                  <React.Fragment key={`sub-${yr}`}>
                    <th className="py-1 px-2 text-right border-l border-slate-200 font-medium">Total</th>
                    <th className="py-1 px-2 text-right font-medium">Active Avg</th>
                    <th className="py-1 px-2 text-right font-medium">Max Mo</th>
                  </React.Fragment>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMetrics.map((m, index) => (
                <tr key={`${m.materialCode}_${m.materialName}_${index}`} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{m.materialName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{m.materialCode}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{m.category}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">{m.uom}</td>

                  {allYears.map((yr) => {
                    const stats = m.yearlyBreakdown[yr];
                    return (
                      <React.Fragment key={`cell-${yr}-${m.materialCode}-${index}`}>
                        <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-900 border-l border-slate-100">
                          {stats ? Math.round(stats.totalConsumption).toLocaleString() : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                          {stats ? Math.round(stats.monthlyAverageActive * 10) / 10 : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-emerald-600">
                          {stats ? Math.round(stats.maximumMonthly) : '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {m.yoyGrowthPct !== null ? (
                      <span
                        className={
                          m.yoyGrowthPct > 0
                            ? 'text-emerald-600'
                            : m.yoyGrowthPct < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }
                      >
                        {m.yoyGrowthPct > 0 ? '+' : ''}
                        {m.yoyGrowthPct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
