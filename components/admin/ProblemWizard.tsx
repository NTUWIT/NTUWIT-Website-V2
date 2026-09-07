"use client";

import { useMemo, useState, useTransition } from "react";

import { removeProblem, saveProblem, type ActionResult } from "@/app/(admin)/admin/actions";
import { useRouter } from "next/navigation";
import { Feedback } from "./Console";
import { PARAM_TYPES, type ParamType } from "@/lib/problems/signature";
import { expectedForm, matchesType } from "@/lib/problems/validate";
import { starterFor } from "@/lib/problems/starter";

const STEPS = [
  { name: "Name it", asks: "What is this problem called, and what is it worth?" },
  { name: "The function", asks: "What does a participant have to write?" },
  { name: "The brief", asks: "What are you asking them to do?" },
  { name: "Examples", asks: "What goes in, and what should come back?" },
  { name: "Check", asks: "Does it hold together?" },
] as const;
type Step = (typeof STEPS)[number]["name"];

type Param = { name: string; type: ParamType };
type Test = { stdin: string; expectedStdout: string; isSample: boolean };

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** A concrete value per type, so the Examples step can show the real shape. */
const EXAMPLE_VALUE: Record<ParamType, string> = {
  int: "42",
  double: "2.5",
  bool: "true",
  string: '"hello"',
  "int[]": "[1, 2, 3]",
  "double[]": "[1.5, 2.5]",
  "bool[]": "[true, false]",
  "string[]": '["a", "b"]',
  "int[][]": "[[1, 2], [3, 4]]",
};

/** Human wording for each type, so nobody has to guess what `int[][]` wants. */
const TYPE_HELP: Record<ParamType, string> = {
  int: "a whole number, e.g. 42",
  double: "a decimal number, e.g. 2.5",
  bool: "true or false",
  string: "text, e.g. hello",
  "int[]": "a list of whole numbers, e.g. [1, 2, 3]",
  "double[]": "a list of decimals, e.g. [1.5, 2.5]",
  "bool[]": "a list of true/false, e.g. [true, false]",
  "string[]": 'a list of text, e.g. ["a", "b"]',
  "int[][]": "a grid of whole numbers, e.g. [[1, 2], [3, 4]]",
};

export type ExistingProblem = {
  id: string;
  setId: string | null;
  title: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  timeLimitMs: number;
  order: number;
  statementMd: string;
  signature: { name: string; params: Param[]; returns: ParamType };
  tests: Test[];
  attempts: number;
};

