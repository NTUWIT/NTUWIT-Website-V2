"use client";

// Ported from the standalone Vite site. Router bindings are the only change:
// `useLocation` becomes `usePathname`, `Outlet` moves into the Next layout, and
// NavLink's render-prop className becomes explicit active/idle strings.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send, Globe, ArrowUpRight, Menu, X } from "lucide-react";

import { Github, Instagram, Linkedin } from "./BrandIcons";

import { NavLink } from "./NavLink";
import { SiteAccount } from "./SiteAccount";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/events", label: "Events" },
  { to: "/beyond-binary", label: "Beyond Binary" },
  { to: "/recruit", label: "Recruitment" },
  { to: "/ide", label: "WIT IDE" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && mobileMenuRef.current?.contains(target)) {
        return;
      }

      setMobileMenuOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    // The first link in the sheet takes focus, so the links are the next thing
    // reached rather than the rest of the page.
    sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/85 backdrop-blur border-b border-hairline"
            : "bg-transparent"
        }`}
      >
        <div className="container-wit flex h-16 md:h-20 items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0"
            aria-label="NTU Women in Tech home"
          >
            <img
              src="/wit-logo.png"
              alt="NTU Women in Tech logo"
              className="h-9 w-9 md:h-10 md:w-10 object-contain"
            />
            <span className="hidden sm:flex flex-col leading-none">
              <span className="font-display text-[14px] text-ink">
                Women in Tech
              </span>
              <span className="mono-eyebrow text-[10px] text-ink-soft mt-1">
                NTU Singapore
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                href={n.to}
                active="text-ink bg-blush"
                idle="text-ink-soft hover:text-ink"
                className="mono-eyebrow px-3 py-2 rounded-full transition-colors"
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <SiteAccount />
            <Link
              href="/recruit#recruitment-form"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink text-background px-4 py-2 text-[11px] font-semibold uppercase hover:bg-primary-deep hover:text-ink transition-colors"
            >
              Join WIT <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* Mobile menu */}
          <div ref={mobileMenuRef} className="lg:hidden relative">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-background/80 text-ink shadow-soft backdrop-blur transition-colors hover:bg-blush"
              ref={triggerRef}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() =>
                setMobileMenuOpen((open) => {
                  // Closing returns focus to the control that opened it.
                  if (open) triggerRef.current?.focus();
                  return !open;
                })
              }
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {mobileMenuOpen && (
              <nav
                ref={sheetRef}
                aria-label="Mobile"
                id="mobile-navigation"
                className="absolute right-0 top-12 z-50 w-60 rounded-lg border border-hairline bg-background/95 p-2 shadow-pop backdrop-blur-md"
              >
                <div className="flex flex-col">
                  {NAV.map((n) => (
                    <NavLink
                      key={n.to}
                      href={n.to}
                      onClick={() => setMobileMenuOpen(false)}
                      active="bg-blush text-ink"
                      idle="text-ink-soft hover:bg-blush hover:text-ink"
                      className="px-3 py-2.5 text-sm font-medium rounded-lg transition-colors"
                    >
                      {n.label}
                    </NavLink>
                  ))}
                  <Link
                    href="/recruit#recruitment-form"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-1 px-3 py-2.5 text-sm font-semibold rounded-lg bg-ink text-background text-center transition-colors hover:bg-primary-deep hover:text-ink"
                  >
                    Join WIT
                  </Link>
                  <SiteAccount className="mt-1 w-full text-center" />
                </div>
              </nav>
            )}
          </div>
        </div>
      </header>
  );
}

const SOCIALS = [
  {
    href: "https://www.instagram.com/ntu_witech/",
    label: "Instagram",
    icon: Instagram,
  },
  { href: "https://t.me/ntu_women_in_tech", label: "Telegram", icon: Send },
  {
    href: "https://linkedin.com/company/ntu-women-in-tech/",
    label: "LinkedIn",
    icon: Linkedin,
  },
  {
    href: "https://github.com/NTUWIT",
    label: "GitHub",
    icon: Github,
  },
  { href: "https://ntubeyondbinary.com", label: "Beyond Binary", icon: Globe },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-blush/40 mt-24">
      {/* Main Footer */}
      <div className="container-wit py-8 md:py-10">
        {/* Top Row: Logo and Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-8">
          {/* Logo & Branding */}
          <div className="col-span-1">
            <div className="flex items-center gap-2.5">
              <img
                src="/wit-logo.png"
                alt="NTU Women in Tech logo"
                className="h-10 w-10 object-contain"
              />
              <div className="flex flex-col">
                <p className="font-display text-base text-ink">Women in Tech</p>
                <p className="mono-eyebrow text-[9px] text-ink-soft mt-0.5">
                  NTU Singapore
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="col-span-1 md:col-span-1">
            <p className="text-xs text-ink-soft leading-relaxed">
              Building the next generation of tech leaders through flagship
              events and mentorship.
            </p>
          </div>

          {/* Explore */}
          <div>
            <p className="mono-eyebrow text-ink-soft uppercase text-xs font-semibold mb-3">
              Explore
            </p>
            <ul className="space-y-1.5">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link
                    href={n.to}
                    className="text-xs text-ink-soft hover:text-ink transition-colors"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <p className="mono-eyebrow text-ink-soft uppercase text-xs font-semibold mb-3">
              Connect
            </p>
            <ul className="space-y-1.5">
              {SOCIALS.map((s) => (
                <li key={s.href}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink transition-colors"
                  >
                    <s.icon size={14} /> {s.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="https://forms.cloud.microsoft/r/9bnx8G5Hqx"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink transition-colors"
                >
                  Membership Registration
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-hairline bg-background/50">
        <div className="container-wit py-4 md:py-5">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-between items-start md:items-center text-xs text-ink-soft">
            <p>
              © {new Date().getFullYear()} NTU Women in Tech. All rights
              reserved.
            </p>
            <p>Made by NTU Women In Tech</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
