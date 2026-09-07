CREATE TABLE "problem_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_settings" ADD COLUMN "active_set_id" uuid;--> statement-breakpoint
ALTER TABLE "event_settings" ADD COLUMN "active_problem_id" uuid;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "set_id" uuid;--> statement-breakpoint
ALTER TABLE "event_settings" ADD CONSTRAINT "event_settings_active_set_id_problem_sets_id_fk" FOREIGN KEY ("active_set_id") REFERENCES "public"."problem_sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_settings" ADD CONSTRAINT "event_settings_active_problem_id_problems_id_fk" FOREIGN KEY ("active_problem_id") REFERENCES "public"."problems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_set_id_problem_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."problem_sets"("id") ON DELETE set null ON UPDATE no action;