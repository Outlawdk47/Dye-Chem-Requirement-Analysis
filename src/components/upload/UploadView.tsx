import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  FileCheck,
  HelpCircle,
  SlidersHorizontal,
  Table,
  Layers,
  Download,
  Sparkles,
  Loader2,
  Trash2,
  Database,
  KeyRound,
} from 'lucide-react';
import {
  parseExcelFile,
  getSheetData,
  autoDetectColumns,
  FIELD_DEFINITIONS,
  ExcelWorkbookInfo,
} from '../../utils/excelParser';
import { cleanAndNormalizeDataset, CleaningResult } from '../../utils/dataCleaner';
import { uploadExcelToStorage } from '../../firebase/services';
import { exportCleanedMasterExcel } from '../../utils/exportUtils';
import type { StandardField, ColumnMapping, DatasetMeta } from '../../types';

interface UploadViewProps {
  onImportComplete: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onImportComplete }) => {
  const { uploadExcelDataset, isUploading, uploadMessage, showToast, user, clearCacheAndResetData, signInWithGoogle, isDriveConnected } = useApp();

  const [file, setFile] = useState<File | null>(null);
  const [workbookInfo, setWorkbookInfo] = useState<ExcelWorkbookInfo | null>(null);
  const [workbookInstance, setWorkbookInstance] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [cleaningResult, setCleaningResult] = useState<CleaningResult | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'all' | 'valid' | 'warning' | 'invalid'>('all');
  const [showRawInspector, setShowRawInspector] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core processing function utilizing global non-unmounting state machine
  const processSelectedFile = async (selectedFile: File) => {
    if (!selectedFile) return;

    if (selectedFile.size > 50 * 1024 * 1024) {
      showToast('File exceeds 50 MB maximum recommended size.');
      return;
    }

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      showToast('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setFile(selectedFile);
    const success = await uploadExcelDataset(selectedFile);
    if (success) {
      onImportComplete();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processSelectedFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processSelectedFile(droppedFile);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (!workbookInstance) return;
    try {
      const info = getSheetData(workbookInstance, sheetName, workbookInfo?.headerRowIndex ?? 1);
      setWorkbookInfo(info);
      const detected = autoDetectColumns(info.headers);
      setColumnMapping(detected);

      const tempId = `ds_${Date.now()}`;
      const result = cleanAndNormalizeDataset(info.rawRows, detected, tempId);
      setCleaningResult(result);

      if (sheetName === '__ALL_SHEETS__') {
        showToast(`Combined all ${workbookInstance.SheetNames.length} worksheets!`);
      } else {
        showToast(`Switched to worksheet "${sheetName}".`);
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleHeaderRowChange = (newHeaderIndex: number) => {
    if (!workbookInstance || !workbookInfo) return;
    try {
      const info = getSheetData(workbookInstance, workbookInfo.selectedSheet, newHeaderIndex);
      setWorkbookInfo(info);
      const detected = autoDetectColumns(info.headers);
      setColumnMapping(detected);

      const tempId = `ds_${Date.now()}`;
      const result = cleanAndNormalizeDataset(info.rawRows, detected, tempId);
      setCleaningResult(result);

      showToast(`Header row set to Row ${newHeaderIndex + 1}. Columns updated!`);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleMappingChange = (excelHeader: string, standardField: StandardField | '') => {
    const updated: ColumnMapping = {
      ...columnMapping,
      [excelHeader]: standardField,
    };
    setColumnMapping(updated);

    if (workbookInfo) {
      const tempId = `ds_${Date.now()}`;
      const result = cleanAndNormalizeDataset(workbookInfo.rawRows, updated, tempId);
      setCleaningResult(result);
    }
  };

  const handleDownloadCleanedExcel = () => {
    if (!cleaningResult || cleaningResult.validRecords.length === 0) {
      showToast('No clean records to download yet.');
      return;
    }
    exportCleanedMasterExcel(cleaningResult.validRecords, file?.name || 'Cleaned_Master_File');
    showToast('Cleaned Master Excel file downloaded!');
  };

  const handleManualConfirmImport = async () => {
    if (!file) return;
    const success = await uploadExcelDataset(file);
    if (success) {
      onImportComplete();
    }
  };

  const mappedStandardFields = Object.values(columnMapping);
  const hasMaterialIdentifier =
    mappedStandardFields.includes('materialName') || mappedStandardFields.includes('materialCode');
  const hasQuantity = mappedStandardFields.includes('quantity');
  const canProceed = hasMaterialIdentifier && hasQuantity;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Upload & Clean Master Excel Data</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic 1-step upload: pulls all sheets using Row 2 headers, auto-maps columns, and generates report immediately.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearCacheAndResetData}
            className="text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-xs transition"
            title="Clear all cached and previous dataset records"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear Cache Data</span>
          </button>

          {cleaningResult && cleaningResult.validRecords.length > 0 && (
            <button
              onClick={handleDownloadCleanedExcel}
              className="text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 rounded-lg px-3 py-1.5 flex items-center gap-1.5 shadow-xs transition"
              title="Download standardized cleaned Excel file"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download Cleaned File</span>
            </button>
          )}

          {step !== 'upload' && (
            <button
              onClick={() => {
                setStep('upload');
                setFile(null);
                setWorkbookInfo(null);
                setCleaningResult(null);
              }}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Upload Different File
            </button>
          )}
        </div>
      </div>

      {/* STEP 1: Upload Dropzone */}
      {step === 'upload' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`p-8 rounded-2xl border-2 border-dashed transition text-center space-y-4 cursor-pointer ${
            isDragging
              ? 'bg-indigo-50/80 border-indigo-600 ring-4 ring-indigo-500/20 scale-[1.01]'
              : 'bg-white border-indigo-300 hover:border-indigo-600 hover:bg-slate-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            onClick={(e) => {
              (e.target as HTMLInputElement).value = '';
            }}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner transition ${
              isDragging ? 'bg-indigo-600 text-white animate-bounce' : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isUploading
                ? uploadMessage || 'Processing Excel & Generating Purchasing Report...'
                : isDragging
                ? 'Release to upload Excel file now...'
                : 'Drop your Excel file here or click to browse'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Auto-detects sheets, chemical names (Row 2 / Row 1 headers), in-hand stock, and monthly consumption to build your purchasing requirement report immediately.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isUploading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-3 rounded-xl transition shadow-md inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isUploading ? 'Analyzing All Sheets...' : 'Select Excel File (.xlsx, .xls, .csv)'}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-500">
            <span>⚡ 1-Step Instant Analysis</span>
            <span>✓ Multi-sheet workbook support</span>
            <span>✓ Automatic column detection</span>
            <span>✓ Generates purchasing report immediately</span>
          </div>
        </div>
      )}

      {/* STEP 2: Optional Mapping Inspector (Only if user chooses to view or edit) */}
      {step === 'mapping' && workbookInfo && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900">{file?.name}</div>
                <div className="text-[11px] text-slate-500">
                  {file ? (file.size / 1024).toFixed(1) : 0} KB • {workbookInfo.totalRows} data rows •{' '}
                  {workbookInfo.headers.length} detected columns
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <label className="text-slate-600 font-medium">Worksheet Source:</label>
                <select
                  value={workbookInfo.selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="bg-transparent text-slate-900 font-bold focus:outline-none"
                >
                  {workbookInfo.sheetNames.length > 1 && (
                    <option value="__ALL_SHEETS__">
                      📚 All Worksheets (Combine All {workbookInfo.sheetNames.length} Sheets)
                    </option>
                  )}
                  {workbookInfo.sheetNames.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      Sheet: {sheet}
                    </option>
                  ))}
                </select>
              </div>

              {!workbookInfo.isAllSheets && (
                <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-200 px-2.5 py-1 rounded-lg text-indigo-950">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <label className="font-semibold">Table Header:</label>
                  <select
                    value={workbookInfo.headerRowIndex}
                    onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                    className="bg-white border border-indigo-300 rounded px-1.5 py-0.5 font-bold text-indigo-700 focus:outline-none"
                  >
                    {Array.from({ length: Math.min(15, (workbookInfo.rawSampleRows.length || 5)) }).map((_, idx) => (
                      <option key={idx} value={idx}>
                        Row {idx + 1} {idx === workbookInfo.headerRowIndex ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowRawInspector(!showRawInspector)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline ml-1"
                  >
                    {showRawInspector ? 'Hide Raw Rows' : 'Inspect Raw Rows'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {cleaningResult && (
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-slate-500">Total Rows Extracted</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {cleaningResult.totalRows.toLocaleString()}
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 text-emerald-900 shadow-xs">
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Valid Clean Rows</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-bold text-emerald-800 mt-1">
                  {cleaningResult.validCount.toLocaleString()}
                </div>
              </div>

              <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-amber-900 shadow-xs">
                <div className="flex items-center justify-between text-amber-700">
                  <span>Warnings / Auto-Fixed</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-bold text-amber-800 mt-1">
                  {cleaningResult.warningCount.toLocaleString()}
                </div>
              </div>

              <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 text-rose-900 shadow-xs">
                <div className="flex items-center justify-between text-rose-700">
                  <span>Invalid / Skipped</span>
                  <XCircle className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-bold text-rose-800 mt-1">
                  {cleaningResult.invalidCount.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setStep('upload')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-300"
            >
              Back to Upload
            </button>

            <button
              onClick={handleManualConfirmImport}
              disabled={!canProceed}
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <span>Open Purchasing Analysis Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
