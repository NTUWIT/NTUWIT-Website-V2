"use client";

import { useEffect, useState } from "react";

import { ClockIcon } from "@/components/ide/icons";

/**
 * Coding Night countdown. The end time comes from the event clock in the
 * database, so an organiser starts and stops it live with `yarn event start
 * <minutes>` and `yarn event stop`. With no clock set it renders nothing, which
 * is the normal state between events.
 */

const format = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export function EventTimer({ endsAt }: { endsAt: string | null }) {
  const deadline = endsAt ? Date.parse(endsAt) : Number.NaN;
  // Server and first client render must agree, so the countdown starts null.
  const [remaining, setRemaining] = useState<number | null>(null);

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
      className={`tnum flex items-center gap-1.5 rounded-control px-3 py-1.5 font-mono text-sm font-semibold ${
        over
          ? "bg-ide-panel-2 text-ide-ink-3"
          : urgent
            ? "bg-ide-warn-quiet text-ide-warn"
            : "bg-ide-accent-quiet text-ide-accent-ink"
      }`}
      title="Time left in this session"
    >
      <ClockIcon className="h-4 w-4" />
      {over ? "Time's up" : format(remaining)}
    </span>
  );
}
