import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase/config';
import {
  getStoredAccessToken,
  saveAccessToken,
  clearAccessToken,
  searchOrCreateFolder,
  listFilesInFolder,
  deleteFile,
  uploadFileToFolder,
  downloadFileContent
} from '../utils/googleDriveService';
import {
  saveDatasetMeta,
  getDatasetsList,
  getDatasetById,
  saveNormalizedRecords,
  getDatasetRecords,
  deleteDataset as deleteDatasetFromDb,
  updateDatasetStatus,
  getUserSettings,
  saveUserSettings,
  getScenarios,
  saveScenario as saveScenarioToDb,
  deleteScenario as deleteScenarioFromDb,
} from '../firebase/services';
import type {
  DatasetMeta,
  NormalizedRecord,
  RawRecord,
  MaterialAnalysisMetric,
  CalculationSettings,
  SavedScenario,
  DataQualityIssue,
  DashboardSummary,
  ColumnMapping,
} from '../types';
import { DEFAULT_SETTINGS, analyzeMaterials, computeDashboardSummary } from '../utils/calculations';
import * as XLSX from 'xlsx';
import { parseExcelFile, getSheetData, autoDetectColumns, findBestHeaderRowIndex, ExcelWorkbookInfo } from '../utils/excelParser';
import { cleanAndNormalizeDataset, CleaningResult } from '../utils/dataCleaner';
import { uploadExcelToStorage } from '../firebase/services';

interface AppContextType {
  user: User | null;
  isAuthLoading: boolean;
  isDriveConnected: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;

  datasets: DatasetMeta[];
  currentDataset: DatasetMeta | null;
  records: NormalizedRecord[];
  metrics: MaterialAnalysisMetric[];
  summary: DashboardSummary;
  issues: DataQualityIssue[];
  settings: CalculationSettings;
  scenarios: SavedScenario[];
  activeScenario: SavedScenario | null;

  selectedSheet: string;
  setSelectedSheet: (sheet: string) => void;
  availableSheets: string[];

  isLoading: boolean;
  isUploading: boolean;
  uploadMessage: string;
  selectedMaterial: MaterialAnalysisMetric | null;
  setSelectedMaterial: (m: MaterialAnalysisMetric | null) => void;

