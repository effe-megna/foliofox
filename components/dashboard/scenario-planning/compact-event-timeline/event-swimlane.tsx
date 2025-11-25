"use client";

import { Badge } from "@/components/ui/badge";
import type { TimelineEvent } from "@/lib/scenario-planning/timeline-transformer";
import { EventMarker } from "./event-marker";

interface EventSwimlaneProps {
  timelineEvent: TimelineEvent;
  year: number;
  currency: string;
  privacyMode?: boolean;
  depth?: number;
}

export function EventSwimlane({
  timelineEvent,
  year,
  currency,
  privacyMode = false,
  depth = 0,
}: EventSwimlaneProps) {
  const { event, occurrences, triggeredBy, children } = timelineEvent;
  const isIncome = event.type === "income";

  // Create a map of month to occurrence
  const occurrenceMap = new Map<number, (typeof occurrences)[0]>();
  occurrences.forEach((occ) => {
    occurrenceMap.set(occ.month, occ);
  });

  return (
    <>
      {/* Main event row */}
      <div className="grid grid-cols-[250px_repeat(12,minmax(40px,1fr))] gap-0.5 border-b border-border/50 hover:bg-muted/30 transition-colors">
        {/* Event name column */}
        <div
          className="flex items-center gap-2 p-2 border-r border-border/50"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          title={event.name}
        >
          {triggeredBy && <span className="text-muted-foreground text-sm">↳</span>}
          <span className="text-sm font-medium truncate flex-1">{event.name}</span>
          <Badge variant={isIncome ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
            {isIncome ? "Inc" : "Exp"}
          </Badge>
        </div>

        {/* Month columns */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => {
          const occurrence = occurrenceMap.get(month);

          return (
            <div
              key={month}
              className="flex items-center justify-center p-1 border-r border-border/50 last:border-r-0"
            >
              {occurrence && (
                <EventMarker
                  event={event}
                  month={month}
                  amount={occurrence.amount}
                  currency={currency}
                  privacyMode={privacyMode}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Render children recursively */}
      {children.map((child, idx) => (
        <EventSwimlane
          key={idx}
          timelineEvent={child}
          year={year}
          currency={currency}
          privacyMode={privacyMode}
          depth={depth + 1}
        />
      ))}
    </>
  );
}
