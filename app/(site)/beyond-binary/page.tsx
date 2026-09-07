import { ArrowUpRight } from "lucide-react";
import PageHero from "@/components/site/PageHero";

import type { Metadata } from "next";

// Ported from the standalone site's Seo component, which set these by hand on
// every route change. Next renders them server-side, so crawlers see them.
export const metadata: Metadata = {
  title: { absolute: "Beyond Binary Hackathon Singapore | NTU Women in Tech" },
  description: "Discover Beyond Binary, NTU Women in Tech's student-run Singapore hackathon championing women, innovation, inclusive technology and emerging tech talent.",
  keywords: ["NTU Women in Tech", "women in tech Singapore", "women in technology", "women in STEM", "female tech leaders", "NTU student club", "Nanyang Technological University", "Singapore tech community", "Beyond Binary hackathon", "hackathon Singapore", "women hackathon", "student innovation", "inclusive technology"],
  alternates: { canonical: "/beyond-binary" },
};


const HERO_STATS = [
  { v: "660", l: "Total Participants" },
  { v: "174", l: "Non-NTU Attendees" },
  { v: "$10K", l: "Prize Pool" },
  { v: "8.7×", l: "vs 2024" },
];

const JUDGES = [
  "Meta",
  "NVIDIA",
  "Microsoft",
  "Amazon",
  "Jane Street",
  "IMDA",
  "Squarepoint",
  "AWS",
  "Sonos",
  "SAP",
  "AMD",
  "EY",
  "UBS",
  "Autodesk",
];

const TIMELINE = [
  { y: "2024", n: "76", l: "registrations · pilot" },
  { y: "2025", n: "240", l: "registrations · refined" },
  { y: "2026", n: "660", l: "registrations · national" },
];

