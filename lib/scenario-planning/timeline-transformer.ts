import type { ScenarioEvent } from "./index";
import type { EventDependencyAnalysis } from "./event-analyzer";

export interface TimelineYear {
  year: number;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  event: ScenarioEvent;
  occurrences: Array<{
    monthKey: string;
    month: number; // 1-12
    amount: number;
  }>;
  triggeredBy?: string; // Parent event name
  children: TimelineEvent[]; // Triggered child events
}

export function transformToTimelineData(
  analysis: EventDependencyAnalysis,
): TimelineYear[] {
  const { eventFlow, triggeredEvents } = analysis;

  // Create a map of event names to their trigger parents
  const triggerMap = new Map<string, string>();
  triggeredEvents.forEach((item) => {
    triggerMap.set(item.event.name, item.triggerEvent);
  });

  // Group events by year
  const yearMap = new Map<number, Map<string, TimelineEvent>>();

  // Process each month in the event flow
  eventFlow.forEach((monthData) => {
    const [yearStr, monthStr] = monthData.monthKey.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    if (!yearMap.has(year)) {
      yearMap.set(year, new Map());
    }

    const eventsInYear = yearMap.get(year)!;

    // Process starting events
    monthData.startingEvents.forEach((item) => {
      const eventName = item.event.name;

      if (!eventsInYear.has(eventName)) {
        eventsInYear.set(eventName, {
          event: item.event,
          occurrences: [],
          triggeredBy: triggerMap.get(eventName),
          children: [],
        });
      }

      eventsInYear.get(eventName)!.occurrences.push({
        monthKey: monthData.monthKey,
        month,
        amount: item.amount,
      });
    });

    // Process triggered events
    monthData.triggeredBy.forEach((item) => {
      const eventName = item.event.name;

      if (!eventsInYear.has(eventName)) {
        eventsInYear.set(eventName, {
          event: item.event,
          occurrences: [],
          triggeredBy: item.triggerEvent,
          children: [],
        });
      }

      const amount = item.event.type === "income" ? item.event.amount : -item.event.amount;

      eventsInYear.get(eventName)!.occurrences.push({
        monthKey: monthData.monthKey,
        month,
        amount,
      });
    });
  });

  // Convert to TimelineYear array and calculate totals
  const timelineYears: TimelineYear[] = [];

  Array.from(yearMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([year, eventsMap]) => {
      const events = Array.from(eventsMap.values());

      // Build parent-child hierarchy
      const topLevelEvents: TimelineEvent[] = [];
      const childEventsMap = new Map<string, TimelineEvent[]>();

      events.forEach((timelineEvent) => {
        if (timelineEvent.triggeredBy) {
          // This is a child event
          if (!childEventsMap.has(timelineEvent.triggeredBy)) {
            childEventsMap.set(timelineEvent.triggeredBy, []);
          }
          childEventsMap.get(timelineEvent.triggeredBy)!.push(timelineEvent);
        } else {
          // This is a top-level event
          topLevelEvents.push(timelineEvent);
        }
      });

      // Attach children to parents
      topLevelEvents.forEach((parent) => {
        const children = childEventsMap.get(parent.event.name) || [];
        parent.children = children;
      });

      // Also add orphaned children (whose parents aren't in this year)
      childEventsMap.forEach((children, parentName) => {
        const hasParentInYear = topLevelEvents.some(
          (e) => e.event.name === parentName,
        );
        if (!hasParentInYear) {
          topLevelEvents.push(...children);
        }
      });

      // Calculate totals for the year
      let totalIncome = 0;
      let totalExpense = 0;

      events.forEach((timelineEvent) => {
        timelineEvent.occurrences.forEach((occurrence) => {
          if (occurrence.amount > 0) {
            totalIncome += occurrence.amount;
          } else {
            totalExpense += Math.abs(occurrence.amount);
          }
        });
      });

      timelineYears.push({
        year,
        totalIncome,
        totalExpense,
        netCashflow: totalIncome - totalExpense,
        events: topLevelEvents,
      });
    });

  return timelineYears;
}
