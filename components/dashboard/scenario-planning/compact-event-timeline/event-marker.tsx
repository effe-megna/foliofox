"use client";

import type { ScenarioEvent } from "@/lib/scenario-planning";
import { formatCurrency } from "@/lib/number-format";

interface EventMarkerProps {
  event: ScenarioEvent;
  month: number;
  amount: number;
  currency: string;
  privacyMode?: boolean;
}

export function EventMarker({
  event,
  month,
  amount,
  currency,
  privacyMode = false,
}: EventMarkerProps) {
  const isIncome = event.type === "income";
  const color = isIncome
    ? "oklch(0.72 0.19 150)" // green
    : "oklch(0.64 0.21 25)"; // red

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const tooltipText = privacyMode
    ? `${event.name} - ${monthNames[month - 1]}`
    : `${event.name}\n${formatCurrency(Math.abs(amount), currency)}\n${monthNames[month - 1]}`;

  return (
    <div
      className="flex items-center justify-center"
      title={tooltipText}
    >
      <div
        className="rounded-full transition-all hover:scale-125 cursor-pointer"
        style={{
          width: "8px",
          height: "8px",
          backgroundColor: color,
        }}
      />
    </div>
  );
}
