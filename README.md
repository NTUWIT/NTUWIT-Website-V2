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

See `docs/DEPLOY.md` for deployment and pre-event verification, and
`docs/FINDINGS.md` for what the judge does at its edges.

---

Made by NTU Women In Tech
