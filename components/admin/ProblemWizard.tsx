"use client";

import { useState, useTransition } from "react";

import { removeProblem, saveProblem, type ActionResult } from "@/app/(admin)/admin/actions";
import { GhostButton, PrimaryButton, SecondaryButton, TabButton } from "@/components/ide/primitives";
import { ReadinessPanel, type ReadinessItem } from "./ReadinessPanel";
import { VerifyStep } from "./VerifyStep";
import { useRouter } from "next/navigation";
import { Feedback } from "./Console";
import {
  isDesign,
  MUTABLE_TYPES,
  PARAM_TYPES,
  RETURN_TYPES,
  type Method,
  type Param,
  type ParamType,
  type ReturnType,
  type Signature,
} from "@/lib/problems/signature";
import { checkArguments, checkExpected } from "@/lib/problems/validate";
import { LANGUAGES, type Language } from "@/lib/languages";
import { starterFor } from "@/lib/problems/starter";

const STEPS = [
  { name: "Details", asks: "Title, difficulty and scoring." },
  { name: "Function", asks: "The function participants are asked to write." },
  { name: "Description", asks: "The problem statement participants read." },
  { name: "Test cases", asks: "Inputs and the answers they should produce." },
  { name: "Verify", asks: "Check the test cases against a working solution." },
  { name: "Review", asks: "Confirm and save." },
] as const;
type Step = (typeof STEPS)[number]["name"];

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
  char: '"a"',
  "char[]": '["a", "b"]',
  "char[][]": '[["a", "b"], ["c", "d"]]',
  "string[][]": '[["a", "b"], ["c"]]',
  "map<string,int>": '{"a": 2, "b": 1}',
  ListNode: "[1, 2, 3]",
  TreeNode: "[3, 9, 20, null, null, 15, 7]",
  NaryTree: "[1, null, 3, 2, 4, null, 5, 6]",
  RandomList: "[[7, null], [13, 0], [11, 4]]",
  Graph: "[[2, 4], [1, 3], [2, 4], [1, 3]]",
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
  "int[][]": "a grid or graph of whole numbers, e.g. [[1, 2], [3, 4]]",
  char: 'a single character, e.g. "a"',
  "char[]": 'a list of characters, e.g. ["a", "b"]',
  "char[][]": 'a grid of characters, e.g. [["a", "b"], ["c", "d"]]',
  "string[][]": 'a grid or groups of text, e.g. [["a", "b"], ["c"]]',
  "map<string,int>": 'text keys to whole numbers, e.g. {"a": 2, "b": 1}',
  ListNode: 'a linked list written as its values, e.g. [1, 2, 3], or {"values": [3, 2, 0], "cycleAt": 1} for one whose tail links back to node 1',
  TreeNode: "a binary tree in level order with null for gaps, e.g. [3, 9, 20, null, null, 15, 7]",
  NaryTree: "an N-ary tree in level order, each node's children followed by null, e.g. [1, null, 3, 2, 4, null, 5, 6]",
  RandomList: "a list whose nodes also point anywhere in it: [value, index of the random node or null] per node",
  Graph: "an undirected graph as an adjacency list; node i+1 is row i, and the function receives node 1",
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
  signature: Signature;
  tests: Test[];
  attempts: number;
};

