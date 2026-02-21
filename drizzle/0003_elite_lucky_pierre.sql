CREATE TYPE "public"."notification_preference" AS ENUM('all', 'weekly_summary', 'none');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('practice_complete', 'weekly_summary');--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"notification_type" "notification_type" NOT NULL,
	"sent_to" varchar(255) NOT NULL,
	"metadata" jsonb,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "parent_email" varchar(255);--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "notification_preference" "notification_preference" DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;