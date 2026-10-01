import type {
  NormalizedRecord,
  MaterialAnalysisMetric,
  YearlyStats,
  CalculationSettings,
  StockCoverageCategory,
  PurchasingPriority,
  TrendClassification,
  VolatilityLevel,
  AbcClass,
  DashboardSummary,
} from '../types';

export const DEFAULT_SETTINGS: CalculationSettings = {
  planningPeriodMonths: 2,
  safetyStockPct: 20, // 20%
  purchasingMethod: 'safety_stock',
  weightLatestYear: 50,
  weightPrevYear: 30,
  weightOlderYears: 20,
  demandGrowthPct: 0,
  defaultLeadTimeDays: 15,
  criticalStockDays: 7,
  lowStockDays: 15,
  normalStockDays: 45,
  excessStockDays: 60,
  ignoreZeroConsumption: true,
  minPurchaseQuantity: 0,
  roundingIncrement: 1,
  abcThresholdA: 70,
  abcThresholdB: 90,
  volatilityLowThreshold: 0.25,
  volatilityMediumThreshold: 0.60,
};

// Calculate linear regression slope for trend detection
export function calculateLinearRegressionSlope(values: number[]): { slope: number; rSquared: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, rSquared: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, rSquared: 0 };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const numeratorR = n * sumXY - sumX * sumY;
  const denomR = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  const rSquared = denomR === 0 ? 0 : Math.pow(numeratorR / denomR, 2);

  return { slope, rSquared };
}

