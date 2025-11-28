"use server";

import { fetchPositions } from "@/server/positions/fetch";
import type { PortfolioAsset } from "@/lib/scenario-planning/types";

export async function fetchPortfolioForScenario(): Promise<{
  initialCashBalance: number;
  portfolioAssets: PortfolioAsset[];
}> {
  try {
    const positions = await fetchPositions({ positionType: "asset" });

    let cashBalance = 0;
    const assets: PortfolioAsset[] = [];

    for (const position of positions) {
      if (position.category_id === "cash") {
        cashBalance += position.total_value;
      } else {
        assets.push({
          id: position.id,
          name: position.name,
          category_id: position.category_id,
          initialValue: position.total_value,
          currency: position.currency,
        });
      }
    }

    return { initialCashBalance: cashBalance, portfolioAssets: assets };
  } catch (error) {
    // If there's an error fetching portfolio (e.g., no user logged in),
    // return empty portfolio
    console.error("Error fetching portfolio for scenario:", error);
    return { initialCashBalance: 0, portfolioAssets: [] };
  }
}
