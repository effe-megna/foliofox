"use client";

import { useMemo } from "react";
import { Accordion } from "@/components/ui/accordion";
import { Calendar } from "lucide-react";
import type { EventDependencyAnalysis } from "@/lib/scenario-planning/event-analyzer";
import { transformToTimelineData } from "@/lib/scenario-planning/timeline-transformer";
import { TimelineYearSection } from "./timeline-year-section";

interface CompactEventTimelineProps {
  analysis: EventDependencyAnalysis;
  currency: string;
  privacyMode?: boolean;
  defaultExpandedYears?: number[];
}

export function CompactEventTimeline({
  analysis,
  currency,
  privacyMode = false,
  defaultExpandedYears,
}: CompactEventTimelineProps) {
  const timelineData = useMemo(() => {
    return transformToTimelineData(analysis);
  }, [analysis]);

  // Default: expand current year and next year
  const defaultExpanded = useMemo(() => {
    if (defaultExpandedYears) {
      return defaultExpandedYears.map(String);
    }

    const currentYear = new Date().getFullYear();
    const yearsInData = timelineData.map((y) => y.year);

    // Expand current year + next year if they exist in data
    const toExpand: string[] = [];
    if (yearsInData.includes(currentYear)) {
      toExpand.push(currentYear.toString());
    }
    if (yearsInData.includes(currentYear + 1)) {
      toExpand.push((currentYear + 1).toString());
    }

    // If we didn't find current/next year, expand first 2 years
    if (toExpand.length === 0 && yearsInData.length > 0) {
      toExpand.push(yearsInData[0].toString());
      if (yearsInData.length > 1) {
        toExpand.push(yearsInData[1].toString());
      }
    }

    return toExpand;
  }, [timelineData, defaultExpandedYears]);

  if (timelineData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No events in this scenario</p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={defaultExpanded} className="space-y-4">
      {timelineData.map((yearData) => (
        <TimelineYearSection
          key={yearData.year}
          yearData={yearData}
          currency={currency}
          privacyMode={privacyMode}
        />
      ))}
    </Accordion>
  );
}
