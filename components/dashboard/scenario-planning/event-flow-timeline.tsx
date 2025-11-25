"use client";

import { ArrowDown, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EventDependencyAnalysis } from "@/lib/scenario-planning/event-analyzer";
import { getEventFrequencyString } from "@/lib/scenario-planning/event-analyzer";

interface EventFlowTimelineProps {
  analysis: EventDependencyAnalysis;
  currency: string;
}

export function EventFlowTimeline({ analysis, currency }: EventFlowTimelineProps) {
  const { eventFlow } = analysis;

  if (eventFlow.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No events in this scenario</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {eventFlow.map((monthData, index) => {
        const date = new Date(monthData.monthKey + "-01");
        const monthLabel = date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

        return (
          <Card key={monthData.monthKey} className="overflow-hidden">
            <CardContent className="p-4">
              {/* Month Header */}
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{monthLabel}</h3>
              </div>

              <div className="space-y-3">
                {/* Starting Events */}
                {monthData.startingEvents.map((item, idx) => {
                  const event = item.event;
                  const isIncome = event.type === "income";
                  const freqString = getEventFrequencyString(event);

                  return (
                    <div key={`start-${idx}`} className="flex items-start gap-3 pl-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.name}</span>
                          <Badge variant={isIncome ? "default" : "secondary"}>
                            {isIncome ? "Income" : "Expense"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isIncome ? "+" : "-"}
                          {currency}
                          {event.amount.toLocaleString()}
                          {freqString !== "one-time" && ` ${freqString}`}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Triggered Events */}
                {monthData.triggeredBy.map((item, idx) => {
                  const event = item.event;
                  const isIncome = event.type === "income";
                  const freqString = getEventFrequencyString(event);

                  return (
                    <div key={`trigger-${idx}`} className="space-y-2">
                      {/* Arrow indicator */}
                      <div className="flex items-center gap-2 pl-4 text-muted-foreground text-sm">
                        <ArrowDown className="h-4 w-4" />
                        <span>Triggered by "{item.triggerEvent}"</span>
                      </div>

                      {/* Event */}
                      <div className="flex items-start gap-3 pl-8 border-l-2 border-muted ml-6">
                        <div className="flex-1 pl-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{event.name}</span>
                            <Badge variant={isIncome ? "default" : "secondary"}>
                              {isIncome ? "Income" : "Expense"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {isIncome ? "+" : "-"}
                            {currency}
                            {event.amount.toLocaleString()}
                            {freqString !== "one-time" && ` ${freqString}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
