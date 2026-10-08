import { TREG_GOOGLE_ACCOUNT_ID } from "@/server/lib/treg-google";

/** A shared property must not mix the English and Hungarian sites. */
export function ga4ProjectHostnames(connection: {
  ga4AccountId: string;
  projectDomain: string | null;
}): string[] | undefined {
  if (
    connection.ga4AccountId !== TREG_GOOGLE_ACCOUNT_ID ||
    !connection.projectDomain
  )
    return undefined;
  const domain = connection.projectDomain.toLowerCase().replace(/^www\./, "");
  return [domain, `www.${domain}`];
}
