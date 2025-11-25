"use client";

import { Check, Lock, AlertCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EventDependencyAnalysis } from "@/lib/scenario-planning/event-analyzer";
import { getEventFrequencyString } from "@/lib/scenario-planning/event-analyzer";

interface EventDetailsListProps {
  analysis: EventDependencyAnalysis;
  currency: string;
}

export function EventDetailsList({ analysis, currency }: EventDetailsListProps) {
  const { independentEvents, conditionalEvents, triggeredEvents } = analysis;

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={["independent", "conditional", "triggered"]} className="space-y-4">
        {/* Independent Events */}
        {independentEvents.length > 0 && (
          <AccordionItem value="independent" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-semibold">Independent Events</span>
                <Badge variant="outline">{independentEvents.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground mb-4">
                Events that start on specific dates without dependencies
              </p>
              <div className="space-y-3">
                {independentEvents.map((event, idx) => {
                  const isIncome = event.type === "income";
                  const freqString = getEventFrequencyString(event);

                  return (
                    <Card key={idx}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{event.name}</span>
                              <Badge variant={isIncome ? "default" : "secondary"}>
                                {isIncome ? "Income" : "Expense"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {isIncome ? "+" : "-"}
                              {currency}
                              {event.amount.toLocaleString()}
                              {freqString !== "one-time" && ` ${freqString}`}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Conditional Events */}
        {conditionalEvents.length > 0 && (
          <AccordionItem value="conditional" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="font-semibold">Conditional Events</span>
                <Badge variant="outline">{conditionalEvents.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground mb-4">
                Events that unlock when certain conditions are met
              </p>
              <div className="space-y-3">
                {conditionalEvents.map((item, idx) => {
                  const event = item.event;
                  const isIncome = event.type === "income";
                  const freqString = getEventFrequencyString(event);

                  return (
                    <Card key={idx}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{event.name}</span>
                              <Badge variant={isIncome ? "default" : "secondary"}>
                                {isIncome ? "Income" : "Expense"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {isIncome ? "+" : "-"}
                              {currency}
                              {event.amount.toLocaleString()}
                              {freqString !== "one-time" && ` ${freqString}`}
                            </p>
                            {item.conditions.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Conditions:</p>
                                {item.conditions.map((condition, condIdx) => (
                                  <p key={condIdx} className="text-xs text-muted-foreground pl-2">
                                    • {condition}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Triggered Events */}
        {triggeredEvents.length > 0 && (
          <AccordionItem value="triggered" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">Triggered Events</span>
                <Badge variant="outline">{triggeredEvents.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground mb-4">
                Events that start after another event happens
              </p>
              <div className="space-y-3">
                {triggeredEvents.map((item, idx) => {
                  const event = item.event;
                  const isIncome = event.type === "income";
                  const freqString = getEventFrequencyString(event);

                  return (
                    <Card key={idx}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{event.name}</span>
                              <Badge variant={isIncome ? "default" : "secondary"}>
                                {isIncome ? "Income" : "Expense"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {isIncome ? "+" : "-"}
                              {currency}
                              {event.amount.toLocaleString()}
                              {freqString !== "one-time" && ` ${freqString}`}
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground">
                                Depends on: <span className="font-medium">{item.triggerEvent}</span>
                              </p>
                              {item.firedAt && (
                                <p className="text-xs text-green-600">
                                  ✓ Fired in {new Date(item.firedAt + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {independentEvents.length === 0 &&
        conditionalEvents.length === 0 &&
        triggeredEvents.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No Events</CardTitle>
              <CardDescription>This scenario has no events defined</CardDescription>
            </CardHeader>
          </Card>
        )}
    </div>
  );
}
