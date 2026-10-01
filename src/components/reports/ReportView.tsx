import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Calendar,
  Layers,
  AlertTriangle,
  Info,
  Clock,
  Package,
} from 'lucide-react';
import { exportAnalysisToExcel, exportAnalysisToPDF } from '../../utils/exportUtils';

export const ReportView: React.FC = () => {
  const { metrics, summary, settings, currentDataset, issues } = useApp();

  const handleExportExcel = () => {
    exportAnalysisToExcel(metrics, summary, settings, currentDataset, issues);
  };

  const handleExportPDF = () => {
    exportAnalysisToPDF(metrics, summary, settings, currentDataset);
  };

  const criticalItems = metrics.filter(
    (m) => m.purchasingPriority === 'Immediate' || m.stockCoverageCategory === 'Critical'
  );
  const excessItems = metrics.filter((m) => m.stockCoverageCategory === 'Excess');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Export Buttons */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
            Official Production Plan
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Purchasing Requirement Formal Report</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-ready report ready for factory general manager, procurement head, and finance department.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export 9-Sheet Excel Workbook</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs transition"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Executive PDF</span>
          </button>
        </div>
      </div>

      {/* Report Document Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-8 text-xs text-slate-700 font-sans">
        {/* Section 1: Executive Summary */}
        <section className="space-y-3 border-b pb-6 border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                1. Executive Summary & Period Overview
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dataset: {currentDataset?.fileName || 'Active Dataset'} • Uploaded:{' '}
                {currentDataset?.uploadedAt
                  ? new Date(currentDataset.uploadedAt).toLocaleDateString()
                  : 'N/A'}{' '}
                • Historical Period: {currentDataset?.yearsCovered || 'Multi-Year'}
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Report Date: {new Date().toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px]">Total SKUs Managed</span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">{summary.totalMaterials}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px]">Items Requiring Purchase</span>
              <div className="text-lg font-bold text-indigo-600 mt-0.5">
                {summary.materialsRequiringPurchase}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px]">Critical Items (&lt;7d)</span>
              <div className="text-lg font-bold text-rose-600 mt-0.5">
                {summary.criticalMaterialsCount}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px]">Recommended Purchase Units</span>
              <div className="text-lg font-bold text-emerald-600 mt-0.5">
                {Math.round(summary.totalPurchasingRequirement).toLocaleString()}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Complete Material & Purchasing Analysis (All Items) */}
        <section className="space-y-3 border-b pb-6 border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                2. Complete Material & Purchasing Analysis (All {metrics.length} Items)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comprehensive inventory status, consumption forecasts, stock coverage, and purchase recommendations for all catalog items.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
              Total {metrics.length} Materials
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">ITEMS NAME</th>
                  <th className="py-2.5 px-3">Sheet / Dept</th>
                  <th className="py-2.5 px-2 text-center">UOM</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Forecast/Mo</th>
                  <th className="py-2.5 px-3 text-right">Incoming PO</th>
                  <th className="py-2.5 px-3 text-right font-bold text-indigo-900">Net Purchase Req</th>
                  <th className="py-2.5 px-3 text-center">Coverage (Days)</th>
                  <th className="py-2.5 px-3 text-center">Priority Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {metrics.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400 font-sans">
                      No materials found in active dataset.
                    </td>
                  </tr>
                ) : (
                  metrics.map((m, index) => (
                    <tr key={`${m.materialCode}_${m.materialName}_${m.sheetName || 'gen'}_${index}`} className="hover:bg-slate-50 font-sans">
                      <td className="py-2 px-3 font-semibold text-slate-900 font-mono">{m.materialCode}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{m.materialName}</td>
                      <td className="py-2 px-3 text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          {m.sheetName || m.department || 'General Sheet'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-slate-500 font-mono text-[10px]">{m.uom}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {Math.round(m.currentStock).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {Math.round(m.forecastMonthlyConsumption).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {Math.round(m.incomingQuantity).toLocaleString()}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Critical Stock Replenishment Priority */}
        <section className="space-y-3 border-b pb-6 border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              3. Critical Stock Replenishment Priority
            </h3>
          </div>
          <p className="text-[11px] text-slate-500">
            Materials where current inventory is below safe lead-time demand or less than{' '}
            {settings.criticalStockDays} days of coverage.
          </p>

          <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-rose-50 text-rose-900 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Code</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-2 text-center">UOM</th>
                <th className="py-2 px-3 text-right">Current Stock</th>
                <th className="py-2 px-3 text-center">Coverage</th>
                <th className="py-2 px-3 text-right">Lead Time</th>
                <th className="py-2 px-3 text-right font-bold text-indigo-900">
                  Net Purchasing Req
                </th>
                <th className="py-2 px-3">Primary Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {criticalItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400">
                    No critical stockout risks detected at this time.
                  </td>
                </tr>
              ) : (
                criticalItems.map((m, index) => (
                  <tr key={`${m.materialCode}_${m.materialName}_${index}`}>
                    <td className="py-2 px-3 font-semibold text-slate-900">{m.materialCode}</td>
                    <td className="py-2 px-3 text-slate-700">{m.materialName}</td>
                    <td className="py-2 px-2 text-center text-slate-500 font-mono">{m.uom}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                      {m.currentStock}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-rose-600 font-mono">
                      {m.stockCoverageDays !== null ? `${m.stockCoverageDays}d` : 'N/A'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{m.leadTimeDays}d</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-indigo-600">
                      {Math.round(m.netPurchasingRequirement).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">{m.supplier}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Section 3: Excess Stock Diagnostic */}
        <section className="space-y-3 border-b pb-6 border-slate-100">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              3. Overstocked Inventory (Working Capital Alert)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500">
            Materials where current stock on hand exceeds {settings.excessStockDays} days of consumption.
            Purchasing should be paused to free up working capital.
          </p>

          <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-purple-50 text-purple-900 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Code</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-2 text-center">UOM</th>
                <th className="py-2 px-3 text-right">Current Stock</th>
                <th className="py-2 px-3 text-center">Coverage (Days)</th>
                <th className="py-2 px-3 text-right">Monthly Consumption</th>
                <th className="py-2 px-3 text-right">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {excessItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-slate-400">
                    No excess inventory detected. Stock is well balanced.
                  </td>
                </tr>
              ) : (
                excessItems.map((m, index) => (
                  <tr key={`${m.materialCode}_${m.materialName}_${index}`}>
                    <td className="py-2 px-3 font-semibold text-slate-900">{m.materialCode}</td>
                    <td className="py-2 px-3 text-slate-700">{m.materialName}</td>
                    <td className="py-2 px-2 text-center text-slate-500 font-mono">{m.uom}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-purple-700">
                      {m.currentStock}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-purple-700">
                      {m.stockCoverageDays}d
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      {Math.round(m.forecastMonthlyConsumption)}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-purple-800">
                      Pause procurement / Reallocate
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Section 4: Calculation Assumptions & Audit Trail */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            4. Calculation Logic & Audit Assumptions
          </h3>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-[11px] text-slate-700">
            <div>
              <span className="font-bold text-indigo-700">FORECAST FORMULA:</span> Weighted historical
              average: Latest Year ({settings.weightLatestYear}%), Previous Year (
              {settings.weightPrevYear}%), Older ({settings.weightOlderYears}%).
            </div>
            <div>
              <span className="font-bold text-indigo-700">PLANNING REQUIREMENT:</span> Forecast Monthly
              Demand × {settings.planningPeriodMonths} Planning Months.
            </div>
            <div>
              <span className="font-bold text-indigo-700">SAFETY STOCK:</span> Forecast Monthly Demand ×{' '}
              {settings.safetyStockPct}%.
            </div>
            <div>
              <span className="font-bold text-indigo-700">NET PURCHASING REQUIREMENT:</span> MAX(0,
              Gross Requirement - Current Stock - Confirmed Incoming POs).
            </div>
            <div>
              <span className="font-bold text-indigo-700">COVERAGE THRESHOLDS:</span> Critical &lt;{' '}
              {settings.criticalStockDays}d, Low {settings.criticalStockDays}–{settings.lowStockDays}d,
              Normal {settings.lowStockDays}–{settings.normalStockDays}d, Excess &gt;{' '}
              {settings.excessStockDays}d.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
