-- Existing rows predate the column; the seed rewrites every problem straight
-- after, so a throwaway default is enough to get the constraint on.
ALTER TABLE "problems" ADD COLUMN "signature" jsonb NOT NULL DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "signature" DROP DEFAULT;
