"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { addYears } from "date-fns";
import {
  makeScenario,
  runScenario,
  makeRecurring,
  makeOneOff,
  makeDependency,
  type PortfolioAsset,
  type ScenarioResultExtended,
} from "@/lib/scenario-planning";
import { fromJSDate, ld } from "@/lib/scenario-planning/local-date";
import { generateDividendEvents } from "@/lib/scenario-planning/dividend-generator";
import { ScenarioChart } from "@/components/dashboard/scenario-planning/scenario-chart";
import { EventFlowTimeline } from "@/components/dashboard/scenario-planning/event-flow-timeline";
import { CompactEventTimeline } from "@/components/dashboard/scenario-planning/compact-event-timeline";
import { EventDetailsList } from "@/components/dashboard/scenario-planning/event-details-list";
import { EventToggleToolbar } from "@/components/dashboard/scenario-planning/event-toggle-toolbar";
import { analyzeEventDependencies } from "@/lib/scenario-planning/event-analyzer";
import type { EventDependencyAnalysis } from "@/lib/scenario-planning/event-analyzer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ScenarioPlanningClientProps {
  initialCashBalance: number;
  portfolioAssets: PortfolioAsset[];
}

export function ScenarioPlanningClient({
  initialCashBalance,
  portfolioAssets,
}: ScenarioPlanningClientProps) {
  const [timeHorizon, setTimeHorizon] = useState<"2" | "5" | "10" | "30">("5");
  const [scale, setScale] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [isDesktop, setIsDesktop] = useState(true);

  // Detect screen size for responsive timeline
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Calculate end date based on time horizon
  const endDate = useMemo(() => {
    return addYears(new Date(), parseInt(timeHorizon));
  }, [timeHorizon]);

  // Create the full scenario first (for toolbar display)
  const fullScenario = useMemo(() => {
    // Generate dividend events from portfolio
    const dividendEvents = generateDividendEvents(
      portfolioAssets,
      0.02, // 2% annual yield
      ld(2025, 1, 1), // Start from current date
      null, // No end date
    );

    const scenario = makeScenario({
      name: "Francesco's Financial Plan",
      events: [
        // Part-time job
        makeRecurring({
          name: "Part-time Salary",
          amount: 2500,
          frequency: "monthly",
          type: "income",
          startDate: ld(2025, 1, 1),
          endDate: ld(2026, 3, 31),
        }),

        // Full-time job returns
        makeRecurring({
          name: "Full-time Salary",
          amount: 5000,
          frequency: "monthly",
          type: "income",
          startDate: ld(2026, 4, 1),
          endDate: null,
        }),

        // Cost of living
        makeRecurring({
          name: "Cost of Life",
          amount: 2400,
          frequency: "monthly",
          type: "expense",
          startDate: ld(2025, 1, 1),
          endDate: null,
        }),

        // Investment contributions - only when back to full-time
        makeRecurring({
          name: "Monthly Investment",
          amount: 500,
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
          amount: 10000,
          type: "expense",
          date: ld(2026, 1, 15),
        }),

        // Car insurance - only after buying car
        makeRecurring({
          name: "Car Insurance",
          amount: 150,
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

        // Add portfolio-generated dividend events
        ...dividendEvents,
      ],
    });

    return scenario;
  }, [portfolioAssets]);

  // State for enabled events (initialize with all events enabled)
  const [enabledEventNames, setEnabledEventNames] = useState<Set<string>>(
    () => {
      return new Set(fullScenario.events.map((e) => e.name));
    },
  );

  // Helper function to get dependent events recursively
  const getDependentEvents = useCallback(
    (eventName: string, tempAnalysis: EventDependencyAnalysis): Set<string> => {
      const dependents = new Set<string>();

      for (const triggered of tempAnalysis.triggeredEvents) {
        if (triggered.triggerEvent === eventName) {
          dependents.add(triggered.event.name);
          // Recursively get children of children
          getDependentEvents(triggered.event.name, tempAnalysis).forEach(
            (name) => dependents.add(name),
          );
        }
      }

      return dependents;
    },
    [],
  );

  // Run scenario with filtered events and portfolio data
  const { scenarioResult, scenario } = useMemo(() => {
    const start = new Date();
    const end = endDate;

    // Filter events based on toggles
    const filteredEvents = fullScenario.events.filter((event) =>
      enabledEventNames.has(event.name),
    );

    const scenario = {
      ...fullScenario,
      events: filteredEvents,
    };

    const scenarioResult = runScenario({
      scenario,
      startDate: fromJSDate(start),
      endDate: fromJSDate(end),
      initialBalance: initialCashBalance,
      portfolioAssets,
      growthRate: 0.07,
      dividendYield: 0, // Don't generate dividends here - already in fullScenario
    });

    return { scenario, scenarioResult };
  }, [endDate, fullScenario, enabledEventNames, initialCashBalance, portfolioAssets]);

  // Get final balance from totalBalance
  const finalBalance = useMemo(() => {
    const months = Object.keys(scenarioResult.totalBalance).sort();
    const lastMonth = months[months.length - 1];
    return scenarioResult.totalBalance[lastMonth] ?? 0;
  }, [scenarioResult]);

  // Calculate total portfolio assets value
  const totalPortfolioValue = useMemo(() => {
    return portfolioAssets.reduce((sum, asset) => sum + asset.initialValue, 0);
  }, [portfolioAssets]);

  // Analyze event dependencies
  const analysis = useMemo(() => {
    return analyzeEventDependencies(scenario, scenarioResult);
  }, [scenario, scenarioResult]);

  // Handle event toggle with cascade
  const handleEventToggle = useCallback(
    (eventName: string, enabled: boolean) => {
      const newEnabled = new Set(enabledEventNames);

      if (enabled) {
        newEnabled.add(eventName);
      } else {
        // Disable event
        newEnabled.delete(eventName);

        // Auto-disable all dependents
        const dependents = getDependentEvents(eventName, analysis);
        dependents.forEach((name) => newEnabled.delete(name));
      }

      setEnabledEventNames(newEnabled);
    },
    [enabledEventNames, analysis, getDependentEvents],
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Scenario Planning</h1>
        <p className="text-muted-foreground">
          Model your financial future with conditional events and dependencies
        </p>
      </div>

      <div className="grid gap-6">
        {/* Tabs */}
        <Tabs defaultValue="balance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="balance">Balance Chart</TabsTrigger>
            <TabsTrigger value="logic">Event Logic</TabsTrigger>
          </TabsList>

          <TabsContent value="balance" className="space-y-4">
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
                  <div className="flex gap-2">
                    <Select
                      value={scale}
                      onValueChange={(value) =>
                        setScale(value as "monthly" | "quarterly" | "yearly")
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Scale" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={timeHorizon}
                      onValueChange={(value) =>
                        setTimeHorizon(value as "2" | "5" | "10" | "30")
                      }
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
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ScenarioChart
                    result={{
                      ...scenarioResult,
                      balance: scenarioResult.totalBalance,
                    }}
                    currency="USD"
                    privacyMode={false}
                    analysis={analysis}
                    scale={scale}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Flow Timeline</CardTitle>
                <CardDescription>
                  {isDesktop
                    ? "Compact timeline showing all events at a glance"
                    : "See when events fire and what they trigger over time"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isDesktop ? (
                  <CompactEventTimeline analysis={analysis} currency="USD" />
                ) : (
                  <EventFlowTimeline analysis={analysis} currency="USD" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Dependencies</CardTitle>
                <CardDescription>
                  Explore events grouped by their conditions and dependencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EventDetailsList analysis={analysis} currency="USD" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Event Toggle Toolbar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Events</CardTitle>
            <CardDescription>
              Toggle events to explore what-if scenarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventToggleToolbar
              scenario={fullScenario}
              enabledEvents={enabledEventNames}
              onToggle={handleEventToggle}
              analysis={analysis}
            />
          </CardContent>
        </Card>

        {/* Portfolio Assets */}
        {portfolioAssets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Assets</CardTitle>
              <CardDescription>
                Your investment holdings tracked in the scenario (growing at 7%/year)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {portfolioAssets.map((asset) => {
                  const monthlyDividend = asset.initialValue * 0.02 / 12;
                  const hasDividend = monthlyDividend >= 1;

                  return (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{asset.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {asset.category_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} • {asset.currency}
                        </p>
                        {hasDividend && (
                          <p className="text-muted-foreground text-sm">
                            Generating ${monthlyDividend.toFixed(2)}/month in dividends
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${asset.initialValue.toLocaleString()}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Starting value
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Starting Cash</CardDescription>
              <CardTitle className="text-2xl">
                ${initialCashBalance.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Starting Investments</CardDescription>
              <CardTitle className="text-2xl">
                ${totalPortfolioValue.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Starting Total</CardDescription>
              <CardTitle className="text-2xl">
                ${(initialCashBalance + totalPortfolioValue).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>
                Final Balance (
                {endDate.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
                )
              </CardDescription>
              <CardTitle className="text-2xl">
                ${finalBalance.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Event Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Major Events</CardTitle>
            <CardDescription>
              Key milestones in your financial plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                  💼
                </div>
                <div className="flex-1">
                  <p className="font-medium">Return to Full-Time (June 2025)</p>
                  <p className="text-muted-foreground text-sm">
                    Salary increases to $5,000/month, investments resume at
                    $400/month
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  🚗
                </div>
                <div className="flex-1">
                  <p className="font-medium">Car Purchase (January 2026)</p>
                  <p className="text-muted-foreground text-sm">
                    $15,000 purchase triggers insurance ($120/month) and
                    maintenance ($600/year)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                  ✈️
                </div>
                <div className="flex-1">
                  <p className="font-medium">Summer Holiday (June 2026)</p>
                  <p className="text-muted-foreground text-sm">
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
                  <p className="text-muted-foreground text-sm">
                    $60,000 down payment triggers mortgage ($1,200/month) and
                    property tax ($3,000/year)
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
