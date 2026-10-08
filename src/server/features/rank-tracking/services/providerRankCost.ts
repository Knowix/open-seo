import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { estimateTregRankCheck } from "@/shared/treg-rank-pricing";
import {
  estimateRankCheckCredits,
  scheduledChecksPerMonth,
} from "@/shared/rank-tracking";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";

export async function usesTregRankChecks(): Promise<boolean> {
  return (await getOptionalEnvValue("SEO_DATA_PROVIDER")) === "treg";
}

export async function estimateProviderRankCheck(
  keywords: readonly string[],
  devices: RankTrackingConfig["devices"],
  depth: number,
  method: "live" | "queued",
) {
  if (!(await usesTregRankChecks()))
    return {
      ...estimateRankCheckCredits(keywords, devices, depth, method),
      pricingSource: "DataForSEO estimate",
      warnings: [] as string[],
    };
  return estimateTregRankCheck(keywords, devices, depth);
}

export async function estimateProviderScheduledCheck(
  keywords: readonly string[],
  devices: RankTrackingConfig["devices"],
  depth: number,
  scheduleInterval: "daily" | "weekly" | "monthly",
) {
  const estimate = await estimateProviderRankCheck(
    keywords,
    devices,
    depth,
    "queued",
  );
  const checksPerMonth = scheduledChecksPerMonth(scheduleInterval);
  return {
    ...estimate,
    scheduleInterval,
    checksPerMonth,
    monthlyCostUsd: estimate.costUsd * checksPerMonth,
    monthlyCostCredits: estimate.costCredits * checksPerMonth,
    method: (await usesTregRankChecks())
      ? ("live" as const)
      : ("queued" as const),
  };
}