  clearCacheAndResetData: () => void;
  selectDataset: (datasetId: string) => Promise<void>;
  createDataset: (
    meta: DatasetMeta,
    records: NormalizedRecord[],
    issues: DataQualityIssue[]
  ) => Promise<void>;
  uploadExcelDataset: (file: File) => Promise<boolean>;
  syncFromGoogleDrive: (tokenOverride?: string) => Promise<boolean>;
  updateSettings: (newSettings: Partial<CalculationSettings>) => Promise<void>;
  saveScenario: (name: string, description: string) => Promise<void>;
  applyScenario: (scenario: SavedScenario | null) => void;
  deleteScenario: (scenarioId: string) => Promise<void>;
  archiveDataset: (datasetId: string) => Promise<void>;
  removeDataset: (datasetId: string) => Promise<void>;
  refreshDatasets: () => Promise<void>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

interface MultiSheetCleaningResult {
  validRecords: NormalizedRecord[];
  allNormalized: NormalizedRecord[];
  issues: DataQualityIssue[];
  totalRows: number;
  validCount: number;
  warningCount: number;
  invalidCount: number;
  distinctMaterialsCount: number;
  yearsDetected: number[];
}

function unpivotAndCleanSingleSheet(
  wb: any,
  sheetName: string,
  headerIdx: number,
  datasetId: string
): CleaningResult {
  const worksheet = wb.Sheets[sheetName];
  if (!worksheet) {
    return {
      validRecords: [],
      allNormalized: [],
      issues: [],
      validCount: 0,
      warningCount: 0,
      invalidCount: 0,
      totalRows: 0,
      duplicateRowsCount: 0,
      distinctMaterialsCount: 0,
      yearsDetected: [],
    };
  }

  const allRows2D = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: true,
  });

  if (allRows2D.length === 0) {
    return {
      validRecords: [],
      allNormalized: [],
      issues: [],
      validCount: 0,
      warningCount: 0,
      invalidCount: 0,
      totalRows: 0,
      duplicateRowsCount: 0,
      distinctMaterialsCount: 0,
      yearsDetected: [],
    };
  }

  const headerRowIndex = findBestHeaderRowIndex(allRows2D, headerIdx);
  const headerRow = allRows2D[headerRowIndex] || [];
  const sheetHeaders: string[] = [];

  headerRow.forEach((cell, colIdx) => {
    let raw = cell !== undefined && cell !== null ? String(cell).trim() : '';
    if (!raw) {
      raw = `Column_${String.fromCharCode(65 + (colIdx % 26))}`;
    }
    sheetHeaders.push(raw);
  });

  // Detect month columns
  const MONTH_MAP: Record<string, number> = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, september: 9, sept: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12,
  };

  const monthColIndices: { month: number; year?: number; colIdx: number; header: string }[] = [];
  sheetHeaders.forEach((h, colIdx) => {
    const cleanH = h.toLowerCase().trim().replace(/\./g, '');
    const match = cleanH.match(/^([a-z]{3,9})[\s\-_\/]*(\d{2,4})?$/);
    if (match && MONTH_MAP[match[1]]) {
      const monthNum = MONTH_MAP[match[1]];
      let yrNum: number | undefined = undefined;
      if (match[2]) {
        const rawYr = parseInt(match[2], 10);
        yrNum = rawYr < 100 ? 2000 + rawYr : rawYr;
      }
      monthColIndices.push({ month: monthNum, year: yrNum, colIdx, header: h });
    }
  });

  const dataRows = allRows2D.slice(headerRowIndex + 1);
  const combinedRows: RawRecord[] = [];

  dataRows.forEach((row, rIdx) => {
    if (!Array.isArray(row)) return;
    const hasContent = row.some((c) => c !== undefined && c !== null && String(c).trim() !== '');
    if (!hasContent) return;

    const baseRow: RawRecord = {
      _rowNumber: headerRowIndex + rIdx + 2,
      _sheetName: sheetName,
    };

    sheetHeaders.forEach((h, cIdx) => {
      baseRow[h] = row[cIdx] !== undefined && row[cIdx] !== null ? row[cIdx] : '';
    });

    if (monthColIndices.length >= 3) {
      let hasPushedAnyMonth = false;
      monthColIndices.forEach(({ month, year: mYr, colIdx }) => {
        const mVal = row[colIdx];
        if (mVal !== undefined && mVal !== null && String(mVal).trim() !== '' && String(mVal).trim() !== '-') {
          combinedRows.push({
            ...baseRow,
            _rowNumber: headerRowIndex + rIdx + 2,
            _month: month,
            _year: mYr,
            Year: mYr || baseRow.Year,
            'Consumption Quantity': mVal,
            Quantity: mVal,
          });
          hasPushedAnyMonth = true;
        }
      });

      if (!hasPushedAnyMonth) {
        combinedRows.push({
          ...baseRow,
          _rowNumber: headerRowIndex + rIdx + 2,
          'Consumption Quantity': 0,
          Quantity: 0,
        });
      }
    } else {
      combinedRows.push(baseRow);
    }
  });

  // Run auto-detect columns on sheet headers
  const detected = autoDetectColumns(sheetHeaders);

  // Clean and normalize sheet rows
  return cleanAndNormalizeDataset(combinedRows, detected, datasetId);
}

