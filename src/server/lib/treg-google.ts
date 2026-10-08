import { AppError } from "@/server/lib/errors";
import {
  getOptionalEnvValue,
  getRequiredEnvValue,
} from "@/server/lib/runtime-env";

export const TREG_GOOGLE_ACCOUNT_ID = "treg";

/** Team credentials are available only in the explicitly enabled local app. */
export async function isTregGoogleConfigured(): Promise<boolean> {
  return (
    (await getOptionalEnvValue("AUTH_MODE")) === "local_noauth" &&
    (await getOptionalEnvValue("TREG_GOOGLE_ENABLED")) === "true" &&
    Boolean(await getOptionalEnvValue("TREG_TOKEN"))
  );
}

export async function fetchTregGoogle(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!(await isTregGoogleConfigured())) {
    throw new AppError(
      "VALIDATION_ERROR",
      "The local Treg Google connection is disabled.",
    );
  }
  const source = new URL(url);
  const method = (init.method ?? "GET").toUpperCase();
  const routes = {
    "https://www.googleapis.com": "google-search-console",
    "https://searchconsole.googleapis.com": "google-search-console",
    "https://analyticsadmin.googleapis.com": "google-analytics-admin",
    "https://analyticsdata.googleapis.com": "google-analytics",
  };
  const tool = routes[source.origin as keyof typeof routes];
  const allowedGet =
    method === "GET" &&
    ((source.origin === "https://www.googleapis.com" &&
      source.pathname === "/webmasters/v3/sites") ||
      (source.origin === "https://analyticsadmin.googleapis.com" &&
        /^\/v1(?:alpha|beta)\/(?:accountSummaries|properties\/\d+(?:\/(?:dataStreams(?:\/\d+\/enhancedMeasurementSettings)?|keyEvents|customDimensions|customMetrics))?)$/.test(
          source.pathname,
        )));
  const allowedPost =
    method === "POST" &&
    ((source.origin === "https://www.googleapis.com" &&
      /^\/webmasters\/v3\/sites\/[^/]+\/searchAnalytics\/query$/.test(
        source.pathname,
      )) ||
      (source.origin === "https://searchconsole.googleapis.com" &&
        source.pathname === "/v1/urlInspection/index:inspect") ||
      (source.origin === "https://analyticsdata.googleapis.com" &&
        /^\/v1beta\/properties\/\d+:runReport$/.test(source.pathname)));
  if (
    !tool ||
    source.username ||
    source.password ||
    source.hash ||
    !(allowedGet || allowedPost)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This Google route is not supported by the read-only Treg bridge.",
    );
  }
  const target = new URL(`https://treg.to/call/${tool}${source.pathname}`);
  target.search = source.search;
  const headers = new Headers(init.headers);
  headers.delete("Authorization");
  headers.set("X-Treg-Token", await getRequiredEnvValue("TREG_TOKEN"));
  const org = await getOptionalEnvValue("TREG_ORG");
  if (org) headers.set("X-Treg-Org", org);
  return fetch(target, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(60_000),
    redirect: "manual",
  });
}
