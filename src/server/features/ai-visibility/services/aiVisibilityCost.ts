import { tregAiAnswerEstimate } from "@/shared/treg-ai-pricing";
import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import { AiVisibilityError } from "./aiVisibilityErrors";
import { aiScope } from "./aiVisibilityConfiguration";
import {
  isSeoDataConfigured,
  getOptionalEnvValue,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
import {
  AI_RECORD_COST_USD,
  type AiCostEstimate,
  type AiEngine,
} from "@/shared/ai-visibility";
import {
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  creditsForProviderUsd,
} from "@/shared/billing";
import { scheduledChecksPerMonth } from "@/shared/rank-tracking";
import type { EstimateAiCostInput } from "@/types/schemas/ai-visibility";
import { projectPatch } from "./aiVisibilityMutation";

/** The customer's cost for `count` answers: credits when hosted, else provider USD. */
export function aiCostForCount(count: number, hosted: boolean) {
  const providerCostUsd = Math.round(count * AI_RECORD_COST_USD * 1e6) / 1e6;
  const costCredits = count * creditsForProviderUsd(AI_RECORD_COST_USD);
  return {
    providerCostUsd,
    costCredits: hosted ? costCredits : 0,
    costUsd: hosted
      ? costCredits / AUTUMN_SEO_DATA_CREDITS_PER_USD
      : providerCostUsd,
  };
}

/** Treg live catalog observations; estimates, not guaranteed charges. */
export async function aiCostForScope(
  promptCount: number,
  engines: AiEngine[],
  hosted: boolean,
) {
  if ((await getOptionalEnvValue("SEO_DATA_PROVIDER")) !== "treg")
    return aiCostForCount(promptCount * engines.length, hosted);
  const providerCostUsd =
    Math.round(
      promptCount *
        engines.reduce(
          (total, engine) => total + tregAiAnswerEstimate(engine),
          0,
        ) *
        1e6,
    ) / 1e6;
  const costCredits = hosted ? creditsForProviderUsd(providerCostUsd) : 0;
  return {
    providerCostUsd,
    costCredits,
    costUsd: hosted
      ? costCredits / AUTUMN_SEO_DATA_CREDITS_PER_USD
      : providerCostUsd,
  };
}

export async function estimateCost(
  input: EstimateAiCostInput,
): Promise<AiCostEstimate> {
  const current = await repo.getConfiguration(input.projectId);
  const config = input.patch
    ? (await projectPatch(input.projectId, input.patch, current)).rows
    : current;
  if (!config)
    throw new AiVisibilityError(
      "TRACKER_REQUIRED",
      "Set your project's website and pass proposed prompts, or save tracking before estimating.",
    );
  const scope = aiScope(config, input.promptIds);
  const observations = scope.prompts.length * scope.engines.length;
  const hosted = await isHostedServerAuthMode();
  const treg = (await getOptionalEnvValue("SEO_DATA_PROVIDER")) === "treg";
  const cost = await aiCostForScope(
    scope.prompts.length,
    scope.engines,
    hosted,
  );
  const scheduleInterval =
    input.scheduleInterval ?? current?.tracker.scheduleInterval ?? "weekly";
  const checksPerMonth = scheduledChecksPerMonth(scheduleInterval);
  return {
    promptCount: scope.prompts.length,
    engineCount: scope.engines.length,
    observations,
    ...cost,
    scheduleInterval,
    checksPerMonth,
    monthlyCostUsd: Math.round(cost.costUsd * checksPerMonth * 1e6) / 1e6,
    currency: "USD",
    warnings: [
      hosted
        ? "Customer cost uses OpenSEO data credits, including the service markup."
        : treg
          ? "Treg live estimate (catalog checked October 9, 2026): ChatGPT/Gemini $0.004 per answer, Google AI Overview planning allowance $0.008 including async load. Actual charges can vary; see Treg usage in Integrations. This is not a guaranteed dollar cap. OpenSEO credits are not used."
          : "Self-hosted DataForSEO standard-queue estimate. OpenSEO credits are not used.",
      `One fresh answer per prompt and engine. The ${scheduleInterval} estimate assumes ${checksPerMonth} ${checksPerMonth === 1 ? "check" : "checks"} per month.`,
      ...(!(await isSeoDataConfigured())
        ? [
            "The SEO data provider is not configured on this server. Setup is available; collection needs provider credentials.",
          ]
        : []),
    ],
  };
}
