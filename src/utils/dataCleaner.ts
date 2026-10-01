import type {
  ColumnMapping,
  RawRecord,
  NormalizedRecord,
  DataQualityIssue,
  RecordStatus,
} from '../types';

export interface CleaningResult {
  validRecords: NormalizedRecord[];
  allNormalized: NormalizedRecord[];
  issues: DataQualityIssue[];
  validCount: number;
  warningCount: number;
  invalidCount: number;
  totalRows: number;
  duplicateRowsCount: number;
  distinctMaterialsCount: number;
  yearsDetected: number[];
}

// UOM Normalization dictionary - Converts MT, TONS, LTR, etc. to KG / KGS
export function normalizeUOM(rawUOM?: string): string {
  if (!rawUOM) return 'KG';
  const clean = rawUOM.trim().toUpperCase().replace(/[\.\s_-]+/g, '');
  if (['MT', 'TON', 'TONS', 'TONNE', 'TONNES', 'METRICTON', 'KG', 'KGS', 'KILOGRAM', 'KILOGRAMS'].includes(clean)) return 'KG';
  if (['LTR', 'LITRE', 'LITRES', 'LITER', 'LITERS', 'L'].includes(clean)) return 'KG';
  if (['PCS', 'PC', 'PIECE', 'PIECES', 'NOS', 'NO', 'NUMBERS'].includes(clean)) return 'PCS';
  return 'KG';
}

// Clean and parse numeric values safely
export function parseNumeric(val: any): { value: number; isParsed: boolean; hadCommas: boolean } {
  if (val === undefined || val === null || val === '') {
    return { value: 0, isParsed: true, hadCommas: false };
  }
  if (typeof val === 'number') {
    return { value: isNaN(val) ? 0 : val, isParsed: !isNaN(val), hadCommas: false };
  }

  const str = String(val).trim();
  const lower = str.toLowerCase();

  // Zero / empty indicators common in factory ledgers
  if (['-', '--', '---', 'nil', 'none', 'n/a', 'na', 'null', '0', 'zero'].includes(lower)) {
    return { value: 0, isParsed: true, hadCommas: false };
  }

  const hadCommas = str.includes(',');
  // Remove currency signs, commas, extra spaces, and common unit suffixes (kg, mt, ltr, pcs, etc.)
  const cleaned = str
    .replace(/[$,€£৳\s]/g, '')
    .replace(/,/g, '')
    .replace(/(kg|kgs|mt|ltr|ltrs|liter|liters|pcs|gm|gms|ton|tons)$/i, '')
    .trim();

  const parsed = parseFloat(cleaned);
  return {
    value: isNaN(parsed) ? 0 : parsed,
    isParsed: !isNaN(parsed),
    hadCommas,
  };
}

// Parse date into Year and Month
export function parseDateYearMonth(
  rawDate: any,
  rawYear: any,
  rawMonth: any
): { dateStr: string; year: number; month: number; isValidDate: boolean } {
  let year = 0;
  let month = 0;
  let dateStr = '';
  let isValidDate = true;

  // 1. If explicit year and month are present
  if (rawYear) {
    const yParsed = parseInt(String(rawYear).trim(), 10);
    if (!isNaN(yParsed) && yParsed > 1990 && yParsed < 2100) {
      year = yParsed;
    }
  }

  if (rawMonth) {
    const mStr = String(rawMonth).trim().toLowerCase();
    const monthsMap: Record<string, number> = {
      jan: 1, january: 1, '1': 1, '01': 1,
      feb: 2, february: 2, '2': 2, '02': 2,
      mar: 3, march: 3, '3': 3, '03': 3,
      apr: 4, april: 4, '4': 4, '04': 4,
      may: 5, '5': 5, '05': 5,
      jun: 6, june: 6, '6': 6, '06': 6,
      jul: 7, july: 7, '7': 7, '07': 7,
      aug: 8, august: 8, '8': 8, '08': 8,
      sep: 9, september: 9, sept: 9, '9': 9, '09': 9,
      oct: 10, october: 10, '10': 10,
      nov: 11, november: 11, '11': 11,
      dec: 12, december: 12, '12': 12,
    };
    if (monthsMap[mStr]) {
      month = monthsMap[mStr];
    }
  }

  // 2. If date string or JS Date object provided
  if (rawDate) {
    let d: Date | null = null;
    if (rawDate instanceof Date) {
      d = rawDate;
    } else {
      const parsedTimestamp = Date.parse(String(rawDate));
      if (!isNaN(parsedTimestamp)) {
        d = new Date(parsedTimestamp);
      }
    }

    if (d && !isNaN(d.getTime())) {
      dateStr = d.toISOString().slice(0, 10);
      if (!year) year = d.getFullYear();
      if (!month) month = d.getMonth() + 1;
    } else {
      dateStr = String(rawDate);
    }
  }

  // Fallback defaults if incomplete
  if (!year || year < 1990 || year > 2100) {
    isValidDate = false;
    year = new Date().getFullYear();
  }
  if (!month || month < 1 || month > 12) {
    isValidDate = false;
    month = 1;
  }
  if (!dateStr) {
    dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  }

  return { dateStr, year, month, isValidDate };
}