// Calculate standard deviation
export function calculateStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function analyzeMaterials(
  records: NormalizedRecord[],
  settings: CalculationSettings = DEFAULT_SETTINGS
): MaterialAnalysisMetric[] {
  if (!records || records.length === 0) return [];

  // 1. Group records by materialName/materialCode to preserve item counts across sheets
  const materialGroups = new Map<string, NormalizedRecord[]>();
  for (const rec of records) {
    const itemIdentifier = rec.materialName ? rec.materialName.trim() : rec.materialCode;
    // Skip records without identifiable material name or code
    if (!itemIdentifier) continue;
    
    if (!materialGroups.has(itemIdentifier)) {
      materialGroups.set(itemIdentifier, []);
    }
    materialGroups.get(itemIdentifier)!.push(rec);
  }

  // 2. Compute individual metrics per material
  const preliminaryMetrics: MaterialAnalysisMetric[] = [];

  materialGroups.forEach((groupRecords) => {
    const firstRec = groupRecords[0];
    const materialCode = firstRec.materialCode;
    const materialName = firstRec.materialName || materialCode;
    const category = firstRec.category || 'General';
    const uom = firstRec.uom || 'UNITS';
    const supplier = firstRec.supplier || 'Standard Supplier';
    const department = firstRec.department || 'Plant';
    const unitPrice = groupRecords.find((r) => r.unitPrice && r.unitPrice > 0)?.unitPrice || 0;
    const leadTimeDays =
      groupRecords.find((r) => r.leadTimeDays && r.leadTimeDays > 0)?.leadTimeDays ||
      settings.defaultLeadTimeDays;

    // Aggregate stock and incoming quantity across distinct sheets/departments
    const sheetStockMap = new Map<string, number>();
    const sheetIncomingMap = new Map<string, number>();

    groupRecords.forEach((r) => {
      const deptKey = r.sheetName || r.department || r.category || 'General';
      if (r.stock !== undefined && r.stock !== null && !isNaN(Number(r.stock))) {
        sheetStockMap.set(deptKey, Number(r.stock));
      }
      if (r.incomingQuantity !== undefined && r.incomingQuantity !== null && !isNaN(Number(r.incomingQuantity))) {
        sheetIncomingMap.set(deptKey, Number(r.incomingQuantity));
      }
    });

    let currentStock = 0;
    sheetStockMap.forEach((st) => { currentStock += st; });

    let incomingQuantity = 0;
    sheetIncomingMap.forEach((inc) => { incomingQuantity += inc; });

    // Group by Year and Month: year -> month -> totalQty
    const yearMonthMap = new Map<number, Map<number, number>>();
    const allChronological: { period: string; year: number; month: number; quantity: number }[] = [];

    groupRecords.forEach((r) => {
      if (!yearMonthMap.has(r.year)) {
        yearMonthMap.set(r.year, new Map<number, number>());
      }
      const monthMap = yearMonthMap.get(r.year)!;
      monthMap.set(r.month, (monthMap.get(r.month) || 0) + r.quantity);
    });

    const years = Array.from(yearMonthMap.keys()).sort((a, b) => a - b);
    const latestYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();

    // Compute Yearly Stats
    const yearlyBreakdown: Record<number, YearlyStats> = {};
    let totalAllTimeConsumption = 0;
    let allActiveMonthlyValues: number[] = [];
    let allCalendarMonthlyValues: number[] = [];

    years.forEach((yr) => {
      const monthMap = yearMonthMap.get(yr)!;
      const monthlyData: { month: number; quantity: number }[] = [];
      let totalAnnual = 0;
      let activeMonths = 0;
      let maxMonthQty = 0;
      let minMonthQty = Infinity;

      for (let m = 1; m <= 12; m++) {
        const qty = monthMap.get(m) || 0;
        if (qty > 0 || !settings.ignoreZeroConsumption) {
          monthlyData.push({ month: m, quantity: qty });
          if (qty > 0) activeMonths++;
          if (qty > maxMonthQty) maxMonthQty = qty;
          if (qty < minMonthQty && (qty > 0 || !settings.ignoreZeroConsumption)) {
            minMonthQty = qty;
          }
          if (qty > 0) allActiveMonthlyValues.push(qty);
          allCalendarMonthlyValues.push(qty);
        }
        totalAnnual += qty;
        totalAllTimeConsumption += qty;

        // Chronological entry
        if (monthMap.has(m)) {
          allChronological.push({
            period: `${yr}-${String(m).padStart(2, '0')}`,
            year: yr,
            month: m,
            quantity: qty,
          });
        }
      }

      if (minMonthQty === Infinity) minMonthQty = 0;

      const monthlyAverageActive = activeMonths > 0 ? totalAnnual / activeMonths : 0;
      const monthlyAverageCalendar = totalAnnual / 12;

      yearlyBreakdown[yr] = {
        year: yr,
        totalConsumption: totalAnnual,
        monthlyAverageActive,
        monthlyAverageCalendar,
        maximumMonthly: maxMonthQty,
        minimumMonthly: minMonthQty,
        activeMonthsCount: activeMonths,
        monthlyData,
      };
    });

    // Chronological order
    allChronological.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const overallMaximumMonthly = Math.max(
      ...years.map((y) => yearlyBreakdown[y]?.maximumMonthly || 0),
      0
    );
    const overallMinimumMonthly = Math.min(
      ...years.map((y) => yearlyBreakdown[y]?.minimumMonthly || 0),
      0
    );

    const overallMonthlyAverageActive =
      allActiveMonthlyValues.length > 0
        ? allActiveMonthlyValues.reduce((a, b) => a + b, 0) / allActiveMonthlyValues.length
        : 0;

    const overallMonthlyAverageCalendar =
      allCalendarMonthlyValues.length > 0
        ? allCalendarMonthlyValues.reduce((a, b) => a + b, 0) / (years.length * 12)
        : 0;

    const latestYearConsumption = yearlyBreakdown[latestYear]?.totalConsumption || 0;

    // YoY Growth % between latest and previous year
    let yoyGrowthPct: number | null = null;
    let averageGrowthRatePct: number | null = null;

    if (years.length >= 2) {
      const prevYear = years[years.length - 2];
      const prevConsumption = yearlyBreakdown[prevYear]?.totalConsumption || 0;
      if (prevConsumption > 0) {
        yoyGrowthPct = ((latestYearConsumption - prevConsumption) / prevConsumption) * 100;
      }

      // Average growth rate across consecutive years
      const growthRates: number[] = [];
      for (let i = 1; i < years.length; i++) {
        const yCur = years[i];
        const yPrv = years[i - 1];
        const cCur = yearlyBreakdown[yCur]?.totalConsumption || 0;
        const cPrv = yearlyBreakdown[yPrv]?.totalConsumption || 0;
        if (cPrv > 0) {
          growthRates.push(((cCur - cPrv) / cPrv) * 100);
        }
      }
      if (growthRates.length > 0) {
        averageGrowthRatePct = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      }
    }

    // Statistical Trend & Volatility
    const monthlySeries = allChronological.map((item) => item.quantity);
    const totalPoints = monthlySeries.length;
    let trend: TrendClassification = 'Insufficient Data';
    let trendSlope = 0;
    let stdDev = 0;
    let coefficientOfVariation = 0;
    let volatility: VolatilityLevel = 'Insufficient Data';

    if (totalPoints >= 3) {
      const regression = calculateLinearRegressionSlope(monthlySeries);
      trendSlope = regression.slope;
      stdDev = calculateStdDev(monthlySeries, overallMonthlyAverageActive);
      coefficientOfVariation =
        overallMonthlyAverageActive > 0 ? stdDev / overallMonthlyAverageActive : 0;

      // Volatility categorization
      if (coefficientOfVariation < settings.volatilityLowThreshold) {
        volatility = 'Low';
      } else if (coefficientOfVariation <= settings.volatilityMediumThreshold) {
        volatility = 'Medium';
      } else {
        volatility = 'High';
      }

      // Trend classification
      const relativeSlope =
        overallMonthlyAverageActive > 0 ? (trendSlope / overallMonthlyAverageActive) * 100 : 0;

      if (volatility === 'High' && Math.abs(relativeSlope) < 10) {
        trend = 'Highly Variable';
      } else if (relativeSlope > 4) {
        trend = 'Increasing';
      } else if (relativeSlope < -4) {
        trend = 'Decreasing';
      } else {
        trend = 'Stable';
      }
    }

    // Forecast Reliability
    let forecastReliability: 'High' | 'Moderate' | 'Insufficient historical data' = 'High';
    if (totalPoints <= 2) {
      forecastReliability = 'Insufficient historical data';
    } else if (volatility === 'High' || totalPoints < 6) {
      forecastReliability = 'Moderate';
    }

    // FORECAST MONTHLY CONSUMPTION CALCULATION
    // Configurable weights: Latest Year, Previous Year, Older Years
    let forecastMonthlyConsumption = 0;
    const weightsUsed: Record<number, number> = {};

    if (years.length === 1) {
      weightsUsed[latestYear] = 1.0;
      forecastMonthlyConsumption = yearlyBreakdown[latestYear].monthlyAverageActive;
    } else if (years.length === 2) {
      const prevYear = years[years.length - 2];
      const wLatest = settings.weightLatestYear / (settings.weightLatestYear + settings.weightPrevYear);
      const wPrev = settings.weightPrevYear / (settings.weightLatestYear + settings.weightPrevYear);
      weightsUsed[latestYear] = wLatest;
      weightsUsed[prevYear] = wPrev;
      forecastMonthlyConsumption =
        yearlyBreakdown[latestYear].monthlyAverageActive * wLatest +
        yearlyBreakdown[prevYear].monthlyAverageActive * wPrev;
    } else if (years.length >= 3) {
      const prevYear = years[years.length - 2];
      const olderYears = years.slice(0, years.length - 2);
      const totalWeight = settings.weightLatestYear + settings.weightPrevYear + settings.weightOlderYears;
      const wLatest = settings.weightLatestYear / totalWeight;
      const wPrev = settings.weightPrevYear / totalWeight;
      const wOlderPerYear = (settings.weightOlderYears / totalWeight) / olderYears.length;

      weightsUsed[latestYear] = wLatest;
      weightsUsed[prevYear] = wPrev;
      olderYears.forEach((oy) => (weightsUsed[oy] = wOlderPerYear));

      let weightedSum =
        yearlyBreakdown[latestYear].monthlyAverageActive * wLatest +
        yearlyBreakdown[prevYear].monthlyAverageActive * wPrev;

      olderYears.forEach((oy) => {
        weightedSum += yearlyBreakdown[oy].monthlyAverageActive * wOlderPerYear;
      });

      forecastMonthlyConsumption = weightedSum;
    } else {
      forecastMonthlyConsumption = overallMonthlyAverageActive;
    }

    // Apply demand growth adjustment if configured in scenario
    if (settings.demandGrowthPct !== 0) {
      forecastMonthlyConsumption *= 1 + settings.demandGrowthPct / 100;
    }

    // Alternate Methods Support
    if (settings.purchasingMethod === 'average') {
      forecastMonthlyConsumption = overallMonthlyAverageActive;
    } else if (settings.purchasingMethod === 'maximum') {
      forecastMonthlyConsumption = overallMaximumMonthly;
    } else if (settings.purchasingMethod === 'trend' && totalPoints >= 3) {
      // Trend extrapolation: last value + 1 step of slope
      const lastVal = monthlySeries[monthlySeries.length - 1];
      const extrapolated = lastVal + trendSlope;
      forecastMonthlyConsumption = Math.max(extrapolated, 0);
    }

    // Lead Time Demand & Reorder Point
    // Average Daily Consumption = Monthly Average / 30
    const avgDailyConsumption = forecastMonthlyConsumption / 30;
    const leadTimeDemand = avgDailyConsumption * leadTimeDays;

    // Safety Stock
    const safetyStock = forecastMonthlyConsumption * (settings.safetyStockPct / 100);

    // Reorder Point = Lead Time Demand + Safety Stock
    const reorderPoint = leadTimeDemand + safetyStock;

    // Planning Requirement
    const planningRequirement = forecastMonthlyConsumption * settings.planningPeriodMonths;

    // Gross Requirement = Planning Requirement + Safety Stock
    const grossRequirement = planningRequirement + safetyStock;

    // Net Purchasing Requirement = Gross Requirement - Current Stock - Incoming Quantity
    let netRequirement = grossRequirement - currentStock - incomingQuantity;
    if (netRequirement < 0) {
      netRequirement = 0;
    }

    // Apply Rounding and Minimum Order Quantity (MOQ)
    if (netRequirement > 0) {
      if (settings.roundingIncrement > 1) {
        netRequirement =
          Math.ceil(netRequirement / settings.roundingIncrement) * settings.roundingIncrement;
      }
      if (settings.minPurchaseQuantity > 0 && netRequirement < settings.minPurchaseQuantity) {
        netRequirement = settings.minPurchaseQuantity;
      }
    }

    // Stock Coverage Days = Current Stock / Daily Consumption
    let stockCoverageDays: number | null = null;
    let stockCoverageCategory: StockCoverageCategory = 'Normal';

    if (avgDailyConsumption > 0) {
      stockCoverageDays = Math.round(currentStock / avgDailyConsumption);
      if (stockCoverageDays < settings.criticalStockDays) {
        stockCoverageCategory = 'Critical';
      } else if (stockCoverageDays <= settings.lowStockDays) {
        stockCoverageCategory = 'Low';
      } else if (stockCoverageDays <= settings.normalStockDays) {
        stockCoverageCategory = 'Normal';
      } else {
        stockCoverageCategory = 'Excess';
      }
    } else if (currentStock > 0) {
      stockCoverageDays = 999;
      stockCoverageCategory = 'Excess';
    } else {
      stockCoverageDays = 0;
      stockCoverageCategory = 'No Consumption';
    }

    // Purchasing Priority Determination
    let purchasingPriority: PurchasingPriority = 'No Purchase Required';
    let priorityScore = 0;

    if (netRequirement <= 0) {
      purchasingPriority = 'No Purchase Required';
      priorityScore = 0;
    } else if (stockCoverageDays !== null && stockCoverageDays < settings.criticalStockDays) {
      purchasingPriority = 'Immediate';
      priorityScore = 100 + (settings.criticalStockDays - stockCoverageDays);
    } else if (
      stockCoverageDays !== null &&
      stockCoverageDays <= settings.lowStockDays
    ) {
      purchasingPriority = 'High';
      priorityScore = 75 + (settings.lowStockDays - stockCoverageDays);
    } else if (currentStock < reorderPoint) {
      purchasingPriority = 'High';
      priorityScore = 70;
    } else if (netRequirement > 0 && stockCoverageDays !== null && stockCoverageDays <= settings.normalStockDays) {
      purchasingPriority = 'Medium';
      priorityScore = 50;
    } else {
      purchasingPriority = 'Low';
      priorityScore = 25;
    }

    // Explainable formula text
    const formulaText = `Planning (${forecastMonthlyConsumption.toFixed(1)} × ${settings.planningPeriodMonths}mo = ${planningRequirement.toFixed(1)}) + Safety (${safetyStock.toFixed(1)}) - Stock (${currentStock.toFixed(1)}) - Incoming (${incomingQuantity.toFixed(1)}) = Net (${netRequirement.toFixed(1)})`;

    const annualValue = unitPrice > 0 ? latestYearConsumption * unitPrice : latestYearConsumption;

    const rawMaterialName = groupRecords.find((r) => r.rawMaterialName)?.rawMaterialName || firstRec.rawMaterialName || materialName;

    preliminaryMetrics.push({
      materialCode,
      materialName,
      rawMaterialName,
      category,
      sheetName: firstRec.sheetName || department || 'General Sheet',
      uom,
      supplier,
      department,
      unitPrice,
      leadTimeDays,
      currentStock,
      incomingQuantity,
      stockCoverageDays,
      stockCoverageCategory,
      reorderPoint,
      leadTimeDemand,
      totalHistoricalConsumption: totalAllTimeConsumption,
      overallMonthlyAverageActive,
      overallMonthlyAverageCalendar,
      overallMaximumMonthly,
      overallMinimumMonthly,
      latestYearConsumption,
      latestYear,
      yearsAvailable: years,
      yearlyBreakdown,
      monthlyHistory: allChronological,
      yoyGrowthPct,
      averageGrowthRatePct,
      trend,
      trendSlope,
      stdDev,
      coefficientOfVariation,
      volatility,
      abcClass: 'C', // Calculated next in Pareto
      annualValue,
      forecastMonthlyConsumption,
      forecastReliability,
      planningRequirement,
      safetyStock,
      grossRequirement,
      netPurchasingRequirement: netRequirement,
      purchasingPriority,
      priorityScore,
      calculationBreakdown: {
        weightsUsed,
        method: settings.purchasingMethod,
        planningMonths: settings.planningPeriodMonths,
        safetyStockPct: settings.safetyStockPct,
        growthAppliedPct: settings.demandGrowthPct,
        stockDeducted: currentStock,
        incomingDeducted: incomingQuantity,
        formulaText,
      },
    });
  });

  // 3. Compute ABC Analysis (Pareto Classification)
  const totalValue = preliminaryMetrics.reduce((sum, m) => sum + m.annualValue, 0);
  const sortedForABC = [...preliminaryMetrics].sort((a, b) => b.annualValue - a.annualValue);

  let cumulativeSum = 0;
  sortedForABC.forEach((metric) => {
    cumulativeSum += metric.annualValue;
    const cumPct = totalValue > 0 ? (cumulativeSum / totalValue) * 100 : 100;
    if (cumPct <= settings.abcThresholdA) {
      metric.abcClass = 'A';
    } else if (cumPct <= settings.abcThresholdB) {
      metric.abcClass = 'B';
    } else {
      metric.abcClass = 'C';
    }
  });

  // Sort default: priorityScore descending, then netPurchasingRequirement descending
  preliminaryMetrics.sort((a, b) => b.priorityScore - a.priorityScore || b.netPurchasingRequirement - a.netPurchasingRequirement);

  return preliminaryMetrics;
}

