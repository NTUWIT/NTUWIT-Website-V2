"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Replaces react-router's NavLink. Its render-prop `className` is split into
 * explicit `active` and `idle` strings so the caller reads the same way it did
 * before, without a function per render.
 */
export function NavLink({
  href,
  active,
  idle,
  className = "",
  onClick,
  children,
}: {
  href: string;
  active: string;
  idle: string;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // react-router matched "/" exactly and everything else by prefix.
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`${className} ${isActive ? active : idle}`}
    >
      {children}
    </Link>
  );
}
