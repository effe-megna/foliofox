"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { formatCurrency, formatCompactNumber } from "@/lib/number-format";
import type { ScenarioResultExtended } from "@/lib/scenario-planning/types";
import type { ScenarioEvent } from "@/lib/scenario-planning";

// Icon mapping for different event types
const getEventIcon = (eventName: string, eventType: "income" | "expense"): string => {
  const lowerName = eventName.toLowerCase();

  // Specific event patterns
  if (lowerName.includes("car") || lowerName.includes("vehicle")) return "🚗";
  if (lowerName.includes("house") || lowerName.includes("home") || lowerName.includes("mortgage")) return "🏠";
  if (lowerName.includes("holiday") || lowerName.includes("vacation") || lowerName.includes("travel")) return "✈️";
  if (lowerName.includes("salary") || lowerName.includes("paycheck") || lowerName.includes("wage")) return "💼";
  if (lowerName.includes("dividend") || lowerName.includes("investment")) return "📈";
  if (lowerName.includes("insurance")) return "🛡️";
  if (lowerName.includes("maintenance") || lowerName.includes("repair")) return "🔧";
  if (lowerName.includes("tax")) return "🏛️";
  if (lowerName.includes("rent")) return "🏘️";
  if (lowerName.includes("food") || lowerName.includes("groceries")) return "🍽️";
  if (lowerName.includes("utilities") || lowerName.includes("bills")) return "💡";
  if (lowerName.includes("education") || lowerName.includes("tuition")) return "🎓";
  if (lowerName.includes("health") || lowerName.includes("medical")) return "🏥";
  if (lowerName.includes("gift") || lowerName.includes("donation")) return "🎁";
  if (lowerName.includes("bonus")) return "💰";
  if (lowerName.includes("cost of life") || lowerName.includes("living expense") || lowerName.includes("living cost")) return "🏡";

  // Generic fallback based on type
  if (eventType === "income") return "💵";
  if (eventType === "expense") return "💸";

  // Ultimate fallback
  return "●";
};

interface CashVsInvestmentsChartProps {
  result: ScenarioResultExtended;
  currency: string;
  privacyMode?: boolean;
  scale?: "monthly" | "quarterly" | "yearly";
}

