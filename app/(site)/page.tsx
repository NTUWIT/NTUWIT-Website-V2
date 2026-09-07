import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import HeroScene from "@/components/site/HeroScene";

import type { Metadata } from "next";

// Ported from the standalone site's Seo component, which set these by hand on
// every route change. Next renders them server-side, so crawlers see them.
export const metadata: Metadata = {
  title: { absolute: "NTU Women in Tech | Women in Technology Community Singapore" },
  description: "NTU Women in Tech is a student-led women in technology community at NTU Singapore offering tech events, hackathons, mentorship and learning opportunities.",
  keywords: ["NTU Women in Tech", "women in tech Singapore", "women in technology", "women in STEM", "female tech leaders", "NTU student club", "Nanyang Technological University", "Singapore tech community", "tech mentorship", "student hackathons", "coding events", "diversity in technology"],
  alternates: { canonical: "/" },
};


const STATS = [
  { value: "660+", label: "Beyond Binary 2026 Participants" },
  { value: "60.82%", label: "Female Participation" },
  { value: "25K+", label: "LinkedIn Impressions" },
  { value: "Award", label: "Campus Life Award AY24/25" },
];

const PARTNERS = [
  "HP",
  "CyberArk",
  "Morgan Stanley",
  "Powers",
  "IMDA",
  "SquarePoint",
  "AWS",
  "SAP",
  "Sonos",
  "Microsoft",
  "EY",
  "AMD",
  "UBS",
  "WomenDevsSG",
];

const PILLARS = [
  {
    t: "Flagship Events",
    d: "Beyond Binary, Coding Nights, SheBuilds — high-impact for all of NTU.",
    to: "/events",
  },
  {
    t: "WoMENTORS",
    d: "Year-long mentorship pairing members with industry mentors and alumni.",
    to: "/about",
  },
  {
    t: "Community",
    d: "A 820+ Telegram channel and the launchpad for what's next.",
    to: "/projects",
  },
];

export default function Home() {
  return (
    <>
      {/* HERO — fullscreen interactive grid mesh */}
      <section className="relative overflow-hidden border-b border-hairline min-h-[88vh] flex items-center">
        <div className="absolute inset-0">
          <HeroScene />
        </div>
        <div
          className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10 pointer-events-none"
          aria-hidden
        />

        <div className="container-wit relative pt-24 md:pt-28 pb-14 md:pb-20 w-full">
          <div className="max-w-4xl fade-up">
            {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur border border-hairline mono-eyebrow text-[10px] text-ink-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> NTU · AY 2025/26
            </div> */}
            <h1 className="display text-4xl sm:text-5xl md:text-6xl lg:text-7xl mt-6 text-ink">
              The{" "}
              <span className="italic text-primary-deep">next generation</span>
              <br />
              of tech leaders.
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/beyond-binary"
                className="inline-flex items-center gap-2 bg-ink text-background rounded-full px-5 py-3 text-sm font-semibold hover:bg-primary-deep hover:text-ink transition-colors"
              >
                See Beyond Binary <ArrowUpRight size={16} />
              </Link>
              <Link
                href="/recruit#recruitment-form"
                className="inline-flex items-center gap-2 border border-ink rounded-full px-5 py-3 text-sm font-semibold hover:bg-blush transition-colors"
              >
                Join the club
              </Link>
              <a
                href="https://forms.cloud.microsoft/r/9bnx8G5Hqx"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-ink rounded-full px-5 py-3 text-sm font-semibold hover:bg-blush transition-colors"
              >
                Membership Registration
              </a>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg">
              {[
                { v: "660+", l: "Hackers" },
                { v: "820+", l: "Community" },
                { v: "8.7×", l: "2-yr growth" },
              ].map((s) => (
                <div key={s.l} className="border-t border-ink/20 pt-3">
                  <div className="display text-2xl md:text-3xl text-ink">
                    {s.v}
                  </div>
                  <div className="mono-eyebrow text-[9px] text-ink-soft mt-1">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS BENTO */}
      <section className="container-wit py-16 md:py-20">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="mono-eyebrow text-ink-soft text-xs">By the numbers</p>
            <h2 className="display text-3xl md:text-4xl mt-3 max-w-xl font-semibold">
              A year of reach, rigour and recognition.
            </h2>
          </div>
          <Link
            href="/about"
            className="hidden md:inline-flex items-center gap-1 text-xs font-medium hover:text-primary-deep"
          >
            About us <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className={`group relative p-5 md:p-6 rounded-lg border transition-all duration-300 hover:shadow-soft ${
                i === 0
                  ? "lg:col-span-2 bg-secondary/60 border-hairline"
                  : i === 3
                    ? "bg-secondary/40 border-hairline"
                    : "border-hairline bg-card"
              }`}
            >
              <div className="font-display text-3xl md:text-4xl font-semibold text-ink">
                {s.value}
              </div>
              <div className="mt-2 text-xs text-ink-soft leading-snug max-w-[20ch]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PARTNERS MARQUEE */}
      <section className="border-y border-hairline py-8 md:py-10 overflow-hidden bg-secondary/40">
        <p className="container-wit mono-eyebrow text-ink-soft text-xs mb-4">
          Industry partners & judges
        </p>
        <div className="relative">
          <div className="flex marquee gap-12 whitespace-nowrap px-container-wit">
            {[...PARTNERS, ...PARTNERS].map((p, i) => (
              <span
                key={i}
                className="font-display text-xl md:text-2xl text-ink-soft hover:text-ink transition-colors"
              >
                {p}{" "}
                <span
                  className="mx-3 inline-block h-4 w-px bg-primary/40 align-middle"
                  aria-hidden="true"
                />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="container-wit py-16 md:py-20 grid lg:grid-cols-12 gap-8 md:gap-10">
        <div className="lg:col-span-4">
          <p className="mono-eyebrow text-ink-soft text-xs">What we do</p>
          <h2 className="display text-3xl md:text-4xl mt-3 font-semibold">
            Three pillars.
            <br />
            One mission.
          </h2>
        </div>
        <div className="lg:col-span-8 grid sm:grid-cols-3 gap-4">
          {PILLARS.map((c) => (
            <Link
              key={c.t}
              href={c.to}
              className="group p-6 rounded-lg border border-hairline bg-card hover:bg-secondary/60 hover:shadow-soft transition-all duration-300"
            >
              <div className="font-display text-xl mb-3">{c.t}</div>
              <p className="text-sm text-ink-soft leading-relaxed">{c.d}</p>
              <ArrowUpRight
                size={18}
                className="mt-6 opacity-40 group-hover:opacity-100 group-hover:text-primary-deep transition"
              />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
