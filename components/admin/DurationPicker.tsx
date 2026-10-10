"use client";

import { useState } from "react";

import { formatMinutes, minutesUntil } from "@/lib/duration";

const PRESETS = [15, 30, 45, 60, 90, 120];

/**
 * How long a session runs: one click for the usual lengths, or an end time on
 * the clock ("until 8:30") for anything else, which is how organisers actually
 * think about it on the night. Reports whole minutes, or null for no timer.
 */
export function DurationPicker({
  value,
  onChange,
  allowNone = false,
  disabled = false,
}: {
  value: number | null;
  onChange: (minutes: number | null) => void;
  allowNone?: boolean;
  disabled?: boolean;
}) {
  const [endsAt, setEndsAt] = useState("");
  const custom = endsAt !== "";

  const chip = (selected: boolean) =>
    `tnum rounded-control px-2.5 py-1.5 text-xs transition disabled:opacity-40 ${
      selected
        ? "bg-ide-accent-quiet font-medium text-ide-accent-ink"
        : "bg-ide-panel-2 text-ide-ink-2 hover:bg-ide-panel-3 hover:text-ide-ink"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Timer length">
      {allowNone && (
        <button
          type="button"
          disabled={disabled}
          aria-pressed={!custom && value === null}
          onClick={() => {
            setEndsAt("");
            onChange(null);
          }}
          className={chip(!custom && value === null)}
        >
          No timer
        </button>
      )}
      {PRESETS.map((minutes) => (
        <button
          key={minutes}
          type="button"
          disabled={disabled}
          aria-pressed={!custom && value === minutes}
          onClick={() => {
            setEndsAt("");
            onChange(minutes);
          }}
          className={chip(!custom && value === minutes)}
        >
          {formatMinutes(minutes)}
        </button>
      ))}
      <label className={`flex items-center gap-1.5 rounded-control py-0.5 pr-1 pl-2.5 text-xs ${custom ? "bg-ide-accent-quiet text-ide-accent-ink" : "bg-ide-panel-2 text-ide-ink-2"}`}>
        Ends at
        <input
          type="time"
          value={endsAt}
          disabled={disabled}
          onChange={(event) => {
            setEndsAt(event.target.value);
            onChange(event.target.value ? minutesUntil(event.target.value, new Date()) : allowNone ? null : 30);
          }}
          className="tnum rounded-[0.4rem] bg-transparent px-1 py-1 text-xs text-ide-ink outline-none"
        />
      </label>
      {custom && value !== null && (
        <span className="tnum text-xs text-ide-ink-3">{formatMinutes(value)} from now</span>
      )}
    </div>
  );
}
