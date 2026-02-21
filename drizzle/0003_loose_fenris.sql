DROP INDEX "submission_student_task_unique";--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "attempt_number" integer NOT NULL;