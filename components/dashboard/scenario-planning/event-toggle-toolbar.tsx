"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/number-format";
import type { Scenario } from "@/lib/scenario-planning";
import type { EventDependencyAnalysis } from "@/lib/scenario-planning/event-analyzer";
import { cn } from "@/lib/utils";

interface EventToggleToolbarProps {
  scenario: Scenario;
  enabledEvents: Set<string>;
  onToggle: (eventName: string, enabled: boolean) => void;
  analysis: EventDependencyAnalysis;
}

export function EventToggleToolbar({
  scenario,
  enabledEvents,
  onToggle,
  analysis,
}: EventToggleToolbarProps) {
  // Create a map of triggered events to their parents
  const triggerMap = new Map<string, string>();
  analysis.triggeredEvents.forEach((item) => {
    triggerMap.set(item.event.name, item.triggerEvent);
  });

  // Build event hierarchy
  interface EventNode {
    event: typeof scenario.events[0];
    children: EventNode[];
  }

  const buildEventTree = (type: "income" | "expense") => {
    const typeEvents = scenario.events.filter((e) => e.type === type);
    const rootEvents: EventNode[] = [];
    const eventMap = new Map<string, EventNode>();

    // Create nodes for all events
    typeEvents.forEach((event) => {
      eventMap.set(event.name, { event, children: [] });
    });

    // Build tree structure
    typeEvents.forEach((event) => {
      const node = eventMap.get(event.name)!;
      const parentName = triggerMap.get(event.name);

      if (parentName && eventMap.has(parentName)) {
        // This is a child event, add to parent
        eventMap.get(parentName)!.children.push(node);
      } else {
        // This is a root event
        rootEvents.push(node);
      }
    });

    return rootEvents;
  };

  const incomeTree = buildEventTree("income");
  const expenseTree = buildEventTree("expense");

  const enabledCount = enabledEvents.size;
  const totalCount = scenario.events.length;

  // Render event node recursively
  const renderEventNode = (node: EventNode, depth: number): React.ReactNode => {
    const event = node.event;
    const enabled = enabledEvents.has(event.name);
    const triggerParent = triggerMap.get(event.name);
    const parentDisabled = triggerParent && !enabledEvents.has(triggerParent);

    return (
      <div key={event.name}>
        {/* Event checkbox */}
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors",
            !enabled && "opacity-60",
            parentDisabled && "cursor-not-allowed opacity-30"
          )}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <Checkbox
            checked={enabled}
            disabled={parentDisabled}
            onCheckedChange={(checked) => onToggle(event.name, checked === true)}
            id={`event-${event.name}`}
          />
          <label
            htmlFor={`event-${event.name}`}
            className="flex-1 flex items-center gap-2 cursor-pointer"
          >
            {depth > 0 && <span className="text-muted-foreground text-xs">├─</span>}
            <span className="text-sm flex-1 truncate" title={event.name}>
              {event.name}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatCurrency(event.amount, "USD")}
            </span>
          </label>
        </div>

        {/* Render children recursively */}
        {node.children.map((child) => renderEventNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Events ({enabledCount}/{totalCount})
          </span>
        </div>
      </div>

      {/* Event checkboxes with hierarchy */}
      <div className="space-y-4">
        {/* Income Section */}
        {incomeTree.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-green-600 mb-2">Income</h3>
            <div className="space-y-1">
              {incomeTree.map((node) => renderEventNode(node, 0))}
            </div>
          </div>
        )}

        {/* Separator */}
        {incomeTree.length > 0 && expenseTree.length > 0 && (
          <div className="border-t border-border" />
        )}

        {/* Expense Section */}
        {expenseTree.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-600 mb-2">Expenses</h3>
            <div className="space-y-1">
              {expenseTree.map((node) => renderEventNode(node, 0))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
