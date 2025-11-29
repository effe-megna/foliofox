import type { ScenarioResultExtended } from "./scenario-planning/types";

// Type definitions for analytics results

export type BalanceChartAnalytics = {
  netWorthGrowth: { amount: number; percentage: number };
  cagr: number | null;
  bestMonth: { month: string; growth: number };
  worstMonth: { month: string; decline: number };
};

export type IncomeExpensesAnalytics = {
  savingsRate: number;
  negativeMonths: number;
  totalIncome: number;
  totalExpenses: number;
  cashflowTrend: "improving" | "declining" | "stable";
};

export type CashInvestmentsAnalytics = {
  averageAllocation: { cash: number; investments: number };
  opportunityCost: { amount: number; percentage: number };
  emergencyFund: { months: number; status: "healthy" | "adequate" | "low" };
  portfolioGrowth: { amount: number; contribution: number };
};

// Calculate Balance Chart Analytics

export function calculateBalanceAnalytics(
  result: ScenarioResultExtended,
  startDate: Date,
  endDate: Date
): BalanceChartAnalytics {
  const months = Object.keys(result.totalBalance).sort();

  // Handle empty data
  if (months.length === 0) {
    return {
      netWorthGrowth: { amount: 0, percentage: 0 },
      cagr: null,
      bestMonth: { month: "", growth: 0 },
      worstMonth: { month: "", decline: 0 },
    };
  }

  const startBalance = result.totalBalance[months[0]] || 0;
  const endBalance = result.totalBalance[months[months.length - 1]] || 0;

  // Net worth growth
  const growthAmount = endBalance - startBalance;
  const growthPercent = startBalance !== 0
    ? (growthAmount / startBalance) * 100
    : 0;

  // CAGR calculation (only for positive starting balance)
  const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  const cagr = startBalance > 0 && endBalance > 0 && years > 0
    ? (Math.pow(endBalance / startBalance, 1 / years) - 1) * 100
    : null;

  // Best/worst month (month-over-month growth percentage)
  let bestMonth = { month: months[0] || "", growth: -Infinity };
  let worstMonth = { month: months[0] || "", decline: Infinity };

  for (let i = 1; i < months.length; i++) {
    const prev = result.totalBalance[months[i - 1]] || 0;
    const curr = result.totalBalance[months[i]] || 0;

    // Skip if previous month had zero balance (division by zero)
    if (prev === 0) continue;

    const change = ((curr - prev) / prev) * 100;

    if (change > bestMonth.growth) {
      bestMonth = { month: months[i], growth: change };
    }
    if (change < worstMonth.decline) {
      worstMonth = { month: months[i], decline: change };
    }
  }

  // If no valid month-over-month comparison was found, use first month
  if (bestMonth.growth === -Infinity) {
    bestMonth = { month: months[0] || "", growth: 0 };
  }
  if (worstMonth.decline === Infinity) {
    worstMonth = { month: months[0] || "", decline: 0 };
  }

  return {
    netWorthGrowth: { amount: growthAmount, percentage: growthPercent },
    cagr,
    bestMonth,
    worstMonth,
  };
}

// Calculate Income vs Expenses Analytics

