import type { MetadataRoute } from "next";

/**
 * Generated rather than hand-maintained: the old static public/sitemap.xml had
 * to be edited by hand whenever a route changed, and silently went stale.
 *
 * Only the public marketing routes belong here. /ide and /leaderboard are
 * signed-in surfaces and are marked noindex on the pages themselves.
 */
const SITE_URL = "https://www.ntuwit.com";

const ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1.0 },
  { path: "/events", priority: 0.9 },
  { path: "/beyond-binary", priority: 0.9 },
  { path: "/about", priority: 0.8 },
  { path: "/recruit", priority: 0.8 },
  { path: "/projects", priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
  }));
}
