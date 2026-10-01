import * as XLSX from 'xlsx';
import type { StandardField, FieldDefinition, ColumnMapping, RawRecord } from '../types';

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    field: 'materialName',
    label: 'ITEMS NAME',
    required: false,
    description: 'Name, title, or description of the material, chemical, or dye',
    synonyms: [
      'items name',
      'item name',
      'item_name',
      'items',
      'material name',
      'material_name',
      'name of dyes & chemicals',
      'name of dyes and chemicals',
      'dyes & chemicals',
      'dyes and chemicals',
      'dyes',
      'chemicals',
      'chemical name',
      'dye name',
      'particulars',
      'description',
      'item description',
      'material description',
      'material desc',
      'item desc',
      'product description',
      'description of goods',
      'description of item',
      'description of items',
      'product name',
      'raw material',
      'dyes & aux',
      'chemical description',
      'details',
      'name of item',
      'chemical/material',
      'item particulars',
    ],
  },
  {
    field: 'materialCode',
    label: 'Material / Item Code',
    required: false,
    description: 'Unique SKU, material code, or serial number (Auto-generated if missing)',
    synonyms: [
      'material code',
      'material_code',
      'item code',
      'item_code',
      'item no',
      'item number',
      'item_no',
      'mat code',
      'code',
      'part number',
      'part no',
      'sku',
      'article',
      'art no',
      'serial no',
    ],
  },
  {
    field: 'quantity',
    label: 'Consumption Quantity',
    required: true,
    description: 'Historical consumed, issued, or used quantity',
    synonyms: [
      'consumption quantity',
      'consumption qty',
      'consumption',
      'consumed qty',
      'quantity',
      'qty',
      'usage',
      'usage qty',
      'consumed quantity',
      'issue qty',
      'issued qty',
      'actual consumption',
      'consumed',
      'total consumption',
      'monthly consumption',
      'consumed (kg)',
      'consumed (mt)',
      'consumption (kg)',
      'consumption (mt)',
      'issue',
      'issued',
      'total qty',
      'act. consumption',
      'total issue',
      'total issued qty',
      'qty (kg)',
      'qty (mt)',
      'qty (ltr)',
      'quantity (kg)',
      'quantity (mt)',
      'use qty',
      'used qty',
      'usage quantity',
      'total issue qty',
      'requisition qty',
      'req qty',
      'qnty',
      'net consumption',
    ],
  },
  {
    field: 'uom',
    label: 'Unit of Measure (UOM)',
    required: false,
    description: 'Unit of measurement (MT, KG, LTR, PCS, etc.)',
    synonyms: [
      'uom',
      'unit',
      'unit of measure',
      'unit of measurement',
      'units',
      'measure',
      'base uom',
      'pkg',
      'packing',
      'unit (uom)',
    ],
  },
  {
    field: 'stock',
    label: 'Current Stock / Balance',
    required: false,
    description: 'Current stock on hand / closing inventory balance',
    synonyms: [
      'in hand stock ----',
      'in hand stock ---',
      'in hand stock --',
      'in hand stock -',
      'in hand stock',
      'in hand stock 03.09.2026',
      'in hand',
      'in-hand stock',
      'in hand qty',
      'hand stock',
      'stock in hand',
      'total stock qty',
      'current stock',
      'closing stock',
      'opening stock',
      'stock on hand',
      'present stock',
      'physical stock',
      'inventory balance',
      'stock balance',
      'balance stock',
      'closing qty',
      'stock qty',
    ],
  },
  {
    field: 'category',
    label: 'Material Category',
    required: false,
    description: 'Classification, family, or product category',
    synonyms: [
      'category',
      'material category',
      'mat category',
      'group',
      'material group',
      'item group',
      'family',
      'class',
      'commodity',
      'type',
      'sec',
      'section',
    ],
  },
  {
    field: 'date',
    label: 'Date',
    required: false,
    description: 'Transaction, period, or entry date',
    synonyms: ['date', 'txn date', 'transaction date', 'posting date', 'consumption date', 'entry date', 'doc date', 'period date'],
  },
  {
    field: 'year',
    label: 'Year',
    required: false,
    description: 'Consumption year (e.g. 2024, 2025)',
    synonyms: ['year', 'consumption year', 'yr', 'cal year'],
  },
  {
    field: 'month',
    label: 'Month',
    required: false,
    description: 'Consumption month (1-12 or Jan-Dec)',
    synonyms: ['month', 'consumption month', 'mo', 'period', 'mth'],
  },
  {
    field: 'purchaseQuantity',
    label: 'Purchase / Received Quantity',
    required: false,
    description: 'Quantity purchased or received (GRN / Inward)',
    synonyms: [
      'purchase quantity',
      'purchase qty',
      'po qty',
      'procured qty',
      'purchased quantity',
      'order qty',
      'received qty',
      'grn qty',
      'received',
      'receipt',
      'inward',
      'receipt qty',
      'purchased',
      'rcvd qty',
    ],
  },
  {
    field: 'supplier',
    label: 'Supplier / Vendor',
    required: false,
    description: 'Supplier or manufacturer name',
    synonyms: ['supplier', 'vendor', 'supplier name', 'vendor name', 'supplier code', 'manufacturer', 'source', 'brand'],
  },
  {
    field: 'department',
    label: 'Department / Section',
    required: false,
    description: 'Consuming plant, department, unit, or cost center',
    synonyms: ['department', 'dept', 'cost center', 'plant', 'section', 'division', 'line', 'unit name', 'factory unit'],
  },
  {
    field: 'unitPrice',
    label: 'Unit Price / Rate',
    required: false,
    description: 'Unit cost/price for ABC value classification',
    synonyms: [
      'last purchased rate',
      'purchased rate',
      'last rate',
      'unit price',
      'price',
      'unit rate',
      'rate',
      'cost',
      'standard cost',
      'unit cost',
      'avg price',
      'rate (tk)',
      'rate (usd)',
    ],
  },
  {
    field: 'leadTimeDays',
    label: 'Lead Time (Days)',
    required: false,
    description: 'Supplier delivery lead time in calendar or working days',
    synonyms: ['lead time', 'lead time days', 'lead days', 'delivery lead time', 'lt days', 'leadtime', 'run time'],
  },
  {
    field: 'incomingQuantity',
    label: 'Incoming / Open PO Qty',
    required: false,
    description: 'Confirmed open orders scheduled for arrival',
    synonyms: [
      'pipeline stock qty.',
      'pipeline stock qty',
      'total pipeline qty.',
      'total pipeline qty',
      'pipeline stock',
      'shipped qty.',
      'shipped qty',
      'non-shipped qty.',
      'non-shipped qty',
      'loan qty.',
      'loan qty',
      'incoming quantity',
      'incoming qty',
      'incoming stock',
      'open po',
      'pending delivery',
      'open orders',
      'on order',
      'in transit',
    ],
  },
];