export function ProblemWizard({ existing }: { existing?: ExistingProblem }) {
  const editing = existing !== undefined;
  const router = useRouter();
  const [step, setStep] = useState<Step>("Details");
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

  const [kind, setKind] = useState<"function" | "class">(
    existing && isDesign(existing.signature) ? "class" : "function",
  );
  const [fnName, setFnName] = useState(existing?.signature.name ?? "");
  const [params, setParams] = useState<Param[]>(
    existing?.signature.params ?? [{ name: "nums", type: "int[]" }],
  );
  const [returns, setReturns] = useState<ReturnType>(existing?.signature.returns ?? "int");
  const [mutates, setMutates] = useState(existing?.signature.mutates ?? "");
  const [unordered, setUnordered] = useState<boolean | "deep">(existing?.signature.unordered ?? false);
  const [hidden, setHidden] = useState<Param[]>(existing?.signature.hidden ?? []);
  const [providedFns, setProvidedFns] = useState<Method[]>(existing?.signature.provided?.functions ?? []);
  const [providedCode, setProvidedCode] = useState<Record<Language, string>>(
    existing?.signature.provided?.code ?? { python: "", javascript: "", cpp: "", java: "" },
  );
  const [codeTab, setCodeTab] = useState<Language>("python");
  const [checker, setChecker] = useState(existing?.signature.checker ?? "");
  const [methods, setMethods] = useState<Method[]>(
    existing?.signature.methods ?? [{ name: "", params: [], returns: "int" }],
  );

  const [statementMd, setStatementMd] = useState(existing?.statementMd ?? "");
  const [tests, setTests] = useState<Test[]>(
    existing?.tests ?? [{ stdin: "", expectedStdout: "", isSample: true }],
  );
  const [bulk, setBulk] = useState("");
  // What was verified, not whether: editing anything the judge saw has to
  // invalidate the result, and comparing a fingerprint says that directly
  // rather than syncing a boolean from an effect.
  const [verifiedShape, setVerifiedShape] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const design = kind === "class";
  // What a function problem prints: its return value, or for an in-place
  // problem the final value of the argument it changes.
  const answer: ParamType | null = design
    ? null
    : returns === "void"
      ? (params.find((p) => p.name === mutates)?.type ?? null)
      : returns;
  // Only a list can be compared in any order.
  const canBeUnordered = answer !== null && (answer.endsWith("[]") || answer === "ListNode");
  const signature: Signature = design
    ? { name: fnName, params, returns: "void", methods }
    : {
        name: fnName,
        params,
        returns,
        ...(returns === "void" ? { mutates } : {}),
        ...(canBeUnordered && unordered ? { unordered } : {}),
        ...(providedFns.length > 0 ? { hidden, provided: { functions: providedFns, code: providedCode } } : {}),
        ...(checker.trim() ? { checker } : {}),
      };
  const shape = JSON.stringify({ tests, signature, timeLimitMs });
  const verified = verifiedShape === shape;

  /**
   * The same rules the server enforces, checked as you type so a mistake is
   * caught next to the field that caused it rather than on submit.
   */
  const testProblems = tests.map((test) => {
    if (!test.stdin.trim()) return "Arguments are empty.";
    let args: unknown;
    try {
      args = JSON.parse(test.stdin);
    } catch {
      return "Arguments are not valid JSON. Wrap them in [ ].";
    }
    return checkArguments(signature, args) ?? checkExpected(signature, test.expectedStdout, args);
  });

  const describe = (list: Param[]) => list.map((p) => `${p.name}: ${p.type}`).join(", ");
  const signatureLine = design
    ? `class ${fnName || "?"}(${describe(params)}) { ${methods.map((m) => `${m.name}(${describe(m.params)}) -> ${m.returns}`).join("; ")} }`
    : `${fnName || "?"}(${describe(params)}) -> ${returns === "void" ? `void, answer is ${mutates || "?"}` : returns}`;
  const argsExample = design
    ? `[["${fnName || "MinStack"}", "${methods[0]?.name || "push"}"], [[${params.map((p) => EXAMPLE_VALUE[p.type]).join(", ")}], [${(methods[0]?.params ?? []).map((p) => EXAMPLE_VALUE[p.type]).join(", ")}]]]`
    : `[${[...params, ...hidden].map((p) => EXAMPLE_VALUE[p.type]).join(", ")}]`;
  const answerExample = design
    ? `[null, ${methods[0] && methods[0].returns !== "void" ? EXAMPLE_VALUE[methods[0].returns] : "null"}]`
    : answer
      ? EXAMPLE_VALUE[answer]
      : "";

  const problemsByStep: Record<Step, string[]> = {
    "Details": [
      title.trim().length < 3 ? "Give the problem a title." : null,
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(effectiveSlug) ? "The URL name looks wrong." : null,
      points <= 0 ? "Points must be positive." : null,
      timeLimitMs < 500 || timeLimitMs > 7000
        ? "The time limit must be between 500ms and 7000ms. The judge refuses anything above that."
        : null,
    ].filter((x): x is string => x !== null),
    "Function": [
      design
        ? !/^[A-Z][A-Za-z0-9]*$/.test(fnName)
          ? "The class name must be PascalCase, e.g. MinStack."
          : null
        : !/^[a-z][a-z0-9_]*$/.test(fnName)
          ? "The function name must be snake_case, e.g. count_vowels."
          : null,
      [params, ...(design ? methods.map((m) => m.params) : [])].flat().some((p) => !/^[a-z][a-z0-9_]*$/.test(p.name))
        ? "Every parameter needs a snake_case name."
        : null,
      [params, ...(design ? methods.map((m) => m.params) : [])].some((list) => new Set(list.map((p) => p.name)).size !== list.length)
        ? "Two parameters share a name."
        : null,
      design && methods.some((m) => !/^[a-z][a-z0-9_]*$/.test(m.name))
        ? "Every method needs a snake_case name, e.g. get_min."
        : null,
      design && new Set(methods.map((m) => m.name)).size !== methods.length ? "Two methods share a name." : null,
      !design && providedFns.some((f) => !/^[a-z][a-z0-9_]*$/.test(f.name))
        ? "Every provided function needs a snake_case name, e.g. is_bad_version."
        : null,
      !design && providedFns.length > 0 && LANGUAGES.some((l) => !providedCode[l].trim())
        ? "Write the provided functions in all four languages."
        : null,
      !design && providedFns.length > 0 && !/\bclass\s+Provided\b/.test(providedCode.java)
        ? "The Java provided code must declare class Provided."
        : null,
      !design && hidden.length > 0 && providedFns.length === 0
        ? "Hidden values need a provided function to read them."
        : null,
      !design && checker.trim() && !/\bdef\s+check\s*\(/.test(checker)
        ? "The checker must define check(args, expected, actual)."
        : null,
      !design && returns === "void" && !params.some((p) => p.name === mutates && MUTABLE_TYPES.includes(p.type))
        ? "Choose the list or grid the function changes; its final value is the answer."
        : null,
    ].filter((x): x is string => x !== null),
    "Description": statementMd.trim().length < 20 ? ["Write a statement so participants know what to do."] : [],
    Verify: [],
    Review: [],
    "Test cases": [
      tests.length === 0 ? "Add at least one test case." : null,
      !tests.some((t) => t.isSample) ? "Show at least one example to participants." : null,
      ...testProblems.map((problem, index) => (problem ? `Test ${index + 1}: ${problem}` : null)),
    ].filter((x): x is string => x !== null),
  };

  const samples = tests.filter((test) => test.isSample).length;

  const readiness: ReadinessItem[] = [
    { label: "Details", step: "Details",
      detail: title.trim() ? `${title.trim()} · ${points} pts` : "no title",
      state: problemsByStep["Details"].length === 0 ? "done" : "todo" },
    { label: "Function", step: "Function",
      detail: !fnName
        ? "not defined"
        : design
          ? `${fnName}, ${methods.length} method${methods.length === 1 ? "" : "s"}`
          : `${fnName}, ${params.length} parameter${params.length === 1 ? "" : "s"}`,
      state: problemsByStep["Function"].length === 0 ? "done" : "todo" },
    { label: "Description", step: "Description",
      detail: statementMd.trim() ? `${statementMd.trim().split(/\s+/).length} words` : "not written",
      state: problemsByStep["Description"].length === 0 ? "done" : "todo" },
    { label: "Test cases", step: "Test cases",
      detail: `${tests.length} case${tests.length === 1 ? "" : "s"}, ${samples} shown`,
      state: problemsByStep["Test cases"].length === 0 ? "done" : "todo" },
    { label: "Verified", step: "Verify",
      detail: verified ? "test cases confirmed" : "not yet run",
      state: verified ? "done" : "warn" },
  ];

  // HackerRank's quality review, in our own terms. Advisory only.
  const advice = [
    tests.length < 3 ? "Three or more test cases gives partial credit meaningful resolution." : null,
    tests.length > 15 ? "More than fifteen cases is slow to judge, particularly in Java." : null,
    samples < 2 ? "Two shown examples are more helpful than one." : null,
    tests.length > 0 && tests.every((t) => t.stdin.length < 12)
      ? "All cases use small inputs. Add a larger one to catch slow solutions."
      : null,
  ].filter((line): line is string => line !== null);

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
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_16rem] lg:items-start">
      <div>
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

      <div className="mt-4 rounded-panel bg-ide-panel p-4 shadow-ide-panel sm:p-6">
        {step === "Details" && (
          <div className="space-y-6">
            <Field label="Title" hint="Shown at the top of the problem.">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Sum of Numbers"
                className={inputClass}
              />
            </Field>

            <Field label="URL name" hint="Used in the address. Generated from the title.">
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

            {/* Every field in a row carries a hint, so the labels, controls and
                hints line up instead of stepping. */}
            <div className="grid gap-x-4 gap-y-6 sm:grid-cols-3">
              <Field label="Difficulty" hint="Shown beside the title.">
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

              <Field label="Points" hint="Awarded in full for a complete solution.">
                <input
                  type="number"
                  value={points}
                  onChange={(event) => setPoints(Number(event.target.value))}
                  className={`${inputClass} tnum`}
                />
              </Field>

              <Field label="Order" hint="Lower numbers are listed first.">
                <input
                  type="number"
                  value={order}
                  onChange={(event) => setOrder(Number(event.target.value))}
                  className={`${inputClass} tnum`}
                />
              </Field>
            </div>

            <Field
              label="Time limit"
              hint="Per test case, in milliseconds. 5000 suits all four languages; Java needs at least 4000."
            >
              <input
                type="number"
                step={500}
                value={timeLimitMs}
                onChange={(event) => setTimeLimitMs(Number(event.target.value))}
                className={`${inputClass} tnum max-w-40`}
              />
            </Field>
          </div>
        )}

        {step === "Function" && (
          <div className="space-y-5">
            <div className="flex gap-1" role="group" aria-label="What participants write">
              <TabButton active={!design} onClick={() => setKind("function")}>
                A function
              </TabButton>
              <TabButton active={design} onClick={() => setKind("class")}>
                A class (design problem)
              </TabButton>
            </div>
            <p className="max-w-[62ch] text-sm leading-relaxed text-ide-ink-2">
              {design
                ? "Participants write a class. For each test the judge creates it, then calls its methods in the order the test lists them, as LeetCode does for design problems."
                : "Participants write this function, plus any helper functions they like."}{" "}
              The judge supplies the program around their code and makes the
              call itself in all four languages, so they cannot change how it is
              called or read the input themselves.
            </p>
            <Field
              label={design ? "Class name" : "Function name"}
              hint={design ? "PascalCase, e.g. MinStack." : "Use snake_case. Converted to each language\u2019s convention automatically."}
            >
              <input
                value={fnName}
                onChange={(event) => setFnName(event.target.value)}
                placeholder={design ? "MinStack" : "sum_of_numbers"}
                className={`${inputClass} font-mono`}
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium">{design ? "Constructor parameters" : "Parameters"}</p>
              <ParamRows params={params} onChange={setParams} idPrefix="param" />
            </div>

            {design ? (
              <div>
                <p className="mb-2 text-sm font-medium">Methods</p>
                <div className="space-y-3">
                  {methods.map((method, index) => (
                    <div key={index} className="rounded-inset bg-ide-panel-2 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          aria-label={`Name of method ${index + 1}`}
                          value={method.name}
                          onChange={(event) =>
                            setMethods(methods.map((m, i) => (i === index ? { ...m, name: event.target.value } : m)))
                          }
                          placeholder="get_min"
                          className={`${inputClass} font-mono w-full sm:max-w-48`}
                        />
                        <select
                          aria-label={`What method ${index + 1} returns`}
                          value={method.returns}
                          onChange={(event) =>
                            setMethods(
                              methods.map((m, i) =>
                                i === index ? { ...m, returns: event.target.value as ReturnType } : m,
                              ),
                            )
                          }
                          className={`${inputClass} w-full sm:max-w-52`}
                        >
                          {RETURN_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type === "void" ? "void (returns nothing)" : `returns ${type}`}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setMethods(methods.filter((_, i) => i !== index))}
                          className="ml-auto text-xs text-ide-ink-3 transition hover:text-ide-fail"
                        >
                          Remove method
                        </button>
                      </div>
                      <div className="mt-3">
                        <ParamRows
                          params={method.params}
                          onChange={(next) =>
                            setMethods(methods.map((m, i) => (i === index ? { ...m, params: next } : m)))
                          }
                          idPrefix={`method-${index}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setMethods([...methods, { name: "", params: [], returns: "void" }])}
                  className="mt-3 rounded-control bg-ide-panel-2 px-3 py-1.5 text-sm transition hover:bg-ide-panel-3"
                >
                  Add a method
                </button>
              </div>
            ) : (
              <>
                <Field label="Returns">
                  <select
                    value={returns}
                    onChange={(event) => setReturns(event.target.value as ReturnType)}
                    className={`${inputClass} w-full sm:max-w-60`}
                  >
                    {RETURN_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type === "void" ? "void (changes an argument in place)" : type}
                      </option>
                    ))}
                  </select>
                </Field>

                {returns === "void" && (
                  <Field
                    label="The answer is the final value of"
                    hint="For in-place problems like Rotate Image or Sort Colors. Only a list or grid can be changed in place."
                  >
                    <select
                      value={mutates}
                      onChange={(event) => setMutates(event.target.value)}
                      className={`${inputClass} w-full sm:max-w-60`}
                    >
                      <option value="">Choose a parameter</option>
                      {params
                        .filter((p) => p.name && MUTABLE_TYPES.includes(p.type))
                        .map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name} ({p.type})
                          </option>
                        ))}
                    </select>
                  </Field>
                )}

                {canBeUnordered && (
                  <Field label="Order of the answer">
                    <select
                      value={String(unordered)}
                      onChange={(event) =>
                        setUnordered(event.target.value === "deep" ? "deep" : event.target.value === "true")
                      }
                      className={`${inputClass} w-full sm:max-w-80`}
                    >
                      <option value="false">Must match exactly</option>
                      <option value="true">Any order (sets, subsets, permutations)</option>
                      <option value="deep">Any order, inside each item too (grouped anagrams)</option>
                    </select>
                  </Field>
                )}

                <details className="rounded-inset bg-ide-panel-2 p-4" open={providedFns.length > 0}>
                  <summary className="cursor-pointer text-sm font-medium">
                    Interactive: functions the judge provides
                  </summary>
                  <p className="mt-2 max-w-[62ch] text-xs leading-relaxed text-ide-ink-2">
                    For problems like First Bad Version, where participants call
                    a function you supply. Hidden values are added to each test
                    after the arguments; your functions can read them, the
                    participant&rsquo;s function never receives them. In Python and
                    JavaScript they are not reachable by name; in C++ and Java
                    they live in <code className="font-mono">Hidden</code>.
                  </p>
                  <p className="mt-4 mb-2 text-sm font-medium">Hidden values</p>
                  <ParamRows params={hidden} onChange={setHidden} idPrefix="hidden" />
                  <p className="mt-4 mb-2 text-sm font-medium">Provided functions</p>
                  <div className="space-y-3">
                    {providedFns.map((fn, index) => (
                      <div key={index} className="rounded-inset bg-ide-panel p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            aria-label={`Name of provided function ${index + 1}`}
                            value={fn.name}
                            onChange={(event) =>
                              setProvidedFns(providedFns.map((f, i) => (i === index ? { ...f, name: event.target.value } : f)))
                            }
                            placeholder="is_bad_version"
                            className={`${inputClass} font-mono w-full sm:max-w-48`}
                          />
                          <select
                            aria-label={`What provided function ${index + 1} returns`}
                            value={fn.returns}
                            onChange={(event) =>
                              setProvidedFns(
                                providedFns.map((f, i) => (i === index ? { ...f, returns: event.target.value as ReturnType } : f)),
                              )
                            }
                            className={`${inputClass} w-full sm:max-w-52`}
                          >
                            {RETURN_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type === "void" ? "void (returns nothing)" : `returns ${type}`}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setProvidedFns(providedFns.filter((_, i) => i !== index))}
                            className="ml-auto text-xs text-ide-ink-3 transition hover:text-ide-fail"
                          >
                            Remove function
                          </button>
                        </div>
                        <div className="mt-3">
                          <ParamRows
                            params={fn.params}
                            onChange={(next) =>
                              setProvidedFns(providedFns.map((f, i) => (i === index ? { ...f, params: next } : f)))
                            }
                            idPrefix={`provided-${index}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProvidedFns([...providedFns, { name: "", params: [], returns: "bool" }])}
                    className="mt-3 rounded-control bg-ide-panel px-3 py-1.5 text-sm transition hover:bg-ide-panel-3"
                  >
                    Add a provided function
                  </button>
                  {providedFns.length > 0 && (
                    <div className="mt-4">
                      <div className="flex gap-1" role="group" aria-label="Language of the provided code">
                        {LANGUAGES.map((language) => (
                          <TabButton key={language} active={codeTab === language} onClick={() => setCodeTab(language)}>
                            {language}
                          </TabButton>
                        ))}
                      </div>
                      <textarea
                        aria-label={`Provided code in ${codeTab}`}
                        value={providedCode[codeTab]}
                        onChange={(event) => setProvidedCode({ ...providedCode, [codeTab]: event.target.value })}
                        rows={6}
                        spellCheck={false}
                        placeholder={
                          codeTab === "python"
                            ? "def is_bad_version(version):\n    return version >= bad"
                            : codeTab === "javascript"
                              ? "function isBadVersion(version) {\n  return version >= bad;\n}"
                              : codeTab === "cpp"
                                ? "bool isBadVersion(long long version) {\n    return version >= Hidden::bad;\n}"
                                : "class Provided {\n    static boolean isBadVersion(long version) {\n        return version >= Hidden.bad;\n    }\n}"
                        }
                        className={`${inputClass} mt-2 font-mono text-xs`}
                      />
                    </div>
                  )}
                </details>

                <details className="rounded-inset bg-ide-panel-2 p-4" open={checker.trim().length > 0}>
                  <summary className="cursor-pointer text-sm font-medium">Many right answers: a custom checker</summary>
                  <p className="mt-2 max-w-[62ch] text-xs leading-relaxed text-ide-ink-2">
                    Leave empty to compare answers exactly. Otherwise write Python
                    defining <code className="font-mono">check(args, expected, actual)</code>{" "}
                    that returns True when <code className="font-mono">actual</code> is a correct
                    answer for <code className="font-mono">args</code>. The expected answer in
                    each test is one correct answer, passed in for reference. It runs
                    in the judge&rsquo;s sandbox, never on the server.
                  </p>
                  <textarea
                    aria-label="Checker in Python"
                    value={checker}
                    onChange={(event) => setChecker(event.target.value)}
                    rows={6}
                    spellCheck={false}
                    placeholder={"def check(args, expected, actual):\n    nums, target = args\n    i, j = actual\n    return i != j and nums[i] + nums[j] == target"}
                    className={`${inputClass} mt-2 font-mono text-xs`}
                  />
                </details>
              </>
            )}

            <div className="rounded-inset bg-ide-panel-2 p-4">
              <p className="mb-2 text-xs text-ide-ink-3">
                Preview of the starting code participants receive, generated
                from the fields above. Shown in Python; equivalents are created
                for the other three languages.
              </p>
              <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap text-ide-ink">
                {fnName
                  ? starterFor("python", signature)
                  : `Enter a ${design ? "class" : "function"} name to preview the starting code.`}
              </pre>
            </div>
          </div>
        )}

        {step === "Description" && (
          <div className="space-y-3">
            <Field
              label="Statement"
              hint="Markdown is supported. Worked examples are generated from your test cases, so there is no need to repeat them here."
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

        {step === "Test cases" && (
          <div className="space-y-4">
            <div className="rounded-inset bg-ide-panel-2 p-4 text-sm leading-relaxed text-ide-ink-2">
              {design ? (
                <p>
                  Each case lists the operations and their arguments, as
                  LeetCode writes design tests. The first operation creates the
                  object. For example{" "}
                  <code className="rounded bg-ide-panel px-1.5 py-0.5 font-mono text-xs text-ide-ink">
                    {'[["MinStack","push","get_min"],[[],[3],[]]]'}
                  </code>{" "}
                  expects{" "}
                  <code className="rounded bg-ide-panel px-1.5 py-0.5 font-mono text-xs text-ide-ink">
                    [null,null,3]
                  </code>
                  : one entry per operation, null for the constructor and for
                  methods that return nothing.
                </p>
              ) : (
                <p>
                  Each case gives the arguments and the answer they should
                  produce. Arguments are written as a JSON array with one entry per
                  parameter, so a function taking{" "}
                  {params.length === 1 ? "one list" : `${params.length} values`}{" "}
                  is written{" "}
                  <code className="rounded bg-ide-panel px-1.5 py-0.5 font-mono text-xs text-ide-ink">
                    {argsExample}
                  </code>
                  .{returns === "void" && mutates ? ` The answer is ${mutates} after the function returns.` : ""}
                </p>
              )}
              <p className="mt-2">
                Shown cases appear in the problem as worked examples. Hidden
                cases are used for scoring only and are never sent to the
                browser. Scoring is proportional to the number of cases passed.
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
                      Shown to participants
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
                        Arguments (
                        {design
                          ? "operations, then their arguments"
                          : params.length === 0
                            ? "no parameters"
                            : params.map((p) => p.name).join(", ")}
                        )
                      </span>
                      <input
                        value={test.stdin}
                        onChange={(event) =>
                          setTests(tests.map((t, i) => (i === index ? { ...t, stdin: event.target.value } : t)))
                        }
                        placeholder={argsExample}
                        className={`${inputClass} font-mono text-sm`}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-ide-ink-3">
                        Expected answer (
                        {design ? "one entry per operation" : returns === "void" ? `final ${mutates || "argument"}` : returns})
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
                        placeholder={answerExample}
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

            <details className="rounded-inset bg-ide-panel-2 p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Paste several at once
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-ide-ink-2">
                One case per line, with the arguments and answer separated by{" "}
                <code className="rounded bg-ide-panel px-1 py-0.5 font-mono">=&gt;</code>. Cases added
                this way are hidden; select the checkbox on any you want shown.
              </p>
              <label className="sr-only" htmlFor="bulk-tests">
                Several test cases, one per line
              </label>
              <textarea
                id="bulk-tests"
                value={bulk}
                onChange={(event) => setBulk(event.target.value)}
                rows={4}
                spellCheck={false}
                placeholder={`[[1, 2, 3]] => 6\n[[-1]] => -1`}
                className="mt-2 w-full rounded-control bg-ide-panel p-2.5 font-mono text-xs text-ide-ink outline-none placeholder:text-ide-ink-3"
              />
              <button
                type="button"
                disabled={bulk.trim().length === 0}
                onClick={() => {
                  const added = bulk
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => {
                      const at = line.lastIndexOf("=>");
                      return at < 0
                        ? null
                        : {
                            stdin: line.slice(0, at).trim(),
                            expectedStdout: line.slice(at + 2).trim(),
                            isSample: false,
                          };
                    })
                    .filter((t): t is Test => t !== null);
                  if (added.length > 0) {
                    setTests([...tests.filter((t) => t.stdin || t.expectedStdout), ...added]);
                    setBulk("");
                  }
                }}
                className="mt-2 rounded-control bg-ide-panel px-3 py-1.5 text-sm transition hover:bg-ide-panel-3 disabled:opacity-40"
              >
                Add them
              </button>
            </details>

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

        {step === "Verify" && (
          <VerifyStep
            signature={signature}
            tests={tests}
            timeLimitMs={timeLimitMs}
            verified={verified}
            onVerified={(passed) => setVerifiedShape(passed ? shape : null)}
          />
        )}

        {step === "Review" && (
          <div className="space-y-4">
            <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <Summary label="Title" value={title || "—"} />
              <Summary label="URL" value={`/ide?problem=${effectiveSlug}`} mono />
              <Summary label="Difficulty" value={difficulty} />
              <Summary label="Points" value={String(points)} />
              <Summary label="Time limit" value={`${timeLimitMs} ms per test`} />
              <Summary label={design ? "Class" : "Function"} mono value={signatureLine} />
              <Summary
                label="Tests"
                value={`${tests.length} total, ${tests.filter((t) => t.isSample).length} shown`}
              />
            </dl>

            {!verified && blocking.length === 0 && (
              <p className="rounded-inset bg-ide-warn-quiet px-3 py-2 text-sm text-ide-warn">
                This problem has not been verified against a working solution.
                You can still save it, but an incorrect expected answer will not
                be detected until a participant attempts it.
              </p>
            )}

            {blocking.length > 0 ? (
              <ul className="space-y-1 rounded-inset bg-ide-fail-quiet px-3 py-2 text-sm text-ide-fail">
                {blocking.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            ) : (
              <p className="rounded-inset bg-ide-pass-quiet px-3 py-2 text-sm text-ide-pass">
                {editing
                  ? "All checks passed."
                  : "All checks passed. The problem becomes visible when its set is opened."}
              </p>
            )}

            {editing && existing.attempts > 0 && (
              <p className="rounded-inset bg-ide-warn-quiet px-3 py-2 text-sm text-ide-warn">
                {existing.attempts} attempt{existing.attempts === 1 ? " has" : "s have"} already
                been submitted. Editing the test cases does not recalculate
                scores that have already been recorded.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <PrimaryButton disabled={pending || blocking.length > 0} onClick={submit}>
                {pending
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : verified
                      ? "Create problem"
                      : "Create without verifying"}
              </PrimaryButton>

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

            {result && <div className="settle">{<Feedback result={result} />}</div>}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <GhostButton disabled={stepIndex === 0} onClick={() => setStep(STEPS[stepIndex - 1]!.name)}>
          Back
        </GhostButton>
        {problemsByStep[step].length > 0 && (
          <p className="text-xs text-ide-fail">{problemsByStep[step][0]}</p>
        )}
        <PrimaryButton
          disabled={stepIndex === STEPS.length - 1}
          onClick={() => setStep(STEPS[stepIndex + 1]!.name)}
        >
          Next
        </PrimaryButton>
      </div>
      </div>

      <ReadinessPanel items={readiness} advice={advice} onJump={(name) => setStep(name as Step)} />
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
      <span className="block text-sm font-medium">{label}</span>
      {hint && <span className="mt-1 block max-w-[62ch] text-xs text-ide-ink-3">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

/** One editor for every parameter list: the function's, the constructor's, each method's. */
function ParamRows({
  params,
  onChange,
  idPrefix,
}: {
  params: Param[];
  onChange: (next: Param[]) => void;
  idPrefix: string;
}) {
  return (
    <>
      <div className="space-y-2">
        {params.map((param, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`${idPrefix}-name-${index}`}>
              Name of parameter {index + 1}
            </label>
            <input
              id={`${idPrefix}-name-${index}`}
              value={param.name}
              onChange={(event) => onChange(params.map((p, i) => (i === index ? { ...p, name: event.target.value } : p)))}
              placeholder="nums"
              className={`${inputClass} font-mono w-full sm:max-w-48`}
            />
            <label className="sr-only" htmlFor={`${idPrefix}-type-${index}`}>
              Type of parameter {index + 1}
            </label>
            <select
              id={`${idPrefix}-type-${index}`}
              value={param.type}
              onChange={(event) =>
                onChange(params.map((p, i) => (i === index ? { ...p, type: event.target.value as ParamType } : p)))
              }
              className={`${inputClass} w-full sm:max-w-44`}
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
              onClick={() => onChange(params.filter((_, i) => i !== index))}
              className="ml-auto text-xs text-ide-ink-3 transition hover:text-ide-fail"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...params, { name: "", type: "int" }])}
        className="mt-2 rounded-control bg-ide-panel-2 px-3 py-1.5 text-sm transition hover:bg-ide-panel-3"
      >
        Add a parameter
      </button>
    </>
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
