import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import PageHero from "@/components/site/PageHero";

const MEMBERSHIP_FORM = "https://forms.cloud.microsoft/r/9bnx8G5Hqx";
export const metadata: Metadata = {
  title: "WIT Membership",
  description:
    "Join the NTU Women in Tech membership list for event updates, community news and opportunities to learn and connect.",
  alternates: { canonical: "/membership" },
};

export default function MembershipPage() {
  return (
    <>
      <PageHero
        tag="Membership"
        title="A place in the community."
        description="Join our membership list for event updates, community news and opportunities to learn and connect with NTU Women in Tech."
      />
      <section
        id="membership-form"
        className="container-wit scroll-mt-24 py-12 md:py-16"
      >
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mono-eyebrow text-xs text-ink-soft">
              Stay in the loop
            </p>
            <h2 className="display mt-3 text-3xl font-semibold">
              Membership registration
            </h2>
          </div>
          <a
            href={MEMBERSHIP_FORM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-primary-deep"
          >
            Open membership form <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="mt-8 overflow-hidden border-t border-hairline pt-6">
          <iframe
            src={`${MEMBERSHIP_FORM}?embed=true`}
            title="NTU Women in Tech membership registration form"
            width="640"
            height="720"
            loading="lazy"
            allowFullScreen
            className="block h-[75svh] min-h-[480px] max-h-[900px] w-full border-0 bg-white"
          />
        </div>
        <p className="mt-4 text-center text-xs text-ink-soft">
          Having trouble viewing the form?{" "}
          <a
            href={MEMBERSHIP_FORM}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
          >
            Open it in a new tab
          </a>
          .
        </p>
      </section>
    </>
  );
}
