import { isSeoDataConfigured } from "@/server/lib/runtime-env";
import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async () => {
    const configured = await isSeoDataConfigured();
    return { configured };
  });
