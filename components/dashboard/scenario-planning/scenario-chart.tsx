"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceDot,
} from "recharts";

import { formatCurrency, formatCompactNumber } from "@/lib/number-format";
import type { ScenarioEvent } from "@/lib/scenario-planning";

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
}

export function ScenarioChart({
  result,
  currency,
  privacyMode = false,
}: ScenarioChartProps) {
  // Convert scenario result to chart data format
  const chartData = useMemo(() => {
    const data: Array<{
      monthKey: string;
      timestamp: number;
      date: Date;
      balance: number;
      cashflow: number;
      events: ScenarioEvent[];
    }> = [];

    const sortedMonths = Object.keys(result.balance).sort();

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
  }, [result]);

  // Extract event markers
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
    }> = [];

    chartData.forEach((point) => {
      if (point.events.length > 0) {
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
        });
      }
    });

    return markers;
  }, [chartData]);

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
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
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
            if (!active || !payload?.length) return null;

            const data = payload[0].payload;
            const monthData = chartData.find((d) => d.timestamp === data.timestamp);

            if (!monthData) return null;

            return (
              <div className="bg-background border-border flex flex-col gap-2 rounded-md border px-2.5 py-1.5 shadow-md max-w-sm">
                <div className="flex flex-col gap-1 border-b pb-2">
                  <span className="text-muted-foreground text-xs">
                    {monthData.date.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-sm font-medium">
                    Balance: {privacyMode ? "***" : formatCurrency(monthData.balance, currency)}
                  </span>
                </div>

                {/* Cashflow */}
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-muted-foreground text-xs">Monthly cash flow:</span>
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
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                      {monthData.events.map((event, idx) => {
                        const value = event.type === "income" ? event.amount : -event.amount;
                        return (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-muted-foreground truncate">{event.name}</span>
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
                      })}
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
          activeDot={{
            r: 4.5,
            strokeWidth: 2.5,
            filter: "drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.3))",
          }}
        />

        {/* Event markers */}
        {eventMarkers.map((marker, markerIndex) => {
          return marker.events.map((event, eventIndex) => {
            const horizontalOffset = eventIndex * 12 - (marker.events.length - 1) * 6;
            const isIncome = event.type === "income";

            return (
              <ReferenceDot
                key={`${markerIndex}-${eventIndex}`}
                x={marker.timestamp}
                y={marker.balance}
                r={0}
                fill="transparent"
                stroke="transparent"
                shape={(props: any) => {
                  const { cx, cy } = props;
                  const adjustedCx = cx + horizontalOffset;

                  return (
                    <circle
                      cx={adjustedCx}
                      cy={cy}
                      r={5}
                      fill={isIncome ? "oklch(0.72 0.19 150)" : "oklch(0.64 0.21 25)"}
                      stroke="var(--background)"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            );
          });
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