export interface ExcelWorkbookInfo {
  sheetNames: string[];
  selectedSheet: string;
  headerRowIndex: number; // 0-based
  headers: string[];
  rawRows: RawRecord[];
  totalRows: number;
  rawSampleRows: { rowIndex: number; cells: string[] }[]; // First 15 rows for inspection
  isAllSheets?: boolean;
  sheetsSummary?: { name: string; rows: number; columns: number }[];
}

export function parseExcelFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          dateNF: 'yyyy-mm-dd',
        });
        resolve(workbook);
      } catch (err) {
        reject(new Error('Unable to read this Excel file. Ensure the file is not corrupted or password-protected.'));
      }
    };
    reader.onerror = () => reject(new Error('File reading error encountered.'));
    reader.readAsArrayBuffer(file);
  });
}

// Scans first 25 rows to identify the real table header row with intelligent scoring
export function findBestHeaderRowIndex(allRows2D: any[][], preferredDefaultIndex: number = 1): number {
  if (!allRows2D || allRows2D.length === 0) return 0;

  const headerKeywords = [
    'item', 'material', 'dyes', 'chemical', 'description', 'particulars',
    'code', 'sl', 'no', 'unit', 'uom', 'qty', 'quantity', 'consumption',
    'stock', 'balance', 'closing', 'received', 'issue', 'date', 'month',
    'year', 'rate', 'price', 'total', 'supplier', 'dept', 'in hand', 'hand stock'
  ];

  let bestIndex = 0;
  let highestScore = -1;

  const maxScan = Math.min(allRows2D.length, 25);

  for (let i = 0; i < maxScan; i++) {
    const row = allRows2D[i];
    if (!Array.isArray(row)) continue;

    const nonBlankCells = row.filter((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '');
    if (nonBlankCells.length < 2) continue;

    let score = 0;

    // Favor user's preferred index or Row 2 (index 1) with bonus score
    if (i === preferredDefaultIndex) score += 12;
    else if (i === 1) score += 8;

    score += nonBlankCells.length * 2;

    nonBlankCells.forEach((cell) => {
      const str = String(cell).toLowerCase().trim();
      if (str.length > 50) {
        score -= 5;
      } else {
        const matches = headerKeywords.some((kw) => str.includes(kw));
        if (matches) {
          score += 8;
        }
      }
    });

    if (i + 1 < allRows2D.length) {
      const nextRow = allRows2D[i + 1];
      if (Array.isArray(nextRow)) {
        const nextNonBlank = nextRow.filter((c) => c !== undefined && c !== null && String(c).trim() !== '');
        if (nextNonBlank.length >= Math.min(nonBlankCells.length - 2, 2)) {
          score += 4;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

// Month name recognition for wide monthly columns
const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9, sept: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

// Extracts and unpivots data from all sheets combined (Row 2 / Index 1 as default header for all sheets!)
export function getAllSheetsCombinedData(
  workbook: XLSX.WorkBook,
  userHeaderIndex: number = 1 // Row 2 default for all sheets!
): ExcelWorkbookInfo {
  const combinedHeadersSet = new Set<string>();
  const combinedRows: RawRecord[] = [];
  const sheetsSummary: { name: string; rows: number; columns: number }[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const allRows2D = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: true,
    });

    if (allRows2D.length < 2) return;

    // Use Row 2 (index 1) for all sheets as requested by user
    const headerRowIndex = findBestHeaderRowIndex(allRows2D, userHeaderIndex);
    const headerRow = allRows2D[headerRowIndex] || [];
    const sheetHeaders: string[] = [];

    headerRow.forEach((cell, colIdx) => {
      let raw = cell !== undefined && cell !== null ? String(cell).trim() : '';
      if (!raw) {
        raw = `Column_${String.fromCharCode(65 + (colIdx % 26))}`;
      }
      
      const isKnown = FIELD_DEFINITIONS.some(def => 
        def.synonyms.includes(raw.toLowerCase()) || def.label.toLowerCase() === raw.toLowerCase()
      );

      if (isKnown) {
        sheetHeaders.push(raw);
        combinedHeadersSet.add(raw);
      }
    });

    // Check if sheet has wide month columns (Jan, Feb, Mar, Jan-24, Feb-25, Jan-26, etc.)
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
    let extractedSheetRows = 0;

    dataRows.forEach((row, rIdx) => {
      if (!Array.isArray(row)) return;
      const hasContent = row.some((c) => c !== undefined && c !== null && String(c).trim() !== '');
      if (!hasContent) return;

      const baseRow: RawRecord = {
        _rowNumber: combinedRows.length + 2,
        _sheetName: sheetName,
      };

      sheetHeaders.forEach((h, cIdx) => {
        baseRow[h] = row[cIdx] !== undefined && row[cIdx] !== null ? row[cIdx] : '';
      });

      // If wide month columns exist, unpivot each month to ensure complete historical data
      if (monthColIndices.length >= 3) {
        let hasPushedAnyMonth = false;
        monthColIndices.forEach(({ month, year: mYr, colIdx }) => {
          const mVal = row[colIdx];
          if (mVal !== undefined && mVal !== null && String(mVal).trim() !== '' && String(mVal).trim() !== '-') {
            combinedRows.push({
              ...baseRow,
              _rowNumber: combinedRows.length + 2,
              _month: month,
              _year: mYr,
              Year: mYr || baseRow.Year,
              'Consumption Quantity': mVal,
              Quantity: mVal,
            });
            extractedSheetRows++;
            hasPushedAnyMonth = true;
          }
        });

        // Ensure chemical item is retained with base stock and 0 consumption even if monthly cells are empty
        if (!hasPushedAnyMonth) {
          combinedRows.push({
            ...baseRow,
            _rowNumber: combinedRows.length + 2,
            'Consumption Quantity': 0,
            Quantity: 0,
          });
          extractedSheetRows++;
        }
      } else {
        combinedRows.push(baseRow);
        extractedSheetRows++;
      }
    });

    sheetsSummary.push({
      name: sheetName,
      rows: extractedSheetRows,
      columns: sheetHeaders.length,
    });
  });

  const headers = Array.from(combinedHeadersSet);

  return {
    sheetNames: workbook.SheetNames,
    selectedSheet: '__ALL_SHEETS__',
    headerRowIndex: userHeaderIndex,
    headers,
    rawRows: combinedRows,
    totalRows: combinedRows.length,
    rawSampleRows: [],
    isAllSheets: true,
    sheetsSummary,
  };
}

export function getSheetData(
  workbook: XLSX.WorkBook,
  sheetName?: string,
  userHeaderRowIndex: number = 1 // Defaults to Row 2 (index 1) for all sheets!
): ExcelWorkbookInfo {
  if (sheetName === '__ALL_SHEETS__' || (!sheetName && workbook.SheetNames.length > 1)) {
    return getAllSheetsCombinedData(workbook, userHeaderRowIndex);
  }

  const selectedSheet = sheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[selectedSheet];
  if (!worksheet) {
    throw new Error(`Sheet "${selectedSheet}" not found in workbook.`);
  }

  const allRows2D = XLSX.utils.sheet_to_json<any[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: true,
  });

  if (allRows2D.length === 0) {
    return {
      sheetNames: workbook.SheetNames,
      selectedSheet,
      headerRowIndex: userHeaderRowIndex,
      headers: [],
      rawRows: [],
      totalRows: 0,
      rawSampleRows: [],
    };
  }

  const rawSampleRows = allRows2D.slice(0, 15).map((row, idx) => ({
    rowIndex: idx,
    cells: Array.isArray(row)
      ? row.slice(0, 12).map((c) => (c !== undefined && c !== null ? String(c).trim() : ''))
      : [],
  }));

  const headerRowIndex = findBestHeaderRowIndex(allRows2D, userHeaderRowIndex);
  const headerRow = allRows2D[headerRowIndex] || [];
  const rawHeaderMapping: { header: string; colIdx: number }[] = [];
  const seenHeaderCounts: Record<string, number> = {};

  headerRow.forEach((cell, colIdx) => {
    let raw = cell !== undefined && cell !== null ? String(cell).trim() : '';
    if (!raw) {
      raw = `Column_${String.fromCharCode(65 + (colIdx % 26))}${colIdx >= 26 ? Math.floor(colIdx / 26) : ''}`;
    }

    const isKnown = FIELD_DEFINITIONS.some(def => 
      def.synonyms.includes(raw.toLowerCase()) || def.label.toLowerCase() === raw.toLowerCase()
    );

    if (isKnown) {
      if (seenHeaderCounts[raw]) {
        seenHeaderCounts[raw]++;
        rawHeaderMapping.push({ header: `${raw}_${seenHeaderCounts[raw]}`, colIdx });
      } else {
        seenHeaderCounts[raw] = 1;
        rawHeaderMapping.push({ header: raw, colIdx });
      }
    }
  });

  const rawHeaders = rawHeaderMapping.map(h => h.header);

  const dataRowsRaw = allRows2D.slice(headerRowIndex + 1);
  const rawRows: RawRecord[] = [];

  dataRowsRaw.forEach((row, rowIdx) => {
    if (!Array.isArray(row)) return;

    const hasAnyContent = row.some((c) => c !== undefined && c !== null && String(c).trim() !== '');
    if (!hasAnyContent) return;

    const rowObj: RawRecord = {
      _rowNumber: headerRowIndex + rowIdx + 2,
      _sheetName: selectedSheet,
    };

    rawHeaderMapping.forEach(({ header, colIdx }) => {
      rowObj[header] = row[colIdx] !== undefined && row[colIdx] !== null ? row[colIdx] : '';
    });

    rawRows.push(rowObj);
  });

  return {
    sheetNames: workbook.SheetNames,
    selectedSheet,
    headerRowIndex,
    headers: rawHeaders,
    rawRows,
    totalRows: rawRows.length,
    rawSampleRows,
  };
}

// 100% Automatic column detection with intelligent fallback
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const assignedFields = new Set<StandardField>();

  // Priority Pass 0A: Explicitly detect "ITEMS NAME" / material description for 'materialName'
  for (const header of headers) {
    const cleanHeader = header.toLowerCase().replace(/[\r\n\t\u00A0]+/g, ' ').trim();
    if (
      /items?\s*name|material\s*name|dyes?\s*(?:&|and)\s*chem|chemical\s*name|particulars|description|product\s*name/i.test(
        cleanHeader
      ) &&
      !/supplier|vendor|customer|code|sl|no/i.test(cleanHeader)
    ) {
      if (!assignedFields.has('materialName')) {
        mapping[header] = 'materialName';
        assignedFields.add('materialName');
      }
    }
  }

  // Priority Pass 0: Detect "IN HAND STOCK" or "IN HAND" column explicitly for 'stock'
  for (const header of headers) {
    const cleanHeader = header.toLowerCase().replace(/[\r\n\t\u00A0]+/g, ' ').trim();
    if (
      /in\s*[\-\_\s]*hand|hand\s*stock|stock\s*in\s*hand|current\s*stock|closing\s*stock|opening\s*stock|present\s*stock/i.test(
        cleanHeader
      ) &&
      !/consumption|issue|consumed|used|amount|rate|price/i.test(cleanHeader)
    ) {
      if (!assignedFields.has('stock')) {
        mapping[header] = 'stock';
        assignedFields.add('stock');
      }
    }
  }

  // Priority Pass 0B: Detect "Consumption Quantity" explicitly for 'quantity'
  for (const header of headers) {
    if (mapping[header]) continue;
    const cleanHeader = header.toLowerCase().replace(/[\r\n\t\u00A0]+/g, ' ').trim();
    if (
      /consumption|consumed|total\s*issue|issue\s*qty|usage/i.test(cleanHeader) &&
      !/stock|in\s*hand|amount|rate|price/i.test(cleanHeader)
    ) {
      if (!assignedFields.has('quantity')) {
        mapping[header] = 'quantity';
        assignedFields.add('quantity');
      }
    }
  }

  // Pass 1: Synonym matching with safety checks against cross-matching
  for (const header of headers) {
    if (mapping[header]) continue;
    const cleanHeader = header.toLowerCase().replace(/[\r\n\t\u00A0]+/g, ' ').trim().replace(/[_\-\.]+/g, ' ').replace(/\s+/g, ' ');
    let matchedField: StandardField | '' = '';

    for (const def of FIELD_DEFINITIONS) {
      if (assignedFields.has(def.field)) continue;

      // Prevent assigning stock if header is clearly consumption, amount, rate, or price
      if (
        def.field === 'stock' &&
        /consumption|issue|consumed|used|amount|rate|price|cost/i.test(cleanHeader)
      ) {
        continue;
      }

      // Prevent assigning quantity if header is stock or price or amount
      if (
        def.field === 'quantity' &&
        /stock|in\s*hand|rate|price|cost|amount/i.test(cleanHeader)
      ) {
        continue;
      }

      // Prevent assigning materialName if header is supplier, vendor, customer, serial, sl no, etc.
      if (
        def.field === 'materialName' &&
        /supplier|vendor|customer|dept|department|date|month|year|uom|unit|price|rate|qty|quantity|stock|balance|sl\s*no|serial/i.test(
          cleanHeader
        )
      ) {
        continue;
      }

      // Prevent assigning materialCode if header is supplier or item name
      if (
        def.field === 'materialCode' &&
        /supplier|vendor|customer|items?\s*name|description|particulars/i.test(
          cleanHeader
        )
      ) {
        continue;
      }

      const exactMatch = def.synonyms.some((syn) => syn.toLowerCase() === cleanHeader);
      if (exactMatch) {
        matchedField = def.field;
        assignedFields.add(def.field);
        break;
      }

      const partialMatch = def.synonyms.some((syn) => {
        const s = syn.toLowerCase();
        if (s.length < 4) return cleanHeader === s; // Avoid short substring false positives
        return cleanHeader.includes(s) || s.includes(cleanHeader);
      });

      if (partialMatch) {
        matchedField = def.field;
        assignedFields.add(def.field);
        break;
      }
    }

    mapping[header] = matchedField;
  }

  // Pass 2: Fallback for Material Name / Code if not mapped
  if (!assignedFields.has('materialName') && !assignedFields.has('materialCode')) {
    // Pick the first unassigned column that contains string names
    for (const h of headers) {
      if (!mapping[h]) {
        mapping[h] = 'materialName';
        assignedFields.add('materialName');
        break;
      }
    }
  }

  // Pass 3: Fallback for Quantity if not mapped
  if (!assignedFields.has('quantity')) {
    for (const h of headers) {
      const lowerH = h.toLowerCase();
      if (
        !mapping[h] &&
        (lowerH.includes('qty') ||
          lowerH.includes('consumption') ||
          lowerH.includes('usage') ||
          lowerH.includes('issue') ||
          lowerH.includes('consumed') ||
          lowerH.includes('total') ||
          lowerH.includes('amount'))
      ) {
        mapping[h] = 'quantity';
        assignedFields.add('quantity');
        break;
      }
    }

    // Secondary fallback: pick first numeric-sounding column after description
    if (!assignedFields.has('quantity')) {
      for (const h of headers) {
        if (!mapping[h] && h !== 'materialName' && h !== 'materialCode') {
          mapping[h] = 'quantity';
          assignedFields.add('quantity');
          break;
        }
      }
    }
  }

  return mapping;
}
