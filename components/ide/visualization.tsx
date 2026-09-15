"use client";

import { createPortal } from "react-dom";
import { useVisualizationDock } from "./visualization-workspace";
import { useEffect, useState } from "react";
import type { Visualization } from "@/lib/visualization/python-tutor";

export type VisualizationSnapshot = Visualization & { source: string; input: string; label: string; revision: number };

export function VisualizationPanel({ snapshot, error, stale, onClose }: {
  snapshot: VisualizationSnapshot | null;
  error: string | null;
  stale: boolean;
  onClose: () => void;
}) {
  const dock = useVisualizationDock();
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, []);
  if (!dock) return null;
  return createPortal(
    <section aria-label="Code visualization" data-expanded={expanded} data-collapsed={collapsed} className="flex h-full min-h-0 flex-col overflow-hidden rounded-panel bg-ide-panel shadow-ide-panel">
      <div className={collapsed ? "flex h-full flex-col items-center gap-3 py-3" : "hidden"}>
        <button type="button" onClick={() => setCollapsed(false)} aria-label="Reopen visualization" aria-expanded={false} className="rounded-control px-2 py-3 text-xs font-medium text-ide-accent-ink hover:bg-ide-panel-2 [writing-mode:vertical-rl]">Visualization ‹</button>
        <button type="button" onClick={onClose} aria-label="Close visualization" className="rounded-control p-2 text-ide-ink-2 hover:bg-ide-panel-2">×</button>
      </div>
      <div className={collapsed ? "hidden" : "flex h-full min-h-0 flex-col"}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ide-hairline px-4 py-3">
          <h2 className="text-sm font-semibold text-ide-ink">Visualization{snapshot ? ` · ${snapshot.label}` : ""}</h2>
          <div className="flex items-center gap-3 text-xs">
            {snapshot && <a href={snapshot.externalUrl} target="_blank" rel="noopener noreferrer" className="text-ide-accent-ink underline underline-offset-4">Open in Python Tutor ↗</a>}
            <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="hidden rounded-control px-2 py-1 text-ide-ink-2 hover:bg-ide-panel-2 xl:block">{expanded ? "Restore width" : "Expand"}</button>
            <button type="button" onClick={() => setCollapsed(true)} aria-expanded={!collapsed} className="rounded-control px-2 py-1 text-ide-ink-2 hover:bg-ide-panel-2">Collapse</button>
            <button type="button" onClick={onClose} className="rounded-control px-2 py-1 text-ide-ink-2 hover:bg-ide-panel-2">Close</button>
          </div>
        </div>
        {error ? <p role="alert" className="overflow-y-auto px-4 py-5 text-sm text-ide-warn">{error}</p> : snapshot ? (
          <>
            <div className="shrink-0 px-4 py-2 text-xs leading-relaxed text-ide-ink-3">
              {stale && <p role="status" className="mb-1 text-ide-warn">Code or input changed. Press Visualize to update this snapshot.</p>}
              <p>Python Tutor runs this snapshot online. Step through with Next / Prev. Run and Submit use the official judge. If the view stays blank, use Open in Python Tutor.</p>
              {!loaded && <p role="status">{slow ? "Taking longer than expected. Try Visualize again or open Python Tutor above." : "Loading Python Tutor…"}</p>}
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-ide-panel">
              <iframe
                title={`Python Tutor visualization — ${snapshot.label}`}
                src={snapshot.embedUrl}
                onLoad={() => setLoaded(true)}
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                className="h-full min-h-[540px] w-full min-w-[760px] border-0 bg-white"
                // The cross-origin embed cannot inherit our CSS. Adjust its rendered
                // colors in dark mode, retaining the hue of arrows and highlights.
                // CSS follows both system and pinned themes without reloading the trace.
                style={{ colorScheme: "light", filter: "var(--ide-visualization-filter)" }}
              />
            </div>
          </>
        ) : null}
      </div>
    </section>,
    dock,
  );
}
