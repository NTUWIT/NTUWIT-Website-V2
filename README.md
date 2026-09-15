# NTU Women in Tech

The NTU Women in Tech website and WIT IDE, the in-house coding platform used
during Coding Nights, in one Next.js app.

| Route | What it is | Rendering |
|---|---|---|
| `/`, `/about`, `/events`, `/beyond-binary`, `/projects`, `/recruit` | The public site | Static |
| `/ide` | The coding platform: problem, editor, judge | Dynamic, signed in |
| `/leaderboard` | Running score totals | Dynamic, revalidated every 10s |
| `/api/run`, `/api/submit`, `/api/leaderboard` | Judge and score endpoints | Dynamic |

The two surfaces are deliberately separate. Each brings its own palette and base
styles, scoped to `.wit-site` and `.ide-surface` respectively, so neither can
restyle the other. IDE design tokens are namespaced `--ide-*` for the same
reason.

## Getting started

```bash
yarn install
cp .env.example .env    # then fill it in
yarn db:migrate
yarn seed
yarn dev
```

## Checks

```bash
yarn typecheck
yarn lint
yarn test            # pure logic: judge, scoring, harness, problems, API contract
yarn check:e2e       # real judge, all four languages (needs PISTON_URL)
yarn check:dsa       # judge behaviour on DSA-shaped stress fixtures
yarn check:problems  # run this before any new problem goes live
```

## Running an event

```bash
yarn event start 90   # start a 90 minute countdown for everyone
yarn event status
yarn event stop
```

---

Made by NTU Women In Tech

## Code visualization

In `/ide`, **Visualize** (beside Run) opens Python Tutor in a right-hand panel using
its current code and the selected sample or custom JSON arguments. Expand widens
the panel; Collapse keeps the trace in a slim right-hand tab without losing the
current step. Close removes it. On mobile it opens as a right-side drawer.
Results stay beneath the editor; Run and Submit close the visualization. Editing
code or changing input marks the existing trace as stale until Visualize is
pressed again. The section follows the IDE theme. The external diagram receives a dark-mode
color filter (Python Tutor has no native theme integration); switching themes
preserves the current execution step. It scrolls within its panel on smaller screens.

Visualization is an optional online learning tool, independent of grading and
sign-in. Clicking Visualize sends that code and input to pythontutor.com. No
hidden tests, checker code, or judge-provided helpers are included. Problems
that need judge-provided helpers show an explanatory message instead.

The adapter supports the four IDE languages, ordinary arguments, linked lists
(including cycles), trees, N-ary trees, random-pointer lists, graphs, in-place
mutation, and class/operation problems. It constructs a small sample driver;
results and object references appear as `wit_result_*` in the trace. Python
Tutor's runtimes differ from Piston (Python 3.11, ES6 JavaScript, C++20, Java 8).
File/network I/O, Node.js APIs, async JavaScript, and arbitrary packages are not
supported there. Code plus its driver is limited to 2,000 characters and the
embed URL to 5,600; large inputs receive an actionable message. Execution step
limits are approximately 1,000 for Python/Java/JS and 300 for C++. Use Run and
Submit for official correctness and performance results.

`yarn test` includes the pure visualization adapter checks. To check the UI,
run `yarn dev --hostname localhost`, open `/ide`, enter a solution, and press
Visualize. Try a second sample, custom input, editing after visualization,
Next/Prev, the theme switch, and a narrow window. Internet access is required;
**Open in Python Tutor** provides a full-size alternative if the embed fails.
