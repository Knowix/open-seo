import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization } from "./better-auth-schema";
import { projects } from "./app.schema";

export const tregUsage = pgTable(
  "treg_usage",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    callId: text("call_id"),
    requestKey: text("request_key").notNull(),
    endpoint: text("endpoint").notNull(),
    status: integer("status").notNull(),
    costMicro: integer("cost_micro"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("treg_usage_call_idx").on(table.callId),
    uniqueIndex("treg_usage_request_idx").on(table.requestKey),
    index("treg_usage_project_idx").on(table.projectId, table.createdAt),
    index("treg_usage_org_idx").on(table.organizationId),
  ],
);
