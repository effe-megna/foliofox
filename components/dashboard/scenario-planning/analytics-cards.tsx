import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/number-format";
import type {
  BalanceChartAnalytics,
  IncomeExpensesAnalytics,
  CashInvestmentsAnalytics,
} from "@/lib/scenario-analytics";

// Reusable base card component
function AnalyticsCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
        {subtitle && (
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        )}
      </CardHeader>
    </Card>
  );
}

// Helper function to format month keys
function formatMonthKey(key: string): string {
  if (!key) return "N/A";
  const [year, month] = key.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Balance Chart Analytics Cards
export function BalanceAnalyticsCards({
  analytics,
  currency,
}: {
  analytics: BalanceChartAnalytics;
  currency: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <AnalyticsCard
        label="Net Worth Growth"
        value={formatCurrency(analytics.netWorthGrowth.amount, currency)}
        subtitle={`${analytics.netWorthGrowth.percentage > 0 ? "+" : ""}${analytics.netWorthGrowth.percentage.toFixed(1)}%`}
      />
      <AnalyticsCard
        label="CAGR"
        value={analytics.cagr !== null ? `${analytics.cagr.toFixed(2)}%` : "N/A"}
        subtitle="Compound annual growth rate"
      />
      <AnalyticsCard
        label="Best Month"
        value={`+${analytics.bestMonth.growth.toFixed(2)}%`}
        subtitle={formatMonthKey(analytics.bestMonth.month)}
      />
      <AnalyticsCard
        label="Worst Month"
        value={`${analytics.worstMonth.decline.toFixed(2)}%`}
        subtitle={formatMonthKey(analytics.worstMonth.month)}
      />
    </div>
  );
}

// Income vs Expenses Analytics Cards
export function IncomeExpensesAnalyticsCards({
  analytics,
  currency,
}: {
  analytics: IncomeExpensesAnalytics;
  currency: string;
}) {
  const trendLabel = analytics.cashflowTrend === "improving"
    ? "Improving"
    : analytics.cashflowTrend === "declining"
    ? "Declining"
    : "Stable";

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <AnalyticsCard
        label="Savings Rate"
        value={`${analytics.savingsRate.toFixed(1)}%`}
        subtitle="Of total income saved"
      />
      <AnalyticsCard
        label="Negative Months"
        value={analytics.negativeMonths.toString()}
        subtitle="Expenses exceeded income"
      />
      <AnalyticsCard
        label="Total Income"
        value={formatCurrency(analytics.totalIncome, currency)}
        subtitle="Over entire period"
      />
      <AnalyticsCard
        label="Cashflow Trend"
        value={trendLabel}
        subtitle="Comparing start vs end"
      />
    </div>
  );
}

// Cash vs Investments Analytics Cards
export function CashInvestmentsAnalyticsCards({
  analytics,
  currency,
}: {
  analytics: CashInvestmentsAnalytics;
  currency: string;
}) {
  const emergencyLabel = analytics.emergencyFund.status === "healthy"
    ? "Healthy"
    : analytics.emergencyFund.status === "adequate"
    ? "Adequate"
    : "Low";

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <AnalyticsCard
        label="Average Allocation"
        value={`${analytics.averageAllocation.cash.toFixed(0)}% / ${analytics.averageAllocation.investments.toFixed(0)}%`}
        subtitle="Cash / Investments"
      />
      <AnalyticsCard
        label="Opportunity Cost"
        value={formatCurrency(analytics.opportunityCost.amount, currency)}
        subtitle="If 20% of cash was invested at 7%"
      />
      <AnalyticsCard
        label="Emergency Fund"
        value={`${analytics.emergencyFund.months.toFixed(1)} months`}
        subtitle={emergencyLabel}
      />
      <AnalyticsCard
        label="Portfolio Growth"
        value={formatCurrency(analytics.portfolioGrowth.amount, currency)}
        subtitle={`${analytics.portfolioGrowth.contribution.toFixed(1)}% of total growth`}
      />
    </div>
  );
}
