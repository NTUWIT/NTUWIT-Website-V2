"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  BeakerIcon,
  ChevronIcon,
  CheckIcon,
  ClockIcon,
  CrossIcon,
  HistoryIcon,
  PartialIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
  SendIcon,
  WrenchIcon,
} from "@/components/ide/icons";
import {
  Mark,
  TabButton,
  TONE,
  type Tone,
} from "@/components/ide/primitives";
import { useTheme } from "@/components/ide/theme";

import {
  LANGUAGES,
  LANGUAGE_LABELS,
  MONACO_LANGUAGE,
  type Language,
} from "@/lib/languages";

/**
 * Monaco is bundled, not fetched from a CDN.
 *
 * `@monaco-editor/react` defaults to loading Monaco through its AMD loader,
 * which installs a global `define` with `define.amd`. Clerk ships its UI as a
 * UMD bundle, so with that global present it hands its factory to Monaco's
 * loader instead of executing: `document.currentScript` is then null when the
 * bundle computes its chunk base path, the resulting error is swallowed, every
 * chunk 404s against our own origin, and Clerk reports "Failed to load Clerk
 * UI". Bundling Monaco removes the global and the collision with it, and means
 * the editor still works when venue wifi cannot reach a CDN.
 */
const loadMonaco = async () => {
  const [{ default: MonacoReact, loader }, monaco] = await Promise.all([
    import("@monaco-editor/react"),
    import("monaco-editor"),
  ]);

  // Without this Monaco runs its language services on the main thread and logs
  // a worker error on every mount. Only JS/TS has a dedicated worker among the
  // four languages we offer; the rest use the base editor worker.
  // ponytail: whole-package import. Narrow to per-language entry points if the
  // bundle size ever shows up in a real measurement.
  window.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      // `new Worker(new URL(...))` has to be written out literally in each
      // branch. Assigning the URL to a variable first defeats the bundler's
      // static analysis, which then serves the raw .ts file as an asset: the
      // browser cannot parse it, and Monaco reports the failure as an opaque
      // "[object Event]".
      if (label === "typescript" || label === "javascript") {
        return new Worker(new URL("./monaco-ts.worker.ts", import.meta.url), {
          type: "module",
        });
      }
      return new Worker(new URL("./monaco-editor.worker.ts", import.meta.url), {
        type: "module",
      });
    },
  };

  loader.config({ monaco });
  return { default: MonacoReact };
};

// Keeps the editor bundle off first paint; the statement is readable while it
// downloads. The skeleton sits on the same unframed ground as the real code
// surface, so nothing shifts when it arrives.
const MonacoEditor = dynamic(loadMonaco, {
  ssr: false,
  loading: () => (
    <div className="h-full px-6 pt-5">
      <div className="space-y-3.5">
        {[62, 38, 74, 26, 52, 44].map((width, index) => (
          <div
            key={index}
            className="h-3 animate-pulse rounded-full bg-ide-panel-3"
            style={{ width: `${width}%`, animationDelay: `${index * 90}ms` }}
          />
        ))}
      </div>
    </div>
  ),
});

/**
 * The code surface takes the page's own ground colour and no frame at all: the
 * point of this layout is that the editor is the room, and the panels are the
 * things set down in it. Syntax colours are the interface palette, so pink
 * appears in code the same way it appears on the primary action, sparingly.
 */
