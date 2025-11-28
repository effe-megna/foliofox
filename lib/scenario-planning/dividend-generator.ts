import type { ScenarioEvent } from "./index";
import type { PortfolioAsset } from "./types";
import { makeRecurring } from "./index";
import type { LocalDate } from "./local-date";

export function generateDividendEvents(
  assets: PortfolioAsset[],
  annualYield: number,
  startDate: LocalDate,
  endDate: LocalDate | null,
): ScenarioEvent[] {
  const events: ScenarioEvent[] = [];

  // Monthly dividend amount (annual yield / 12)
  const monthlyYield = annualYield / 12;

  for (const asset of assets) {
    // Skip cash (already counted)
    if (asset.category_id === "cash") continue;

    const monthlyDividend = asset.initialValue * monthlyYield;

    // Only generate if dividend is meaningful (> $1/month)
    if (monthlyDividend >= 1) {
      events.push(
        makeRecurring({
          name: `Dividends from ${asset.name}`,
          amount: monthlyDividend,
          type: "income",
          frequency: "monthly",
          startDate,
          endDate,
        }),
      );
    }
  }

  return events;
}
