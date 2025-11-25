"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/number-format";
import type { TimelineYear } from "@/lib/scenario-planning/timeline-transformer";
import { EventSwimlane } from "./event-swimlane";

interface TimelineYearSectionProps {
  yearData: TimelineYear;
  currency: string;
  privacyMode?: boolean;
}

export function TimelineYearSection({
  yearData,
  currency,
  privacyMode = false,
}: TimelineYearSectionProps) {
  const { year, netCashflow, events } = yearData;

  const eventCount = events.length + events.reduce((sum, e) => sum + e.children.length, 0);

  return (
    <AccordionItem value={year.toString()} className="border rounded-lg">
      <AccordionTrigger className="hover:no-underline px-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">{year}</span>
          <Badge variant="outline" className="font-normal">
            {eventCount} {eventCount === 1 ? "event" : "events"}
          </Badge>
          <span
            className={`text-sm font-medium ${
              netCashflow >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {netCashflow >= 0 ? "+" : ""}
            {privacyMode ? "***" : formatCurrency(netCashflow, currency)}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="border-t border-border">
          {/* Month header row */}
          <div className="grid grid-cols-[250px_repeat(12,minmax(40px,1fr))] gap-0.5 bg-muted/50 sticky top-0">
            <div className="p-2 border-r border-border/50 text-xs font-medium text-muted-foreground">
              Event Name
            </div>
            {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((month, idx) => (
              <div
                key={idx}
                className="p-2 border-r border-border/50 last:border-r-0 text-center text-xs font-medium text-muted-foreground"
              >
                {month}
              </div>
            ))}
          </div>

          {/* Event swimlanes */}
          <div>
            {events.map((timelineEvent, idx) => (
              <EventSwimlane
                key={idx}
                timelineEvent={timelineEvent}
                year={year}
                currency={currency}
                privacyMode={privacyMode}
              />
            ))}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