export default function BeyondBinary() {
  return (
    <>
      <PageHero
        tag="Flagship Event · AY 2025/26"
        title={
          <>
            Beyond <span className="italic text-primary-deep">Binary</span> 2026
          </>
        }
        description="Singapore's largest student-run hackathon centred on women in tech — 660 participants, $10K prize pool, judged by engineers from Meta, NVIDIA, Microsoft and Jane Street."
      />

      {/* Stats Grid */}
      <section className="container-wit py-12 md:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {HERO_STATS.map((s) => (
            <div
              key={s.l}
              className="p-5 md:p-6 rounded-lg border border-hairline bg-card hover:shadow-soft transition-all duration-300"
            >
              <div className="font-display text-3xl md:text-4xl font-semibold text-primary-deep">
                {s.v}
              </div>
              <div className="mt-2 text-xs text-ink-soft leading-snug">
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <a
            href="https://ntubeyondbinary.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-ink text-background rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-primary-deep transition-colors"
          >
            Visit ntubeyondbinary.com <ArrowUpRight size={14} />
          </a>
        </div>
      </section>

      {/* Judges Marquee */}
      <section className="border-b border-hairline py-8 md:py-10 overflow-hidden bg-secondary/40">
        <p className="container-wit mono-eyebrow text-ink-soft text-xs mb-4">
          Judging Panel · AY 2025/26
        </p>
        <div className="flex marquee gap-12 whitespace-nowrap">
          {[...JUDGES, ...JUDGES, ...JUDGES].map((j, i) => (
            <span
              key={i}
              className="font-display text-xl md:text-2xl text-ink-soft hover:text-ink transition-colors"
            >
              {j}{" "}
              <span
                className="mx-3 inline-block h-4 w-px bg-primary/40 align-middle"
                aria-hidden="true"
              />
            </span>
          ))}
        </div>
      </section>

      {/* Growth Timeline */}
      <section className="container-wit py-12 md:py-16">
        <div className="grid lg:grid-cols-5 gap-8 md:gap-10">
          <div className="lg:col-span-2">
            <p className="mono-eyebrow text-ink-soft text-xs">Legacy</p>
            <h2 className="display text-3xl md:text-4xl mt-3 font-semibold">
              From 76 to 660 in two years.
            </h2>
            <p className="mt-4 text-sm text-ink-soft leading-relaxed">
              Each edition compounded with new formats, deeper partnerships and
              broader reach.
            </p>
          </div>
          <div className="lg:col-span-3 grid md:grid-cols-3 gap-4">
            {TIMELINE.map((t, i) => (
              <div
                key={t.y}
                className={`p-5 rounded-lg border transition-all duration-300 ${i === 2 ? "bg-secondary/60 border-hairline" : "border-hairline bg-card hover:shadow-soft"}`}
              >
                <div className="mono-eyebrow text-ink-soft text-xs">{t.y}</div>
                <div className="display text-3xl md:text-4xl font-semibold mt-3 text-ink">
                  {t.n}
                </div>
                <div className="mt-2 text-xs text-ink-soft leading-snug">
                  {t.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact */}
      <section className="bg-secondary/40 border-y border-hairline">
        <div className="container-wit py-12 md:py-16">
          <p className="mono-eyebrow text-ink-soft text-xs">
            Impact & recognition
          </p>
          <h2 className="display text-3xl md:text-4xl mt-3 max-w-3xl font-semibold">
            Recognised by NTU leadership and shared across LinkedIn.
          </h2>

          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <div className="p-6 rounded-lg bg-background border border-hairline hover:shadow-soft transition-all duration-300">
              <div className="font-display text-2xl font-semibold">25K+</div>
              <p className="mono-eyebrow text-ink-soft mt-2 text-xs">
                LinkedIn Impressions
              </p>
              <p className="mt-3 text-sm text-ink-soft leading-relaxed">
                Coverage spanning the NTU President&apos;s recognition, participant
                testimonials and partner shares.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-secondary/60 border border-hairline hover:shadow-soft transition-all duration-300">
              <div className="font-display text-2xl font-semibold text-primary-deep">
                Campus Life Award
              </div>
              <p className="mono-eyebrow text-ink-soft mt-2 text-xs">
                AY 2024/25 Winner
              </p>
              <p className="mt-3 text-sm text-ink-soft leading-relaxed">
                NTU&apos;s recognition for clubs that meaningfully shape student
                life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-wit py-12 md:py-16">
        <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
          <div>
            <p className="mono-eyebrow text-ink-soft text-xs">In their words</p>
            <h2 className="display text-3xl md:text-4xl mt-3 max-w-2xl font-semibold">
              What our sponsors and judges said.
            </h2>
          </div>
          <p className="text-xs text-ink-soft max-w-xs">
            Direct feedback collected via post-event survey, April 2026.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {[
            {
              company: "Squarepoint Capital",
              score: "4 / 5",
              quote:
                "The variety of tracks students could choose from, paired with the clear effort of the organising team, really stood out.",
            },
            {
              company: "Amazon Web Services",
              score: "5 / 5",
              quote:
                "Participants engaged deeply with the content and showed a genuine desire to learn. The WiT team was incredibly accommodating and a pleasure to work with — it was lovely partnering with NTU WiT.",
              featured: true,
            },
            {
              company: "IMDA",
              score: "4 / 5",
              quote:
                "Strong interest and participation, especially among female students, supported by the clear passion and leadership of the NTU WiT team. Beyond Binary is meaningful and aligned with IMDA SGWIT's mission to empower young women in tech.",
            },
          ].map((t) => (
            <article
              key={t.company}
              className={`p-6 md:p-7 rounded-lg border flex flex-col transition-all duration-300 ${
                t.featured
                  ? "bg-blush/80 border-blush-strong shadow-soft"
                  : "bg-card border-hairline hover:shadow-soft"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="mono-eyebrow text-[10px] text-ink-soft">
                    {t.company}
                  </div>
                  <div className="mt-2 text-xs text-ink-soft">
                    Partner feedback
                  </div>
                </div>
                <div
                  className="shrink-0 rounded-full border border-hairline bg-background px-3 py-1 text-[11px] font-medium text-ink-soft"
                  aria-label={`${t.score} survey score`}
                >
                  {t.score}
                </div>
              </div>
              <blockquote className="text-sm md:text-[15px] leading-relaxed flex-1 text-ink">
                <span className="text-primary-deep">&quot;</span>
                {t.quote}
                <span className="text-primary-deep">&quot;</span>
              </blockquote>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
