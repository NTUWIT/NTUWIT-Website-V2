import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CODING_NIGHTS_FORM } from "@/components/site/CodingNightsFeature";
import HeroScene from "@/components/site/HeroScene";

export const metadata: Metadata = {
  title: "Coding Nights 2026",
  description:
    "Join NTU WIT and IEEE NTU on 12 and 19 October 2026, 6–9 PM, for a DSA workshop, an online assessment and mock interviews. Open to all genders and courses.",
  alternates: { canonical: "/coding-nights" },

};

const NIGHTS = [
  {
    number: "01",
    date: "12 October",
    iso: "2026-10-12",
    title: "Dive into DSA",
    description:
      "Build your foundations in data structures and algorithms with a workshop and time for your questions.",
    items: ["Dinner", "Introduction", "DSA workshop", "Q&A", "Closing"],
  },
  {
    number: "02",
    date: "19 October",
    iso: "2026-10-19",
    title: "Put it into practice",
    description:
      "Challenge yourself with a timed online assessment, then practise a technical interview with experienced mentors.",
    items: ["Dinner", "Welcome", "Online assessment", "Mock interviews"],
  },
];

export default function CodingNightsPage() {
  return (
    <>
      <section className="coding-nights-campaign cn-hero border-b border-hairline">
        <div className="site-main-mesh absolute inset-0" aria-hidden="true"><HeroScene /></div>
        <div className="container-wit relative z-10 grid items-center gap-10 py-12 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <p className="cn-eyebrow">NTU WIT × IEEE NTU Student Branch</p>
            <h1 className="cn-title mt-6 text-5xl sm:text-7xl xl:text-8xl">
              Coding
              <br />
              Nights
            </h1>
            <p className="mt-6 text-xl font-semibold sm:text-2xl">
              Level up your interview game.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed">
              From learning the fundamentals to thinking on your feet. Join us
              for two evenings of code, community and interview practice.
            </p>
            <dl className="mt-7 grid grid-cols-2 gap-5 border-y border-current/20 py-5 text-sm">
              <div>
                <dt className="cn-eyebrow">When</dt>
                <dd className="mt-2 font-semibold">
                  12 & 19 October 2026
                  <br />
                  6–9 PM on both nights
                </dd>
              </div>
              <div>
                <dt className="cn-eyebrow">Who can join</dt>
                <dd className="mt-2 font-semibold">
                  All genders.
                  <br />
                  All courses.
                </dd>
              </div>
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#register" className="cn-button">
                Sign up now <ArrowUpRight size={16} />
              </a>
              <a href="#schedule" className="cn-button cn-button-secondary">
                See the schedule ↓
              </a>
            </div>
            <p className="mt-4 text-sm">Dinner is provided on both days.</p>
          </div>
          <div className="border-y border-current/20 py-8 sm:py-10">
            <p className="cn-eyebrow">Two evenings. Room to grow.</p>
            <ol className="mt-8 space-y-8">
              {[
                ["01", "Learn the fundamentals", "Explore data structures and algorithms in a hands-on workshop."],
                ["02", "Put your skills to work", "Think through a timed online assessment at your own keyboard."],
                ["03", "Talk through your approach", "Practise technical interviews with experienced mentors."],
              ].map(([number, title, description]) => (
                <li key={number} className="flex gap-5">
                  <span className="pt-1 text-sm text-primary-deep">{number}</span>
                  <div><h2 className="display text-2xl">{title}</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        id="schedule"
        className="container-wit scroll-mt-24 py-14 md:py-20"
        aria-labelledby="schedule-title"
      >
        <p className="mono-eyebrow text-xs text-ink-soft">
          Your two-night roadmap
        </p>
        <h2
          id="schedule-title"
          className="display mt-3 text-3xl font-semibold md:text-4xl"
        >
          Learn it. Try it. Talk it through.
        </h2>
        <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-16">
          {NIGHTS.map((night) => (
            <article
              key={night.number}
              className="border-t border-hairline py-6 sm:py-8"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="cn-eyebrow">Night {night.number}</span>
                <time dateTime={night.iso} className="font-semibold">
                  {night.date}
                </time>
              </div>
              <h3 className="mt-5 font-display text-2xl font-semibold">
                {night.title}
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
                {night.description}
              </p>
              <p className="mt-5 text-xs font-semibold">6–9 PM</p>
              <ol className="cn-timeline mt-5 space-y-4">
                {night.items.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <span className="cn-dot" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section
        className="coding-nights-campaign cn-prizes border-y border-hairline py-12 md:py-16"
        aria-labelledby="prizes-title"
      >
        <div className="container-wit relative z-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="cn-eyebrow">A little extra motivation</p>
              <h2
                id="prizes-title"
                className="display mt-3 text-3xl font-semibold md:text-4xl"
              >
                Code your way to the podium.
              </h2>
            </div>
          </div>
          <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              ["1st place", "$500"],
              ["2nd place", "$300"],
              ["3rd place", "$100"],
            ].map(([place, prize]) => (
              <div
                key={place}
                className="border-t border-current/20 py-6"
              >
                <dt className="cn-eyebrow">{place}</dt>
                <dd className="cn-title mt-3 text-5xl">{prize}</dd>
              </div>
            ))}
          </dl>

        </div>
      </section>

      <section
        id="register"
        className="container-wit scroll-mt-24 py-14 md:py-20"
        aria-labelledby="register-title"
      >
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mono-eyebrow text-xs text-ink-soft">Your next step</p>
            <h2
              id="register-title"
              className="display mt-3 text-3xl font-semibold md:text-4xl"
            >
              See you at Coding Nights.
            </h2>
            <p className="mt-3 text-sm text-ink-soft">
              Register below for the 12 & 19 October sessions.
            </p>
          </div>
          <a
            href={CODING_NIGHTS_FORM}
            target="_blank"
            rel="noopener noreferrer"
            className="cn-button"
          >
            Open registration form <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="mt-8 overflow-hidden border-t border-hairline pt-6">
          <iframe
            src={`${CODING_NIGHTS_FORM}?embed=true`}
            title="Coding Nights 2026 registration form"
            width="640"
            height="720"
            loading="lazy"
            allowFullScreen
            className="block h-[75svh] min-h-[480px] max-h-[900px] w-full border-0 bg-white"
          />
        </div>
        <p className="mt-4 text-center text-xs text-ink-soft">
          Form not loading?{" "}
          <a
            href={CODING_NIGHTS_FORM}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
          >
            Register in a new tab
          </a>
          .
        </p>
      </section>

      <section className="container-wit pb-8">
        <Link
          href="/events"
          className="mt-6 inline-block text-sm font-semibold text-ink-soft hover:text-primary-deep"
        >
          ← All WIT events
        </Link>
      </section>
    </>
  );
}
