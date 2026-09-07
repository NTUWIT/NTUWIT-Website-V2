"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Send, ArrowUpRight } from "lucide-react";

import { Instagram, Linkedin } from "@/components/site/BrandIcons";
import PageHero from "@/components/site/PageHero";

const EXEC = [
  { role: "Secretary", reports: [] },
  { role: "Vice President (Academics)", reports: [] },
  {
    role: "Vice President (External)",
    reports: [
      "Events Director (Community)",
      "Events Director (Corporate)",
      "Business Management Director",
    ],
  },
  {
    role: "Vice President (Internal)",
    reports: ["Marketing Director", "Logistics Director"],
  },
  { role: "Treasurer", reports: [] },
];

const SUB = [
  "Events Subcommittee",
  "Marketing Subcommittee",
  "Logistics Subcommittee",
  "Business Management Subcommittee",
];

const EXCO_FORM_URL =
  "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=SJPOFSq-K0aPwOF2WpsgSujmEZQvx-1NstWfk-jSZrdUME1VU1haN0lYV1ZZNUw0NkNLTzVUSUEwRi4u&embed=true";

const PERKS = [
  {
    t: "Mentorship that compounds",
    d: "Direct access to alumni now at Meta, NVIDIA, Amazon, Jane Street and beyond — plus structured WoMENTORS pairing.",
  },
  {
    t: "Run mega-events",
    d: "Inherit a Corporate Outreach Database and full SOPs for Beyond Binary, Coding Nights and SheBuilds. You ship from day one.",
  },
  {
    t: "Real handover",
    d: "Documented playbooks, financial templates and post-event reports. Leadership continuity is built into the org.",
  },
  {
    t: "Community over competition",
    d: "820+ Telegram members, regular socials, alumni reunions. Joining WIT is joining a network for life.",
  },
];