export function CashVsInvestmentsChart({
  result,
  currency,
  privacyMode = false,
  scale = "monthly",
}: CashVsInvestmentsChartProps) {
  // Helper function to get period key based on scale
  const getPeriodKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth();

    switch (scale) {
      case "monthly":
        return `${year}-${String(month + 1).padStart(2, "0")}`;
      case "quarterly":
        const quarter = Math.floor(month / 3) + 1;
        return `${year}-Q${quarter}`;
      case "yearly":
        return `${year}`;
      default:
        return `${year}-${String(month + 1).padStart(2, "0")}`;
    }
  };

  // Convert scenario result to chart data format
  const chartData = useMemo(() => {
    const sortedMonths = Object.keys(result.cashBalance).sort();

    if (scale === "monthly") {
      // Monthly view - no aggregation needed
      const data: Array<{
        monthKey: string;
        timestamp: number;
        date: Date;
        cash: number;
        investments: number;
        total: number;
        events: ScenarioEvent[];
      }> = [];

      sortedMonths.forEach((monthKey) => {
        const [yearStr, monthStr] = monthKey.split("-");
        const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);

        const cash = result.cashBalance[monthKey] || 0;

        // Calculate total investments value
        const assetBalances = result.assetBalance[monthKey] || {};
        const investments = Object.values(assetBalances).reduce(
          (sum, value) => sum + value,
          0
        );

        const monthCashflow = result.cashflow[monthKey];

        data.push({
          monthKey,
          timestamp: date.getTime(),
          date,
          cash,
          investments,
          total: cash + investments,
          events: monthCashflow?.events || [],
        });
      });

      return data;
    } else {
      // Quarterly or Yearly - use last month of period
      const periodMap = new Map<string, {
        monthKey: string;
        timestamp: number;
        date: Date;
        cash: number;
        investments: number;
        total: number;
        events: ScenarioEvent[];
      }>();

      sortedMonths.forEach((monthKey) => {
        const [yearStr, monthStr] = monthKey.split("-");
        const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
        const periodKey = getPeriodKey(date);

        const cash = result.cashBalance[monthKey] || 0;
        const assetBalances = result.assetBalance[monthKey] || {};
        const investments = Object.values(assetBalances).reduce(
          (sum, value) => sum + value,
          0
        );

        const monthCashflow = result.cashflow[monthKey];

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            monthKey: periodKey,
            timestamp: date.getTime(),
            date,
            cash,
            investments,
            total: cash + investments,
            events: [],
          });
        }

        const period = periodMap.get(periodKey)!;
        // Use the latest values for the period
        period.cash = cash;
        period.investments = investments;
        period.total = cash + investments;

        // Collect all events from the period
        if (monthCashflow?.events) {
          period.events.push(...monthCashflow.events);
        }
      });

      return Array.from(periodMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    }
  }, [result, scale]);

  const formatXAxisDate = (timestamp: number) => {
    if (!timestamp || isNaN(timestamp)) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    if (scale === "yearly") {
      return date.getFullYear().toString();
    } else if (scale === "quarterly") {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear().toString().slice(2)}`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
  };

  const formatYAxisValue = (value: number) => {
    if (privacyMode) return "***";
    return formatCompactNumber(value);
  };

  // Calculate allocation percentages for the tooltip
  const calculateAllocation = (cash: number, investments: number) => {
    const total = cash + investments;
    if (total === 0) return { cashPercent: 0, investmentsPercent: 0 };

    return {
      cashPercent: (cash / total) * 100,
      investmentsPercent: (investments / total) * 100,
    };
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <YAxis
          tickFormatter={formatYAxisValue}
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: 12,
            fill: "var(--muted-foreground)",
            opacity: privacyMode ? 0 : 1,
          }}
          domain={[0, "auto"]}
          width={60}
        />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={["dataMin", "dataMax"]}
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: 12,
            fill: "var(--muted-foreground)",
          }}
          tickFormatter={formatXAxisDate}
          scale="time"
          tickCount={8}
          minTickGap={50}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;

            const data = payload[0].payload;
            const { cashPercent, investmentsPercent } = calculateAllocation(
              data.cash,
              data.investments
            );

            const periodLabel = scale === "yearly"
              ? data.date.getFullYear().toString()
              : scale === "quarterly"
              ? `Q${Math.floor(data.date.getMonth() / 3) + 1} ${data.date.getFullYear()}`
              : data.date.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                });

            return (
              <div className="bg-background border-border flex flex-col gap-2 rounded-md border px-2.5 py-1.5 shadow-md max-w-sm">
                <div className="flex flex-col gap-1 border-b pb-2">
                  <span className="text-muted-foreground text-xs">
                    {periodLabel}
                  </span>
                </div>

                {/* Summary */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-xs font-medium text-blue-600">Cash:</span>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium text-blue-600">
                        {privacyMode ? "***" : formatCurrency(data.cash, currency)}
                      </span>
                      {!privacyMode && (
                        <span className="text-muted-foreground text-[10px]">
                          {cashPercent.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-xs font-medium text-purple-600">Investments:</span>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium text-purple-600">
                        {privacyMode ? "***" : formatCurrency(data.investments, currency)}
                      </span>
                      {!privacyMode && (
                        <span className="text-muted-foreground text-[10px]">
                          {investmentsPercent.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-t pt-1">
                    <span className="text-xs font-medium">Total:</span>
                    <span className="text-xs font-medium">
                      {privacyMode ? "***" : formatCurrency(data.total, currency)}
                    </span>
                  </div>
                </div>

                {/* Events */}
                {data.events.length > 0 && (
                  <div className="flex flex-col gap-1 border-t pt-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      Cash Flow Events ({data.events.length}):
                    </span>
                    <div className="flex flex-col gap-1">
                      {(() => {
                        // Sort events by amount: expenses first (negative), then income (positive)
                        const sortedEvents = [...data.events].sort((a, b) => {
                          const aValue = a.type === "income" ? a.amount : -a.amount;
                          const bValue = b.type === "income" ? b.amount : -b.amount;

                          // Negative values first (expenses), then positive (income)
                          if (aValue < 0 && bValue >= 0) return -1;
                          if (aValue >= 0 && bValue < 0) return 1;

                          // Both negative or both positive - sort by absolute value descending
                          return Math.abs(bValue) - Math.abs(aValue);
                        });

                        return sortedEvents.map((event, idx) => {
                          const value = event.type === "income" ? event.amount : -event.amount;
                          const eventIcon = getEventIcon(event.name, event.type);

                          return (
                            <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground truncate flex items-center gap-1">
                                <span className="text-sm">{eventIcon}</span>
                                {event.name}
                              </span>
                              <span
                                className={`font-medium whitespace-nowrap ${
                                  value >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {value >= 0 ? "+" : ""}
                                {privacyMode ? "***" : formatCurrency(value, currency)}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          }}
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="line"
          wrapperStyle={{
            paddingBottom: "12px",
          }}
        />
        <Line
          name="Cash"
          dataKey="cash"
          stroke="oklch(0.60 0.20 250)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          name="Investments"
          dataKey="investments"
          stroke="oklch(0.65 0.25 300)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
