CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "task_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekly_task_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_notifications" ADD CONSTRAINT "task_notifications_weekly_task_id_weekly_tasks_id_fk" FOREIGN KEY ("weekly_task_id") REFERENCES "public"."weekly_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_notifications" ADD CONSTRAINT "task_notifications_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;