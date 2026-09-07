// Seeds problems and test cases. Safe to re-run: existing problems are updated
// in place and their test cases replaced, so no duplicates accumulate.
// Run with: yarn seed
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { problemSets, problems, testCases } from "@/lib/db/schema";
import { setActiveSelection } from "@/lib/db/queries";
import { SEED_PROBLEMS } from "@/lib/seed/problems";

const SET_NAME = "Warm-up";

async function main() {
  // Seeded problems land in one set, which is then activated, so a fresh
  // database is immediately usable. Problems added through the console start
  // outside any set and stay invisible until an admin activates them.
  const [existing] = await db
    .select({ id: problemSets.id })
    .from(problemSets)
    .where(eq(problemSets.name, SET_NAME))
    .limit(1);

  const setId =
    existing?.id ??
    (
      await db
        .insert(problemSets)
        .values({ name: SET_NAME, description: "Seeded practice problems.", order: 0 })
        .returning({ id: problemSets.id })
    )[0]!.id;

  for (const seed of SEED_PROBLEMS) {
    const { tests, ...fields } = seed;

    // `visibleFrom` gates what participants can open, so seeded problems are
    // launched immediately: the seed exists to give a fresh database something
    // usable. Problems added through the admin console start as drafts.
    const values = { ...fields, setId };

    const [row] = await db
      .insert(problems)
      .values(values)
      .onConflictDoUpdate({ target: problems.slug, set: values })
      .returning({ id: problems.id });

    if (!row) throw new Error(`failed to upsert problem ${seed.slug}`);

    await db.delete(testCases).where(eq(testCases.problemId, row.id));
    await db.insert(testCases).values(
      tests.map((test, order) => ({ ...test, problemId: row.id, order })),
    );

    console.log(`seeded ${seed.slug} (${tests.length} tests)`);
  }
  await setActiveSelection({ setId, problemId: null, endsAt: null });
  console.log(`done: ${SEED_PROBLEMS.length} problems in "${SET_NAME}", now active`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
