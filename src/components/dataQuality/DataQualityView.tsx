import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertCircle,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Download,
  Filter,
  Search,
  FileSpreadsheet,
} from 'lucide-react';
import { exportIssuesToCSV } from '../../utils/exportUtils';

export const DataQualityView: React.FC = () => {
  const { issues, currentDataset, summary } = useApp();

  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'warning' | 'invalid'>('ALL');
  const [fieldFilter, setFieldFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const distinctFields = useMemo(() => {
    return Array.from(new Set(issues.map((i) => i.field)));
  }, [issues]);

  const filteredIssues = useMemo(() => {
    let list = [...issues];
    if (severityFilter !== 'ALL') {
      list = list.filter((i) => i.severity === severityFilter);
    }
    if (fieldFilter !== 'ALL') {
      list = list.filter((i) => i.field === fieldFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (i) =>
          i.message.toLowerCase().includes(q) ||
          (i.materialCode && i.materialCode.toLowerCase().includes(q))
      );
    }
    return list;
  }, [issues, severityFilter, fieldFilter, searchTerm]);

  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const invalidCount = issues.filter((i) => i.severity === 'invalid').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Data Quality & Validation Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of warnings, non-critical auto-adjustments, and invalid records encountered in{' '}
            <span className="font-semibold text-slate-800">{currentDataset?.fileName || 'dataset'}</span>.
          </p>
        </div>

        {issues.length > 0 && (
          <button
            onClick={() => exportIssuesToCSV(issues)}
            className="text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Issues CSV</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span>Total Quality Flags</span>
            <AlertCircle className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{issues.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across entire uploaded dataset</div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-xs text-amber-900">
          <div className="flex items-center justify-between text-amber-700">
            <span>Warnings (Auto-Normalized)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-2">{warningCount}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">
            E.g. Negative values made positive, UOM standardized
          </div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-xs text-rose-900">
          <div className="flex items-center justify-between text-rose-700">
            <span>Invalid Rows (Excluded)</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-800 mt-2">{invalidCount}</div>
          <div className="text-[11px] text-rose-700 mt-0.5">
            Missing required keys or corrupt quantities
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-700 font-medium"
          >
            <option value="ALL">All Severities</option>
            <option value="warning">Warnings Only</option>
            <option value="invalid">Invalid Only</option>
          </select>

          <span className="text-slate-500 font-medium ml-2">Field:</span>
          <select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-700 font-medium"
          >
            <option value="ALL">All Fields</option>
            {distinctFields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search issue message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredIssues.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <div className="font-semibold text-slate-700">No data quality issues found!</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              The dataset adheres cleanly to all schema constraints and numerical requirements.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Excel Row #</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Affected Field</th>
                  <th className="py-2.5 px-3">Material Code</th>
                  <th className="py-2.5 px-3">Detailed Issue Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIssues.map((issue, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      Row {issue.rowNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          issue.severity === 'invalid'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {issue.severity === 'invalid' ? (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                        )}
                        {issue.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{issue.field}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {issue.materialCode || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-md truncate" title={issue.message}>
                      {issue.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
