"use client";

import { useMemo, useState } from "react";
import { addYears } from "date-fns";
import {
  makeScenario,
  runScenario,
  makeRecurring,
  makeOneOff,
} from "@/lib/scenario-planning";
import { ld } from "@/lib/scenario-planning/local-date";
import { ScenarioChart } from "@/components/dashboard/scenario-planning/scenario-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ScenarioPlanningPage() {
  const [timeHorizon, setTimeHorizon] = useState<"2" | "5" | "10" | "30">("5");

  // Calculate end date based on time horizon
  const endDate = useMemo(() => {
    return addYears(new Date(), parseInt(timeHorizon));
  }, [timeHorizon]);

  // Create Francesco's real-case scenario (adapted to selected dates)
  const scenarioResult = useMemo(() => {
    const start = new Date();
    const end = endDate;
    const scenario = makeScenario({
      name: "Francesco's Financial Plan 2025-2027",
      events: [
        // Part-time job
        makeRecurring({
          name: "Part-time Salary",
          amount: 2500,
          frequency: "monthly",
          type: "income",
          startDate: ld(2025, 1, 1),
          endDate: ld(2025, 5, 31),
        }),

        // Full-time job returns
        makeRecurring({
          name: "Full-time Salary",
          amount: 5000,
          frequency: "monthly",
          type: "income",
          startDate: ld(2025, 6, 1),
          endDate: null,
        }),

        // Cost of living
        makeRecurring({
          name: "Cost of Life",
          amount: 1400,
          frequency: "monthly",
          type: "expense",
          startDate: ld(2025, 1, 1),
          endDate: null,
        }),

        // Investment contributions - only when back to full-time
        makeRecurring({
          name: "Monthly Investment",
          amount: 400,
          frequency: "monthly",
          type: "expense",
          startDate: ld(2025, 6, 1),
          endDate: null,
          unlockedBy: [
            {
              type: "income-is-above",
              tag: "balance",
              value: { eventName: "Full-time Salary", amount: 4000 },
            },
          ],
        }),

        // Car purchase
        makeOneOff({
          name: "Buy Car",
          amount: 15000,
          type: "expense",
          date: ld(2026, 1, 15),
        }),

        // Car insurance - only after buying car
        makeRecurring({
          name: "Car Insurance",
          amount: 120,
          frequency: "monthly",
          type: "expense",
          startDate: ld(2026, 1, 1),
          endDate: null,
          unlockedBy: [
            {
              type: "event-happened",
              tag: "balance",
              value: { eventName: "Buy Car" },
            },
          ],
        }),

        // Car maintenance - only after buying car
        makeRecurring({
          name: "Car Maintenance",
          amount: 600,
          frequency: "yearly",
          type: "expense",
          startDate: ld(2026, 1, 1),
          endDate: null,
          unlockedBy: [
            {
              type: "event-happened",
              tag: "balance",
              value: { eventName: "Buy Car" },
            },
          ],
        }),

        // Holiday - conditional on salary
        makeOneOff({
          name: "Summer Holiday 2026",
          amount: 3500,
          type: "expense",
          date: ld(2026, 6, 15),
          unlockedBy: [
            {
              type: "income-is-above",
              tag: "balance",
              value: { eventName: "Full-time Salary", amount: 4000 },
            },
          ],
        }),

        // House purchase - low downpayment scenario
        makeOneOff({
          name: "Buy House - Low Downpayment",
          amount: 60000,
          type: "expense",
          date: ld(2027, 5, 1),
          unlockedBy: [
            {
              type: "income-is-above",
              tag: "balance",
              value: { eventName: "Full-time Salary", amount: 4000 },
            },
          ],
        }),

        // Mortgage - only after buying house
        makeRecurring({
          name: "Mortgage Payment",
          amount: 1200,
          frequency: "monthly",
          type: "expense",
          startDate: ld(2027, 5, 1),
          endDate: null,
          unlockedBy: [
            {
              type: "event-happened",
              tag: "balance",
              value: { eventName: "Buy House - Low Downpayment" },
            },
          ],
        }),

        // House expenses - only after buying house
        makeRecurring({
          name: "Property Tax",
          amount: 3000,
          frequency: "yearly",
          type: "expense",
          startDate: ld(2027, 5, 1),
          endDate: null,
          unlockedBy: [
            {
              type: "event-happened",
              tag: "balance",
              value: { eventName: "Buy House - Low Downpayment" },
            },
          ],
        }),
      ],
    });

    return runScenario({
      scenario,
      startDate: ld(start.getFullYear(), start.getMonth() + 1, start.getDate()),
      endDate: ld(end.getFullYear(), end.getMonth() + 1, end.getDate()),
      initialBalance: 140000, // 100K cash + 40K invested
    });
  }, [endDate]);

  // Get final balance
  const finalBalance = useMemo(() => {
    const months = Object.keys(scenarioResult.balance).sort();
    const lastMonth = months[months.length - 1];
    return scenarioResult.balance[lastMonth] ?? 0;
  }, [scenarioResult]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Scenario Planning</h1>
        <p className="text-muted-foreground">
          Model your financial future with conditional events and dependencies
        </p>
      </div>

      <div className="grid gap-6">
        {/* Chart Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                <CardTitle>Balance Over Time</CardTitle>
                <CardDescription>
                  Financial projection with conditional events
                </CardDescription>
              </div>
              <Select
                value={timeHorizon}
                onValueChange={(value) => setTimeHorizon(value as "2" | "5" | "10" | "30")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Time horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 years</SelectItem>
                  <SelectItem value="5">5 years</SelectItem>
                  <SelectItem value="10">10 years</SelectItem>
                  <SelectItem value="30">30 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ScenarioChart
                result={scenarioResult}
                currency="USD"
                privacyMode={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Starting Balance</CardDescription>
              <CardTitle className="text-2xl">
                ${(140000).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Final Balance ({endDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })})</CardDescription>
              <CardTitle className="text-2xl">
                ${finalBalance.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Change</CardDescription>
              <CardTitle className="text-2xl">
                {(finalBalance - 140000) >= 0 ? "+" : ""}
                ${(finalBalance - 140000).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Event Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Major Events</CardTitle>
            <CardDescription>Key milestones in your financial plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                  💼
                </div>
                <div className="flex-1">
                  <p className="font-medium">Return to Full-Time (June 2025)</p>
                  <p className="text-sm text-muted-foreground">
                    Salary increases to $5,000/month, investments resume at $400/month
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  🚗
                </div>
                <div className="flex-1">
                  <p className="font-medium">Car Purchase (January 2026)</p>
                  <p className="text-sm text-muted-foreground">
                    $15,000 purchase triggers insurance ($120/month) and maintenance ($600/year)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                  ✈️
                </div>
                <div className="flex-1">
                  <p className="font-medium">Summer Holiday (June 2026)</p>
                  <p className="text-sm text-muted-foreground">
                    $3,500 vacation unlocked by salary threshold
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                  🏠
                </div>
                <div className="flex-1">
                  <p className="font-medium">House Purchase (May 2027)</p>
                  <p className="text-sm text-muted-foreground">
                    $60,000 down payment triggers mortgage ($1,200/month) and property tax ($3,000/year)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