const MONACO_THEMES = {
  light: {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "9a8e93", fontStyle: "italic" },
      { token: "keyword", foreground: "c9346f" },
      { token: "string", foreground: "0f7a5c" },
      { token: "number", foreground: "8f6208" },
      { token: "type", foreground: "2a60b8" },
      { token: "identifier", foreground: "191416" },
      { token: "delimiter", foreground: "675c61" },
    ],
    colors: {
      "editor.background": "#fbf8f9",
      "editor.foreground": "#191416",
      "editorLineNumber.foreground": "#c8bec3",
      "editorLineNumber.activeForeground": "#675c61",
      "editor.lineHighlightBackground": "#f5f1f3",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#fbeef4",
      "editorCursor.foreground": "#c9346f",
      "editorIndentGuide.background1": "#ede7ea",
      "editorGutter.background": "#fbf8f9",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#e9e2e6",
      "scrollbarSlider.background": "#ede7ea",
      "scrollbarSlider.hoverBackground": "#e0d8dc",
      "scrollbarSlider.activeBackground": "#c8bec3",
    },
  },
  dark: {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "786f75", fontStyle: "italic" },
      { token: "keyword", foreground: "e2669e" },
      { token: "string", foreground: "4fcda4" },
      { token: "number", foreground: "e0ab4b" },
      { token: "type", foreground: "7fa8ef" },
      { token: "identifier", foreground: "f4f1f3" },
      { token: "delimiter", foreground: "aaa2a7" },
    ],
    colors: {
      "editor.background": "#111014",
      "editor.foreground": "#f4f1f3",
      "editorLineNumber.foreground": "#453f47",
      "editorLineNumber.activeForeground": "#aaa2a7",
      "editor.lineHighlightBackground": "#1a181c",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#2e1a24",
      "editorCursor.foreground": "#e2669e",
      "editorIndentGuide.background1": "#211f24",
      "editorGutter.background": "#111014",
      "editorWidget.background": "#1a181c",
      "editorWidget.border": "#2f2c33",
      "scrollbarSlider.background": "#2b282e",
      "scrollbarSlider.hoverBackground": "#3a363d",
      "scrollbarSlider.activeBackground": "#4a454d",
    },
  },
} as const;

type SampleTest = { stdin: string; expectedStdout: string };

type RunTest = {
  index: number;
  isCustom: boolean;
  passed: boolean;
  verdict: string;
  stdin: string;
  expected: string;
  actual: string;
  stderr: string;
};

type RunResponse =
  | { ok: true; verdict: string; passedCount: number; totalCount: number; runtimeMs: number; tests: RunTest[] }
  | { ok: false; error: string };

type SubmitResponse =
  | {
      ok: true;
      verdict: string;
      passedCount: number;
      totalCount: number;
      runtimeMs: number;
      failedAt: number | null;
      score: number;
    }
  | { ok: false; error: string };

const ERROR_TEXT: Record<string, { title: string; body: string }> = {
  UNAUTHENTICATED: {
    title: "Sign in first",
    body: "Running and submitting need an account so your work is saved to you.",
  },
  INVALID: {
    title: "That input wasn't readable",
    body: "Custom input has to be a JSON array with one value per parameter, each of the type the problem asks for. For a function taking a list of numbers that is [[1, 2, 3]].",
  },
  SESSION_CLOSED: {
    title: "The session is closed",
    body: "Running and submitting are only open while the session timer is running. Nothing you have already scored is affected.",
  },
  RATE_LIMITED: {
    title: "Take a breath",
    body: "That's a lot of attempts in a short window. Wait a few seconds and try again. Nothing was lost.",
  },
  NOT_FOUND: {
    title: "Problem not found",
    body: "Reload the page and pick a problem again.",
  },
  JUDGE_UNAVAILABLE: {
    title: "The judge isn't answering",
    body: "This is on us, not your code. Try again in a moment.",
  },
  INTERNAL: {
    title: "Something went wrong",
    body: "Try again. If it keeps happening, tell an organiser.",
  },
};

const errorFor = (code: string) => ERROR_TEXT[code] ?? ERROR_TEXT.INTERNAL!;

// Starter code is part of the key: when a problem's signature or starter
// changes, old drafts are orphaned rather than restored over the new stub.
const fingerprint = (value: string): string => {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

const draftKey = (problemId: string, language: Language, starter: string) =>
  `wit-ide:draft:${problemId}:${language}:${fingerprint(starter)}`;

const readDraft = (problemId: string, language: Language, starter: string): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(draftKey(problemId, language, starter));
  } catch {
    return null;
  }
};

