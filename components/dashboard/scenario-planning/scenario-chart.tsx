"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceDot,
  Label,
} from "recharts";

import { formatCurrency, formatCompactNumber } from "@/lib/number-format";
import type { ScenarioEvent } from "@/lib/scenario-planning";
import type { EventDependencyAnalysis } from "@/lib/scenario-planning/event-analyzer";

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

// Custom marker component for rendering emoji icons
const CustomEventMarker = (props: {
  cx?: number;
  cy?: number;
  icon: string;
  netCashflow: number;
  count?: number;
  isHovered?: boolean;
}) => {
  const { cx, cy, icon, netCashflow, count, isHovered } = props;

  if (!cx || !cy) return null;

  // Negative cashflow (balance drop) = bigger, more prominent
  // Positive cashflow = smaller, less prominent
  const isNegative = netCashflow < 0;
  const baseRadius = isNegative ? 16 : 10;
  const baseFontSize = isNegative ? 18 : 14;
  const baseStrokeWidth = isNegative ? 3 : 2;

  // Scale up when hovered
  const radius = isHovered ? baseRadius * 1.2 : baseRadius;
  const fontSize = isHovered ? baseFontSize * 1.2 : baseFontSize;
  const strokeWidth = isHovered ? baseStrokeWidth * 1.2 : baseStrokeWidth;

  const backgroundColor = netCashflow >= 0
    ? "oklch(0.72 0.19 150)" // green
    : "oklch(0.64 0.21 25)";  // red

  const showBadge = count && count > 1;

  return (
    <g style={{ cursor: 'pointer' }}>
      {/* Background circle */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={backgroundColor}
        stroke="var(--background)"
        strokeWidth={strokeWidth}
        opacity={isHovered ? 1 : 0.95}
        style={{
          transition: 'all 0.2s ease',
          filter: isHovered ? 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.3))' : 'none'
        }}
      />
      {/* Icon text */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        style={{
          userSelect: 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {icon}
      </text>
      {/* Counter badge */}
      {showBadge && (
        <g>
          <circle
            cx={cx + baseRadius - 2}
            cy={cy - baseRadius + 2}
            r={8}
            fill="var(--background)"
            stroke={backgroundColor}
            strokeWidth={1.5}
          />
          <text
            x={cx + baseRadius - 2}
            y={cy - baseRadius + 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fontWeight="bold"
            fill={backgroundColor}
            style={{ userSelect: 'none' }}
          >
            {count}
          </text>
        </g>
      )}
    </g>
  );
};

interface ScenarioResult {
  balance: Record<string, number>;
  cashflow: Record<string, {
    amount: number;
    events: ScenarioEvent[];
  }>;
}

interface ScenarioChartProps {
  result: ScenarioResult;
  currency: string;
  privacyMode?: boolean;
  analysis?: EventDependencyAnalysis;
  scale?: "monthly" | "quarterly" | "yearly";
}

export function ScenarioChart({
  result,
  currency,
  privacyMode = false,
  analysis,
  scale = "monthly",
}: ScenarioChartProps) {
  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);

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

  // Helper function to get period label
  const getPeriodLabel = (periodKey: string): string => {
    if (scale === "monthly") {
      const [year, month] = periodKey.split("-");
      return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    } else if (scale === "quarterly") {
      return periodKey;
    } else {
      return periodKey;
    }
  };
  // Convert scenario result to chart data format
  const chartData = useMemo(() => {
    const sortedMonths = Object.keys(result.balance).sort();

    if (scale === "monthly") {
      // Monthly view - no aggregation needed
      const data: Array<{
        monthKey: string;
        timestamp: number;
        date: Date;
        balance: number;
        cashflow: number;
        events: ScenarioEvent[];
      }> = [];

      sortedMonths.forEach((monthKey) => {
        const [yearStr, monthStr] = monthKey.split("-");
        const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);

        data.push({
          monthKey,
          timestamp: date.getTime(),
          date,
          balance: result.balance[monthKey],
          cashflow: result.cashflow[monthKey]?.amount || 0,
          events: result.cashflow[monthKey]?.events || [],
        });
      });

      return data;
    } else {
      // Quarterly or Yearly - aggregate data
      const periodMap = new Map<string, {
        monthKey: string;
        timestamp: number;
        date: Date;
        balance: number;
        cashflow: number;
        events: ScenarioEvent[];
        monthCount: number;
      }>();

      sortedMonths.forEach((monthKey) => {
        const [yearStr, monthStr] = monthKey.split("-");
        const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
        const periodKey = getPeriodKey(date);

        if (!periodMap.has(periodKey)) {
          periodMap.set(periodKey, {
            monthKey: periodKey,
            timestamp: date.getTime(),
            date,
            balance: result.balance[monthKey],
            cashflow: 0,
            events: [],
            monthCount: 0,
          });
        }

        const period = periodMap.get(periodKey)!;
        // Use the latest balance for the period
        period.balance = result.balance[monthKey];
        // Sum cashflow
        period.cashflow += result.cashflow[monthKey]?.amount || 0;
        // Collect all events
        const monthEvents = result.cashflow[monthKey]?.events || [];
        period.events.push(...monthEvents);
        period.monthCount++;
      });

      return Array.from(periodMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    }
  }, [result, scale]);

  // Extract event markers with biggest event and icon counting
  const eventMarkers = useMemo(() => {
    const markers: Array<{
      monthKey: string;
      timestamp: number;
      date: Date;
      balance: number;
      events: Array<{
        name: string;
        type: "income" | "expense";
        amount: number;
      }>;
      biggestEvent: {
        name: string;
        type: "income" | "expense";
        amount: number;
        icon: string;
      };
      netCashflow: number;
      iconCount?: number; // Number of events with the same icon
    }> = [];

    chartData.forEach((point) => {
      if (point.events.length > 0) {
        // Calculate net cashflow
        const netCashflow = point.events.reduce((sum, event) => {
          const amount = event.type === "income" ? event.amount : -event.amount;
          return sum + amount;
        }, 0);

        if (scale === "monthly") {
          // Monthly: show biggest event only
          let biggestEvent = point.events[0];
          let maxImpact = Math.abs(point.events[0].amount);

          point.events.forEach((event) => {
            const impact = Math.abs(event.amount);
            if (impact > maxImpact) {
              maxImpact = impact;
              biggestEvent = event;
            }
          });

          markers.push({
            monthKey: point.monthKey,
            timestamp: point.timestamp,
            date: point.date,
            balance: point.balance,
            events: point.events.map((e) => ({
              name: e.name,
              type: e.type,
              amount: e.amount,
            })),
            biggestEvent: {
              name: biggestEvent.name,
              type: biggestEvent.type,
              amount: biggestEvent.amount,
              icon: getEventIcon(biggestEvent.name, biggestEvent.type),
            },
            netCashflow,
          });
        } else {
          // Quarterly/Yearly: count icons and show most frequent
          const iconCounts = new Map<string, { count: number; event: ScenarioEvent }>();

          point.events.forEach((event) => {
            const icon = getEventIcon(event.name, event.type);
            if (!iconCounts.has(icon)) {
              iconCounts.set(icon, { count: 0, event });
            }
            iconCounts.get(icon)!.count++;
          });

          // Find the icon with the most occurrences
          let mostFrequentIcon = "";
          let maxCount = 0;
          let representativeEvent: ScenarioEvent | null = null;

          iconCounts.forEach((data, icon) => {
            if (data.count > maxCount) {
              maxCount = data.count;
              mostFrequentIcon = icon;
              representativeEvent = data.event;
            }
          });

          if (representativeEvent) {
            markers.push({
              monthKey: point.monthKey,
              timestamp: point.timestamp,
              date: point.date,
              balance: point.balance,
              events: point.events.map((e) => ({
                name: e.name,
                type: e.type,
                amount: e.amount,
              })),
              biggestEvent: {
                name: representativeEvent.name,
                type: representativeEvent.type,
                amount: representativeEvent.amount,
                icon: mostFrequentIcon,
              },
              netCashflow,
              iconCount: maxCount,
            });
          }
        }
      }
    });

    return markers;
  }, [chartData, scale]);

  // Determine trend for gradient color
  const isPositiveTrend = useMemo(() => {
    if (chartData.length === 0) return true;
    const firstBalance = chartData[0].balance;
    const lastBalance = chartData[chartData.length - 1].balance;
    return lastBalance >= firstBalance;
  }, [chartData]);

  const chartColor = isPositiveTrend
    ? "oklch(0.72 0.19 150)" // green
    : "oklch(0.64 0.21 25)"; // red

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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="scenarioGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <YAxis
          dataKey="balance"
          tickFormatter={formatYAxisValue}
          axisLine={false}
          tickLine={false}
          tick={{
            fontSize: 12,
            fill: "var(--muted-foreground)",
            opacity: privacyMode ? 0 : 1,
          }}
          domain={["auto", "auto"]}
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
            if (!active || !payload?.length) {
              if (hoveredTimestamp !== null) {
                setHoveredTimestamp(null);
              }
              return null;
            }

            const data = payload[0].payload;
            const monthData = chartData.find((d) => d.timestamp === data.timestamp);

            if (!monthData) return null;

            // Update hovered timestamp
            if (hoveredTimestamp !== monthData.timestamp) {
              setHoveredTimestamp(monthData.timestamp);
            }

            const periodLabel = scale === "yearly"
              ? monthData.date.getFullYear().toString()
              : scale === "quarterly"
              ? `Q${Math.floor(monthData.date.getMonth() / 3) + 1} ${monthData.date.getFullYear()}`
              : monthData.date.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                });

            const cashflowLabel = scale === "yearly"
              ? "Yearly cash flow:"
              : scale === "quarterly"
              ? "Quarterly cash flow:"
              : "Monthly cash flow:";

            return (
              <div className="bg-background border-border flex flex-col gap-2 rounded-md border px-2.5 py-1.5 shadow-md max-w-sm">
                <div className="flex flex-col gap-1 border-b pb-2">
                  <span className="text-muted-foreground text-xs">
                    {periodLabel}
                  </span>
                  <span className="text-sm font-medium">
                    Balance: {privacyMode ? "***" : formatCurrency(monthData.balance, currency)}
                  </span>
                </div>

                {/* Cashflow */}
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-muted-foreground text-xs">{cashflowLabel}</span>
                  <span
                    className={`text-xs font-medium ${
                      monthData.cashflow >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {monthData.cashflow >= 0 ? "+" : ""}
                    {privacyMode ? "***" : formatCurrency(monthData.cashflow, currency)}
                  </span>
                </div>

                {/* Events */}
                {monthData.events.length > 0 && (
                  <div className="flex flex-col gap-1 border-t pt-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      Events ({monthData.events.length}):
                    </span>
                    <div className="flex flex-col gap-1">
                      {(() => {
                        // Sort events by amount: negative (expenses) first, then positive (income)
                        const sortedEvents = [...monthData.events].sort((a, b) => {
                          const aValue = a.type === "income" ? a.amount : -a.amount;
                          const bValue = b.type === "income" ? b.amount : -b.amount;

                          // Negative values first (expenses), then positive (income)
                          // Within each group, sort by absolute value descending
                          if (aValue < 0 && bValue >= 0) return -1;
                          if (aValue >= 0 && bValue < 0) return 1;

                          // Both negative or both positive - sort by absolute value descending
                          return Math.abs(bValue) - Math.abs(aValue);
                        });

                        // Build event list with trigger information
                        const eventsToRender: Array<{
                          event?: ScenarioEvent;
                          isTriggered: boolean;
                          triggerEvent?: string;
                          isReference?: boolean;
                        }> = [];

                        // Create a map of triggered events
                        const triggeredEventsMap = new Map<string, string>();
                        if (analysis) {
                          analysis.triggeredEvents.forEach((item) => {
                            triggeredEventsMap.set(item.event.name, item.triggerEvent);
                          });
                        }

                        // Add all sorted events with their trigger info
                        sortedEvents.forEach((event) => {
                          const triggerEvent = triggeredEventsMap.get(event.name);
                          eventsToRender.push({
                            event,
                            isTriggered: !!triggerEvent,
                            triggerEvent,
                          });
                        });

                        return eventsToRender.map((item, idx) => {
                          if (item.isReference) {
                            // This is a parent reference (not firing this month)
                            return (
                              <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-muted-foreground/60 truncate italic">
                                  {item.triggerEvent}
                                </span>
                                <span className="text-muted-foreground/60 text-xs italic whitespace-nowrap">
                                  (trigger)
                                </span>
                              </div>
                            );
                          }

                          const value = item.event!.type === "income" ? item.event!.amount : -item.event!.amount;
                          const eventIcon = getEventIcon(item.event!.name, item.event!.type);
                          return (
                            <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                              <span className={`text-muted-foreground truncate flex items-center gap-1 ${item.isTriggered ? "pl-3" : ""}`}>
                                {item.isTriggered && "├─ "}
                                <span className="text-sm">{eventIcon}</span>
                                {item.event!.name}
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
        <Area
          dataKey="balance"
          stroke={chartColor}
          strokeWidth={1.5}
          fill="url(#scenarioGradient)"
          fillOpacity={1}
          dot={false}
          activeDot={false}
        />

        {/* Event markers - custom icons based on biggest event */}
        {eventMarkers.map((marker, markerIndex) => {
          const isHovered = hoveredTimestamp === marker.timestamp;
          return (
            <ReferenceDot
              key={markerIndex}
              x={marker.timestamp}
              y={marker.balance}
              shape={(props: any) => (
                <CustomEventMarker
                  cx={props.cx}
                  cy={props.cy}
                  icon={marker.biggestEvent.icon}
                  netCashflow={marker.netCashflow}
                  count={marker.iconCount}
                  isHovered={isHovered}
                />
              )}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
