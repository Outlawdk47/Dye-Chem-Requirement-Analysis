import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Columns,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { MaterialAnalysisMetric, PurchasingPriority, StockCoverageCategory } from '../../types';
import { exportAnalysisToExcel } from '../../utils/exportUtils';

interface ColumnConfig {
  key: keyof MaterialAnalysisMetric | 'actions' | 'calculation';
  label: string;
  visible: boolean;
  align?: 'left' | 'right' | 'center';
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'materialCode', label: 'Material Code', visible: true, align: 'left' },
  { key: 'materialName', label: 'ITEMS NAME', visible: true, align: 'left' },
  { key: 'rawMaterialName', label: 'Original Excel Item Name', visible: true, align: 'left' },
  { key: 'category', label: 'Category', visible: true, align: 'left' },
  { key: 'uom', label: 'UOM', visible: true, align: 'center' },
  { key: 'purchasingPriority', label: 'Priority', visible: true, align: 'center' },
  { key: 'currentStock', label: 'Current Stock', visible: true, align: 'right' },
  { key: 'overallMonthlyAverageActive', label: 'Avg Monthly', visible: true, align: 'right' },
  { key: 'overallMaximumMonthly', label: 'Max Monthly', visible: false, align: 'right' },
  { key: 'overallMinimumMonthly', label: 'Min Monthly', visible: false, align: 'right' },
  { key: 'latestYearConsumption', label: 'Latest Yr Total', visible: false, align: 'right' },
  { key: 'yoyGrowthPct', label: 'YoY Growth', visible: true, align: 'right' },
  { key: 'forecastMonthlyConsumption', label: 'Forecast/Mo', visible: true, align: 'right' },
  { key: 'safetyStock', label: 'Safety Stock', visible: true, align: 'right' },
  { key: 'planningRequirement', label: 'Planning Req', visible: true, align: 'right' },
  { key: 'grossRequirement', label: 'Gross Req', visible: false, align: 'right' },
  { key: 'incomingQuantity', label: 'Incoming Qty', visible: true, align: 'right' },
  { key: 'netPurchasingRequirement', label: 'Net Purchase Req', visible: true, align: 'right' },
  { key: 'stockCoverageDays', label: 'Coverage (Days)', visible: true, align: 'center' },
  { key: 'leadTimeDays', label: 'Lead Time', visible: false, align: 'center' },
  { key: 'reorderPoint', label: 'ROP', visible: true, align: 'right' },
  { key: 'abcClass', label: 'ABC', visible: true, align: 'center' },
];

