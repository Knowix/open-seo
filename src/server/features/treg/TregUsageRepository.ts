import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { tregUsage } from "@/db/schema";

export const TregUsageRepository = {
  async record(row: typeof tregUsage.$inferInsert) {
    // Retries and idempotent replays represent the same charge.
    await db.insert(tregUsage).values(row).onConflictDoNothing();
  },
  async list(projectId: string, organizationId: string) {
    const scope = and(
      eq(tregUsage.projectId, projectId),
      eq(tregUsage.organizationId, organizationId),
    );
    const [totals, calls] = await Promise.all([
      db
        .select({
          requests: sql<number>`count(*)`,
          knownCostMicro: sql<number>`coalesce(sum(${tregUsage.costMicro}), 0)`,
          unknownCosts: sql<number>`coalesce(sum(case when ${tregUsage.costMicro} is null then 1 else 0 end), 0)`,
        })
        .from(tregUsage)
        .where(scope),
      db
        .select()
        .from(tregUsage)
        .where(scope)
        .orderBy(desc(tregUsage.createdAt))
        .limit(50),
    ]);
    return { totals: totals[0], calls };
  },
};
