import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import CodingNightsFeature from "@/components/site/CodingNightsFeature";
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
    d: "Workshops, datathons and hackathons. Come with a question, leave with something you built.",
    to: "/events",
  },
  {
    t: "WoMENTORS",
    d: "Three months of one-to-one conversations with women working in technology.",
    to: "/about",
  },
  {
    t: "Community",
    d: "Meet students across disciplines, share what you know and find people to learn with.",
    to: "/membership",
  },
];

export default function Home() {
  return (
    <>
      {/* Main homepage with the interactive mesh. */}
      <section className="site-home-hero relative overflow-hidden border-b border-hairline">
        <div className="site-main-mesh absolute inset-0" aria-hidden="true"><HeroScene /></div>
        <div className="container-wit site-hero-composition relative">
          <div className="site-hero-copy">
            <p className="mono-eyebrow text-ink-soft">Women in Tech · Nanyang Technological University</p>
            <h1 className="site-home-title display mt-6 text-ink">
              <span className="block">The next generation</span>
              <span className="block">of <span className="italic text-primary-deep">tech leaders.</span></span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft md:text-lg">A student-led community for women in tech at NTU. Learn something new, build alongside friends and find your own way into the industry.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/coding-nights#register"
                className="inline-flex items-center gap-2 bg-ink text-background rounded-full px-5 py-3 text-sm font-semibold hover:bg-primary-deep transition-colors"
              >
                Explore Coding Nights <ArrowUpRight size={16} />
              </Link>
              <Link href="/membership" className="inline-flex items-center gap-2 px-2 py-3 text-sm font-semibold underline underline-offset-4 hover:text-primary-deep">Join WIT <ArrowUpRight size={16} /></Link>
            </div>
          </div>
        </div>
        <div className="container-wit site-hero-baseline"><span>Student-led. Across disciplines.</span><a href="#explore-wit">Explore WIT <span aria-hidden="true">↓</span></a></div>
      </section>

      <CodingNightsFeature />

      {/* STATS BENTO */}
      <section className="container-wit py-16 md:py-20">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="mono-eyebrow text-ink-soft text-xs">By the numbers</p>
            <h2 className="display text-3xl md:text-4xl mt-3 max-w-xl font-semibold">
              A community built by showing up.
            </h2>
          </div>
          <Link
            href="/about"
            className="hidden md:inline-flex items-center gap-1 text-xs font-medium hover:text-primary-deep"
          >
            About us <ArrowUpRight size={14} />
          </Link>
        </div>

        <dl className="site-statistics grid grid-cols-2 gap-x-8 gap-y-10 border-t border-hairline pt-8 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <dd className="display text-4xl md:text-5xl">{s.value}</dd>
              <dt className="mt-3 max-w-[24ch] text-sm text-ink-soft">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="container-wit border-y border-hairline py-9">
        <p className="mono-eyebrow text-ink-soft">People from across the industry have joined us</p>
        <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-soft">
          {PARTNERS.map((partner) => <li key={partner}>{partner}</li>)}
        </ul>
      </section>

      {/* WHAT WE DO */}
      <section id="explore-wit" className="site-explore container-wit scroll-mt-24 py-16 md:py-20 grid lg:grid-cols-12 gap-8 md:gap-10">
        <div className="lg:col-span-4">
          <p className="mono-eyebrow text-ink-soft text-xs">What we do</p>
          <h2 className="display text-3xl md:text-4xl mt-3 font-semibold">
            Find your
            <br />
            next thing.
          </h2>
        </div>
        <div className="lg:col-span-8 divide-y divide-black/10 border-y border-hairline">
          {PILLARS.map((c, index) => (
            <Link
              key={c.t}
              href={c.to}
              className="site-programme-link group relative block py-7 pr-10 transition-colors"
            >
              <span className="site-programme-number" aria-hidden="true">0{index + 1}</span>
              <div className="font-display text-2xl mb-3">{c.t}</div>
              <p className="text-sm text-ink-soft leading-relaxed">{c.d}</p>
              <ArrowUpRight
                size={28}
                className="site-programme-arrow absolute right-1 top-8 transition"
              />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