export type PastSubmission = {
  id: string;
  language: Language;
  source: string;
  status: string;
  runtimeMs: number;
  passedCount: number;
  totalCount: number;
  score: number;
  createdAt: string;
};

type EditorProps = {
  problemId: string;
  starterCode: Partial<Record<Language, string>>;
  samples: SampleTest[];
  history: PastSubmission[];
  signedIn: boolean;
};

export function Editor(props: EditorProps) {
  const [language, setLanguage] = useState<Language>("python");
  // Remounting on problem/language is what loads the right draft: source is
  // seeded once per pair rather than synced back in an effect.
  return (
    <EditorPane
      key={`${props.problemId}:${language}`}
      {...props}
      language={language}
      onLanguageChange={setLanguage}
    />
  );
}

type Tab = "result" | "custom" | "history";

function EditorPane({
  problemId,
  starterCode,
  samples,
  history,
  signedIn,
  language,
  onLanguageChange,
}: EditorProps & {
  language: Language;
  onLanguageChange: (language: Language) => void;
}) {
  const starter = starterCode[language] ?? "";
  const [source, setSource] = useState<string>(() => readDraft(problemId, language, starter) ?? starter);
  const [busy, setBusy] = useState<"run" | "submit" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [customArgs, setCustomArgs] = useState("");
  const [tab, setTab] = useState<Tab>("result");
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const router = useRouter();
  const theme = useTheme();

  // Debounced local persistence, no server round-trip per keystroke.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (source === "") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey(problemId, language, starter), source);
      } catch {
        // Storage unavailable (private mode, quota). Drafts are a convenience.
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [source, problemId, language, starter]);

  // The confirm beat is a pause, not a dialog: it lapses on its own so nobody
  // is left staring at an armed button they no longer want to press.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const post = useCallback(
    async (path: string, extra?: Record<string, unknown>) => {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, language, source, ...extra }),
      });
      return response.json();
    },
    [problemId, language, source],
  );

  const onRun = async () => {
    setBusy("run");
    setConfirming(false);
    setSubmitResult(null);
    setTab("result");
    try {
      const extra = customArgs.trim() ? { customArgs } : undefined;
      setRunResult((await post("/api/run", extra)) as RunResponse);
    } catch {
      setRunResult({ ok: false, error: "INTERNAL" });
    } finally {
      setBusy(null);
    }
  };

  const onSubmit = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setBusy("submit");
    setRunResult(null);
    setTab("result");
    try {
      setSubmitResult((await post("/api/submit")) as SubmitResponse);
      // The new row is rendered on the server; refresh so History includes it.
      router.refresh();
    } catch {
      setSubmitResult({ ok: false, error: "INTERNAL" });
    } finally {
      setBusy(null);
    }
  };

  const onReset = () => {
    setSource(starter);
    try {
      window.localStorage.removeItem(draftKey(problemId, language, starter));
    } catch {
      // Storage unavailable; the editor content is reset either way.
    }
  };

  const disabled = busy !== null || !signedIn;
  const argsExample = samples[0]?.stdin ?? "[]";

  return (
    <div className="flex h-full min-h-0 flex-col p-3 pt-0 lg:pl-1.5">
      {/* The action strip sits on the bare ground, not in a panel. Run is flat
          and on the left; Submit carries the only pink on this half of the
          screen and sits at the far right, a full gutter away. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-2 py-2.5">
        <label className="sr-only" htmlFor="wit-language">
          Language
        </label>
        {/* The native arrow is the one piece of system chrome in an otherwise
            drawn icon set, so it is suppressed and replaced with ours. */}
        <span className="relative flex items-center">
          <select
            id="wit-language"
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as Language)}
            className="cursor-pointer appearance-none rounded-control bg-transparent py-1.5 pr-6 pl-2 text-sm font-medium text-ide-ink-2 outline-none transition hover:text-ide-ink"
          >
            {LANGUAGES.map((value) => (
              <option key={value} value={value}>
                {LANGUAGE_LABELS[value]}
              </option>
            ))}
          </select>
          <ChevronIcon className="pointer-events-none absolute right-1.5 h-3 w-3 rotate-90 text-ide-ink-3" />
        </span>

        <button
          type="button"
          onClick={onReset}
          disabled={busy !== null}
          title="Restore the starting code"
          className="flex items-center gap-1.5 rounded-control px-2 py-1.5 text-sm text-ide-ink-3 transition hover:text-ide-ink disabled:opacity-40"
        >
          <ResetIcon className="h-3.5 w-3.5" />
          Reset
        </button>

        {!signedIn && (
          <a
            href="/sign-in?next=/ide"
            className="rounded-control px-2.5 py-2 text-sm text-ide-accent-ink transition hover:bg-ide-accent-quiet"
          >
            Sign in to run or submit
          </a>
        )}

        <div className="flex w-full items-center gap-3 sm:ml-auto sm:w-auto sm:gap-5">
          <button
            type="button"
            onClick={onRun}
            disabled={disabled}
            className="flex flex-1 items-center justify-center gap-2 rounded-control bg-ide-panel px-4 py-2.5 text-sm font-medium text-ide-ink shadow-ide-panel transition hover:bg-ide-panel-2 disabled:opacity-40 disabled:shadow-none sm:min-w-30 sm:flex-none"
          >
            {busy === "run" ? (
              <Working label="Running" />
            ) : (
              <>
                <PlayIcon className="h-3.5 w-3.5" />
                Run
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled}
            className={`flex flex-1 items-center justify-center gap-2 rounded-control px-5 py-2.5 text-sm font-semibold transition disabled:opacity-40 disabled:shadow-none sm:min-w-36 sm:flex-none ${
              confirming
                ? "bg-ide-warn-quiet text-ide-warn"
                : "bg-ide-accent text-ide-on-accent hover:brightness-105"
            }`}
          >
            {busy === "submit" ? (
              <Working label="Judging" />
            ) : confirming ? (
              <>
                <CheckIcon className="h-3.5 w-3.5" />
                Yes, submit
              </>
            ) : (
              <>
                <SendIcon className="h-3.5 w-3.5" />
                Submit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unframed: the editor's own background is the page ground. */}
      <div className="min-h-0 flex-[3]">
        <MonacoEditor
          height="100%"
          theme={`wit-${theme}`}
          language={MONACO_LANGUAGE[language]}
          value={source}
          onChange={(value) => setSource(value ?? "")}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme("wit-light", MONACO_THEMES.light as never);
            monaco.editor.defineTheme("wit-dark", MONACO_THEMES.dark as never);
          }}
          options={{
            // The editor is hidden and shown by the tab strip below `lg`, and
            // resized by the split handle above it; without this it keeps
            // whatever size it had when it first mounted.
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 1.75,
            fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
            fontLigatures: true,
            padding: { top: 20, bottom: 24 },
            smoothScrolling: true,
            renderLineHighlight: "line",
            scrollBeyondLastLine: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { verticalSliderSize: 6, horizontalSliderSize: 6 },
            guides: { indentation: true },
            tabSize: 4,
          }}
        />
      </div>

      {/* The shelf: the one place on this half of the screen with depth,
          because it is the one place that answers you. */}
      <section className="mt-2 flex min-h-40 flex-[2] flex-col overflow-hidden rounded-panel bg-ide-panel shadow-ide-panel sm:min-h-56">
        <div className="flex shrink-0 items-center gap-0.5 px-3 pt-2.5">
          <TabButton active={tab === "result"} onClick={() => setTab("result")}>
            Result
          </TabButton>
          <TabButton active={tab === "custom"} onClick={() => setTab("custom")}>
            <BeakerIcon className="h-3.5 w-3.5" />
            Custom input
            {customArgs.trim() ? (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ide-accent" />
            ) : null}
          </TabButton>
          <TabButton active={tab === "history"} onClick={() => setTab("history")}>
            <HistoryIcon className="h-3.5 w-3.5" />
            Submissions
            {history.length > 0 && (
              <span className="tnum text-ide-ink-3">{history.length}</span>
            )}
          </TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "custom" ? (
            <CustomInput value={customArgs} onChange={setCustomArgs} example={argsExample} />
          ) : tab === "history" ? (
            <History entries={history} onRestore={setSource} signedIn={signedIn} />
          ) : (
            <Results run={runResult} submit={submitResult} busy={busy} />
          )}
        </div>
      </section>
    </div>
  );
}

