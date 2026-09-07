import Link from "next/link";
import PageHero from "@/components/site/PageHero";

import type { Metadata } from "next";

// Ported from the standalone site's Seo component, which set these by hand on
// every route change. Next renders them server-side, so crawlers see them.
export const metadata: Metadata = {
  title: { absolute: "About NTU Women in Tech | Women in STEM Singapore" },
  description: "Learn about NTU Women in Tech, a student community empowering women in technology and STEM through leadership, mentorship and inclusive opportunities.",
  keywords: ["NTU Women in Tech", "women in tech Singapore", "women in technology", "women in STEM", "female tech leaders", "NTU student club", "Nanyang Technological University", "Singapore tech community", "women in STEM Singapore", "diversity in tech", "female student leadership", "inclusive technology community"],
  alternates: { canonical: "/about" },
};


const STATS = [
  { v: "660+", l: "Beyond Binary Participants" },
  { v: "60.82%", l: "Female Participation" },
  { v: "25K+", l: "LinkedIn Impressions" },
  { v: "10K+", l: "Community Reached" },
  { v: "820+", l: "Telegram Members" },
];

const PILLARS = [
  {
    t: "Internal Governance",
    d: "Transparent operations, proper election procedures, full PDPA compliance and risk management across leadership.",
  },
  {
    t: "Mentorship — WoMENTORS",
    d: "Structured year-long pairing with industry mentors and senior alumni for career support.",
  },
  {
    t: "Advisor & Faculty Support",
    d: "Guided by Club Advisor Prof. Li Fang with formal NTU SAO endorsement for continued growth.",
  },
];

export default function About() {
  return (
    <>
      <PageHero
        tag="About"
        title={
          <>
            We&apos;re rewriting what{" "}
            <span className="italic text-primary-deep">tech leadership</span>{" "}
            looks like at NTU.
          </>
        }
        description="NTU Women in Tech is a non-constituent student club uniting students across SCSE, EEE, NBS and beyond. We organise hackathons, industry nights, mentorship and learning experiences that have grown participation significantly in two years."
      />

      {/* Stats Grid */}
      <section className="container-wit py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STATS.map((s, i) => (
            <div
              key={s.l}
              className={`p-4 md:p-5 rounded-lg border transition-all duration-300 ${
                i % 3 === 0
                  ? "bg-secondary/60 border-hairline"
                  : "bg-card border-hairline"
              } hover:shadow-soft`}
            >
              <div className="font-display text-2xl md:text-3xl font-semibold text-ink">
                {s.v}
              </div>
              <div className="mt-2 text-xs text-ink-soft leading-snug">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission & Governance */}
      <section className="bg-secondary/40 border-y border-hairline">
        <div className="container-wit py-12 md:py-16 grid lg:grid-cols-5 gap-8 md:gap-10">
          <div className="lg:col-span-2">
            <p className="mono-eyebrow text-ink-soft text-xs">
              Mission & governance
            </p>
            <h2 className="display text-3xl md:text-4xl mt-3 font-semibold">
              Built on integrity. Run with rigour.
            </h2>
            <p className="mt-4 text-sm text-ink-soft leading-relaxed">
              Every dollar accounted for. Every event documented. Every handover
              smooth. That&apos;s how we&apos;ve grown into a thriving community.
            </p>
          </div>
          <div className="lg:col-span-3 grid md:grid-cols-3 gap-4">
            {PILLARS.map((p) => (
              <div
                key={p.t}
                className="p-5 rounded-lg bg-background border border-hairline hover:shadow-soft transition-all duration-300"
              >
                <div className="font-display text-lg font-semibold text-ink">
                  {p.t}
                </div>
                <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                  {p.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor Quote */}
      <section className="container-wit py-12 md:py-16">
        <div className="max-w-4xl">
          <p className="mono-eyebrow text-ink-soft text-xs mb-4">
            Endorsed by faculty
          </p>
          <blockquote className="display text-2xl md:text-3xl leading-tight font-semibold">
            <span className="text-primary-deep">&quot;</span>
            NTU Women in Tech has demonstrated exceptional growth, governance
            and community impact.
            <span className="text-primary-deep">&quot;</span>
          </blockquote>
          <div className="mt-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-coral" />
            <div>
              <div className="font-semibold text-sm">Prof. Li Fang</div>
              <div className="text-xs text-ink-soft">Club Advisor · NTU</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 bg-ink text-background rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-primary-deep transition-colors"
          >
            See our events →
          </Link>
          <Link
            href="/recruit"
            className="inline-flex items-center gap-2 border border-ink rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-blush transition-colors"
          >
            Join WIT
          </Link>
        </div>
      </section>
    </>
  );
}
