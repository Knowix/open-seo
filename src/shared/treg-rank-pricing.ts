import { creditsForProviderUsd } from "@/shared/billing";
import {
  devicesCount,
  serpKeywordCostMultiplier,
} from "@/shared/rank-tracking";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";

export function estimateTregRankCheck(
  keywords: readonly string[],
  devices: RankTrackingConfig["devices"],
  depth: number,
) {
  // Treg catalog inspected Oct 8, 2026: $0.004 observed per first-page call.
  // Deeper pages are planning estimates, not a live quote or a runtime cap.
  const perCall = 0.004 + Math.max(0, depth / 10 - 1) * 0.003;
  let costUsd = 0,
    costCredits = 0;
  for (const keyword of keywords) {
    const usd = perCall * serpKeywordCostMultiplier(keyword);
    costUsd += usd * devicesCount(devices);
    costCredits += creditsForProviderUsd(usd) * devicesCount(devices);
  }
  return {
    costUsd: Number(costUsd.toFixed(6)),
    costCredits,
    pricingSource: "Treg catalog observation, inspected Oct 8, 2026",
    warnings: [
      "Treg uses live SERPs for both manual and scheduled checks. This is a planning estimate; deeper-page pricing and actual charges can vary. Read actual USD charges in project Settings > Integrations > Treg usage. Credit ceilings are estimate checks, not enforceable Treg dollar caps.",
    ],
  };
}
