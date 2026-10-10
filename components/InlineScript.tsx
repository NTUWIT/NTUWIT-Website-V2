"use client";

/**
 * A script that runs once, from the server-rendered HTML, before first paint.
 *
 * React warns when rendering produces a <script> on the client, because such a
 * script never executes there. Following the Next.js "Preventing flash before
 * hydration" guide, the server renders it as JavaScript (so the browser runs
 * it while parsing) and the client as inert text/plain; suppressHydrationWarning
 * accepts that one attribute differing.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
