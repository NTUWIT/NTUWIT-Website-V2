import type { Metadata } from "next";
import { Gabarito, Geist, Geist_Mono, Fraunces, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "@/styles/app.css";

import { THEME_SCRIPT } from "@/components/ide/theme";

// The marketing site's faces.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

// The IDE's faces.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const gabarito = Gabarito({ variable: "--font-gabarito", subsets: ["latin"] });

const SITE_URL = "https://www.ntuwit.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NTU Women in Tech | Women in Technology Community Singapore",
    template: "%s | NTU Women in Tech",
  },
  description:
    "NTU Women in Tech is a student-led women in technology community at NTU Singapore offering tech events, hackathons, mentorship and learning opportunities.",
  keywords: [
    "NTU Women in Tech",
    "women in tech Singapore",
    "women in technology",
    "women in STEM",
    "female tech leaders",
    "NTU student club",
    "Nanyang Technological University",
    "Singapore tech community",
  ],
  icons: { icon: "/favicon.ico", apple: "/ntuwit-icon.png" },
  openGraph: { type: "website", siteName: "NTU Women in Tech", url: SITE_URL },
};

/**
 * Root layout. Deliberately thin: it owns the document, the fonts and Clerk,
 * and nothing visual. The marketing site and the IDE each bring their own
 * palette and base styles in their own layout, scoped so neither leaks.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${inter.variable} ${fraunces.variable} ${geistSans.variable} ${geistMono.variable} ${gabarito.variable} h-full`}
      >
        <head>
          {/* Applies the pinned IDE theme before first paint. */}
          <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        </head>
        <body className="min-h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
