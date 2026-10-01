export type StandardField =
  | 'materialCode'
  | 'materialName'
  | 'category'
  | 'uom'
  | 'date'
  | 'year'
  | 'month'
  | 'quantity'
  | 'purchaseQuantity'
  | 'stock'
  | 'supplier'
  | 'department'
  | 'unitPrice'
  | 'leadTimeDays'
  | 'incomingQuantity';

export interface FieldDefinition {
  field: StandardField;
  label: string;
  required: boolean;
  description: string;
  synonyms: string[];
}

export type ColumnMapping = Record<string, StandardField | ''>;

export interface RawRecord {
  _rowNumber: number;
  [key: string]: any;
}

export type RecordStatus = 'valid' | 'warning' | 'invalid';

export interface DataQualityIssue {
  rowNumber: number;
  materialCode?: string;
  materialName?: string;
  field: string;
  severity: 'warning' | 'invalid';
  message: string;
  rawData: Record<string, any>;
}

export interface NormalizedRecord {
  id?: string;
  datasetId: string;
  materialCode: string;
  materialName: string;
  rawMaterialName?: string;
  category: string;
  sheetName?: string;
  uom: string;
  date: string;
  year: number;
  month: number;
  quantity: number;
  purchaseQuantity?: number;
  stock?: number;
  supplier?: string;
  department?: string;
  unitPrice?: number;
  leadTimeDays?: number;
  incomingQuantity?: number;
}

export interface DatasetMeta {
  id: string;
  fileName: string;
  fileSize: number;
  fileStorageUrl?: string;
  uploadedBy?: string;
  uploadedByEmail?: string;
  uploadedAt: string;
  updatedAt?: string;
  rowCount: number;
  validCount: number;
  warningCount: number;
  invalidCount: number;
  columnMapping: string; // JSON string
  status: 'uploaded' | 'analyzed' | 'archived';
  yearsCovered?: string;
  materialCount?: number;
  isDemo?: boolean;
}

export type PurchasingMethod = 'safety_stock' | 'average' | 'maximum' | 'trend';

export type StockCoverageCategory = 'Critical' | 'Low' | 'Normal' | 'Excess' | 'No Consumption';

export type PurchasingPriority = 'Immediate' | 'High' | 'Medium' | 'Low' | 'No Purchase Required';

export type TrendClassification = 'Increasing' | 'Decreasing' | 'Stable' | 'Highly Variable' | 'Insufficient Data';

export type VolatilityLevel = 'Low' | 'Medium' | 'High' | 'Insufficient Data';

export type AbcClass = 'A' | 'B' | 'C';

export interface YearlyStats {
  year: number;
  totalConsumption: number;
  monthlyAverageActive: number;
  monthlyAverageCalendar: number;
  maximumMonthly: number;
  minimumMonthly: number;
  activeMonthsCount: number;
  monthlyData: { month: number; quantity: number }[];
}

export interface MaterialAnalysisMetric {
  materialCode: string;
  materialName: string;
  rawMaterialName?: string;
  category: string;
  sheetName?: string;
  uom: string;
  supplier: string;
  department: string;
  unitPrice: number;
  leadTimeDays: number;
  
  // Stock & Inventory
  currentStock: number;
  incomingQuantity: number;
  stockCoverageDays: number | null;
  stockCoverageCategory: StockCoverageCategory;
  reorderPoint: number;
  leadTimeDemand: number;
  
  // Historical consumption
  totalHistoricalConsumption: number;
  overallMonthlyAverageActive: number;
  overallMonthlyAverageCalendar: number;
  overallMaximumMonthly: number;
  overallMinimumMonthly: number;
  latestYearConsumption: number;
  latestYear: number;
  yearsAvailable: number[];
  yearlyBreakdown: Record<number, YearlyStats>;
  monthlyHistory: { period: string; year: number; month: number; quantity: number }[];
  
  // Trends & Volatility
  yoyGrowthPct: number | null;
  averageGrowthRatePct: number | null;
  trend: TrendClassification;
  trendSlope: number;
  stdDev: number;
  coefficientOfVariation: number; // CV = stdDev / avg
  volatility: VolatilityLevel;
  abcClass: AbcClass;
  annualValue: number;
  
  // Requirement Planning
  forecastMonthlyConsumption: number;
  forecastReliability: 'High' | 'Moderate' | 'Insufficient historical data';
  planningRequirement: number;
  safetyStock: number;
  grossRequirement: number;
  netPurchasingRequirement: number;
  purchasingPriority: PurchasingPriority;
  priorityScore: number;
  
  // Calculation details
  calculationBreakdown: {
    weightsUsed: { [year: number]: number };
    method: PurchasingMethod;
    planningMonths: number;
    safetyStockPct: number;
    growthAppliedPct: number;
    stockDeducted: number;
    incomingDeducted: number;
    formulaText: string;
  };
}

export interface CalculationSettings {
  planningPeriodMonths: number;
  safetyStockPct: number;
  purchasingMethod: PurchasingMethod;
  weightLatestYear: number;
  weightPrevYear: number;
  weightOlderYears: number;
  demandGrowthPct: number;
  
  defaultLeadTimeDays: number;
  criticalStockDays: number;
  lowStockDays: number;
  normalStockDays: number;
  excessStockDays: number;
  
  ignoreZeroConsumption: boolean;
  minPurchaseQuantity: number;
  roundingIncrement: number;
  
  abcThresholdA: number; // e.g. 70
  abcThresholdB: number; // e.g. 90
  
  volatilityLowThreshold: number; // e.g. 0.25 (25% CV)
  volatilityMediumThreshold: number; // e.g. 0.60 (60% CV)
}

export interface SavedScenario {
  id: string;
  name: string;
  description: string;
  planningPeriodMonths: number;
  safetyStockPct: number;
  demandGrowthPct: number;
  leadTimeDays?: number;
  purchasingMethod?: PurchasingMethod;
  createdAt: string;
  createdBy?: string;
}

export interface DashboardSummary {
  totalMaterials: number;
  distinctMaterialsCount: number;
  materialsRequiringPurchase: number;
  criticalMaterialsCount: number;
  totalForecastRequirement: number;
  totalPurchasingRequirement: number;
  excessStockItemsCount: number;
  totalCurrentStock: number;
  averageMonthlyConsumption: number;
  dataQualityIssuesCount: number;
}