function cleanAndNormalizeWorkbook(
  wb: any,
  headerIdx: number,
  datasetId: string,
  userUid: string,
  userEmail: string
): MultiSheetCleaningResult {
  const validRecords: NormalizedRecord[] = [];
  const allNormalized: NormalizedRecord[] = [];
  const issues: DataQualityIssue[] = [];
  let totalRows = 0;
  let validCount = 0;
  let warningCount = 0;
  let invalidCount = 0;
  const distinctMaterials = new Set<string>();
  const yearsSet = new Set<number>();

  // Direct raw scan of ITEMS NAME column across all sheets for 100% exact match with Excel file
  const rawItemsNamesSet = new Set<string>();
  wb.SheetNames.forEach((sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) return;
    const allRows2D = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', blankrows: true });
    if (allRows2D.length === 0) return;
    const headerRowIndex = findBestHeaderRowIndex(allRows2D, headerIdx);
    const headerRow = allRows2D[headerRowIndex] || [];
    
    let targetColIdx = -1;
    headerRow.forEach((cell, cIdx) => {
      const raw = cell !== undefined && cell !== null ? String(cell).toLowerCase().trim() : '';
      if (['item name', 'items name', 'item', 'items', 'material name', 'particulars', 'description', 'chemical name', 'dye name'].includes(raw)) {
        if (targetColIdx === -1) targetColIdx = cIdx;
      }
    });

    if (targetColIdx === -1) {
      headerRow.forEach((cell, cIdx) => {
        const raw = cell !== undefined && cell !== null ? String(cell).toLowerCase().trim() : '';
        if (raw.includes('item') || raw.includes('material') || raw.includes('particular') || raw.includes('description') || raw.includes('chemical')) {
          if (targetColIdx === -1) targetColIdx = cIdx;
        }
      });
    }

    if (targetColIdx !== -1) {
      const dataRows = allRows2D.slice(headerRowIndex + 1);
      dataRows.forEach((row) => {
        if (!Array.isArray(row)) return;
        const val = row[targetColIdx];
        if (val !== undefined && val !== null) {
          const str = String(val).trim();
          if (str && str.toLowerCase() !== 'total' && str.toLowerCase() !== 'grand total' && str.toLowerCase() !== 'sub total') {
            rawItemsNamesSet.add(str);
          }
        }
      });
    }
  });

  wb.SheetNames.forEach((sheetName: string) => {
    try {
      const result = unpivotAndCleanSingleSheet(wb, sheetName, headerIdx, datasetId);

      const mappedRecords = result.validRecords.map(rec => ({
        ...rec,
        sheetName: sheetName.trim(),
        department: rec.department === 'Plant General' || !rec.department ? sheetName.trim() : rec.department,
        category: rec.category === 'Chemicals' || !rec.category ? sheetName.trim() : rec.category
      }));

      validRecords.push(...mappedRecords);
      allNormalized.push(...result.allNormalized);
      issues.push(...result.issues.map(iss => ({ ...iss, sheetName: sheetName.trim() })));
      
      totalRows += result.totalRows;
      validCount += result.validCount;
      warningCount += result.warningCount;
      invalidCount += result.invalidCount;

      mappedRecords.forEach((rec) => {
        distinctMaterials.add(rec.materialCode);
        if (rec.year) yearsSet.add(rec.year);
      });
    } catch (err) {
      console.warn(`Failed to process sheet "${sheetName}":`, err);
    }
  });

  const exactExcelItemsCount = rawItemsNamesSet.size > 0 ? rawItemsNamesSet.size : distinctMaterials.size;

  return {
    validRecords,
    allNormalized,
    issues,
    totalRows,
    validCount,
    warningCount,
    invalidCount,
    distinctMaterialsCount: exactExcelItemsCount,
    yearsDetected: Array.from(yearsSet).sort((a, b) => a - b),
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);

  const [datasets, setDatasets] = useState<DatasetMeta[]>(() => {
    try {
      const saved = localStorage.getItem('procureplan_local_dataset_meta');
      return saved ? [JSON.parse(saved)] : [];
    } catch {
      return [];
    }
  });
  const [currentDataset, setCurrentDataset] = useState<DatasetMeta | null>(() => {
    try {
      const saved = localStorage.getItem('procureplan_local_dataset_meta');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [records, setRecords] = useState<NormalizedRecord[]>(() => {
    try {
      const saved = localStorage.getItem('procureplan_local_records');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [issues, setIssues] = useState<DataQualityIssue[]>(() => {
    try {
      const saved = localStorage.getItem('procureplan_local_issues');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [settings, setSettings] = useState<CalculationSettings>(DEFAULT_SETTINGS);
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<SavedScenario | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialAnalysisMetric | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Listen to Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);

      if (currentUser) {
        try {
          const userSet = await getUserSettings(currentUser.uid);
          if (userSet) {
            setSettings({ ...DEFAULT_SETTINGS, ...userSet });
          }
        } catch (e) {
          console.warn('Could not load user settings from Firestore:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch datasets & scenarios on mount or user change
  const refreshDatasets = useCallback(async () => {
    try {
      const dbDatasets = await getDatasetsList();
      const userDatasets = dbDatasets.filter((d) => !d.isDemo);
      setDatasets(userDatasets);

      if (userDatasets.length > 0) {
        const exists = currentDataset && userDatasets.some((d) => d.id === currentDataset.id);
        if (!currentDataset || !exists) {
          const first = userDatasets[0];
          setCurrentDataset(first);
          const dbRecords = await getDatasetRecords(first.id);
          setRecords(dbRecords);
        }
      } else {
        // No user datasets in Firestore - check if we have local storage cache before clearing!
        const localMeta = localStorage.getItem('procureplan_local_dataset_meta');
        if (!localMeta) {
          setCurrentDataset(null);
          setRecords([]);
          setIssues([]);
        }
      }

      const dbScenarios = await getScenarios();
      setScenarios(dbScenarios);
    } catch (err) {
      console.warn('Error refreshing datasets list:', err);
    }
  }, [currentDataset]);

  const syncFromGoogleDrive = useCallback(
    async (tokenOverride?: string): Promise<boolean> => {
      const token = tokenOverride || getStoredAccessToken();
      if (!token) {
        console.log('No Google Drive access token found.');
        return false;
      }

      setIsUploading(true);
      setUploadMessage('Connecting to Google Drive...');
      try {
        const folderId = await searchOrCreateFolder(token);
        setUploadMessage('Checking active ERP files inside "ProcurePlan ERP" folder...');
        const files = await listFilesInFolder(token, folderId);

        if (files.length === 0) {
          setIsUploading(false);
          setUploadMessage('');
          console.log('No active ERP spreadsheet file found in Google Drive folder.');
          return false;
        }

        // Use the first file in the folder as active spreadsheet
        const activeFile = files[0];
        setUploadMessage(`Downloading active file "${activeFile.name}" from Google Drive...`);

        const blob = await downloadFileContent(token, activeFile.id);
        const selectedFile = new File([blob], activeFile.name);

        setUploadMessage('Parsing Excel workbook sheets...');
        const wb = await parseExcelFile(selectedFile);
        const datasetId = `gdrive_${activeFile.id}`;

        setUploadMessage('Analyzing columns & unpivoting consumption data...');
        let bestResult: MultiSheetCleaningResult | null = null;
        let bestHeaderIdx = 1;

        const candidateHeaderIndices = [1, 0, 2];
        for (const headerIdx of candidateHeaderIndices) {
          try {
            const result = cleanAndNormalizeWorkbook(wb, headerIdx, datasetId, user?.uid || 'anonymous', user?.email || '');
            if (result.validRecords.length > 0) {
              bestResult = result;
              bestHeaderIdx = headerIdx;
              break;
            }
          } catch (e) {
            console.warn(`Header index ${headerIdx} scan failed:`, e);
          }
        }

        if (!bestResult || bestResult.validRecords.length === 0) {
          bestHeaderIdx = 1;
          bestResult = cleanAndNormalizeWorkbook(wb, 1, datasetId, user?.uid || 'anonymous', user?.email || '');
        }

        if (bestResult.validRecords.length === 0) {
          showToast('No valid chemical item rows found in the Google Drive file.');
          setIsUploading(false);
          setUploadMessage('');
          return false;
        }

        const datasetMeta: DatasetMeta = {
          id: datasetId,
          fileName: activeFile.name,
          fileSize: blob.size,
          fileStorageUrl: `gdrive://${activeFile.id}`,
          uploadedBy: user?.uid || 'anonymous',
          uploadedByEmail: user?.email || '',
          uploadedAt: new Date().toISOString(),
          rowCount: bestResult.totalRows,
          validCount: bestResult.validCount,
          warningCount: bestResult.warningCount,
          invalidCount: bestResult.invalidCount,
          columnMapping: JSON.stringify({}),
          status: 'analyzed',
          yearsCovered: bestResult.yearsDetected.join(', '),
          materialCount: bestResult.distinctMaterialsCount,
        };

        // Cache fully parsed records globally in-memory and persist in localStorage
        try {
          localStorage.setItem('procureplan_local_dataset_meta', JSON.stringify(datasetMeta));
          localStorage.setItem('procureplan_local_records', JSON.stringify(bestResult.validRecords));
          localStorage.setItem('procureplan_local_issues', JSON.stringify(bestResult.issues));
        } catch (storageErr) {
          console.warn('Failed to save Drive sync to localStorage:', storageErr);
        }

        setCurrentDataset(datasetMeta);
        setRecords(bestResult.validRecords);
        setIssues(bestResult.issues);

        // Populate datasets list with our single Google Drive active file meta
        setDatasets([datasetMeta]);

        showToast(`Successfully synced and loaded "${activeFile.name}" from Google Drive!`);

        // Save to Firestore in background (asynchronously) so it persists across page refreshes!
        (async () => {
          try {
            console.log('Syncing Drive dataset to Firestore in background...');
            const dbDatasets = await getDatasetsList();
            if (dbDatasets) {
              const oldUserDatasets = dbDatasets.filter((d) => !d.isDemo && d.id !== datasetId);
              // Delete old datasets from Firestore in parallel
              await Promise.all(oldUserDatasets.map((d) => deleteDatasetFromDb(d.id)));
            }

            await saveDatasetMeta(datasetMeta);
            await saveNormalizedRecords(datasetId, bestResult!.validRecords);
            console.log('Successfully saved synced Drive dataset to Firestore!');
          } catch (fsErr) {
            console.warn('Background Firestore save for Drive sync failed:', fsErr);
          }
        })();

        setIsUploading(false);
        setUploadMessage('');
        return true;
      } catch (err: any) {
        console.error('Google Drive sync error:', err);
        setIsUploading(false);
        setUploadMessage('');
        clearAccessToken();
        setIsDriveConnected(false);

        if (err.message === 'UNAUTHORIZED' || (err.message && err.message.includes('401'))) {
          showToast('Google Drive connection expired. Please log in again to reconnect.');
        } else {
          showToast('Failed to sync active file from Google Drive. Please reconnect.');
        }
        return false;
      }
    },
    [user, showToast]
  );

  const uploadExcelDataset = useCallback(
    async (selectedFile: File): Promise<boolean> => {
      const token = getStoredAccessToken();

      setIsUploading(true);
      setUploadMessage('Reading & parsing uploaded spreadsheet instantly...');
      try {
        // 1. INSTANT LOCAL PARSING AND ACTIVE LAUNCH (Takes under 100 milliseconds!)
        const wb = await parseExcelFile(selectedFile);
        const datasetId = `gdrive_temp_${Date.now()}`;

        let bestResult: MultiSheetCleaningResult | null = null;
        let bestHeaderIdx = 1;

        const candidateHeaderIndices = [1, 0, 2];
        for (const headerIdx of candidateHeaderIndices) {
          try {
            const result = cleanAndNormalizeWorkbook(wb, headerIdx, datasetId, user?.uid || 'anonymous', user?.email || '');
            if (result.validRecords.length > 0) {
              bestResult = result;
              bestHeaderIdx = headerIdx;
              break;
            }
          } catch (e) {
            console.warn(`Local Header index ${headerIdx} scan failed:`, e);
          }
        }

        if (!bestResult || bestResult.validRecords.length === 0) {
          bestHeaderIdx = 1;
          bestResult = cleanAndNormalizeWorkbook(wb, 1, datasetId, user?.uid || 'anonymous', user?.email || '');
        }

        if (bestResult.validRecords.length === 0) {
          showToast('No valid chemical item rows found in the selected file.');
          setIsUploading(false);
          setUploadMessage('');
          return false;
        }

        const datasetMeta: DatasetMeta = {
          id: datasetId,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileStorageUrl: `gdrive://temp`,
          uploadedBy: user?.uid || 'anonymous',
          uploadedByEmail: user?.email || '',
          uploadedAt: new Date().toISOString(),
          rowCount: bestResult.totalRows,
          validCount: bestResult.validCount,
          warningCount: bestResult.warningCount,
          invalidCount: bestResult.invalidCount,
          columnMapping: JSON.stringify({}),
          status: 'analyzed',
          yearsCovered: bestResult.yearsDetected.join(', '),
          materialCount: bestResult.distinctMaterialsCount,
        };

        // Instantly load data into state so app runs immediately and persist in localStorage
        try {
          localStorage.setItem('procureplan_local_dataset_meta', JSON.stringify(datasetMeta));
          localStorage.setItem('procureplan_local_records', JSON.stringify(bestResult.validRecords));
          localStorage.setItem('procureplan_local_issues', JSON.stringify(bestResult.issues));
        } catch (storageErr) {
          console.warn('Failed to save manual upload to localStorage:', storageErr);
        }

        setCurrentDataset(datasetMeta);
        setRecords(bestResult.validRecords);
        setIssues(bestResult.issues);
        setDatasets([datasetMeta]);

        showToast(`Instant Analysis Complete! Loaded ${bestResult.validRecords.length} chemical rows.`);
        setIsUploading(false);
        setUploadMessage('');

        // Save to Firestore in background (asynchronously) so it persists across page refreshes!
        (async () => {
          try {
            console.log('Syncing manual upload dataset to Firestore in background...');
            const dbDatasets = await getDatasetsList();
            if (dbDatasets) {
              const oldUserDatasets = dbDatasets.filter((d) => !d.isDemo && d.id !== datasetId);
              // Delete old datasets from Firestore in parallel
              await Promise.all(oldUserDatasets.map((d) => deleteDatasetFromDb(d.id)));
            }

            await saveDatasetMeta(datasetMeta);
            await saveNormalizedRecords(datasetId, bestResult!.validRecords);
            console.log('Successfully saved manual upload dataset to Firestore!');
          } catch (fsErr) {
            console.warn('Background Firestore save for manual upload failed:', fsErr);
          }
        })();

        // 2. KICK OFF BACKGROUND GOOGLE DRIVE CLOUD SYNC (QUIET AND NON-BLOCKING)
        if (token) {
          (async () => {
            try {
              console.log('Starting background Google Drive backup & older files cleanup...');
              const folderId = await searchOrCreateFolder(token);
              
              // Delete older files in parallel!
              const files = await listFilesInFolder(token, folderId);
              await Promise.all(files.map(file => deleteFile(token, file.id)));

              // Upload the new file to Google Drive
              const newFileId = await uploadFileToFolder(token, folderId, selectedFile);
              console.log(`Successfully backed up "${selectedFile.name}" to Google Drive folder! ID: ${newFileId}`);
            } catch (driveErr) {
              console.error('Background Google Drive backup failed:', driveErr);
            }
          })();
        }

        return true;
      } catch (err: any) {
        console.error('Upload parsing failed:', err);
        showToast(err.message || 'File parsing failed.');
        setIsUploading(false);
        setUploadMessage('');
        return false;
      }
    },
    [user, showToast]
  );

  useEffect(() => {
    const token = getStoredAccessToken();
    if (user && token) {
      setIsDriveConnected(true);
      syncFromGoogleDrive(token);
    } else {
      setIsDriveConnected(false);
      refreshDatasets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const clearCacheAndResetData = useCallback(async () => {
    setIsLoading(true);
    try {
      const dbDatasets = await getDatasetsList();
      const userDatasets = dbDatasets.filter((d) => !d.isDemo);

      // Delete each dataset from the database in parallel
      await Promise.all(userDatasets.map((d) => deleteDatasetFromDb(d.id)));
      
      localStorage.removeItem('procureplan_local_dataset_meta');
      localStorage.removeItem('procureplan_local_records');
      localStorage.removeItem('procureplan_local_issues');

      setDatasets([]);
      setRecords([]);
      setIssues([]);
      setCurrentDataset(null);
      setSelectedMaterial(null);
      setSelectedSheet('ALL');
      showToast('Database cleared successfully! Ready for a fresh file upload.');
    } catch (err) {
      console.warn('Firestore clear failed (clearing locally):', err);
      localStorage.removeItem('procureplan_local_dataset_meta');
      localStorage.removeItem('procureplan_local_records');
      localStorage.removeItem('procureplan_local_issues');

      setDatasets([]);
      setRecords([]);
      setIssues([]);
      setCurrentDataset(null);
      setSelectedMaterial(null);
      setSelectedSheet('ALL');
      showToast('Cache cleared successfully!');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const selectDataset = useCallback(
    async (datasetId: string) => {
      setIsLoading(true);
      try {
        const found = datasets.find((d) => d.id === datasetId) || (await getDatasetById(datasetId));
        if (found) {
          setCurrentDataset(found);
          const dbRecords = await getDatasetRecords(datasetId);
          setRecords(dbRecords);
          setIssues([]);
          showToast(`Switched active dataset to "${found.fileName}".`);
        }
      } catch (err) {
        console.error('Error selecting dataset:', err);
        showToast('Error loading dataset records. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [datasets, showToast]
  );

  const createDataset = useCallback(
    async (meta: DatasetMeta, cleanRecords: NormalizedRecord[], qualityIssues: DataQualityIssue[]) => {
      setIsLoading(true);
      try {
        await saveDatasetMeta(meta);
        await saveNormalizedRecords(meta.id, cleanRecords);

        setDatasets((prev) => [meta, ...prev.filter((d) => d.id !== meta.id)]);
        setCurrentDataset(meta);
        setRecords(cleanRecords);
        setIssues(qualityIssues);
        showToast(`Dataset "${meta.fileName}" successfully imported and analyzed!`);
      } catch (err) {
        console.error('Failed to save dataset in Firestore:', err);
        // Fallback to local memory session if Firestore permission issue occurred
        setDatasets((prev) => [meta, ...prev.filter((d) => d.id !== meta.id)]);
        setCurrentDataset(meta);
        setRecords(cleanRecords);
        setIssues(qualityIssues);
        showToast(`Dataset imported in active session (${cleanRecords.length} records analyzed).`);
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<CalculationSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);

      if (user) {
        try {
          await saveUserSettings(user.uid, updated);
        } catch (err) {
          console.warn('Failed to persist settings in Firestore:', err);
        }
      }
      showToast('Purchasing parameters updated.');
    },
    [settings, user, showToast]
  );

  const applyScenario = useCallback(
    (scenario: SavedScenario | null) => {
      setActiveScenario(scenario);
      if (scenario) {
        setSettings((prev) => ({
          ...prev,
          planningPeriodMonths: scenario.planningPeriodMonths,
          safetyStockPct: scenario.safetyStockPct,
          demandGrowthPct: scenario.demandGrowthPct,
          defaultLeadTimeDays: scenario.leadTimeDays || prev.defaultLeadTimeDays,
          purchasingMethod: scenario.purchasingMethod || prev.purchasingMethod,
        }));
        showToast(`Applied scenario "${scenario.name}".`);
      } else {
        setSettings(DEFAULT_SETTINGS);
        showToast('Reset to standard default planning scenario.');
      }
    },
    [showToast]
  );

  const saveScenarioHandler = useCallback(
    async (name: string, description: string) => {
      const newScenario: SavedScenario = {
        id: `scen_${Date.now()}`,
        name,
        description,
        planningPeriodMonths: settings.planningPeriodMonths,
        safetyStockPct: settings.safetyStockPct,
        demandGrowthPct: settings.demandGrowthPct,
        leadTimeDays: settings.defaultLeadTimeDays,
        purchasingMethod: settings.purchasingMethod,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || 'user',
      };

      try {
        await saveScenarioToDb(newScenario);
      } catch (err) {
        console.warn('Failed to save scenario to Firestore (saving in local state):', err);
      }

      setScenarios((prev) => [newScenario, ...prev]);
      setActiveScenario(newScenario);
      showToast(`Scenario "${name}" saved successfully.`);
    },
    [settings, user, showToast]
  );

  const deleteScenarioHandler = useCallback(
    async (scenarioId: string) => {
      try {
        await deleteScenarioFromDb(scenarioId);
      } catch (err) {
        console.warn('Failed to delete scenario from Firestore:', err);
      }
      setScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
      if (activeScenario?.id === scenarioId) {
        setActiveScenario(null);
      }
      showToast('Scenario removed.');
    },
    [activeScenario, showToast]
  );

  const archiveDatasetHandler = useCallback(
    async (datasetId: string) => {
      try {
        await updateDatasetStatus(datasetId, 'archived');
      } catch (e) {
        console.warn('Archive Firestore error:', e);
      }
      setDatasets((prev) =>
        prev.map((d) => (d.id === datasetId ? { ...d, status: 'archived' } : d))
      );
      if (currentDataset?.id === datasetId) {
        setCurrentDataset((prev) => (prev ? { ...prev, status: 'archived' } : null));
      }
      showToast('Dataset archived.');
    },
    [currentDataset, showToast]
  );

  const removeDatasetHandler = useCallback(
    async (datasetId: string) => {
      try {
        await deleteDatasetFromDb(datasetId);
      } catch (e) {
        console.warn('Delete Firestore error:', e);
      }
      setDatasets((prev) => {
        const remaining = prev.filter((d) => d.id !== datasetId);
        if (currentDataset?.id === datasetId) {
          if (remaining.length > 0) {
            const next = remaining[0];
            setCurrentDataset(next);
            getDatasetRecords(next.id).then((recs) => setRecords(recs)).catch(() => setRecords([]));
          } else {
            setCurrentDataset(null);
            setRecords([]);
          }
        }
        return remaining;
      });
      showToast('Dataset deleted.');
    },
    [currentDataset, showToast]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        saveAccessToken(token);
        setIsDriveConnected(true);
        showToast('Google Account & Drive synced successfully!');
        await syncFromGoogleDrive(token);
      } else {
        showToast('Signed in successfully.');
      }
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      showToast('Google Sign-in could not be completed.');
    }
  }, [showToast, syncFromGoogleDrive]);

  const logOut = useCallback(async () => {
    try {
      await signOut(auth);
      clearAccessToken();
      setIsDriveConnected(false);

      localStorage.removeItem('procureplan_local_dataset_meta');
      localStorage.removeItem('procureplan_local_records');
      localStorage.removeItem('procureplan_local_issues');

      setRecords([]);
      setIssues([]);
      setCurrentDataset(null);
      setDatasets([]);
      showToast('Signed out from Google Account.');
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  }, [showToast]);

  const [selectedSheet, setSelectedSheet] = useState<string>('ALL');

  // Compute all distinct sheet names
  const availableSheets = useMemo(() => {
    const sheetSet = new Set<string>();
    records.forEach((r) => {
      const name = r.sheetName || r.department || r.category;
      if (name) sheetSet.add(name);
    });
    return Array.from(sheetSet).sort();
  }, [records]);

  // Reactive calculations with memoization based on selected sheet
  const activeRecords = useMemo(() => {
    if (selectedSheet === 'ALL') return records;
    return records.filter(
      (r) => (r.sheetName || r.department || r.category) === selectedSheet
    );
  }, [records, selectedSheet]);

  const metrics = useMemo(() => {
    return analyzeMaterials(activeRecords, settings);
  }, [activeRecords, settings]);

  const summary = useMemo(() => {
    return computeDashboardSummary(metrics, issues.length);
  }, [metrics, issues.length]);

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthLoading,
        isDriveConnected,
        signInWithGoogle,
        logOut,
        datasets,
        currentDataset,
        records,
        metrics,
        summary,
        issues,
        settings,
        scenarios,
        activeScenario,
        selectedSheet,
        setSelectedSheet,
        availableSheets,
        isLoading,
        isUploading,
        uploadMessage,
        selectedMaterial,
        setSelectedMaterial,
        clearCacheAndResetData,
        selectDataset,
        createDataset,
        uploadExcelDataset,
        syncFromGoogleDrive,
        updateSettings,
        saveScenario: saveScenarioHandler,
        applyScenario,
        deleteScenario: deleteScenarioHandler,
        archiveDataset: archiveDatasetHandler,
        removeDataset: removeDatasetHandler,
        refreshDatasets,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
