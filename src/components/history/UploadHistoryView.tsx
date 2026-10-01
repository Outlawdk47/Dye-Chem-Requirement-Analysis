import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  History,
  FileSpreadsheet,
  CheckCircle2,
  Archive,
  Trash2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

export const UploadHistoryView: React.FC = () => {
  const {
    datasets,
    currentDataset,
    selectDataset,
    archiveDataset,
    removeDataset,
    refreshDatasets,
    showToast,
  } = useApp();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dataset Upload History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit log of uploaded spreadsheets, normalized database records, and active analytical models.
          </p>
        </div>

        <button
          onClick={refreshDatasets}
          className="text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Database List</span>
        </button>
      </div>

      {/* Dataset Cards List */}
      <div className="space-y-3">
        {datasets.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Uploaded Datasets</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Please upload your factory consumption and stock Excel spreadsheets in the "Upload Excel File" tab to start analyzing requirements.
            </p>
          </div>
        ) : (
          datasets.map((dataset) => {
            const isActive = currentDataset?.id === dataset.id;

            return (
              <div
                key={dataset.id}
                className={`bg-white rounded-xl border p-4 transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Left Info */}
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{dataset.fileName}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                          Active Dataset
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          dataset.status === 'analyzed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : dataset.status === 'archived'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {dataset.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-500 mt-1">
                      <span>
                        Uploaded:{' '}
                        <strong className="text-slate-700">
                          {new Date(dataset.uploadedAt).toLocaleString()}
                        </strong>
                      </span>
                      <span>
                        Rows:{' '}
                        <strong className="text-slate-700 font-mono">
                          {dataset.rowCount.toLocaleString()}
                        </strong>
                      </span>
                      <span>
                        Materials:{' '}
                        <strong className="text-slate-700 font-mono">
                          {dataset.materialCount || '-'}
                        </strong>
                      </span>
                      {dataset.yearsCovered && (
                        <span>
                          Years: <strong className="text-slate-700">{dataset.yearsCovered}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {!isActive ? (
                    <button
                      onClick={() => selectDataset(dataset.id)}
                      className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Load & Analyze</span>
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Loaded in Memory
                    </span>
                  )}

                  {dataset.status !== 'archived' && (
                    <button
                      onClick={() => archiveDataset(dataset.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      title="Archive dataset"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to permanently delete "${dataset.fileName}"?`
                        )
                      ) {
                        removeDataset(dataset.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Delete dataset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
