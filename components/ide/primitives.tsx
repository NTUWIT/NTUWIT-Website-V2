"use client";

import {
  BeakerIcon,
  CheckIcon,
  ClockIcon,
  CrossIcon,
  PartialIcon,
} from "./icons";

/**
 * The shared vocabulary of the platform's interface.
 *
 * These live here rather than inside the editor because the console must use
 * the same state marks, tabs and buttons, not lookalikes. Two implementations
 * of "a passing state" drift apart within a week.
 */

export type Tone = "pass" | "warn" | "fail" | "info" | "quiet";

export const ICON: Record<Tone, (props: { className?: string }) => React.ReactElement> = {
  pass: CheckIcon,
  warn: PartialIcon,
  fail: CrossIcon,
  info: BeakerIcon,
  quiet: ClockIcon,
};

export const TONE: Record<Tone, { text: string; quiet: string; bar: string }> = {
  pass: { text: "text-ide-pass", quiet: "bg-ide-pass-quiet", bar: "bg-ide-pass" },
  warn: { text: "text-ide-warn", quiet: "bg-ide-warn-quiet", bar: "bg-ide-warn" },
  fail: { text: "text-ide-fail", quiet: "bg-ide-fail-quiet", bar: "bg-ide-fail" },
  info: { text: "text-ide-info", quiet: "bg-ide-info-quiet", bar: "bg-ide-info" },
  quiet: { text: "text-ide-ink-3", quiet: "bg-ide-panel-2", bar: "bg-ide-ink-3" },
};

/** State is never carried by colour alone: a mark, a word, and where one
 *  exists, a count. */
export function Mark({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const Icon = ICON[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${TONE[tone].text}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${TONE[tone].quiet}`}>
        <Icon className="h-3 w-3" />
      </span>
      {children}
    </span>
  );
}

export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm transition ${
        active ? "bg-ide-panel-2 font-medium text-ide-ink" : "text-ide-ink-3 hover:text-ide-ink-2"
      }`}
    >
      {children}
    </button>
  );
}

/** The editor's Submit, reused wherever an action is the point of the screen. */
export function PrimaryButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`flex items-center justify-center gap-2 rounded-control bg-ide-accent px-5 py-2.5 text-sm font-semibold text-ide-on-accent transition hover:brightness-105 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** The editor's Run: a flat panel that drops its shadow when disabled. */
export function SecondaryButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`flex items-center justify-center gap-2 rounded-control bg-ide-panel px-4 py-2.5 text-sm font-medium text-ide-ink shadow-ide-panel transition hover:bg-ide-panel-2 disabled:opacity-40 disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  );
}

/** A quiet control for actions that are available but not the point. */
export function GhostButton({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`flex items-center gap-1.5 rounded-control px-3 py-2 text-sm text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** The one elevation in the system. */
export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-panel bg-ide-panel shadow-ide-panel ${className}`}>
      {children}
    </section>
  );
}

/** The editor's spinner, at the size the surrounding text expects. */
export function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`${className} animate-spin rounded-full border-[1.75px] border-ide-accent border-t-transparent`}
    />
  );
}
