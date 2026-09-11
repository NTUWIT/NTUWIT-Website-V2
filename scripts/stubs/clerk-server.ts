/**
 * Stands in for `@clerk/nextjs/server` when a script calls the admin server
 * actions directly. Only the session lookup is replaced: the actions' own
 * guard still runs and still reads the role from here, so a script can prove
 * a non-admin is refused before it acts as an admin.
 *
 * Wired in by scripts/tsconfig.load.json. The app never resolves this file.
 */
export const stubSession = { role: "admin" as "admin" | "member" };

export async function auth() {
  return { userId: "problem-bank-loader" };
}

export async function clerkClient() {
  return {
    users: {
      getUser: async () => ({ publicMetadata: { role: stubSession.role } }),
    },
  };
}
