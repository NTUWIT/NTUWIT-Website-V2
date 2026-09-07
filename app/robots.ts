import type { MetadataRoute } from "next";

const SITE_URL = "https://www.ntuwit.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // The event surfaces are for signed-in participants and carry no public
      // content worth indexing; the API is not a page at all.
      { userAgent: "*", allow: "/", disallow: ["/ide", "/leaderboard", "/admin", "/api/"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