export default function RecruitContent() {
  // react-router exposed the fragment through useLocation; Next leaves it to
  // the browser, so it is read from the URL directly.
  useEffect(() => {
    if (window.location.hash !== "#recruitment-form") return;

    document
      .getElementById("recruitment-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      <PageHero
        tag="Recruitment · AY 26/27"
        title="You don't need to code to join."
        description="We're building a multi-disciplinary team — engineers, designers, marketers, event leads, finance ops. If you care about the mission, there's a seat for you."
      />

      <section className="container-wit py-8 md:py-10">
        <div className="flex flex-wrap gap-2">
          <a
            href="https://t.me/ntu_women_in_tech"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-ink text-background rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-primary-deep hover:text-ink transition-colors"
          >
            <Send size={14} /> Join Telegram (820+) <ArrowUpRight size={12} />
          </a>
          <a
            href="https://www.instagram.com/ntu_witech/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-ink rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-secondary/40 transition-colors"
          >
            <Instagram size={14} /> Follow Instagram
          </a>
          <a
            href="https://linkedin.com/company/ntu-women-in-tech/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-ink rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-secondary/40 transition-colors"
          >
            <Linkedin size={14} /> LinkedIn
          </a>
        </div>
      </section>

      {/* Why Join */}
      <section className="container-wit py-12 md:py-16">
        <p className="mono-eyebrow text-ink-soft text-xs mb-8">Why join</p>
        <div className="grid md:grid-cols-2 gap-4">
          {PERKS.map((p, i) => (
            <div
              key={p.t}
              className={`p-6 rounded-lg border transition-all duration-300 ${
                i === 0
                  ? "bg-secondary/60 border-hairline hover:shadow-soft"
                  : "bg-card border-hairline hover:shadow-soft"
              }`}
            >
              <h3 className="font-display text-lg md:text-xl font-semibold text-ink">
                {p.t}
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                {p.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Committee Structure */}
      <section className="bg-secondary/40 border-y border-hairline">
        <div className="container-wit py-12 md:py-16">
          <p className="mono-eyebrow text-ink-soft text-xs">
            Committee structure
          </p>
          <h2 className="display text-3xl md:text-4xl mt-3 max-w-2xl font-semibold">
            Two layers. One team.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-ink-soft">
            An executive committee that sets direction, and subcommittees where
            most members start, build and grow into directorship roles.
          </p>

          {/* Exco - org chart */}
          <div className="mt-10">
            <p className="mono-eyebrow text-ink-soft text-xs mb-4">
              Executive Committee
            </p>

            {/* President */}
            <div className="flex justify-center">
              <RoleCard role="President" highlight />
            </div>
            <div className="h-6 w-px bg-ink/30 mx-auto" />

            {/* Direct reports row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              {EXEC.map((e) => (
                <div key={e.role} className="flex flex-col gap-2">
                  <RoleCard role={e.role} />
                  {e.reports.length > 0 && (
                    <>
                      <div className="h-3 w-px bg-ink/20 mx-auto" />
                      <div className="flex flex-col gap-2">
                        {e.reports.map((r) => (
                          <div
                            key={r}
                            className="px-2 py-2 text-xs rounded-lg bg-background border border-hairline text-center"
                          >
                            {r}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Subcommittees */}
          <div className="mt-12">
            <p className="mono-eyebrow text-ink-soft text-xs mb-4">
              Subcommittees
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {SUB.map((s) => (
                <div
                  key={s}
                  className="p-4 rounded-lg bg-background border border-hairline text-xs font-semibold"
                >
                  {s}
                </div>
              ))}
            </div>
            <p className="mt-4 max-w-2xl text-xs text-ink-soft">
              Subcommittee members work directly with the relevant Director,
              gain hands-on experience running events, and are first in line for
              directorship in the next cycle.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-wit py-12 md:py-16">
        <div
          className="scroll-mt-24 rounded-lg bg-secondary/60 border border-hairline p-4 sm:p-6 md:p-8"
          id="recruitment-form"
        >
          <div className="max-w-2xl">
            <p className="mono-eyebrow text-ink-soft text-xs mb-2">
              Recruitment application
            </p>
            <h2 className="display text-2xl md:text-3xl font-semibold text-ink">
              Ready to build with us?
            </h2>
            <p className="mt-3 text-ink-soft text-sm">
              Fill in the form below to apply for AY 26/27.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-hairline bg-background shadow-soft md:mt-8">
            <iframe
              className="block h-[70svh] min-h-[640px] w-full sm:h-[76svh] sm:min-h-[720px] md:h-[820px] lg:h-[900px]"
              src={EXCO_FORM_URL}
              frameBorder="0"
              loading="lazy"
              allowFullScreen
              title="NTU Women In Tech Recruitment Form AY26/27"
            />
          </div>

          <p className="mt-3 text-center text-xs text-ink-soft">
            Having trouble viewing the form?{" "}
            <a
              href={EXCO_FORM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:text-primary-deep"
            >
              Open it in a new tab <ArrowUpRight size={12} />
            </a>
          </p>

          <div className="mt-8 rounded-lg border border-hairline bg-background p-5 md:p-6">
            <p className="mono-eyebrow text-ink-soft text-xs mb-2">
              Membership registration
            </p>
            <h3 className="font-display text-lg md:text-xl font-semibold text-ink">
              Join our membership list
            </h3>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed max-w-2xl">
              Use this form if you want to join the email blast, receive event
              updates, and attend future Women in Tech events without applying
              for the committee.
            </p>
            <a
              href="https://forms.cloud.microsoft/r/9bnx8G5Hqx"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 border border-ink rounded-full px-5 py-2.5 text-xs font-semibold hover:bg-blush transition-colors"
            >
              Women In Tech (WIT) Membership Registration Form – Fill in form
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function RoleCard({
  role,
  highlight = false,
}: {
  role: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`px-4 py-2.5 rounded-lg border text-center text-xs font-semibold ${
        highlight
          ? "bg-ink text-background border-ink min-w-[160px]"
          : "bg-background border-hairline"
      }`}
    >
      {role}
    </div>
  );
}