export function computeDashboardSummary(
  metrics: MaterialAnalysisMetric[],
  dataQualityIssuesCount: number = 0
): DashboardSummary {
  const totalMaterials = metrics.length;
  const distinctMaterialsCount = new Set(metrics.map(m => m.materialName)).size;
  const materialsRequiringPurchase = metrics.filter((m) => m.netPurchasingRequirement > 0).length;
  const criticalMaterialsCount = metrics.filter((m) => m.purchasingPriority === 'Immediate').length;
  const excessStockItemsCount = metrics.filter((m) => m.stockCoverageCategory === 'Excess').length;

  const totalForecastRequirement = metrics.reduce((sum, m) => sum + m.planningRequirement, 0);
  const totalPurchasingRequirement = metrics.reduce(
    (sum, m) => sum + m.netPurchasingRequirement,
    0
  );
  const totalCurrentStock = metrics.reduce((sum, m) => sum + m.currentStock, 0);
  const averageMonthlyConsumption =
    totalMaterials > 0
      ? metrics.reduce((sum, m) => sum + m.forecastMonthlyConsumption, 0) / totalMaterials
      : 0;

  return {
    totalMaterials,
    distinctMaterialsCount,
    materialsRequiringPurchase,
    criticalMaterialsCount,
    totalForecastRequirement,
    totalPurchasingRequirement,
    excessStockItemsCount,
    totalCurrentStock,
    averageMonthlyConsumption,
    dataQualityIssuesCount,
  };
}
