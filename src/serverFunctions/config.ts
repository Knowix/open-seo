import {
  getOptionalEnvValue,
  isSeoDataConfigured,
} from "@/server/lib/runtime-env";
import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async () => {
    const configured = await isSeoDataConfigured();
    return {
      configured,
      dataProvider:
        (await getOptionalEnvValue("SEO_DATA_PROVIDER")) === "treg"
          ? ("treg" as const)
          : ("dataforseo" as const),
    };
  });
