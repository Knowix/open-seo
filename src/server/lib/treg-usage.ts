import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import { TregUsageRepository } from "@/server/features/treg/TregUsageRepository";

const usageScope = new AsyncLocalStorage<BillingCustomerContext>();
export function withTregUsageScope<T>(
  customer: BillingCustomerContext,
  run: () => Promise<T>,
): Promise<T> {
  return usageScope.run(customer, run);
}

export async function recordTregResponse(
  response: Response,
  endpoint: string,
  requestKey: string,
) {
  const scope = usageScope.getStore();
  if (!scope) return;
  const raw = response.headers.get("X-Treg-Cost-Micro");
  const parsed =
    raw !== null && /^\d+$/.test(raw)
      ? z
          .number()
          .int()
          .nonnegative()
          .max(Number.MAX_SAFE_INTEGER)
          .safeParse(Number(raw))
      : null;
  try {
    await TregUsageRepository.record({
      id: crypto.randomUUID(),
      organizationId: scope.organizationId,
      projectId: scope.projectId ?? null,
      callId: response.headers.get("X-Treg-Call-Id"),
      requestKey,
      endpoint,
      status: response.status,
      costMicro: parsed?.success ? parsed.data : null,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // A ledger failure must never discard a delivered result or replay a charge.
    console.error("treg.usage-record-failed", {
      endpoint,
      callId: response.headers.get("X-Treg-Call-Id"),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export async function recordTregTransportFailure(
  endpoint: string,
  requestKey: string,
) {
  // Without response headers the provider charge is unknowable, even on a timeout.
  const scope = usageScope.getStore();
  if (!scope) return;
  try {
    await TregUsageRepository.record({
      id: crypto.randomUUID(),
      organizationId: scope.organizationId,
      projectId: scope.projectId ?? null,
      callId: null,
      requestKey,
      endpoint,
      status: 0,
      costMicro: null,
      createdAt: new Date().toISOString(),
    });
  } catch {
    console.error("treg.transport-usage-record-failed", { endpoint });
  }
}
