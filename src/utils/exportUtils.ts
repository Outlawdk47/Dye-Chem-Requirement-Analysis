import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  MaterialAnalysisMetric,
  CalculationSettings,
  DataQualityIssue,
  DashboardSummary,
  DatasetMeta,
} from '../types';

export function exportAnalysisToExcel(
  metrics: MaterialAnalysisMetric[],
  summary: DashboardSummary,
  settings: CalculationSettings,
  datasetMeta?: DatasetMeta | null,
  issues: DataQualityIssue[] = []
): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Executive Summary
  const summaryData = [
    ['PURCHASING REQUIREMENT ANALYSIS - EXECUTIVE SUMMARY'],
    ['Report Generated Date:', new Date().toLocaleString()],
    ['Dataset:', datasetMeta?.fileName || 'Active Dataset'],
    ['Status:', datasetMeta?.status || 'Analyzed'],
    [''],
    ['Key Performance Indicator', 'Value', 'Unit / Note'],
    ['Total Materials Analyzed', summary.totalMaterials, 'SKUs'],
    ['Materials Requiring Purchase', summary.materialsRequiringPurchase, 'SKUs with Net Requirement > 0'],
    ['Critical Priority Items (< 7d coverage)', summary.criticalMaterialsCount, 'Immediate attention required'],
    ['Excess Stock Items (> 45d coverage)', summary.excessStockItemsCount, 'Working capital tied up'],
    ['Total Forecast Requirement (Period)', Math.round(summary.totalForecastRequirement), 'Total Demand'],
    ['Total Net Purchasing Requirement', Math.round(summary.totalPurchasingRequirement), 'Recommended Purchase'],
    ['Total Current Stock on Hand', Math.round(summary.totalCurrentStock), 'Inventory On-Hand'],
    ['Average Monthly Consumption', Math.round(summary.averageMonthlyConsumption), 'Per Material'],
    ['Data Quality Issues Detected', summary.dataQualityIssuesCount, 'Flagged rows in original file'],
    [''],
    ['PLANNING ASSUMPTIONS USED:'],
    ['Planning Period:', `${settings.planningPeriodMonths} months`],
    ['Safety Stock Buffer:', `${settings.safetyStockPct}%`],
    ['Forecast Method:', settings.purchasingMethod.toUpperCase()],
    ['Forecast Weights:', `Latest Year ${settings.weightLatestYear}%, Prev Year ${settings.weightPrevYear}%, Older ${settings.weightOlderYears}%`],
    ['Critical Stock Threshold:', `< ${settings.criticalStockDays} days`],
    ['Low Stock Threshold:', `${settings.criticalStockDays} - ${settings.lowStockDays} days`],
    ['Normal Stock Threshold:', `${settings.lowStockDays} - ${settings.normalStockDays} days`],
    ['Excess Stock Threshold:', `> ${settings.excessStockDays} days`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // 2. Sheet: Purchasing Requirement
  const purchHeaders = [
    'Material Code',
    'Material Name',
    'Original Excel Item Name',
    'Category',
    'UOM',
    'Priority',
    'Stock Coverage (Days)',
    'Coverage Status',
    'Current Stock',
    'Incoming (Open PO)',
    'Forecast Monthly Consumption',
    'Planning Requirement',
    'Safety Stock',
    'Gross Requirement',
    'Net Purchasing Requirement',
    'Lead Time (Days)',
    'Reorder Point',
    'Supplier',
    'ABC Class',
    'Calculation Logic',
  ];
  const purchRows = metrics.map((m) => [
    m.materialCode,
    m.materialName,
    m.rawMaterialName || m.materialName,
    m.category,
    m.uom,
    m.purchasingPriority,
    m.stockCoverageDays ?? 'N/A',
    m.stockCoverageCategory,
    m.currentStock,
    m.incomingQuantity,
    Math.round(m.forecastMonthlyConsumption * 10) / 10,
    Math.round(m.planningRequirement * 10) / 10,
    Math.round(m.safetyStock * 10) / 10,
    Math.round(m.grossRequirement * 10) / 10,
    Math.round(m.netPurchasingRequirement * 10) / 10,
    m.leadTimeDays,
    Math.round(m.reorderPoint * 10) / 10,
    m.supplier,
    m.abcClass,
    m.calculationBreakdown.formulaText,
  ]);
  const wsPurch = XLSX.utils.aoa_to_sheet([purchHeaders, ...purchRows]);
  XLSX.utils.book_append_sheet(wb, wsPurch, 'Purchasing Requirement');

  // 3. Sheet: Material Analysis (Historical & Statistics)
  const matHeaders = [
    'Material Code',
    'Material Name',
    'Category',
    'UOM',
    'Avg Monthly (Active)',
    'Avg Monthly (Calendar)',
    'Max Monthly Consumption',
    'Min Monthly Consumption',
    'Latest Year Consumption',
    'YoY Growth %',
    'Trend',
    'Volatility (CV)',
    'Std Dev',
    'ABC Class',
    'Annual Value / Qty',
  ];
  const matRows = metrics.map((m) => [
    m.materialCode,
    m.materialName,
    m.category,
    m.uom,
    Math.round(m.overallMonthlyAverageActive * 10) / 10,
    Math.round(m.overallMonthlyAverageCalendar * 10) / 10,
    Math.round(m.overallMaximumMonthly * 10) / 10,
    Math.round(m.overallMinimumMonthly * 10) / 10,
    Math.round(m.latestYearConsumption * 10) / 10,
    m.yoyGrowthPct !== null ? `${m.yoyGrowthPct.toFixed(1)}%` : 'N/A',
    m.trend,
    `${(m.coefficientOfVariation * 100).toFixed(1)}% (${m.volatility})`,
    Math.round(m.stdDev * 10) / 10,
    m.abcClass,
    Math.round(m.annualValue),
  ]);
  const wsMat = XLSX.utils.aoa_to_sheet([matHeaders, ...matRows]);
  XLSX.utils.book_append_sheet(wb, wsMat, 'Material Analysis');

  // 4. Sheet: Yearly Analysis
  const allYears = Array.from(
    new Set(metrics.flatMap((m) => Object.keys(m.yearlyBreakdown).map(Number)))
  ).sort((a, b) => a - b);

  const yearlyHeaders = ['Material Code', 'Material Name', 'UOM'];
  allYears.forEach((y) => {
    yearlyHeaders.push(`${y} Total`);
    yearlyHeaders.push(`${y} Monthly Avg`);
    yearlyHeaders.push(`${y} Max Month`);
  });

  const yearlyRows = metrics.map((m) => {
    const row: (string | number)[] = [m.materialCode, m.materialName, m.uom];
    allYears.forEach((y) => {
      const yStats = m.yearlyBreakdown[y];
      if (yStats) {
        row.push(Math.round(yStats.totalConsumption));
        row.push(Math.round(yStats.monthlyAverageActive * 10) / 10);
        row.push(Math.round(yStats.maximumMonthly));
      } else {
        row.push(0, 0, 0);
      }
    });
    return row;
  });
  const wsYearly = XLSX.utils.aoa_to_sheet([yearlyHeaders, ...yearlyRows]);
  XLSX.utils.book_append_sheet(wb, wsYearly, 'Yearly Analysis');

  // 5. Sheet: Critical Items (<7 days coverage or immediate priority)
  const criticalItems = metrics.filter(
    (m) => m.purchasingPriority === 'Immediate' || m.stockCoverageCategory === 'Critical'
  );
  const critHeaders = [
    'Material Code',
    'Material Name',
    'Category',
    'Stock Coverage (Days)',
    'Current Stock',
    'Forecast Monthly',
    'Net Purchase Req',
    'Lead Time (Days)',
    'Supplier',
  ];
  const critRows = criticalItems.map((m) => [
    m.materialCode,
    m.materialName,
    m.category,
    m.stockCoverageDays ?? 'N/A',
    m.currentStock,
    Math.round(m.forecastMonthlyConsumption),
    Math.round(m.netPurchasingRequirement),
    m.leadTimeDays,
    m.supplier,
  ]);
  const wsCrit = XLSX.utils.aoa_to_sheet([critHeaders, ...critRows]);
  XLSX.utils.book_append_sheet(wb, wsCrit, 'Critical Items');

  // 6. Sheet: Excess Stock Items
  const excessItems = metrics.filter((m) => m.stockCoverageCategory === 'Excess');
  const excessHeaders = [
    'Material Code',
    'Material Name',
    'Category',
    'Stock Coverage (Days)',
    'Current Stock',
    'Monthly Consumption',
    'Excess Buffer Over Normal',
    'UOM',
  ];
  const excessRows = excessItems.map((m) => [
    m.materialCode,
    m.materialName,
    m.category,
    m.stockCoverageDays ?? 'N/A',
    m.currentStock,
    Math.round(m.forecastMonthlyConsumption),
    Math.max(0, Math.round(m.currentStock - m.forecastMonthlyConsumption * 1.5)),
    m.uom,
  ]);
  const wsExcess = XLSX.utils.aoa_to_sheet([excessHeaders, ...excessRows]);
  XLSX.utils.book_append_sheet(wb, wsExcess, 'Excess Stock');

  // 7. Sheet: Data Quality
  const dqHeaders = ['Row #', 'Severity', 'Field', 'Material Code', 'Issue Description'];
  const dqRows = issues.map((i) => [
    i.rowNumber,
    i.severity.toUpperCase(),
    i.field,
    i.materialCode || 'N/A',
    i.message,
  ]);
  const wsDQ = XLSX.utils.aoa_to_sheet([dqHeaders, ...dqRows]);
  XLSX.utils.book_append_sheet(wb, wsDQ, 'Data Quality');

  // 8. Sheet: Assumptions
  const assumptions = [
    ['Parameter', 'Configured Value', 'Description'],
    ['Planning Horizon', `${settings.planningPeriodMonths} months`, 'Number of forward months to fulfill'],
    ['Safety Stock %', `${settings.safetyStockPct}%`, 'Buffer percentage added to forecast demand'],
    ['Purchasing Method', settings.purchasingMethod, 'Method used to calculate monthly consumption'],
    ['Latest Year Weight', `${settings.weightLatestYear}%`, 'Weight in weighted-average calculation'],
    ['Previous Year Weight', `${settings.weightPrevYear}%`, 'Weight in weighted-average calculation'],
    ['Older Years Weight', `${settings.weightOlderYears}%`, 'Weight in weighted-average calculation'],
    ['Demand Growth Factor', `${settings.demandGrowthPct}%`, 'Simulated demand shift'],
    ['Critical Stock Limit', `${settings.criticalStockDays} days`, 'Immediate reorder threshold'],
    ['Low Stock Limit', `${settings.lowStockDays} days`, 'High priority reorder threshold'],
    ['Excess Stock Limit', `${settings.excessStockDays} days`, 'Overstocked threshold'],
    ['Ignore Zero Months', settings.ignoreZeroConsumption ? 'YES' : 'NO', 'Exclude zero months in monthly average'],
    ['ABC Thresholds', `A: top ${settings.abcThresholdA}%, B: up to ${settings.abcThresholdB}%, C: remaining`, 'Pareto stratification'],
  ];
  const wsAssump = XLSX.utils.aoa_to_sheet(assumptions);
  XLSX.utils.book_append_sheet(wb, wsAssump, 'Assumptions');

  // Trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Purchasing_Requirement_Report_${dateStr}.xlsx`);
}

export function exportAnalysisToPDF(
  metrics: MaterialAnalysisMetric[],
  summary: DashboardSummary,
  settings: CalculationSettings,
  datasetMeta?: DatasetMeta | null
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const dateStr = new Date().toLocaleString();

  // Document Title Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 842, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Purchasing Requirement Analysis & Planning Report', 40, 36);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated: ${dateStr} | Dataset: ${datasetMeta?.fileName || 'Active Dataset'}`, 500, 36);

  // Executive Summary Card Section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Executive KPI Summary', 40, 85);

  const kpiData = [
    [
      `Total Materials: ${summary.totalMaterials}`,
      `Purchase Required: ${summary.materialsRequiringPurchase}`,
      `Critical Items: ${summary.criticalMaterialsCount}`,
      `Excess Items: ${summary.excessStockItemsCount}`,
    ],
    [
      `Total Current Stock: ${Math.round(summary.totalCurrentStock).toLocaleString()}`,
      `Total Forecast: ${Math.round(summary.totalForecastRequirement).toLocaleString()}`,
      `Total Net Purchase Req: ${Math.round(summary.totalPurchasingRequirement).toLocaleString()}`,
      `Planning Horizon: ${settings.planningPeriodMonths} Months`,
    ],
  ];

  autoTable(doc, {
    startY: 95,
    margin: { left: 40, right: 40 },
    theme: 'grid',
    body: kpiData,
    styles: { fontSize: 10, fontStyle: 'bold', cellPadding: 6, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });

  // Table 1: Critical & High Priority Materials
  const priorityItems = metrics
    .filter((m) => m.purchasingPriority === 'Immediate' || m.purchasingPriority === 'High')
    .slice(0, 15);

  const finalY1 = (doc as any).lastAutoTable.finalY + 25;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Critical & High Priority Purchasing Requirements', 40, finalY1);

  const tableBody = priorityItems.map((m) => [
    m.materialCode,
    m.materialName.slice(0, 24),
    m.uom,
    m.purchasingPriority,
    m.stockCoverageDays !== null ? `${m.stockCoverageDays}d` : 'N/A',
    m.currentStock.toFixed(0),
    m.incomingQuantity.toFixed(0),
    m.forecastMonthlyConsumption.toFixed(0),
    m.safetyStock.toFixed(0),
    m.netPurchasingRequirement.toFixed(0),
    `${m.leadTimeDays}d`,
    m.supplier.slice(0, 20),
  ]);

  autoTable(doc, {
    startY: finalY1 + 10,
    margin: { left: 40, right: 40 },
    theme: 'striped',
    head: [[
      'Code', 'Description', 'UOM', 'Priority', 'Coverage',
      'Stock', 'Incoming', 'Forecast/mo', 'Safety', 'Net Req', 'Lead Time', 'Supplier'
    ]],
    body: tableBody.length > 0 ? tableBody : [['-', 'No critical priority items at this time', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 4 },
  });

  // Page 2: Full Material Purchasing Schedule
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('3. Comprehensive Purchasing & Stock Plan', 40, 40);

  const allTableBody = metrics.map((m) => [
    m.materialCode,
    m.materialName.slice(0, 26),
    m.category.slice(0, 15),
    m.uom,
    m.purchasingPriority,
    m.stockCoverageDays !== null ? `${m.stockCoverageDays}d` : 'N/A',
    m.currentStock.toFixed(0),
    m.forecastMonthlyConsumption.toFixed(0),
    m.grossRequirement.toFixed(0),
    m.netPurchasingRequirement.toFixed(0),
    m.reorderPoint.toFixed(0),
    m.abcClass,
  ]);

  autoTable(doc, {
    startY: 55,
    margin: { left: 40, right: 40 },
    theme: 'striped',
    head: [[
      'Code', 'Material Name', 'Category', 'UOM', 'Priority',
      'Coverage', 'Current Stock', 'Forecast/mo', 'Gross Req', 'Net Req', 'ROP', 'ABC'
    ]],
    body: allTableBody,
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3.5 },
  });

  // Footer note on calculation formula
  const finalY2 = (doc as any).lastAutoTable.finalY + 20;
  if (finalY2 < 550) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Formula: Net Requirement = (Forecast Monthly × ${settings.planningPeriodMonths}mo Planning Period + ${settings.safetyStockPct}% Safety Stock) - Current Stock - Incoming Open POs. Values rounded to nearest unit.`,
      40,
      finalY2
    );
  }

  const pdfDate = new Date().toISOString().slice(0, 10);
  doc.save(`Purchasing_Requirement_Report_${pdfDate}.pdf`);
}

export function exportIssuesToCSV(issues: DataQualityIssue[]): void {
  const headers = ['Row Number', 'Severity', 'Field', 'Material Code', 'Issue Description'];
  const rows = issues.map((i) => [
    i.rowNumber,
    i.severity,
    `"${i.field}"`,
    `"${i.materialCode || ''}"`,
    `"${i.message.replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Data_Quality_Issues_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generates a clean, normalized Master Excel workbook from all cleaned records
export function exportCleanedMasterExcel(
  records: any[],
  originalFileName: string = 'Master_File'
): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Cleaned Master Records
  const cleanHeaders = [
    'Material Code',
    'Material / Chemical Name',
    'Category / Worksheet',
    'Unit of Measure (UOM)',
    'Year',
    'Month',
    'Consumption Quantity',
    'Current Stock / Balance',
    'Purchase / Received Qty',
    'Supplier / Vendor',
    'Department / Plant Unit',
    'Lead Time (Days)',
    'Open PO / Incoming Qty',
    'Date Recorded',
  ];

  const cleanRows = records.map((r) => [
    r.materialCode,
    r.materialName,
    r.category || 'General',
    r.uom || 'UNITS',
    r.year,
    r.month,
    r.quantity ?? 0,
    r.stock ?? 0,
    r.purchaseQuantity ?? 0,
    r.supplier || '',
    r.department || '',
    r.leadTimeDays ?? '',
    r.incomingQuantity ?? 0,
    r.date || '',
  ]);

  const wsClean = XLSX.utils.aoa_to_sheet([cleanHeaders, ...cleanRows]);
  XLSX.utils.book_append_sheet(wb, wsClean, 'Cleaned Master Data');

  // 2. Sheet: Material Summary
  const matMap = new Map<string, { name: string; category: string; uom: string; totalQty: number; stock: number }>();
  records.forEach((r) => {
    const code = r.materialCode;
    if (!matMap.has(code)) {
      matMap.set(code, {
        name: r.materialName,
        category: r.category || 'General',
        uom: r.uom || 'UNITS',
        totalQty: 0,
        stock: r.stock || 0,
      });
    }
    const cur = matMap.get(code)!;
    cur.totalQty += Number(r.quantity) || 0;
    if (r.stock) cur.stock = Math.max(cur.stock, Number(r.stock));
  });

  const sumHeaders = ['Material Code', 'Material Name', 'Category', 'UOM', 'Total Consumption', 'Latest Stock'];
  const sumRows = Array.from(matMap.entries()).map(([code, data]) => [
    code,
    data.name,
    data.category,
    data.uom,
    Math.round(data.totalQty * 10) / 10,
    Math.round(data.stock * 10) / 10,
  ]);
  const wsSum = XLSX.utils.aoa_to_sheet([sumHeaders, ...sumRows]);
  XLSX.utils.book_append_sheet(wb, wsSum, 'Materials Summary');

  const baseName = originalFileName.replace(/\.[^/.]+$/, '');
  XLSX.writeFile(wb, `Cleaned_${baseName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

