"use client";

import { useSyncExternalStore } from "react";

import { MoonIcon, SunIcon } from "@/components/ide/icons";

type Resolved = "light" | "dark";

const STORAGE_KEY = "wit-ide:theme";
const EVENT = "wit-ide:themechange";

/** Runs before paint so a pinned dark theme never flashes white. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

const subscribe = (notify: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", notify);
  window.addEventListener(EVENT, notify);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener(EVENT, notify);
  };
};

const read = (): Resolved => {
  const pinned = document.documentElement.dataset.theme;
  if (pinned === "light" || pinned === "dark") return pinned;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

/**
 * What the page is actually painted as, pinned or inherited from the OS.
 * The DOM attribute is the store, no provider, and nothing to keep in sync.
 */
export const useTheme = (): Resolved =>
  useSyncExternalStore(subscribe, read, () => "light");

export function ThemeToggle() {
  const theme = useTheme();
  const next: Resolved = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Storage unavailable; the choice just doesn't survive a reload.
        }
        window.dispatchEvent(new Event(EVENT));
      }}
      aria-label={`Switch to ${next} theme`}
      className="rounded-control p-2 text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink"
    >
      {theme === "dark" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
