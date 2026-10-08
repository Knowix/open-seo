CREATE TABLE "treg_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text,
	"call_id" text,
	"request_key" text NOT NULL,
	"endpoint" text NOT NULL,
	"status" integer NOT NULL,
	"cost_micro" integer,
	"created_at" text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "treg_usage" ADD CONSTRAINT "treg_usage_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treg_usage" ADD CONSTRAINT "treg_usage_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "treg_usage_call_idx" ON "treg_usage" USING btree ("call_id");--> statement-breakpoint
CREATE UNIQUE INDEX "treg_usage_request_idx" ON "treg_usage" USING btree ("request_key");--> statement-breakpoint
CREATE INDEX "treg_usage_project_idx" ON "treg_usage" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "treg_usage_org_idx" ON "treg_usage" USING btree ("organization_id");