export const MaterialAnalysisTable: React.FC = () => {
  const { metrics, summary, settings, currentDataset, issues, setSelectedMaterial } = useApp();

  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [showColPicker, setShowColPicker] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [coverageFilter, setCoverageFilter] = useState<string>('ALL');
  const [abcFilter, setAbcFilter] = useState('ALL');

  // Sorting
  const [sortField, setSortField] = useState<keyof MaterialAnalysisMetric>('priorityScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Categories list
  const categories = useMemo(() => {
    return Array.from(new Set(metrics.map((m) => m.category))).filter(Boolean);
  }, [metrics]);

  // Filtering & Sorting
  const filteredMetrics = useMemo(() => {
    let result = [...metrics];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.materialCode.toLowerCase().includes(q) ||
          m.materialName.toLowerCase().includes(q) ||
          m.supplier.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter((m) => m.category === categoryFilter);
    }

    if (priorityFilter !== 'ALL') {
      result = result.filter((m) => m.purchasingPriority === priorityFilter);
    }

    if (coverageFilter !== 'ALL') {
      result = result.filter((m) => m.stockCoverageCategory === coverageFilter);
    }

    if (abcFilter !== 'ALL') {
      result = result.filter((m) => m.abcClass === abcFilter);
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA === null || valA === undefined) valA = sortDirection === 'asc' ? Infinity : -Infinity;
      if (valB === null || valB === undefined) valB = sortDirection === 'asc' ? Infinity : -Infinity;

      if (typeof valA === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [
    metrics,
    searchTerm,
    categoryFilter,
    priorityFilter,
    coverageFilter,
    abcFilter,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredMetrics.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMetrics.slice(start, start + pageSize);
  }, [filteredMetrics, currentPage, pageSize]);

  const handleSort = (field: keyof MaterialAnalysisMetric) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const getPriorityBadge = (p: PurchasingPriority) => {
    switch (p) {
      case 'Immediate':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getCoverageBadge = (c: StockCoverageCategory) => {
    switch (c) {
      case 'Critical':
        return 'text-rose-600 font-bold';
      case 'Low':
        return 'text-orange-600 font-semibold';
      case 'Normal':
        return 'text-emerald-600';
      case 'Excess':
        return 'text-purple-600 font-medium';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Search, Filters, Column Visibility & Export */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code, description, or supplier..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowColPicker(!showColPicker)}
                className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-slate-100"
              >
                <Columns className="w-3.5 h-3.5 text-slate-500" />
                <span>Columns ({columns.filter((c) => c.visible).length})</span>
              </button>

              {/* Column picker dropdown */}
              {showColPicker && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-30 space-y-2 max-h-80 overflow-y-auto">
                  <div className="text-xs font-bold text-slate-900 border-b pb-1 flex justify-between">
                    <span>Toggle Visible Columns</span>
                    <button
                      onClick={() => setShowColPicker(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>
                  {columns.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 text-xs text-slate-700 hover:bg-slate-50 p-1 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => exportAnalysisToExcel(metrics, summary, settings, currentDataset, issues)}
              className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-emerald-100 transition"
              title="Download Excel Sheet with full formulas"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Table</span>
            </button>
          </div>
        </div>

        {/* Filter Pills row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700 font-medium"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700 font-medium"
          >
            <option value="ALL">All Priorities</option>
            <option value="Immediate">Immediate Priority</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
            <option value="No Purchase Required">No Purchase Required</option>
          </select>

          {/* Coverage */}
          <select
            value={coverageFilter}
            onChange={(e) => {
              setCoverageFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700 font-medium"
          >
            <option value="ALL">All Stock Coverage</option>
            <option value="Critical">Critical (&lt; 7 days)</option>
            <option value="Low">Low (7–15 days)</option>
            <option value="Normal">Normal (15–45 days)</option>
            <option value="Excess">Excess (&gt; 45 days)</option>
          </select>

          {/* ABC */}
          <select
            value={abcFilter}
            onChange={(e) => {
              setAbcFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700 font-medium"
          >
            <option value="ALL">All ABC Classes</option>
            <option value="A">Class A (High Value)</option>
            <option value="B">Class B (Medium Value)</option>
            <option value="C">Class C (Low Value)</option>
          </select>

          {(categoryFilter !== 'ALL' ||
            priorityFilter !== 'ALL' ||
            coverageFilter !== 'ALL' ||
            abcFilter !== 'ALL' ||
            searchTerm) && (
            <button
              onClick={() => {
                setCategoryFilter('ALL');
                setPriorityFilter('ALL');
                setCoverageFilter('ALL');
                setAbcFilter('ALL');
                setSearchTerm('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline ml-2"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-slate-500 text-[11px]">
            Showing <span className="font-semibold text-slate-800">{filteredMetrics.length}</span>{' '}
            materials
          </div>
        </div>
      </div>

      {/* Main Analytical 20-Column Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 select-none">
              <tr>
                {columns
                  .filter((c) => c.visible)
                  .map((col) => {
                    const isSorted = sortField === col.key;
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key as keyof MaterialAnalysisMetric)}
                        className={`py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        <div
                          className={`inline-flex items-center gap-1.5 ${
                            col.align === 'right' ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <span>{col.label}</span>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.filter((c) => c.visible).length + 1}
                    className="text-center py-12 text-slate-400"
                  >
                    No materials matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedData.map((m, index) => {
                  return (
                    <tr
                      key={`${m.materialCode}_${m.materialName}_${m.sheetName || m.category}_${index}`}
                      onClick={() => setSelectedMaterial(m)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition"
                    >
                      {columns
                        .filter((c) => c.visible)
                        .map((col) => {
                          const key = col.key as keyof MaterialAnalysisMetric;

                          // Custom renderings
                          if (key === 'materialCode') {
                            return (
                              <td key={key} className="py-2.5 px-3 font-semibold text-slate-900">
                                {m.materialCode}
                              </td>
                            );
                          }

                          if (key === 'materialName') {
                            return (
                              <td key={key} className="py-2.5 px-3 font-medium text-slate-800 max-w-[220px] truncate" title={m.materialName}>
                                {m.materialName}
                              </td>
                            );
                          }

                          if (key === 'rawMaterialName') {
                            return (
                              <td key={key} className="py-2.5 px-3 font-mono text-[11px] text-slate-700 bg-emerald-50/20 font-medium max-w-[220px] truncate" title={m.rawMaterialName || m.materialName}>
                                {m.rawMaterialName || m.materialName}
                              </td>
                            );
                          }

                          if (key === 'purchasingPriority') {
                            return (
                              <td key={key} className="py-2.5 px-3 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadge(
                                    m.purchasingPriority
                                  )}`}
                                >
                                  {m.purchasingPriority}
                                </span>
                              </td>
                            );
                          }

                          if (key === 'stockCoverageDays') {
                            return (
                              <td key={key} className={`py-2.5 px-3 text-center font-mono ${getCoverageBadge(m.stockCoverageCategory)}`}>
                                {m.stockCoverageDays !== null ? `${m.stockCoverageDays}d` : 'N/A'}
                              </td>
                            );
                          }

                          if (key === 'netPurchasingRequirement') {
                            return (
                              <td key={key} className="py-2.5 px-3 text-right">
                                <span
                                  className={`font-bold font-mono ${
                                    m.netPurchasingRequirement > 0
                                      ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {Math.round(m.netPurchasingRequirement).toLocaleString()}{' '}
                                  <span className="text-[10px] text-slate-400 font-normal">{m.uom}</span>
                                </span>
                              </td>
                            );
                          }

                          if (key === 'yoyGrowthPct') {
                            return (
                              <td key={key} className="py-2.5 px-3 text-right font-mono text-[11px]">
                                {m.yoyGrowthPct !== null ? (
                                  <span
                                    className={`inline-flex items-center gap-0.5 ${
                                      m.yoyGrowthPct > 0
                                        ? 'text-emerald-600 font-semibold'
                                        : m.yoyGrowthPct < 0
                                        ? 'text-rose-600 font-semibold'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    {m.yoyGrowthPct > 0 ? (
                                      <TrendingUp className="w-3 h-3" />
                                    ) : m.yoyGrowthPct < 0 ? (
                                      <TrendingDown className="w-3 h-3" />
                                    ) : (
                                      <Minus className="w-3 h-3" />
                                    )}
                                    {m.yoyGrowthPct.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            );
                          }

                          if (key === 'abcClass') {
                            return (
                              <td key={key} className="py-2.5 px-3 text-center">
                                <span
                                  className={`inline-block w-5 h-5 text-center leading-5 rounded text-[10px] font-bold ${
                                    m.abcClass === 'A'
                                      ? 'bg-rose-100 text-rose-800'
                                      : m.abcClass === 'B'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {m.abcClass}
                                </span>
                              </td>
                            );
                          }

                          // Default numeric formatting
                          const rawVal = m[key];
                          if (typeof rawVal === 'number') {
                            return (
                              <td key={key} className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {Math.round(rawVal * 10) / 10}
                              </td>
                            );
                          }

                          if (typeof rawVal === 'string') {
                            return (
                              <td key={key} className="py-2.5 px-3 text-slate-600">
                                {rawVal}
                              </td>
                            );
                          }

                          return (
                            <td key={key} className="py-2.5 px-3 text-slate-400">
                              -
                            </td>
                          );
                        })}

                      {/* Action Cell */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedMaterial(m)}
                          className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          title="View In-Depth Calculation & Trend Breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 font-medium"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              Page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
              <span className="font-semibold text-slate-800">{totalPages}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