export function cleanAndNormalizeDataset(
  rawRows: RawRecord[],
  columnMapping: ColumnMapping,
  datasetId: string
): CleaningResult {
  const issues: DataQualityIssue[] = [];
  const validRecords: NormalizedRecord[] = [];
  const allNormalized: NormalizedRecord[] = [];

  let validCount = 0;
  let warningCount = 0;
  let invalidCount = 0;
  let duplicateRowsCount = 0;

  const seenKeys = new Set<string>();
  const distinctMaterials = new Set<string>();
  const yearsSet = new Set<number>();

  // Invert mapping for quick lookup: standardField -> excelColumnName
  const fieldToCol: Partial<Record<string, string>> = {};
  for (const [col, field] of Object.entries(columnMapping)) {
    if (field) {
      fieldToCol[field] = col;
    }
  }

  rawRows.forEach((row, idx) => {
    const rowNum = row._rowNumber || idx + 2;

    const rawMatCode = fieldToCol.materialCode ? row[fieldToCol.materialCode] : undefined;
    const rawMatName = fieldToCol.materialName ? row[fieldToCol.materialName] : undefined;
    const rawQty = fieldToCol.quantity ? row[fieldToCol.quantity] : (row['Consumption Quantity'] || row.Quantity);
    const rawUom = fieldToCol.uom ? row[fieldToCol.uom] : undefined;
    const rawCategory = fieldToCol.category ? row[fieldToCol.category] : (row._sheetName || undefined);
    const rawDate = fieldToCol.date ? row[fieldToCol.date] : undefined;
    const rawYear = row._year !== undefined ? row._year : (fieldToCol.year ? row[fieldToCol.year] : undefined);
    const rawMonth = row._month !== undefined ? row._month : (fieldToCol.month ? row[fieldToCol.month] : undefined);
    // Priority stock extraction: Check for explicit "IN HAND STOCK" or "IN HAND" column in row
    let rawStock: any = undefined;
    const inHandStockKey = Object.keys(row).find((k) => {
      const cleanKey = k.toLowerCase().replace(/[\r\n\t\u00A0]+/g, ' ').trim();
      return (
        /in\s*[\-\_\s]*hand|hand\s*stock|stock\s*in\s*hand/i.test(cleanKey) &&
        !/consumption|issue|consumed|used|amount|rate|price/i.test(cleanKey)
      );
    });

    if (inHandStockKey && row[inHandStockKey] !== undefined && row[inHandStockKey] !== null && String(row[inHandStockKey]).trim() !== '') {
      rawStock = row[inHandStockKey];
    } else if (
      fieldToCol.stock &&
      row[fieldToCol.stock] !== undefined &&
      row[fieldToCol.stock] !== null &&
      String(row[fieldToCol.stock]).trim() !== '' &&
      !/consumption|issue|consumed|used|amount|rate|price/i.test(fieldToCol.stock)
    ) {
      rawStock = row[fieldToCol.stock];
    } else {
      const fallbackStockKey = Object.keys(row).find((k) => {
        const cleanKey = k.toLowerCase().replace(/[\r\n\t\u00A0]+/g, ' ').trim();
        return (
          /closing\s*stock|current\s*stock|opening\s*stock|present\s*stock|stock\s*balance/i.test(cleanKey) &&
          !/consumption|issue|consumed|used|amount|rate|price/i.test(cleanKey)
        );
      });
      if (fallbackStockKey) {
        rawStock = row[fallbackStockKey];
      }
    }
    const rawPurchaseQty = fieldToCol.purchaseQuantity ? row[fieldToCol.purchaseQuantity] : undefined;
    const rawSupplier = fieldToCol.supplier ? row[fieldToCol.supplier] : undefined;
    const rawDept = fieldToCol.department ? row[fieldToCol.department] : (row._sheetName || undefined);
    const rawUnitPrice = fieldToCol.unitPrice ? row[fieldToCol.unitPrice] : undefined;
    const rawLeadTime = fieldToCol.leadTimeDays ? row[fieldToCol.leadTimeDays] : undefined;
    const rawIncoming = fieldToCol.incomingQuantity ? row[fieldToCol.incomingQuantity] : undefined;

    // Check if entire row is blank
    const nonRowKeys = Object.keys(row).filter((k) => !k.startsWith('_'));
    const isBlankRow = nonRowKeys.every((k) => row[k] === '' || row[k] === null || row[k] === undefined);
    if (isBlankRow) {
      return; // Silently skip completely empty spreadsheet rows
    }

    // Check if row is a Total / Summary footer row
    const testName = String(rawMatName || rawMatCode || '').trim().toLowerCase();
    if (
      testName === 'total' ||
      testName === 'grand total' ||
      testName === 'sub total' ||
      testName === 'subtotal' ||
      testName.startsWith('total ') ||
      testName.startsWith('grand total')
    ) {
      return; // Skip summary footer rows so they don't corrupt SKU calculations
    }

    let isInvalid = false;
    let hasWarning = false;

    // 1. Material Code & Name validation
    const cleanMatCode = rawMatCode ? String(rawMatCode).trim() : '';
    const cleanMatName = rawMatName ? String(rawMatName).trim() : '';

    if (!cleanMatCode && !cleanMatName) {
      isInvalid = true;
      issues.push({
        rowNumber: rowNum,
        field: 'materialName',
        severity: 'invalid',
        message: 'Row missing both Material / Chemical Name and Code',
        rawData: row,
      });
    } else if (!cleanMatCode) {
      // Auto-generate a clean, stable material code from the chemical/material name
      hasWarning = true;
      const slug = cleanMatName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 16);
      issues.push({
        rowNumber: rowNum,
        materialName: cleanMatName,
        field: 'materialCode',
        severity: 'warning',
        message: `Material Code missing; auto-generated: "CHEM-${slug}"`,
        rawData: row,
      });
    } else if (!cleanMatName) {
      // Removed hasWarning = true; so that missing material name is accepted if code exists
    }

    const materialCode = cleanMatCode || `CHEM-${cleanMatName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 16)}`;
    const materialName = cleanMatName || `Item ${materialCode}`;

    // 2. Quantity validation
    const qtyParse = parseNumeric(rawQty);
    let quantity = qtyParse.value;

    if (!qtyParse.isParsed && rawQty !== '' && rawQty !== undefined) {
      hasWarning = true;
      issues.push({
        rowNumber: rowNum,
        materialCode,
        materialName,
        field: 'quantity',
        severity: 'warning',
        message: `Non-numeric quantity "${rawQty}" defaulted to 0`,
        rawData: row,
      });
      quantity = 0;
    }

    if (quantity < 0) {
      hasWarning = true;
      issues.push({
        rowNumber: rowNum,
        materialCode,
        materialName,
        field: 'quantity',
        severity: 'warning',
        message: `Negative consumption quantity (${quantity}) adjusted to absolute positive value (${Math.abs(quantity)})`,
        rawData: row,
      });
      quantity = Math.abs(quantity);
    }

    // 3. Date / Year / Month
    const { dateStr, year, month, isValidDate } = parseDateYearMonth(rawDate, rawYear, rawMonth);
    if (!isValidDate && !rawYear && !rawMonth) {
      // Non-critical: defaults to current year
    }

    // 4. Duplicate Record Check (same material, year, month, dept)
    const duplicateKey = `${materialCode}__${year}__${month}__${String(rawDept || '').trim().toLowerCase()}`;
    if (seenKeys.has(duplicateKey)) {
      duplicateRowsCount++;
      // We still include it, but flag it
      hasWarning = true;
      issues.push({
        rowNumber: rowNum,
        materialCode,
        materialName,
        field: 'duplicate',
        severity: 'warning',
        message: `Multiple entries found for ${materialCode} in period ${year}-M${month}`,
        rawData: row,
      });
    }
    seenKeys.add(duplicateKey);

    // 5. UOM Check
    const cleanUom = normalizeUOM(rawUom ? String(rawUom) : undefined);
    if (!rawUom) {
      hasWarning = true;
    }

    // 6. Supplier, Department, Stock
    const supplier = rawSupplier ? String(rawSupplier).trim().replace(/\s+/g, ' ') : 'General Supplier';
    const department = rawDept ? String(rawDept).trim().replace(/\s+/g, ' ') : (row._sheetName || 'Plant General');
    const category = rawCategory ? String(rawCategory).trim().replace(/\s+/g, ' ') : (row._sheetName || 'Chemicals');

    const stock = parseNumeric(rawStock).value;
    const purchaseQty = parseNumeric(rawPurchaseQty).value;
    const unitPrice = parseNumeric(rawUnitPrice).value;
    const leadTimeDays = parseNumeric(rawLeadTime).value;
    const incomingQuantity = parseNumeric(rawIncoming).value;

    const sheetName = row._sheetName ? String(row._sheetName).trim() : (rawCategory ? String(rawCategory).trim() : 'General Sheet');

    const rawMaterialName = rawMatName ? String(rawMatName).trim() : materialName;

    const normalizedRecord: NormalizedRecord = {
      id: `rec_${rowNum}_${idx}`,
      datasetId,
      materialCode,
      materialName,
      rawMaterialName,
      category,
      sheetName,
      uom: cleanUom,
      date: dateStr,
      year,
      month,
      quantity,
      purchaseQuantity: purchaseQty,
      stock,
      supplier,
      department,
      unitPrice,
      leadTimeDays,
      incomingQuantity,
    };

    allNormalized.push(normalizedRecord);

    if (isInvalid) {
      invalidCount++;
    } else {
      validRecords.push(normalizedRecord);
      distinctMaterials.add(materialCode);
      yearsSet.add(year);

      if (hasWarning) {
        warningCount++;
      } else {
        validCount++;
      }
    }
  });

  return {
    validRecords,
    allNormalized,
    issues,
    validCount,
    warningCount,
    invalidCount,
    totalRows: rawRows.length,
    duplicateRowsCount,
    distinctMaterialsCount: distinctMaterials.size,
    yearsDetected: Array.from(yearsSet).sort((a, b) => a - b),
  };
}