export function calculateIncomeExpensesAnalytics(
  result: ScenarioResultExtended
): IncomeExpensesAnalytics {
  const months = Object.keys(result.cashflow).sort();

  // Handle empty data
  if (months.length === 0) {
    return {
      savingsRate: 0,
      negativeMonths: 0,
      totalIncome: 0,
      totalExpenses: 0,
      cashflowTrend: "stable",
    };
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  let negativeMonths = 0;

  // Single pass to calculate all metrics
  months.forEach((month) => {
    const events = result.cashflow[month]?.events || [];
    let monthIncome = 0;
    let monthExpenses = 0;

    events.forEach((event) => {
      if (event.type === "income") {
        monthIncome += event.amount;
        totalIncome += event.amount;
      } else {
        monthExpenses += event.amount;
        totalExpenses += event.amount;
      }
    });

    if (monthExpenses > monthIncome) negativeMonths++;
  });

  // Savings rate
  const savingsRate = totalIncome > 0
    ? ((totalIncome - totalExpenses) / totalIncome) * 100
    : 0;

  // Cashflow trend (compare first quartile vs last quartile)
  const quartileSize = Math.max(1, Math.floor(months.length / 4));
  const firstQuartile = months.slice(0, quartileSize);
  const lastQuartile = months.slice(-quartileSize);

  const calculateQuartileAvg = (monthsSlice: string[]) => {
    if (monthsSlice.length === 0) return 0;

    const total = monthsSlice.reduce((sum, m) => {
      const events = result.cashflow[m]?.events || [];
      return sum + events.reduce((s, e) =>
        s + (e.type === "income" ? e.amount : -e.amount), 0
      );
    }, 0);

    return total / monthsSlice.length;
  };

  const avgFirst = calculateQuartileAvg(firstQuartile);
  const avgLast = calculateQuartileAvg(lastQuartile);

  // Determine trend
  let cashflowTrend: "improving" | "declining" | "stable" = "stable";

  if (Math.abs(avgFirst) > 0) {
    const trendChange = ((avgLast - avgFirst) / Math.abs(avgFirst)) * 100;
    cashflowTrend = trendChange > 5 ? "improving"
      : trendChange < -5 ? "declining"
      : "stable";
  } else if (avgLast > 5) {
    // If starting from near-zero, any positive trend is improving
    cashflowTrend = "improving";
  } else if (avgLast < -5) {
    cashflowTrend = "declining";
  }

  return {
    savingsRate,
    negativeMonths,
    totalIncome,
    totalExpenses,
    cashflowTrend,
  };
}

// Calculate Cash vs Investments Analytics

export function calculateCashInvestmentsAnalytics(
  result: ScenarioResultExtended,
  startDate: Date,
  endDate: Date,
  opportunityCostRate: number = 0.07
): CashInvestmentsAnalytics {
  const months = Object.keys(result.cashBalance).sort();

  // Handle empty data
  if (months.length === 0) {
    return {
      averageAllocation: { cash: 0, investments: 0 },
      opportunityCost: { amount: 0, percentage: 0 },
      emergencyFund: { months: 0, status: "low" },
      portfolioGrowth: { amount: 0, contribution: 0 },
    };
  }

  // Average allocation
  let totalCash = 0;
  let totalInvestments = 0;

  months.forEach((month) => {
    totalCash += result.cashBalance[month] || 0;
    const assets = Object.values(result.assetBalance[month] || {});
    totalInvestments += assets.reduce((sum, val) => sum + val, 0);
  });

  const avgCash = totalCash / months.length;
  const avgInvestments = totalInvestments / months.length;
  const avgTotal = avgCash + avgInvestments;

  const cashPercent = avgTotal > 0 ? (avgCash / avgTotal) * 100 : 0;
  const investmentsPercent = avgTotal > 0 ? (avgInvestments / avgTotal) * 100 : 0;

  // Opportunity cost (20% of average cash invested at specified rate)
  const years = Math.max(0, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
  const excessCash = avgCash * 0.2; // 20% could be invested
  const potentialGains = excessCash > 0 && years > 0
    ? excessCash * (Math.pow(1 + opportunityCostRate, years) - 1)
    : 0;
  const opportunityCostPercent = excessCash > 0
    ? (potentialGains / excessCash) * 100
    : 0;

  // Emergency fund (cash as months of expenses)
  const totalExpenses = Object.values(result.cashflow).reduce((sum, cf) => {
    const monthExpenses = (cf.events || [])
      .filter(e => e.type === "expense")
      .reduce((s, e) => s + e.amount, 0);
    return sum + monthExpenses;
  }, 0);

  const avgMonthlyExpenses = months.length > 0 ? totalExpenses / months.length : 0;
  const finalCash = result.cashBalance[months[months.length - 1]] || 0;
  const emergencyMonths = avgMonthlyExpenses > 0
    ? finalCash / avgMonthlyExpenses
    : 0;

  const emergencyStatus = emergencyMonths >= 6 ? "healthy"
    : emergencyMonths >= 3 ? "adequate"
    : "low";

  // Portfolio growth contribution
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];

  const startInvestments = Object.values(result.assetBalance[firstMonth] || {})
    .reduce((sum, val) => sum + val, 0);
  const endInvestments = Object.values(result.assetBalance[lastMonth] || {})
    .reduce((sum, val) => sum + val, 0);

  const portfolioGrowthAmount = endInvestments - startInvestments;
  const totalGrowth = (result.totalBalance[lastMonth] || 0) - (result.totalBalance[firstMonth] || 0);
  const portfolioContribution = totalGrowth > 0
    ? (portfolioGrowthAmount / totalGrowth) * 100
    : 0;

  return {
    averageAllocation: {
      cash: cashPercent,
      investments: investmentsPercent
    },
    opportunityCost: {
      amount: potentialGains,
      percentage: opportunityCostPercent
    },
    emergencyFund: {
      months: emergencyMonths,
      status: emergencyStatus
    },
    portfolioGrowth: {
      amount: portfolioGrowthAmount,
      contribution: portfolioContribution
    },
  };
}
