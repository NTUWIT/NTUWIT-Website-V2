import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PageHero from "@/components/site/PageHero";

import type { Metadata } from "next";

// Ported from the standalone site's Seo component, which set these by hand on
// every route change. Next renders them server-side, so crawlers see them.
export const metadata: Metadata = {
  title: { absolute: "Women in Tech Events at NTU Singapore | NTU WIT" },
  description: "Explore NTU Women in Tech events, including coding workshops, industry networking, mentorship, hackathons and community programmes for students.",
  keywords: ["NTU Women in Tech", "women in tech Singapore", "women in technology", "women in STEM", "female tech leaders", "NTU student club", "Nanyang Technological University", "Singapore tech community", "women in tech events Singapore", "coding workshops NTU", "tech networking", "student mentorship", "technology events"],
  alternates: { canonical: "/events" },
};


type WitEvent = {
  name: string;
  tag: string;
  desc: string;
  cta?: { label: string; to: string };
  partners?: string[];
};

const FLAGSHIP: WitEvent[] = [
  {
    name: "Beyond Binary 2026",
    tag: "Flagship Hackathon",
    desc: "Our signature 2-day hackathon. 660 participants, $10K prize pool, judges from Meta, NVIDIA, Microsoft, Amazon, Jane Street.",
    cta: { label: "See the highlights", to: "/beyond-binary" },
  },
  {
    name: "Coding Nights 2.0",
    tag: "Industry Series",
    desc: "Two-night technical & career series with engineers from Amazon, PayPal, Morgan Stanley and Microsoft.",
    // partners: ["Amazon", "PayPal", "Morgan Stanley", "Microsoft"],
  },
  {
    name: "WoMENTORS",
    tag: "Mentorship Programme",
    desc: "Our flagship year-long mentorship: members are paired with industry mentors and senior alumni for resume reviews, mock interviews and career navigation.",
    // partners: ["Meta", "NVIDIA", "Amazon", "Jane Street", "Microsoft"],
  },
  {
    name: "SheBuilds",
    tag: "Build Workshop",
    desc: "Hands-on build sessions where members ship a working prototype start-to-finish in one evening.",
  },
  {
    name: "SheLearns — Agentic AI & Finance",
    tag: "Learning Track",
    desc: "Curated talks and workshops on the topics shaping tech: Agentic AI systems and quantitative finance.",
  },
];

const INTERNAL = [
  {
    name: "Alumni Mentorship",
    desc: "Year-long pairing with WIT alumni now at top tech companies.",
  },
  {
    name: "Resume & LinkedIn Reviews",
    desc: "1:1 reviews with mentors and seniors, ahead of recruiting season.",
  },
  {
    name: "Autodesk Office Visit",
    desc: "Behind-the-scenes look at one of Singapore's most innovative tech offices.",
  },
];

export default function Events() {
  return (
    <>
      <PageHero
        tag="Events"
        title={
          <>
            Events that <span className="italic text-primary-deep">scale</span>.
            Communities that{" "}
            <span className="italic text-primary-deep">stick</span>.
          </>
        }
        description="We split our calendar in two: flagship events that broadcast WIT to all of NTU, and internal programs that level up our members directly."
      />

      <section className="container-wit py-12 md:py-16">
        <div className="flex items-baseline gap-3 mb-8">
          <span className="w-6 h-px bg-ink-soft" />
          <p className="mono-eyebrow text-ink-soft text-xs">
            Flagship · External
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {FLAGSHIP.map((e, i) => (
            <article
              key={e.name}
              className={`relative p-6 md:p-8 rounded-lg border transition-all duration-300 ${
                i === 0
                  ? "md:col-span-2 bg-secondary/40 border-hairline hover:shadow-soft hover:border-primary/30"
                  : "bg-card border-hairline hover:border-primary/20 hover:bg-card hover:shadow-soft"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="mono-eyebrow text-ink-soft text-xs">
                  {e.tag}
                </span>
                {e.cta && (
                  <Link
                    href={e.cta.to}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-deep hover:text-primary transition-colors"
                  >
                    {e.cta.label} <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>
              <h3
                className={`font-display text-ink font-semibold ${i === 0 ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl"}`}
              >
                {e.name}
              </h3>
              <p
                className={`mt-3 max-w-2xl leading-relaxed text-ink-soft ${i === 0 ? "text-base" : "text-sm"}`}
              >
                {e.desc}
              </p>
              {e.partners && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {e.partners.map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 rounded-lg bg-background border border-hairline text-xs font-medium text-ink-soft"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="container-wit py-12 md:py-16">
        <div className="flex items-baseline gap-3 mb-8">
          <span className="w-6 h-px bg-ink-soft" />
          <p className="mono-eyebrow text-ink-soft text-xs">
            Internal · For members
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {INTERNAL.map((e) => (
            <div
              key={e.name}
              className="p-6 rounded-lg bg-secondary/50 border border-hairline hover:shadow-soft transition-all duration-300"
            >
              <h3 className="font-display text-xl font-semibold text-ink">
                {e.name}
              </h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                {e.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
