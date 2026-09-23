"use client";

import { createPortal } from "react-dom";
import { useVisualizationDock } from "./visualization-workspace";
import { useEffect, useState } from "react";
import { CrossIcon } from "./icons";
import type { Visualization } from "@/lib/visualization/python-tutor";

export type VisualizationSnapshot = Visualization & { source: string; input: string; label: string; revision: number };

/** Header actions are ghost buttons, the same atom the rest of the chrome uses. */
const GHOST = "rounded-control p-2.5 text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink";

export function VisualizationPanel({ snapshot, error, stale, onClose }: {
  snapshot: VisualizationSnapshot | null;
  error: string | null;
  stale: boolean;
  onClose: () => void;
}) {
  const dock = useVisualizationDock();
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, []);
  if (!dock) return null;
  return createPortal(
    <section
      aria-label="Code visualization"
      className="settle flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-panel bg-ide-panel shadow-ide-panel"
    >
      {/* Same vertical rhythm as the editor's action strip across the seam, so
          the two rows of chrome sit on one line. */}
      <div className="flex min-w-0 shrink-0 items-center gap-2 px-4 py-2.5">
        <h2 className="min-w-0 flex-1 truncate font-ide-display text-base font-semibold text-ide-ink">
          Visualization
        </h2>
        {snapshot && (
          <a
            href={snapshot.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-control px-2 py-2.5 text-sm text-ide-ink-3 transition hover:text-ide-ink"
          >
            Open in Python Tutor
          </a>
        )}
        <button type="button" onClick={onClose} title="Close" className={`shrink-0 ${GHOST}`}>
          <CrossIcon className="h-5 w-5" />
          <span className="sr-only">Close visualization</span>
        </button>
      </div>
      {error ? (
        <p role="alert" className="overflow-y-auto px-4 pb-4 text-sm text-ide-ink-2">{error}</p>
      ) : snapshot ? (
        <>
          {(stale || !loaded) && (
            <p role="status" className="shrink-0 px-4 pb-3 text-xs text-ide-ink-3">
              {stale
                ? "Your code changed. Press Visualize to update this snapshot."
                : slow
                  ? "Still loading. Try Visualize again, or open it in Python Tutor above."
                  : "Loading…"}
            </p>
          )}
          {/* The embed is a foreign surface, so it is inset from the panel's
              edges the way any other recessed block in this system is, rather
              than run to the corners. */}
          <div className="min-h-0 min-w-0 flex-1 overflow-auto px-4 pb-4">
            <iframe
              title={`Python Tutor visualization — ${snapshot.label}`}
              src={snapshot.embedUrl}
              onLoad={() => setLoaded(true)}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              className="h-full min-h-[540px] w-full rounded-inset border-0 bg-white"
              // The cross-origin embed cannot inherit our CSS. Adjust its rendered
              // colors in dark mode, retaining the hue of arrows and highlights.
              // CSS follows both system and pinned themes without reloading the trace.
              style={{ colorScheme: "light", filter: "var(--ide-visualization-filter)" }}
            />
          </div>
        </>
      ) : null}
    </section>,
    dock,
  );
}
