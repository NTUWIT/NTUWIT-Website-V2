/**
 * Fails when a Tailwind class refers to a design token that does not exist.
 *
 * Tailwind v4 generates a utility only when the theme names it, and produces
 * nothing at all otherwise. There is no error and no warning: the element
 * simply renders unstyled. That is how every panel in the app lost its corner
 * radius after `--radius-panel` was renamed to `--radius-ide-panel` and five
 * `rounded-panel` classes were left behind.
 *
 * Run: yarn test
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const NAMESPACES = [
  { prefix: "--color-", utilities: ["bg", "text", "border", "ring", "divide", "fill", "stroke", "accent", "from", "to", "via", "shadow"] },
  { prefix: "--radius-", utilities: ["rounded"] },
  { prefix: "--shadow-", utilities: ["shadow"] },
  { prefix: "--font-", utilities: ["font"] },
];

/** Names Tailwind ships itself, which need no theme entry. */
const BUILT_IN = new Set([
  "full", "none", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "inherit", "current",
  "transparent", "black", "white", "auto", "px", "mono", "sans", "serif", "balance",
]);

const walk = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((path) => /\.tsx?$/.test(path) && !path.split(/[\\/]/).some((part) => part.startsWith(".")))
    .map((path) => join(dir, path));

const css = ["styles/ide.css", "styles/site.css"].map((f) => readFileSync(f, "utf8")).join("\n");

/** Every token the theme actually declares, by namespace. */
const declared = new Map<string, Set<string>>();
for (const { prefix } of NAMESPACES) {
  const names = new Set<string>();
  for (const match of css.matchAll(new RegExp(`${prefix.replace(/-/g, "\\-")}([a-z0-9-]+)\\s*:`, "g"))) {
    names.add(match[1]!);
  }
  declared.set(prefix, names);
}

// Utilities the marketing site declares by hand rather than through the theme.
for (const match of css.matchAll(/@utility\s+([a-z0-9-]+)/g)) {
  declared.get("--color-")!.add(match[1]!);
}

const problems: string[] = [];

for (const file of [...walk("app"), ...walk("components")]) {
  const source = readFileSync(file, "utf8");
  for (const { prefix, utilities } of NAMESPACES) {
    const names = declared.get(prefix)!;
    for (const utility of utilities) {
      const pattern = new RegExp(`(?<![\\w-])${utility}-([a-z][a-z0-9-]*)(?![\\w-])`, "g");
      for (const match of source.matchAll(pattern)) {
        const token = match[1]!;
        if (BUILT_IN.has(token) || names.has(token)) continue;
        // Only complain about our own namespaces; Tailwind's own scales
        // (bg-red-500, rounded-lg) are not ours to verify.
        if (!token.startsWith("ide-") && prefix !== "--radius-") continue;
        if (prefix === "--radius-" && !["panel", "inset", "control"].some((n) => token.startsWith(n))) continue;
        problems.push(`${file}: ${utility}-${token} has no ${prefix}${token} in the theme`);
      }
    }
  }
}

for (const problem of [...new Set(problems)]) console.error(`  ${problem}`);
assert.equal(problems.length, 0, `${problems.length} class(es) reference a token that does not exist`);

console.log(
  `check-tokens: every ide-* and radius class resolves (${declared.get("--color-")!.size} colours, ${declared.get("--radius-")!.size} radii)`,
);

/* ---------- The Two Worlds Rule ---------- */

/**
 * The IDE and marketing palettes never mix. Both sets of names are legal
 * tokens, so the resolution check above cannot catch a marketing colour used
 * inside the editor — it resolves perfectly and renders the wrong world.
 */
const SITE_ONLY = [
  "ink", "ink-soft", "blush", "blush-strong", "primary", "primary-deep",
  "hairline", "background", "foreground", "muted", "muted-foreground",
  "card", "popover", "secondary", "accent-foreground",
];
const UTILITIES = ["bg", "text", "border", "divide", "ring", "fill", "stroke"];

const crossings: string[] = [];

for (const file of [...walk("components/ide"), ...walk("components/admin"), ...walk("app")]) {
  if (file.includes("(site)") || file.includes("components/site")) continue;
  // A file that opts into the marketing scope is a marketing surface wherever
  // it happens to live: the shared 404 is rendered inside `.wit-site`.
  const scoped = readFileSync(file, "utf8");
  if (scoped.includes("wit-site")) continue;
  const source = readFileSync(file, "utf8");
  for (const utility of UTILITIES) {
    for (const token of SITE_ONLY) {
      const pattern = new RegExp(`(?<![\\w-])${utility}-${token}(?![\\w-])`, "g");
      if (pattern.test(source)) {
        crossings.push(`${file}: ${utility}-${token} is a marketing token inside the IDE`);
      }
    }
  }
}

for (const crossing of [...new Set(crossings)]) console.error(`  ${crossing}`);
assert.equal(crossings.length, 0, `${crossings.length} cross-world token use(s)`);

console.log("check-tokens: no marketing token used inside the IDE or console");

/* ---------- contrast: every text-on-surface pairing the IDE uses reads at WCAG AA ---------- */

const ideCss = readFileSync("styles/ide.css", "utf8");
const block = (selector: string) => {
  const start = ideCss.indexOf(selector);
  assert.ok(start >= 0, `styles/ide.css has no ${selector} block`);
  const body = ideCss.slice(ideCss.indexOf("{", start) + 1, ideCss.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--ide-([a-z0-9-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1]!, m[2]!]));
};
const themes = {
  light: block(":root {"),
  dark: block(':root[data-theme="dark"]'),
  "dark (system)": block(':root:not([data-theme="light"])'),
};
assert.deepEqual(themes["dark (system)"], themes.dark, "the system-dark and pinned-dark palettes must match");

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const SURFACES = ["ground", "panel", "panel-2", "panel-3"];
const PAIRS: [string, string][] = [
  ...["ink", "ink-2", "ink-3", "accent-ink"].flatMap((ink) => SURFACES.map((s): [string, string] => [ink, s])),
  ["accent-ink", "accent-quiet"],
  ["on-accent", "accent"],
  ...["pass", "warn", "fail", "info"].flatMap((tone): [string, string][] => [
    [tone, `${tone}-quiet`],
    [tone, "panel"],
  ]),
];

const weak: string[] = [];
for (const [name, palette] of Object.entries(themes)) {
  for (const [fg, bg] of PAIRS) {
    const ratio = contrast(palette[fg]!, palette[bg]!);
    if (ratio < 4.5) weak.push(`${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  }
}
for (const line of weak) console.error(`  ${line}`);
assert.equal(weak.length, 0, `${weak.length} pairing(s) under 4.5:1`);

console.log(`check-tokens: ${PAIRS.length} text pairings reach 4.5:1 in light and dark`);
