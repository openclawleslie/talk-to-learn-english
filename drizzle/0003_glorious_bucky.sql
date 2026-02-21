CREATE TABLE "curriculum_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_item_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_item_id" uuid NOT NULL,
	"curriculum_tag_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_item_tags" ADD CONSTRAINT "task_item_tags_task_item_id_task_items_id_fk" FOREIGN KEY ("task_item_id") REFERENCES "public"."task_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_item_tags" ADD CONSTRAINT "task_item_tags_curriculum_tag_id_curriculum_tags_id_fk" FOREIGN KEY ("curriculum_tag_id") REFERENCES "public"."curriculum_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_item_tag_unique" ON "task_item_tags" USING btree ("task_item_id","curriculum_tag_id");