function Working({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.75px] border-current border-t-transparent" />
      {label}…
    </span>
  );
}

function CustomInput({
  value,
  onChange,
  example,
}: {
  value: string;
  onChange: (value: string) => void;
  example: string;
}) {
  return (
    <div className="p-4">
      <p className="max-w-[62ch] text-sm leading-relaxed text-ide-ink-2">
        Try your function on anything you like. Write the arguments as a JSON
        array, one entry per parameter, and it runs beside the samples on your
        next <span className="font-medium text-ide-ink">Run</span>. It is
        never compared and never scored.
      </p>
      <label className="sr-only" htmlFor="custom-input">
        Your own arguments, as a JSON array
      </label>
      <textarea
        id="custom-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        spellCheck={false}
        placeholder={example}
        className="mt-3 w-full resize-none rounded-inset bg-ide-panel-2 p-3 font-mono text-sm text-ide-ink outline-none placeholder:text-ide-ink-3"
      />
      <button
        type="button"
        onClick={() => onChange(example)}
        className="mt-2 rounded-control px-2 py-2 text-xs text-ide-ink-3 transition hover:bg-ide-panel-2 hover:text-ide-ink-2"
      >
        Start from sample 1: <span className="font-mono">{example}</span>
      </button>
    </div>
  );
}

