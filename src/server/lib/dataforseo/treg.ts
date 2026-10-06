import { AppError } from "@/server/lib/errors";
import {
  getOptionalEnvValue,
  getRequiredEnvValue,
} from "@/server/lib/runtime-env";
import endpoints from "./treg-endpoints.json";

/** Resolve the provider request without sending provider credentials to Treg. */
export async function resolveTregRequest(
  input: RequestInfo,
  init: RequestInit | undefined,
  headers: Headers,
): Promise<string> {
  const source = new URL(typeof input === "string" ? input : input.url);
  if (source.origin !== "https://api.dataforseo.com") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Treg mode supports production DataForSEO routes only.",
    );
  }
  const method = (init?.method ?? "GET").toUpperCase();
  // Queued jobs need task ownership and collection routes. Refuse submission
  // before spending until those follow-up routes are supported by this adapter.
  if (
    source.pathname.includes("/task_post") ||
    source.pathname === "/v3/appendix/user_data"
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This route is unavailable in Treg mode. Queued jobs need a collection adapter; account balances must be read from Treg.",
    );
  }
  const actual = source.pathname.replace(/^\/v3/, "").split("/");
  const endpoint = endpoints.find((entry) => {
    const expected = entry.path.split("/");
    return (
      entry.method === method &&
      expected.length === actual.length &&
      expected.every(
        (segment, index) =>
          /^\{\w+\}$/.test(segment) || segment === actual[index],
      )
    );
  });
  if (!endpoint) {
    throw new AppError(
      "VALIDATION_ERROR",
      `No supported Treg catalog endpoint for ${method} ${source.pathname}.`,
    );
  }
  const target = new URL(`https://treg.to/call/${endpoint.id}`);
  target.search = source.search;
  endpoint.path.split("/").forEach((segment, index) => {
    const parameter = /^\{(\w+)\}$/.exec(segment)?.[1];
    if (parameter)
      target.searchParams.set(parameter, decodeURIComponent(actual[index]!));
  });
  headers.delete("Authorization");
  headers.set("X-Treg-Token", await getRequiredEnvValue("TREG_TOKEN"));
  const org = await getOptionalEnvValue("TREG_ORG");
  if (org) headers.set("X-Treg-Org", org);
  // Created once per request, then reused by the existing retry loop.
  headers.set("Idempotency-Key", crypto.randomUUID());
  return target.toString();
}
