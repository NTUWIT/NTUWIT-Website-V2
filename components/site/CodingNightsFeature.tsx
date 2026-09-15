import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const CODING_NIGHTS_FORM = "https://forms.cloud.microsoft/r/QF8c9HSM8s";

export default function CodingNightsFeature() {
  return (
    <section
      className="cn-feature-stage"
      aria-labelledby="coding-nights-feature"
    >
      <div className="container-wit grid gap-12 py-14 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div className="relative z-10 flex flex-col items-start justify-center">
          <p className="cn-eyebrow">
            <span className="site-event-marker" aria-hidden="true" />
            NTU WIT × IEEE NTU Student Branch
          </p>
          <h2
            id="coding-nights-feature"
            className="cn-title mt-5 text-5xl sm:text-6xl lg:text-7xl"
          >
            Coding
            <span className="cn-feature-title-second">
              Nights<span aria-hidden="true"></span>
            </span>
          </h2>
          <p className="mt-5 text-xl font-semibold">
            Level up your interview game.
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed">
            Two evenings to build your data structures and algorithms skills,
            try a timed online assessment, and practise technical interviews
            with experienced mentors.
          </p>
          <div className="my-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold">
            <span className="py-1">12 & 19 October 2026</span>
            <span className="py-1">6–9 PM · dinner provided</span>
            <span className="py-1">All genders & courses</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/coding-nights#register" className="cn-button">
              Sign up for Coding Nights <ArrowUpRight size={16} />
            </Link>
            <Link
              href="/coding-nights"
              className="inline-flex items-center py-3 text-sm font-semibold underline underline-offset-4 hover:text-primary-deep"
            >
              Explore the two nights →
            </Link>
          </div>
        </div>
        <div className="cn-feature-schedule relative z-10 self-center">
          <div className="cn-feature-night">
            <time dateTime="2026-10-12" className="cn-feature-date">
              12<span>OCT</span>
            </time>
            <div>
              <p className="cn-eyebrow">Night one · 6–9 PM</p>
              <h3 className="display mt-3 text-2xl">DSA workshop</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Dinner, a hands-on DSA workshop and time for your questions.
              </p>
            </div>
          </div>
          <div className="cn-feature-night">
            <time dateTime="2026-10-19" className="cn-feature-date">
              19<span>OCT</span>
            </time>
            <div>
              <p className="cn-eyebrow">Night two · 6–9 PM</p>
              <h3 className="display mt-3 text-2xl">Assessment & interviews</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                A timed assessment and mock interviews with experienced mentors.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
