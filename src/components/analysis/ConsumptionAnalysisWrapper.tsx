import React, { useState } from 'react';
import { YearlyAnalysisView } from './YearlyAnalysisView';
import { MonthlyAnalysisView } from './MonthlyAnalysisView';
import { Calendar, BarChart2, Grid } from 'lucide-react';

export const ConsumptionAnalysisWrapper: React.FC = () => {
  const [subTab, setSubTab] = useState<'yearly' | 'monthly'>('yearly');

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Consumption Analysis & History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Examine multi-year trends, annual totals, and month-by-month usage seasonality.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setSubTab('yearly')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              subTab === 'yearly'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Yearly Summary & Growth</span>
          </button>

          <button
            onClick={() => setSubTab('monthly')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              subTab === 'monthly'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Monthly Grid Matrix</span>
          </button>
        </div>
      </div>

      {subTab === 'yearly' ? <YearlyAnalysisView /> : <MonthlyAnalysisView />}
    </div>
  );
};
