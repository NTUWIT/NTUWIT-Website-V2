import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";

/**
 * The marketing site. `wit-site` scopes its palette, fonts and base styles so
 * none of it reaches the IDE, which lives under (app) with its own tokens.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="wit-site flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
