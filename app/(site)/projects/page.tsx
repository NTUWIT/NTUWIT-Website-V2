import PageHero from "@/components/site/PageHero";

import type { Metadata } from "next";

// Ported from the standalone site's Seo component, which set these by hand on
// every route change. Next renders them server-side, so crawlers see them.
export const metadata: Metadata = {
  title: { absolute: "Technology Projects | NTU Women in Tech Singapore" },
  description: "Explore technology projects by the NTU Women in Tech community, where students build practical skills, collaborate and create meaningful solutions.",
  keywords: ["NTU Women in Tech", "women in tech Singapore", "women in technology", "women in STEM", "female tech leaders", "NTU student club", "Nanyang Technological University", "Singapore tech community", "student technology projects", "women developers", "collaborative coding", "tech portfolio", "student builders"],
  alternates: { canonical: "/projects" },
};


const TRACKS = [
  {
    tag: "Hack Series",
    title: "Mini-Hacks",
    desc: "Monthly weekend builds — small teams ship a working prototype on a tight theme.",
  },
  {
    tag: "Research",
    title: "Applied AI Group",
    desc: "Reading group + build sessions exploring agentic AI systems and applied ML in finance.",
  },
];

export default function Projects() {
  return (
    <>
      <PageHero
        tag="Projects"
        title="Something extraordinary is being built."
        description="Our project tracks turn the WIT community into shipping engineers. We're structuring three build streams for AY 26/27 — drop in below or join the Telegram."
      />

      {/* Launch Timeline */}
      <section className="container-wit py-12 md:py-16">
        <div className="relative overflow-hidden rounded-lg bg-secondary/60 border border-hairline p-6 md:p-8">
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background/70 backdrop-blur mono-eyebrow text-xs text-primary-deep">
              <span className="w-1 h-1 rounded-full bg-primary-deep animate-pulse" />{" "}
              Stay tuned
            </div>
            <h2 className="display text-2xl md:text-3xl mt-4 max-w-3xl font-semibold text-ink">
              Project tracks launching{" "}
              <span className="italic text-primary-deep">AY 26/27</span>.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-ink-soft leading-relaxed">
              We&apos;re moving from event-only to event + build. Structured tracks
              where members ship real things together.
            </p>
            <a
              href="https://t.me/ntu_women_in_tech"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 bg-ink text-background rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-primary-deep hover:text-ink transition-colors"
            >
              Join Telegram for updates →
            </a>
          </div>
        </div>
      </section>

      {/* Planned Tracks */}
      <section className="container-wit py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-4">
          {TRACKS.map((t) => (
            <div
              key={t.title}
              className="p-6 rounded-lg border border-hairline bg-card hover:shadow-soft transition-all duration-300"
            >
              <div className="mono-eyebrow text-primary-deep text-xs">
                {t.tag}
              </div>
              <h3 className="font-display text-xl md:text-2xl mt-3 font-semibold">
                {t.title}
              </h3>
              <p className="mt-3 text-sm text-ink-soft leading-relaxed">
                {t.desc}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs mono-eyebrow text-ink-soft">
                <span className="w-1 h-1 rounded-full bg-accent" /> Coming AY
                26/27
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
