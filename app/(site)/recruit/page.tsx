import type { Metadata } from "next";

import RecruitContent from "@/components/site/RecruitContent";

// The page body scrolls to the form when the URL carries its fragment, so it is
// a client component. Keeping the route itself on the server is what lets it
// export metadata for crawlers.
export const metadata: Metadata = {
  title: { absolute: "Join NTU Women in Tech | Student Tech Community Singapore" },
  description:
    "Join NTU Women in Tech and contribute through engineering, design, marketing, events or operations while connecting with an inclusive tech community.",
  keywords: ["NTU Women in Tech", "women in tech Singapore", "women in technology", "women in STEM", "female tech leaders", "NTU student club", "Nanyang Technological University", "Singapore tech community", "join NTU Women in Tech", "NTU CCA", "women in tech membership", "student tech club", "tech volunteering Singapore"],
  alternates: { canonical: "/recruit" },
};

export default function RecruitPage() {
  return <RecruitContent />;
}