const VERDICT_LABEL: Record<string, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong answer",
  runtime_error: "Runtime error",
  time_limit_exceeded: "Time limit exceeded",
  compile_error: "Compilation error",
};

const verdictText = (verdict: string) => VERDICT_LABEL[verdict] ?? verdict.replace(/_/g, " ");

/** Why the verdict happened, in the participant's terms. Never leaks a hidden
 *  test, it names the failure mode, never the data. */
const VERDICT_HINT: Record<string, string> = {
  wrong_answer:
    "Your function returned something different from what was expected. The usual culprits are the edges: empty input, a single element, negatives, duplicates.",
  runtime_error: "Your code crashed part-way through. The output below has the line.",
  time_limit_exceeded:
    "Your code was still going when the clock ran out. Usually that means a loop that never ends, or a scan inside a scan on large input.",
  compile_error: "Your code didn't build. The compiler's own message is below.",
};

const VERDICT_TONE: Record<string, Tone> = {
  accepted: "pass",
  wrong_answer: "fail",
  runtime_error: "fail",
  compile_error: "fail",
  time_limit_exceeded: "warn",
};

function Results({
  run,
  submit,
  busy,
}: {
  run: RunResponse | null;
  submit: SubmitResponse | null;
  busy: "run" | "submit" | null;
}) {
  if (busy) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="h-5 w-5 animate-spin rounded-full border-[1.75px] border-ide-accent border-t-transparent" />
        <p className="text-sm font-medium text-ide-ink">
          {busy === "run" ? "Running your samples" : "Checking every test"}
        </p>
        <p className="text-xs text-ide-ink-3">Usually one to three seconds.</p>
      </div>
    );
  }

  if (run && !run.ok) return <Failure code={run.error} />;
  if (submit && !submit.ok) return <Failure code={submit.error} />;

  if (submit?.ok) {
    const accepted = submit.verdict === "accepted";
    const partial = !accepted && submit.passedCount > 0;
    const tone: Tone = accepted ? "pass" : partial ? "warn" : VERDICT_TONE[submit.verdict] ?? "fail";
    const pct = Math.round((submit.passedCount / submit.totalCount) * 100);

    return (
      <div className="settle p-5">
        {/* The one heroic line on this screen. It does not shrink. */}
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className={`font-ide-display text-2xl font-semibold tracking-tight sm:text-3xl ${TONE[tone].text}`}>
            {verdictText(submit.verdict)}
          </h2>
          <p className="tnum text-sm text-ide-ink-2">
            {submit.passedCount} of {submit.totalCount} tests passed
          </p>
          <p className="tnum ml-auto flex items-center gap-4 text-sm text-ide-ink-3">
            <span>{submit.score} points</span>
            <span>{submit.runtimeMs} ms</span>
          </p>
        </div>

        <div className="mt-3 flex h-1.5 gap-1 overflow-hidden" aria-hidden>
          {Array.from({ length: submit.totalCount }, (_, index) => (
            <span
              key={index}
              className={`h-full flex-1 rounded-full ${
                index < submit.passedCount ? TONE[tone].bar : "bg-ide-panel-3"
              }`}
            />
          ))}
        </div>

        <div className="settle-2 mt-4 max-w-[68ch] space-y-2 text-sm leading-relaxed text-ide-ink-2">
          {accepted ? (
            <p>
              Every test passed. Your best score on this problem is the one that
              counts, so nothing you try next can lower it, {pct}% is yours.
            </p>
          ) : (
            <>
              <p className="font-medium text-ide-ink">
                {/* Only the failing test's number: hidden test content is never shown. */}
                {submit.failedAt !== null
                  ? `The first one to fail was test ${submit.failedAt}.`
                  : "Some tests failed."}
              </p>
              {VERDICT_HINT[submit.verdict] && <p>{VERDICT_HINT[submit.verdict]}</p>}
              <p className="text-ide-ink-3">
                The tests themselves stay hidden, try the same shape of input
                yourself under <span className="text-ide-ink-2">Custom input</span>.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (run?.ok) {
    const samples = run.tests.filter((test) => !test.isCustom);
    const custom = run.tests.find((test) => test.isCustom);
    const allPassed = run.passedCount === run.totalCount;
    const tone: Tone = allPassed ? "pass" : run.passedCount > 0 ? "warn" : "fail";

    return (
      <div className="settle p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Mark tone={tone}>
            <span className="tnum">
              {run.passedCount} of {run.totalCount} samples passed
            </span>
          </Mark>
          <p className="ml-auto flex items-center gap-4 text-sm text-ide-ink-3">
            <span className="tnum">{run.runtimeMs} ms</span>
            <span>not scored</span>
          </p>
        </div>

        <div className="settle-2 mt-4 divide-y divide-ide-hairline border-t border-ide-hairline">
          {samples.map((test) => (
            <TestRow key={test.index} test={test} title={`Sample ${test.index + 1}`} />
          ))}
          {custom && <TestRow test={custom} title="Custom input" />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 p-6 text-center">
      <p className="text-sm font-medium text-ide-ink-2">Nothing run yet</p>
      <p className="max-w-md text-sm leading-relaxed text-ide-ink-3">
        <span className="text-ide-ink-2">Run</span> tries your code on the
        examples you can see. <span className="text-ide-ink-2">Submit</span> checks
        it against every test and records a score.
      </p>
    </div>
  );
}

/** A test reads as a line on a worksheet: what went in, what should come back,
 *  what yours returned, and, when it fails, a note in the margin. */
function TestRow({ test, title }: { test: RunTest; title: string }) {
  const tone: Tone = test.isCustom ? "info" : test.passed ? "pass" : VERDICT_TONE[test.verdict] ?? "fail";
  return (
    <div className="py-3.5">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="text-sm font-medium text-ide-ink">{title}</span>
        <Mark tone={tone}>
          {test.isCustom ? verdictText(test.verdict) : test.passed ? "Passed" : verdictText(test.verdict)}
        </Mark>
      </div>

      <div
        className={`grid gap-x-6 gap-y-2.5 font-mono text-xs ${
          test.isCustom ? "sm:grid-cols-2" : "sm:grid-cols-3"
        }`}
      >
        <Cell label="Input" value={test.stdin} />
        {!test.isCustom && <Cell label="Expected output" value={test.expected} />}
        <Cell label="Your output" value={test.actual} tone={test.isCustom ? undefined : tone} />
      </div>

      {test.stderr && (
        <div className="mt-3 border-l-[1px] border-ide-fail pl-3">
          <p className="mb-1 text-xs font-medium text-ide-ink-3">
            What your code printed and where it stopped
          </p>
          <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap text-ide-fail">
            {test.stderr}
          </pre>
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 font-sans text-xs text-ide-ink-3">{label}</p>
      <pre
        className={`overflow-x-auto rounded-inset bg-ide-panel-2 px-2.5 py-2 ${
          tone === "fail" ? "text-ide-fail" : tone === "pass" ? "text-ide-pass" : "text-ide-ink"
        }`}
      >
        {value || ", "}
      </pre>
    </div>
  );
}

function Failure({ code }: { code: string }) {
  const { title, body } = errorFor(code);
  const tone: Tone = code === "RATE_LIMITED" ? "warn" : "fail";
  const Icon = code === "RATE_LIMITED" ? PauseIcon : WrenchIcon;
  return (
    <div className="settle flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${TONE[tone].quiet} ${TONE[tone].text}`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-1 font-ide-display text-lg font-semibold">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-ide-ink-2">{body}</p>
    </div>
  );
}

function History({
  entries,
  onRestore,
  signedIn,
}: {
  entries: PastSubmission[];
  onRestore: (source: string) => void;
  signedIn: boolean;
}) {
  if (!signedIn) {
    return (
      <Placeholder title="Sign in to keep your submissions">
        Every submission is saved, so you can look back at what you tried and pick
        any of it up again.
      </Placeholder>
    );
  }
  if (entries.length === 0) {
    return (
      <Placeholder title="No submissions yet">
        Every submission is kept here with the code you sent
        newest first.
      </Placeholder>
    );
  }

  return (
    <ul className="divide-y divide-ide-hairline px-4 sm:px-5">
      {entries.map((entry) => {
        const tone: Tone =
          entry.status === "accepted" ? "pass" : entry.passedCount > 0 ? "warn" : "fail";
        return (
          <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3">
            <Mark tone={tone}>{verdictText(entry.status)}</Mark>
            <span className="tnum text-sm text-ide-ink-2">
              {entry.passedCount}/{entry.totalCount}
            </span>
            <span className="text-xs text-ide-ink-3">
              {LANGUAGE_LABELS[entry.language]}
            </span>
            <time
              dateTime={entry.createdAt}
              className="tnum text-xs text-ide-ink-3"
              suppressHydrationWarning
            >
              {new Date(entry.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
            <span className="tnum ml-auto text-sm text-ide-ink-2">{entry.score} pts</span>
            <button
              type="button"
              onClick={() => onRestore(entry.source)}
              className="rounded-control px-2.5 py-2 text-xs text-ide-ink-3 transition hover:bg-ide-panel hover:text-ide-accent"
            >
              Open in editor
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Placeholder({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 p-6 text-center">
      <p className="text-sm font-medium text-ide-ink-2">{title}</p>
      <p className="max-w-md text-sm leading-relaxed text-ide-ink-3">{children}</p>
    </div>
  );
}
