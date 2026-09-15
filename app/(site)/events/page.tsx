import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import CodingNightsFeature from "@/components/site/CodingNightsFeature";
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
    name: "Coding Nights 2026",
    tag: "12 & 19 October · 6–9 PM",
    desc: "A DSA workshop, timed online assessment and mock technical interviews with experienced mentors. Open to all genders and courses; dinner provided on both nights.",
    cta: { label: "Details & sign up", to: "/coding-nights" },
  },
  {
    name: "WoMENTORS",
    tag: "Mentorship Programme",
    desc: "A three-month mentorship programme connecting students with experienced women in technology for career guidance and one-to-one conversations.",
    // partners: ["Meta", "NVIDIA", "Amazon", "Jane Street", "Microsoft"],
  },
  {
    name: "SheBuilds",
    tag: "Datathon",
    desc: "A beginner-friendly datathon where students explore real-world problems through data, teamwork and presentations.",
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
    desc: "1:1 reviews with mentors and seniors, to prepare for job applications.",
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
            Make time for <span className="italic text-primary-deep">something new.</span>
          </>
        }
        description="Get hands-on with code, work through an idea with a team, or talk to someone who has been where you are. Explore our workshops, competitions and mentorship programmes."
      />

      <CodingNightsFeature />

      <section className="container-wit py-12 md:py-16">
        <div className="flex items-baseline gap-3 mb-8">
          <span className="w-6 h-px bg-ink-soft" />
          <p className="mono-eyebrow text-ink-soft text-xs">
            Our programmes
          </p>
        </div>
        <div className="site-event-list">
          {FLAGSHIP.map((e) => (
            <article
              key={e.name}
              className="site-event-row"
            >
              <div className="site-event-meta flex flex-wrap items-start justify-between gap-4 mb-4">
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
                className="font-display text-ink text-3xl md:text-4xl"
              >
                {e.name}
              </h3>
              <p
                className="mt-3 max-w-2xl leading-relaxed text-ink-soft text-sm"
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
              className="border-t border-hairline py-6"
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
