import type { Scenario, ScenarioEvent } from "./index";

export interface EventDependencyAnalysis {
  independentEvents: ScenarioEvent[];
  conditionalEvents: Array<{
    event: ScenarioEvent;
    conditions: string[];
  }>;
  triggeredEvents: Array<{
    event: ScenarioEvent;
    triggerEvent: string;
    firedAt?: string;
  }>;
  eventFlow: Array<{
    monthKey: string;
    startingEvents: Array<{
      event: ScenarioEvent;
      amount: number;
    }>;
    triggeredBy: Array<{
      event: ScenarioEvent;
      triggerEvent: string;
    }>;
  }>;
}

interface ScenarioResult {
  balance: Record<string, number>;
  cashflow: Record<
    string,
    {
      amount: number;
      events: ScenarioEvent[];
    }
  >;
}

function conditionToString(
  condition:
    | { tag: "cashflow"; type: "date-is" | "date-in-range"; value: any }
    | {
        tag: "balance";
        type: "networth-is-above" | "event-happened" | "income-is-above";
        value: any;
      },
): string {
  if (condition.tag === "cashflow") {
    // Skip date conditions as they're not interesting for dependency visualization
    return "";
  }

  switch (condition.type) {
    case "networth-is-above":
      return `When net worth > $${condition.value.amount.toLocaleString()}`;

    case "event-happened":
      return `After "${condition.value.eventName}" happens`;

    case "income-is-above":
      return `When "${condition.value.eventName}" >= $${condition.value.amount.toLocaleString()}`;

    default:
      return "";
  }
}

function getEventFrequencyString(event: ScenarioEvent): string {
  switch (event.recurrence.type) {
    case "once":
      return "one-time";
    case "monthly":
      return "/month";
    case "yearly":
      return "/year";
    default:
      return "";
  }
}

export function analyzeEventDependencies(
  scenario: Scenario,
  result: ScenarioResult,
): EventDependencyAnalysis {
  const independentEvents: ScenarioEvent[] = [];
  const conditionalEvents: Array<{
    event: ScenarioEvent;
    conditions: string[];
  }> = [];
  const triggeredEvents: Array<{
    event: ScenarioEvent;
    triggerEvent: string;
    firedAt?: string;
  }> = [];

  // Categorize events based on their conditions
  for (const event of scenario.events) {
    const balanceConditions = event.unlockedBy.filter((c) => c.tag === "balance");
    const cashflowConditions = event.unlockedBy.filter((c) => c.tag === "cashflow");

    if (balanceConditions.length === 0) {
      // Events with only date/range conditions are "independent"
      independentEvents.push(event);
    } else {
      // Check if it's triggered by another event
      const eventHappenedCondition = balanceConditions.find(
        (c) => c.type === "event-happened",
      );

      if (eventHappenedCondition && eventHappenedCondition.type === "event-happened") {
        const triggerEventName = eventHappenedCondition.value.eventName;

        // Find when this event fired
        let firedAt: string | undefined;
        for (const [monthKey, cashflowData] of Object.entries(result.cashflow)) {
          if (cashflowData.events.some((e) => e.name === event.name)) {
            firedAt = monthKey;
            break;
          }
        }

        triggeredEvents.push({
          event,
          triggerEvent: triggerEventName,
          firedAt,
        });
      } else {
        // Other balance conditions (income-is-above, networth-is-above)
        const conditions = balanceConditions
          .map(conditionToString)
          .filter((s) => s !== "");

        conditionalEvents.push({
          event,
          conditions,
        });
      }
    }
  }

  // Build event flow (month-by-month)
  const eventFlow: EventDependencyAnalysis["eventFlow"] = [];
  const sortedMonths = Object.keys(result.cashflow).sort();

  for (const monthKey of sortedMonths) {
    const cashflowData = result.cashflow[monthKey];

    if (cashflowData.events.length === 0) {
      continue;
    }

    const startingEvents: Array<{ event: ScenarioEvent; amount: number }> = [];
    const triggeredBy: Array<{ event: ScenarioEvent; triggerEvent: string }> = [];

    for (const event of cashflowData.events) {
      const amount = event.type === "income" ? event.amount : -event.amount;

      // Check if this event is triggered by another event
      const trigger = triggeredEvents.find((t) => t.event.name === event.name);

      if (trigger) {
        triggeredBy.push({
          event,
          triggerEvent: trigger.triggerEvent,
        });
      } else {
        startingEvents.push({ event, amount });
      }
    }

    if (startingEvents.length > 0 || triggeredBy.length > 0) {
      eventFlow.push({
        monthKey,
        startingEvents,
        triggeredBy,
      });
    }
  }

  return {
    independentEvents,
    conditionalEvents,
    triggeredEvents,
    eventFlow,
  };
}

export { getEventFrequencyString };
