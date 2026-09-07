CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"difficulty" text NOT NULL,
	"statement_md" text NOT NULL,
	"time_limit_ms" integer DEFAULT 3000 NOT NULL,
	"memory_limit_kb" integer DEFAULT 131072 NOT NULL,
	"starter_code" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"points" integer DEFAULT 100 NOT NULL,
	"visible_from" timestamp with time zone,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"user_id" text NOT NULL,
	"problem_id" uuid NOT NULL,
	"best_score" integer NOT NULL,
	"first_solved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scores_user_id_problem_id_pk" PRIMARY KEY("user_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"problem_id" uuid NOT NULL,
	"language" text NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"runtime_ms" integer DEFAULT 0 NOT NULL,
	"passed_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid NOT NULL,
	"stdin" text NOT NULL,
	"expected_stdout" text NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "problems_slug_idx" ON "problems" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "scores_problem_idx" ON "scores" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "submissions_user_problem_idx" ON "submissions" USING btree ("user_id","problem_id");--> statement-breakpoint
CREATE INDEX "test_cases_problem_idx" ON "test_cases" USING btree ("problem_id");