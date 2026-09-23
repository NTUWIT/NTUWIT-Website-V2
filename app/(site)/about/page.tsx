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
  { t: "Learn by doing", d: "Build practical skills through Coding Nights and the SheLearns workshop series, from coding fundamentals to interview preparation." },
  { t: "Create together", d: "Explore real-world problems through data at SheBuilds, or turn an idea into a solution at the Beyond Binary hackathon and ideathon." },
  { t: "Grow with guidance", d: "woMENTORS connects students with experienced women in technology for three months of one-to-one mentorship and career conversations." },
];

const COMMITTEE = [
  { role: "President", name: "Rishika" },
  { role: "Vice President (External)", name: "Khanak" },
  { role: "Vice President (Internal)", name: "Divisha" },
  { role: "Vice President (Academics)", name: "Saba" },
  { role: "Treasurer", name: "Kashvi" },
  { role: "Honorary General Secretary", name: "Gwen" },
  { role: "Events Director (Corporate)", name: "Khushi" },
  { role: "Events Director (Community)", name: "Tricia" },
  { role: "Business Management Director", name: "Maanya & Nikitha" },
  { role: "Marketing Director", name: "Devanshi" },
  { role: "Logistics Director", name: "Sushmitha" },
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
        description="NTU Women in Tech is a student-led community empowering women in STEM through learning, mentorship and industry engagement. Across disciplines and experience levels, we create opportunities to build skills, meet people and explore a future in technology."
      />

      {/* Stats Grid */}
      <section className="container-wit py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STATS.map((s) => (
            <div
              key={s.l}
              className="border-t border-hairline py-5"
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
              Our community
            </p>
            <h2 className="display text-3xl md:text-4xl mt-3 font-semibold">
              A place to learn, build and belong.
            </h2>
            <p className="mt-4 text-sm text-ink-soft leading-relaxed">
              From your first workshop to your next technical interview, there is
              room to ask questions, try something new and grow alongside others.
            </p>
          </div>
          <div className="lg:col-span-3 grid md:grid-cols-3 gap-4">
            {PILLARS.map((p) => (
              <div
                key={p.t}
                className="border-t border-hairline py-5"
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

      <section id="committee" className="container-wit scroll-mt-24 py-12 md:py-16" aria-labelledby="committee-title">
        <p className="mono-eyebrow text-xs text-ink-soft">The people behind WIT</p>
        <h2 id="committee-title" className="display mt-3 text-3xl font-semibold md:text-4xl">Meet the committee.</h2>
        <p className="mt-3 text-sm text-ink-soft">Academic year 2026–2027</p>
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          {[{ title: "Executive committee", members: COMMITTEE.slice(0, 6) }, { title: "Directors", members: COMMITTEE.slice(6) }].map(({ title, members }) => (
            <div key={title} className="border-t border-ink">
              <h3 className="border-b border-hairline py-5 text-sm font-semibold">{title}</h3>
              <dl className="divide-y divide-black/10">
                {members.map(({ role, name }) => (
                  <div key={role} className="grid gap-2 py-5 sm:grid-cols-[1.3fr_1fr] sm:items-center sm:gap-5">
                    <dt className="text-sm leading-relaxed text-ink-soft">{role}</dt>
                    <dd className="font-display text-xl font-semibold text-ink">{name}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
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
            href="/membership"
            className="inline-flex items-center gap-2 border border-ink rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-blush transition-colors"
          >
            Join WIT
          </Link>
        </div>
      </section>
    </>
  );
}
