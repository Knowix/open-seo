import { z } from "zod";
import { TregUsageRepository } from "@/server/features/treg/TregUsageRepository";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";
import { withMcpProjectAuth } from "@/server/mcp/project-auth";
import { projectIdSchema } from "@/server/mcp/schemas";
import { mcpResponse } from "@/server/mcp/formatters";
import { buildProjectMeta } from "@/server/mcp/context";

export const getTregUsageTool = {
  name: "get_treg_usage",
  config: {
    title: "Read recorded Treg usage",
    description:
      "Free read of this project's recorded Treg USD charges and last 50 responses. Uses actual X-Treg-Cost-Micro headers, deduplicates idempotent replays, and explicitly counts unknown charges. Covers only requests made through this app since usage recording was installed; excludes earlier and external calls. HTTP 0 means transport failure with unknown charge. This is not the account balance or a spending cap. No secrets or request bodies returned.",
    inputSchema: { projectId: projectIdSchema },
    outputSchema: z.looseObject({
      provider: z.string(),
      recordedCostUsd: z.number(),
      unknownCosts: z.number(),
      calls: z.array(z.looseObject({})),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(async (args: { projectId: string }, context) => {
    const usage = await TregUsageRepository.list(
      args.projectId,
      context.auth.organizationId,
    );
    const recordedCostUsd =
      Number(usage.totals?.knownCostMicro ?? 0) / 1_000_000;
    const unknownCosts = Number(usage.totals?.unknownCosts ?? 0);
    return mcpResponse({
      text: `$${recordedCostUsd.toFixed(6)} recorded Treg charges; ${unknownCosts} unknown charges. Earlier and external requests are excluded.`,
      structuredContent: {
        provider:
          (await getOptionalEnvValue("SEO_DATA_PROVIDER")) ?? "dataforseo",
        recordedCostUsd,
        unknownCosts,
        ...usage,
      },
      meta: buildProjectMeta(
        context,
        args.projectId,
        `/p/${args.projectId}/settings/integrations`,
      ),
    });
  }),
};
