"use client";

import { useState, useTransition } from "react";

import { verifySolution, type VerifyResult } from "@/app/(admin)/admin/actions";
import { Mark, PrimaryButton, SecondaryButton, Spinner } from "@/components/ide/primitives";
import { LANGUAGES, LANGUAGE_LABELS, type Language } from "@/lib/languages";
import { starterFor } from "@/lib/problems/starter";
import type { Signature } from "@/lib/problems/signature";

/**
 * Runs a working solution against the author's own test cases on the real
 * judge. This is the only check that detects an incorrect expected answer;
 * structural validation cannot, because the problem is still well formed.
 */
export function VerifyStep({
  signature,
  tests,
  timeLimitMs,
  verified,
  onVerified,
}: {
  signature: Signature;
  tests: { stdin: string; expectedStdout: string; isSample: boolean }[];
  timeLimitMs: number;
  verified: boolean;
  onVerified: (passed: boolean) => void;
}) {
  const [language, setLanguage] = useState<Language>("python");
  const [source, setSource] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const outcome = await verifySolution({
        language,
        source,
        signature,
        tests: tests.map((test) => ({ stdin: test.stdin, expectedStdout: test.expectedStdout })),
        timeLimitMs,
      });
      setResult(outcome);
      onVerified(outcome.ok && outcome.passed === outcome.total);
    });

  return (
    <div className="space-y-4">
      <p className="max-w-[64ch] text-sm leading-relaxed text-ide-ink-2">
        Paste a working solution and run it against the test cases above. Any
        case that disagrees indicates an incorrect expected answer, which is
        worth correcting before the problem is used.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="verify-language">
          Language
        </label>
        <select
          id="verify-language"
          value={language}
          onChange={(event) => {
            setLanguage(event.target.value as Language);
            setResult(null);
          }}
          className="rounded-control bg-ide-panel-2 px-3 py-2 text-sm outline-none"
        >
          {LANGUAGES.map((value) => (
            <option key={value} value={value}>
              {LANGUAGE_LABELS[value]}
            </option>
          ))}
        </select>

        <SecondaryButton onClick={() => setSource(starterFor(language, signature))}>
          Insert starting code
        </SecondaryButton>

        <PrimaryButton
          disabled={pending || source.trim().length === 0 || tests.length === 0}
          onClick={run}
          className="ml-auto"
        >
          {pending && <Spinner />}
          {pending ? "Running…" : "Run against test cases"}
        </PrimaryButton>
      </div>

      <label className="sr-only" htmlFor="verify-source">
        Reference solution
      </label>
      <textarea
        id="verify-source"
        value={source}
        onChange={(event) => {
          setSource(event.target.value);
          setResult(null);
        }}
        rows={12}
        spellCheck={false}
        placeholder={`Paste a working ${LANGUAGE_LABELS[language]} solution here.`}
        className="w-full rounded-inset bg-ide-panel-2 p-3 font-mono text-sm leading-relaxed text-ide-ink outline-none placeholder:text-ide-ink-3"
      />

      {result && !result.ok && (
        <ul role="alert" className="space-y-1 rounded-inset bg-ide-fail-quiet px-3 py-2 text-sm text-ide-fail">
          {result.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {result?.ok && (
        <div role="status" aria-live="polite" className="settle rounded-inset bg-ide-panel-2 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            {result.passed === result.total ? (
              <Mark tone="pass">All test cases agree with this solution</Mark>
            ) : (
              <Mark tone="fail">
                {result.total - result.passed} case
                {result.total - result.passed === 1 ? "" : "s"} disagree with this solution
              </Mark>
            )}
            <span className="tnum ml-auto text-xs font-normal text-ide-ink-3">
              {result.passed}/{result.total} · {result.runtimeMs} ms
            </span>
          </p>

          {result.passed !== result.total && (
            <>
              <p className="mt-2 text-xs leading-relaxed text-ide-ink-2">
                Either the expected answer or the solution is incorrect.
                Correct it and run again.
              </p>
              <ul className="mt-3 divide-y divide-ide-hairline border-t border-ide-hairline">
                {result.tests
                  .filter((test) => !test.passed)
                  .map((test) => (
                    <li key={test.index} className="py-2.5">
                      <p className="text-xs font-medium">
                        Case {test.index + 1}
                        {tests[test.index]?.isSample ? " (shown)" : " (hidden)"} ·{" "}
                        <span className="text-ide-fail">{test.verdict.replace(/_/g, " ")}</span>
                      </p>
                      <div className="mt-1.5 grid gap-2 font-mono text-xs sm:grid-cols-3">
                        <Cell label="Input" value={tests[test.index]?.stdin ?? ""} />
                        <Cell label="Expected" value={test.expected} />
                        <Cell label="Solution returned" value={test.actual} tone />
                      </div>
                      {test.stderr && (
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-ide-fail-quiet p-2 font-mono text-xs whitespace-pre-wrap text-ide-fail">
                          {test.stderr.slice(0, 400)}
                        </pre>
                      )}
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      )}

      {!result && verified && (
        <p className="rounded-inset bg-ide-pass-quiet px-3 py-2 text-sm text-ide-pass">
          Verified. The test cases agree with a working solution.
        </p>
      )}
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 font-sans text-ide-ink-3">{label}</p>
      <pre className={`overflow-x-auto rounded-lg bg-ide-panel px-2 py-1.5 ${tone ? "text-ide-fail" : "text-ide-ink"}`}>
        {value || "—"}
      </pre>
    </div>
  );
}
