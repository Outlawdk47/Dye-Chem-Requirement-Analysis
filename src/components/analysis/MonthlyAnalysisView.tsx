import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Filter,
  Search,
  LineChart as LineChartIcon,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MonthlyAnalysisView: React.FC = () => {
  const { metrics, records } = useApp();

  // All distinct years available
  const availableYears = useMemo(() => {
    const yrSet = new Set<number>();
    metrics.forEach((m) => {
      Object.keys(m.yearlyBreakdown).forEach((y) => yrSet.add(Number(y)));
    });
    return Array.from(yrSet).sort((a, b) => b - a); // descending
  }, [metrics]);

  const [selectedYear, setSelectedYear] = useState<number>(
    availableYears[0] || new Date().getFullYear()
  );
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = useMemo(() => {
    return Array.from(new Set(metrics.map((m) => m.category))).filter(Boolean);
  }, [metrics]);

  // Aggregate monthly consumption matrix for the selected year
  const monthlyMatrix = useMemo(() => {
    let list = [...metrics];

    if (selectedCategory !== 'ALL') {
      list = list.filter((m) => m.category === selectedCategory);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.materialCode.toLowerCase().includes(q) ||
          m.materialName.toLowerCase().includes(q)
      );
    }

    return list.map((m) => {
      const yearStats = m.yearlyBreakdown[selectedYear];
      const monthValues: Record<number, number> = {};
      for (let i = 1; i <= 12; i++) {
        monthValues[i] = 0;
      }

      if (yearStats) {
        yearStats.monthlyData.forEach((d) => {
          monthValues[d.month] = d.quantity;
        });
      }

      const total = yearStats ? yearStats.totalConsumption : 0;
      const avg = yearStats ? yearStats.monthlyAverageActive : 0;

      return {
        materialCode: m.materialCode,
        materialName: m.materialName,
        category: m.category,
        uom: m.uom,
        months: monthValues,
        total,
        avg,
      };
    });
  }, [metrics, selectedYear, selectedCategory, searchTerm]);

  // Chart data: monthly trend for top 5 materials in that year
  const chartTrendData = useMemo(() => {
    const topMaterials = [...monthlyMatrix]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return MONTH_NAMES.map((mName, idx) => {
      const monthNum = idx + 1;
      const point: Record<string, any> = { month: mName };

      topMaterials.forEach((m) => {
        point[m.materialCode] = m.months[monthNum] || 0;
      });

      return point;
    });
  }, [monthlyMatrix]);

  const topMaterialsForLegend = useMemo(() => {
    return [...monthlyMatrix].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [monthlyMatrix]);

  const LINE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Controls & Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-indigo-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-700 text-xs"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
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

        <div className="text-xs text-slate-500 font-medium">
          Showing monthly consumption for{' '}
          <span className="font-bold text-slate-900">{monthlyMatrix.length}</span> materials in{' '}
          <span className="font-bold text-indigo-600">{selectedYear}</span>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Monthly Consumption Pattern ({selectedYear})
            </h3>
            <p className="text-[11px] text-slate-500">
              Seasonal trends for top consuming materials in selected year
            </p>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {topMaterialsForLegend.map((m, idx) => (
                <Line
                  key={m.materialCode}
                  type="monotone"
                  dataKey={m.materialCode}
                  name={`${m.materialCode} (${m.materialName.slice(0, 15)})`}
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Consumption Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {selectedYear} Month-by-Month Consumption Matrix
          </h3>
          <span className="text-[11px] text-slate-400">Values in respective material UOM</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 sticky left-0 bg-slate-100 z-10 shadow-xs">Material</th>
                <th className="py-2.5 px-2 text-center">UOM</th>
                {MONTH_NAMES.map((m) => (
                  <th key={m} className="py-2.5 px-2 text-right">
                    {m}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right bg-indigo-50/60 font-bold text-indigo-900">
                  Annual Total
                </th>
                <th className="py-2.5 px-3 text-right bg-slate-100">Monthly Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyMatrix.map((item, index) => (
                <tr key={`${item.materialCode}_${item.materialName}_${index}`} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 sticky left-0 bg-white z-10 shadow-xs">
                    <div className="font-semibold text-slate-900">{item.materialName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.materialCode}</div>
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-500">
                    {item.uom}
                  </td>
                  {MONTH_NAMES.map((_, idx) => {
                    const val = item.months[idx + 1] || 0;
                    return (
                      <td
                        key={idx}
                        className={`py-2.5 px-2 text-right font-mono text-[11px] ${
                          val > 0 ? 'text-slate-800' : 'text-slate-300'
                        }`}
                      >
                        {val > 0 ? Math.round(val).toLocaleString() : '-'}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/40">
                    {Math.round(item.total).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700 bg-slate-50/40">
                    {Math.round(item.avg * 10) / 10}
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
