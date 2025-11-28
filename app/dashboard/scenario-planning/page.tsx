import { fetchPortfolioForScenario } from "@/server/scenario-planning/fetch-portfolio-data";
import { ScenarioPlanningClient } from "@/components/dashboard/scenario-planning/scenario-planning-client";

export default async function ScenarioPlanningPage() {
  // Fetch portfolio data
  const { initialCashBalance, portfolioAssets } =
    await fetchPortfolioForScenario();

  // Render client component with data
  return (
    <ScenarioPlanningClient
      initialCashBalance={initialCashBalance}
      portfolioAssets={portfolioAssets}
    />
  );
}
