import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  requireAuthenticatedContext,
  requireProjectContext,
} from "@/serverFunctions/middleware";
import { TregUsageRepository } from "@/server/features/treg/TregUsageRepository";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";

export const getTregUsage = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(z.object({ projectId: z.string().min(1) }))
  .handler(async ({ context }) => ({
    provider: (await getOptionalEnvValue("SEO_DATA_PROVIDER")) ?? "dataforseo",
    ...(await TregUsageRepository.list(
      context.projectId,
      context.organizationId,
    )),
  }));

export const getSeoProvider = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async () => ({
    provider: (await getOptionalEnvValue("SEO_DATA_PROVIDER")) ?? "dataforseo",
  }));
