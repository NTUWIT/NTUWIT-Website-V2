"use client";

import { useEffect, useState } from "react";

import { ClockIcon } from "@/components/ide/icons";

/**
 * Coding Night countdown. The end time comes from the event clock in the
 * database. The server render supplies the first value; after that the clock
 * polls /api/event, so an organiser starting, extending or stopping it from
 * the admin console reaches every open tab without a reload. With no clock
 * set it renders nothing, which is the normal state between events.
 */

/** How often an open tab rechecks the clock. Also rechecked on focus. */
const POLL_MS = 15_000;

const format = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export function EventTimer({ endsAt: initial }: { endsAt: string | null }) {
  const [endsAt, setEndsAt] = useState(initial);
  const deadline = endsAt ? Date.parse(endsAt) : Number.NaN;
  // Server and first client render must agree, so the countdown starts null.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const check = () =>
      fetch("/api/event", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((body) => {
          if (body && "endsAt" in body) setEndsAt(body.endsAt);
        })
        // A missed poll keeps the last known clock; the next one corrects it.
        .catch(() => {});
    const id = setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, []);

  useEffect(() => {
    if (Number.isNaN(deadline)) return;
    const tick = () => setRemaining(deadline - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (Number.isNaN(deadline) || remaining === null) return null;

  const over = remaining <= 0;
  // Amber for the last five minutes. Never red: the clock should be readable
  // from across a lecture hall without raising the temperature in it.
  const urgent = !over && remaining < 5 * 60 * 1000;

  return (
    <span
      role="timer"
      aria-live="off"
      className={`tnum flex items-center gap-2 rounded-control px-3.5 py-1.5 font-mono text-base font-semibold sm:text-lg ${
        over
          ? "bg-ide-panel-2 text-ide-ink-2"
          : urgent
            ? "bg-ide-warn-quiet text-ide-warn"
            : "bg-ide-accent-quiet text-ide-accent-ink"
      }`}
    >
      <ClockIcon className="h-4 w-4" />
      {!over && <span className="hidden font-sans text-sm font-medium sm:inline">Time left</span>}
      {over ? "Time's up" : format(remaining)}
    </span>
  );
}