export function ProblemWizard({ existing }: { existing?: ExistingProblem }) {
  const editing = existing !== undefined;
  const router = useRouter();
  const [step, setStep] = useState<Step>("Name it");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(existing?.difficulty ?? "easy");
  const [points, setPoints] = useState(existing?.points ?? 100);
  const [timeLimitMs, setTimeLimitMs] = useState(existing?.timeLimitMs ?? 5000);
  const [order, setOrder] = useState(existing?.order ?? 0);

  const [fnName, setFnName] = useState(existing?.signature.name ?? "");
  const [params, setParams] = useState<Param[]>(
    existing?.signature.params ?? [{ name: "nums", type: "int[]" }],
  );
  const [returns, setReturns] = useState<ParamType>(existing?.signature.returns ?? "int");

  const [statementMd, setStatementMd] = useState(existing?.statementMd ?? "");
  const [tests, setTests] = useState<Test[]>(
    existing?.tests ?? [{ stdin: "", expectedStdout: "", isSample: true }],
  );

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const signature = { name: fnName, params, returns };

  /**
   * The same rules the server enforces, checked as you type so a mistake is
   * caught next to the field that caused it rather than on submit.
   */
  const testProblems = useMemo(
    () =>
      tests.map((test) => {
        if (!test.stdin.trim()) return "Arguments are empty.";
        let args: unknown;
        try {
          args = JSON.parse(test.stdin);
        } catch {
          return "Arguments are not valid JSON. Wrap them in [ ].";
        }
        if (!Array.isArray(args)) return "Arguments must be a JSON array.";
        if (args.length !== params.length) {
          return `${args.length} argument${args.length === 1 ? "" : "s"} given, the function takes ${params.length}.`;
        }
        for (const [index, param] of params.entries()) {
          if (!matchesType(args[index], param.type)) {
            return `Argument ${index + 1} (${param.name}) should be ${TYPE_HELP[param.type]}.`;
          }
        }
        if (!test.expectedStdout.trim()) return "The expected answer is empty.";
        if (returns !== "double" && returns !== "bool") {
          let parsed: unknown;
          try {
            parsed = JSON.parse(test.expectedStdout);
          } catch {
            return returns === "string"
              ? 'A text answer must be quoted, e.g. "hello".'
              : "The expected answer is not valid JSON.";
          }
          if (!matchesType(parsed, returns)) {
            return `The expected answer should be ${TYPE_HELP[returns]}.`;
          }
          const canonical = expectedForm(parsed, returns);
          if (canonical !== test.expectedStdout.trim()) {
            return `Write it exactly as the judge prints it: ${canonical}`;
          }
        }
        return null;
      }),
    [tests, params, returns],
  );

  const problemsByStep: Record<Step, string[]> = {
    "Name it": [
      title.trim().length < 3 ? "Give the problem a title." : null,
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(effectiveSlug) ? "The URL name looks wrong." : null,
      points <= 0 ? "Points must be positive." : null,
      timeLimitMs < 500 || timeLimitMs > 7000
        ? "The time limit must be between 500ms and 7000ms. The judge refuses anything above that."
        : null,
    ].filter((x): x is string => x !== null),
    "The function": [
      !/^[a-z][a-z0-9_]*$/.test(fnName) ? "The function name must be snake_case, e.g. count_vowels." : null,
      params.some((p) => !/^[a-z][a-z0-9_]*$/.test(p.name))
        ? "Every parameter needs a snake_case name."
        : null,
      new Set(params.map((p) => p.name)).size !== params.length
        ? "Two parameters share a name."
        : null,
    ].filter((x): x is string => x !== null),
    "The brief": statementMd.trim().length < 20 ? ["Write a statement so participants know what to do."] : [],
    Examples: [
      tests.length === 0 ? "Add at least one test case." : null,
      !tests.some((t) => t.isSample) ? "Show at least one example to participants." : null,
      ...testProblems.map((problem, index) => (problem ? `Test ${index + 1}: ${problem}` : null)),
    ].filter((x): x is string => x !== null),
    Check: [],
  };

  const blocking = STEPS.flatMap((s) => problemsByStep[s.name]);
  const stepIndex = STEPS.findIndex((s) => s.name === step);
  const current = STEPS[stepIndex]!;

  const submit = () =>
    startTransition(async () => {
      setResult(
        await saveProblem({
          ...(existing ? { id: existing.id } : {}),
          setId: existing?.setId ?? null,
          title: title.trim(),
          slug: effectiveSlug,
          difficulty,
          points,
          timeLimitMs,
          memoryLimitKb: 131072,
          order,
          statementMd,
          signature,
          tests: tests.map((test) => ({
            stdin: test.stdin.trim(),
            expectedStdout: test.expectedStdout.trim(),
            isSample: test.isSample,
          })),
        }),
      );
    });

  return (
    <div className="mt-8">
      {/* Progress reads as a sentence, not a set of tabs: a first-time author
          should know where they are and what this step is asking. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="tnum text-xs text-ide-ink-3">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h2 className="font-ide-display text-xl font-semibold tracking-tight">{current.name}</h2>
        <p className="text-sm text-ide-ink-2">{current.asks}</p>
      </div>

      <div className="mt-3 flex gap-1" aria-hidden>
        {STEPS.map((entry, index) => {
          const issues = problemsByStep[entry.name].length;
          const visited = index <= stepIndex;
          return (
            <button
              key={entry.name}
              type="button"
              onClick={() => setStep(entry.name)}
              title={entry.name}
              className={`h-1.5 flex-1 rounded-full transition ${
                index === stepIndex
                  ? "bg-ide-accent"
                  : visited && issues > 0
                    ? "bg-ide-fail"
                    : visited
                      ? "bg-ide-pass"
                      : "bg-ide-panel-3"
              }`}
            />
          );
        })}
      </div>

      <div className="mt-4 rounded-panel bg-ide-panel p-6 shadow-ide-panel">
        {step === "Name it" && (
          <div className="space-y-5">
            <Field label="Title" hint="What participants see at the top of the problem.">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Sum of Numbers"
                className={inputClass}
              />
            </Field>
            <Field label="URL name" hint="Appears in the address bar. Generated from the title.">
              <input
                value={effectiveSlug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
                placeholder="sum-of-numbers"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Difficulty">
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}
                  className={inputClass}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </Field>
              <Field label="Points">
                <input
                  type="number"
                  value={points}
                  onChange={(event) => setPoints(Number(event.target.value))}
                  className={`${inputClass} tnum`}
                />
              </Field>
              <Field label="Order" hint="Lower shows first.">
                <input
                  type="number"
                  value={order}
                  onChange={(event) => setOrder(Number(event.target.value))}
                  className={`${inputClass} tnum`}
                />
              </Field>
            </div>
            <Field
              label="Time limit per test"
              hint="5000ms is the default. Java spends roughly 2.7s of it starting up, so do not go below 4000ms if you expect Java submissions."
            >
              <input
                type="number"
                step={500}
                value={timeLimitMs}
                onChange={(event) => setTimeLimitMs(Number(event.target.value))}
                className={`${inputClass} tnum`}
              />
            </Field>
          </div>
        )}

        {step === "The function" && (
          <div className="space-y-5">
            <p className="max-w-[62ch] text-sm leading-relaxed text-ide-ink-2">
              Participants write one function. The platform generates the code
              that reads the arguments and prints the answer, in all four
              languages, so nobody loses points to input parsing.
            </p>
            <Field label="Function name" hint="snake_case. Converted automatically for each language.">
              <input
                value={fnName}
                onChange={(event) => setFnName(event.target.value)}
                placeholder="sum_of_numbers"
                className={`${inputClass} font-mono`}
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium">Parameters</p>
              <div className="space-y-2">
                {params.map((param, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <input
                      value={param.name}
                      onChange={(event) =>
                        setParams(params.map((p, i) => (i === index ? { ...p, name: event.target.value } : p)))
                      }
                      placeholder="nums"
                      className={`${inputClass} font-mono max-w-48`}
                    />
                    <select
                      value={param.type}
                      onChange={(event) =>
                        setParams(
                          params.map((p, i) =>
                            i === index ? { ...p, type: event.target.value as ParamType } : p,
                          ),
                        )
                      }
                      className={`${inputClass} max-w-44`}
                    >
                      {PARAM_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-ide-ink-3">{TYPE_HELP[param.type]}</span>
                    <button
                      type="button"
                      onClick={() => setParams(params.filter((_, i) => i !== index))}
                      className="ml-auto text-xs text-ide-ink-3 transition hover:text-ide-fail"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setParams([...params, { name: "", type: "int" }])}
                className="mt-3 rounded-control bg-ide-panel-2 px-3 py-1.5 text-sm transition hover:bg-ide-panel-3"
              >
                Add a parameter
              </button>
            </div>

            <div className="rounded-inset bg-ide-panel-2 p-4">
              <p className="mb-2 text-xs text-ide-ink-3">
                This is what a participant opens, generated from the fields
                above. It is written for all four languages; Python is shown.
              </p>
              <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap text-ide-ink">
                {fnName
                  ? starterFor("python", signature)
                  : "Name the function to see the starting code."}
              </pre>
            </div>

            <Field label="Returns">
              <select
                value={returns}
                onChange={(event) => setReturns(event.target.value as ParamType)}
                className={`${inputClass} max-w-44`}
              >
                {PARAM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === "The brief" && (
          <div className="space-y-3">
            <Field
              label="Statement"
              hint="Markdown. Headings, lists, bold and code all work. Worked examples are added from your test cases automatically, so you do not need to repeat them here."
            >
              <textarea
                value={statementMd}
                onChange={(event) => setStatementMd(event.target.value)}
                rows={14}
                placeholder={"Return the sum of the given integers.\n\n### Constraints\n\n- The list has at most 1000 numbers."}
                className={`${inputClass} font-mono text-sm leading-relaxed`}
              />
            </Field>
          </div>
        )}

        {step === "Examples" && (
          <div className="space-y-4">
            <div className="rounded-inset bg-ide-panel-2 p-4 text-sm leading-relaxed text-ide-ink-2">
              <p>
                Each case is the arguments going in and the answer coming back.
                Arguments are a JSON array with one entry per parameter, so a
                function taking{" "}
                {params.length === 1 ? "one list" : `${params.length} values`}{" "}
                is written{" "}
                <code className="rounded bg-ide-panel px-1.5 py-0.5 font-mono text-xs text-ide-ink">
                  {`[${params.map((p) => EXAMPLE_VALUE[p.type]).join(", ")}]`}
                </code>
                .
              </p>
              <p className="mt-2">
                Shown cases appear in the problem as worked examples. Hidden
                ones only score, and never reach the browser. Scoring is
                proportional, so more hidden cases means a fairer mark.
              </p>
            </div>

            <div className="space-y-3">
              {tests.map((test, index) => (
                <div key={index} className="rounded-inset bg-ide-panel-2 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-sm font-medium">Test {index + 1}</span>
                    <label className="flex items-center gap-1.5 text-xs text-ide-ink-2">
                      <input
                        type="checkbox"
                        checked={test.isSample}
                        onChange={(event) =>
                          setTests(
                            tests.map((t, i) =>
                              i === index ? { ...t, isSample: event.target.checked } : t,
                            ),
                          )
                        }
                        className="h-3.5 w-3.5 accent-[var(--ide-accent)]"
                      />
                      Show to participants
                    </label>
                    <button
                      type="button"
                      onClick={() => setTests(tests.filter((_, i) => i !== index))}
                      className="ml-auto text-xs text-ide-ink-3 transition hover:text-ide-fail"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs text-ide-ink-3">
                        Arguments ({params.length === 0 ? "no parameters" : params.map((p) => p.name).join(", ")})
                      </span>
                      <input
                        value={test.stdin}
                        onChange={(event) =>
                          setTests(tests.map((t, i) => (i === index ? { ...t, stdin: event.target.value } : t)))
                        }
                        placeholder={`[${params.map((p) => EXAMPLE_VALUE[p.type]).join(", ")}]`}
                        className={`${inputClass} font-mono text-sm`}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-ide-ink-3">
                        Expected answer ({returns})
                      </span>
                      <input
                        value={test.expectedStdout}
                        onChange={(event) =>
                          setTests(
                            tests.map((t, i) =>
                              i === index ? { ...t, expectedStdout: event.target.value } : t,
                            ),
                          )
                        }
                        placeholder={EXAMPLE_VALUE[returns]}
                        className={`${inputClass} font-mono text-sm`}
                      />
                    </label>
                  </div>

                  {testProblems[index] && (
                    <p className="mt-2 text-xs text-ide-fail">{testProblems[index]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTests([...tests, { stdin: "", expectedStdout: "", isSample: false }])}
                className="rounded-control bg-ide-panel-2 px-3 py-1.5 text-sm transition hover:bg-ide-panel-3"
              >
                Add a hidden test
              </button>
              <button
                type="button"
                onClick={() => setTests([...tests, { stdin: "", expectedStdout: "", isSample: true }])}
                className="rounded-control bg-ide-panel-2 px-3 py-1.5 text-sm transition hover:bg-ide-panel-3"
              >
                Add a shown example
              </button>
            </div>
          </div>
        )}

        {step === "Check" && (
          <div className="space-y-4">
            <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <Summary label="Title" value={title || "—"} />
              <Summary label="URL" value={`/ide?problem=${effectiveSlug}`} mono />
              <Summary label="Difficulty" value={difficulty} />
              <Summary label="Points" value={String(points)} />
              <Summary label="Time limit" value={`${timeLimitMs} ms per test`} />
              <Summary
                label="Function"
                mono
                value={`${fnName || "?"}(${params.map((p) => `${p.name}: ${p.type}`).join(", ")}) -> ${returns}`}
              />
              <Summary
                label="Tests"
                value={`${tests.length} total, ${tests.filter((t) => t.isSample).length} shown`}
              />
            </dl>

            {blocking.length > 0 ? (
              <ul className="space-y-1 rounded-inset bg-ide-fail-quiet px-3 py-2 text-sm text-ide-fail">
                {blocking.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            ) : (
              <p className="rounded-inset bg-ide-pass-quiet px-3 py-2 text-sm text-ide-pass">
                {editing
                  ? "Everything checks out."
                  : "Everything checks out. The problem is only visible once its set is activated."}
              </p>
            )}

            {editing && existing.attempts > 0 && (
              <p className="rounded-inset bg-ide-warn-quiet px-3 py-2 text-sm text-ide-warn">
                {existing.attempts} attempt{existing.attempts === 1 ? " has" : "s have"} already
                been made on this problem. Changing the tests changes what those
                attempts would have scored; scores already recorded are not
                recalculated.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={pending || blocking.length > 0}
                onClick={submit}
                className="rounded-control bg-ide-accent px-5 py-2.5 text-sm font-semibold text-ide-on-accent transition hover:brightness-105 disabled:opacity-40"
              >
                {pending ? "Saving…" : editing ? "Save changes" : "Create problem"}
              </button>

              {editing && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirmingDelete) {
                      startTransition(async () => {
                        const outcome = await removeProblem(existing.id);
                        setResult(outcome);
                        setConfirmingDelete(false);
                        if (outcome.ok) router.push("/admin");
                      });
                      return;
                    }
                    setConfirmingDelete(true);
                  }}
                  className={`rounded-control px-4 py-2.5 text-sm transition disabled:opacity-40 ${
                    confirmingDelete
                      ? "bg-ide-fail-quiet font-medium text-ide-fail"
                      : "text-ide-ink-3 hover:text-ide-fail"
                  }`}
                >
                  {confirmingDelete ? "Really delete it?" : "Delete problem"}
                </button>
              )}
            </div>

            {result && <Feedback result={result} />}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setStep(STEPS[stepIndex - 1]!.name)}
          className="rounded-control px-3 py-2 text-sm text-ide-ink-3 transition hover:text-ide-ink disabled:opacity-40"
        >
          Back
        </button>
        {problemsByStep[step].length > 0 && (
          <p className="text-xs text-ide-fail">{problemsByStep[step][0]}</p>
        )}
        <button
          type="button"
          disabled={stepIndex === STEPS.length - 1}
          onClick={() => setStep(STEPS[stepIndex + 1]!.name)}
          className="rounded-control bg-ide-accent px-5 py-2 text-sm font-medium text-ide-on-accent transition hover:brightness-105 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-control bg-ide-panel-2 px-3 py-2 text-ide-ink outline-none placeholder:text-ide-ink-3";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {hint && <span className="mb-2 block max-w-[62ch] text-xs text-ide-ink-3">{hint}</span>}
      {children}
    </label>
  );
}

function Summary({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ide-ink-3">{label}</dt>
      <dd className={`mt-0.5 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
