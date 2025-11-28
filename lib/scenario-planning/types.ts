import type { Cashflow } from "./index";

export type PortfolioAsset = {
  id: string;
  name: string;
  category_id: string;
  initialValue: number;
  currency: string;
};

export type AssetBalance = Record<string, number>; // assetId → value

export type ScenarioResultExtended = {
  cashflow: Cashflow;
  cashBalance: Record<string, number>;
  assetBalance: Record<string, AssetBalance>;
  totalBalance: Record<string, number>;
};
