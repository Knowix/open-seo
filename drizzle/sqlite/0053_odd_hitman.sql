CREATE TABLE `treg_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`project_id` text,
	`call_id` text,
	`request_key` text NOT NULL,
	`endpoint` text NOT NULL,
	`status` integer NOT NULL,
	`cost_micro` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `treg_usage_call_idx` ON `treg_usage` (`call_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `treg_usage_request_idx` ON `treg_usage` (`request_key`);--> statement-breakpoint
CREATE INDEX `treg_usage_project_idx` ON `treg_usage` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `treg_usage_org_idx` ON `treg_usage` (`organization_id`);