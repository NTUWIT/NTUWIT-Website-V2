#!/usr/bin/env bash
# Installs the event's language runtimes into a Piston instance.
#
#   ./install-runtimes.sh [base-url]
#
# Safe to re-run: already-installed runtimes are skipped, so a half-finished
# run (closed terminal, dropped wifi) is fixed by running it again. Installs
# are slow — java pulls a JDK — so expect several minutes on a cold instance.
#
# The versions here must match RUNTIME in lib/judge/piston.ts exactly; a
# mismatch fails every execution with an unrecognised-runtime error.
set -uo pipefail

# "<package> <version>" — package names, which are NOT always the names used
# when executing: `javascript` and `c++` are aliases of the `node` and `gcc`
# packages. Installing by alias fails with "package does not exist".
RUNTIMES=(
  "python 3.12.0"
  "node 20.11.1"
  "gcc 10.2.0"
  "java 15.0.2"
)

ENV_FILE="$(dirname "$0")/../../.env"
from_env() { [ -f "$ENV_FILE" ] && grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'"' '; }

BASE="${1-}"
[ -z "$BASE" ] && BASE=$(from_env PISTON_URL)
TOKEN="${PISTON_TOKEN-$(from_env PISTON_TOKEN)}"
if [ -z "$BASE" ]; then
  echo "usage: $0 <base-url>   (or set PISTON_URL in .env)" >&2
  exit 1
fi
BASE="${BASE%/}"

# The judge sits behind a proxy that rejects unauthenticated requests.
AUTH=(-H "X-Piston-Token: ${TOKEN:-none}")

# ponytail: python3 for JSON rather than requiring jq, which macOS lacks by default.
json() { python3 -c "$1"; }

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }
info() { printf '  · %s\n' "$*"; }

say "Piston at $BASE"

installed=$(curl -fsS --max-time 20 "${AUTH[@]}" "$BASE/api/v2/runtimes" 2>/dev/null) || {
  bad "cannot reach $BASE/api/v2/runtimes"
  info "is the app deployed? try: fly status -a wit-piston"
  exit 1
}
# Reads the runtime list on stdin so the JSON is never spliced into source.
have() {
  printf '%s' "$installed" | LANG_Q="$1" VER_Q="$2" json '
import json,os,sys
try: rs = json.load(sys.stdin)
except Exception: rs = []
print(any(r.get("language") == os.environ["LANG_Q"]
          and r.get("version") == os.environ["VER_Q"] for r in rs))
'
}

failed=0
for spec in "${RUNTIMES[@]}"; do
  set -- $spec
  lang=$1 version=$2

  if [ "$(have "$lang" "$version")" = "True" ]; then
    ok "$lang $version already installed"
    continue
  fi

  info "installing $lang $version — this can take a few minutes, leave it running"
  body=$(curl -sS -X POST "${AUTH[@]}" "$BASE/api/v2/packages" \
    -H 'Content-Type: application/json' \
    --max-time 900 \
    -d "{\"language\":\"$lang\",\"version\":\"$version\"}")

  if printf '%s' "$body" | grep -q '"language"'; then
    ok "$lang $version installed"
  else
    bad "$lang $version failed: ${body:-no response}"
    failed=1
  fi
done

say "Installed runtimes"
curl -fsS "${AUTH[@]}" "$BASE/api/v2/runtimes" | json '
import json,sys
for r in json.load(sys.stdin):
    print("  %-12s %s" % (r["language"], r["version"]))
'

say "Smoke test (python)"
result=$(curl -sS -X POST "${AUTH[@]}" "$BASE/api/v2/execute" -H 'Content-Type: application/json' --max-time 30 -d '{
  "language":"python","version":"3.12.0",
  "files":[{"name":"main.py","content":"import sys\nprint(sum(int(x) for x in sys.stdin.read().split()))"}],
  "stdin":"1 2 3\n","run_timeout":3000
}')
stdout=$(printf '%s' "$result" | json '
import json,sys
try: print(json.load(sys.stdin).get("run",{}).get("stdout",""), end="")
except Exception: pass
')
# $(...) strips the trailing newline, so compare against the bare value.
if [ "$stdout" = "6" ]; then
  ok "executed 1+2+3 and got 6"
else
  bad "unexpected result: $result"
  failed=1
fi

if [ "$failed" = 0 ]; then
  say "Done. Set PISTON_URL=$BASE (and PISTON_TOKEN) in .env and in Vercel."
else
  say "Finished with errors — re-run this script; completed runtimes are skipped."
  exit 1
fi

# ---------------------------------------------------------------------------
# Java ships without a compile stage: its run script uses `java Main.java`
# single-file mode, which recompiles the source on every execution. That put
# roughly 1.6s of javac inside the run timeout on every test case, so correct
# Java solutions timed out at random. Splitting compile out moves that cost to
# the compile budget and leaves the run stage at under 100ms.
#
# Requires a `docker compose restart piston` afterwards: Piston reads a
# package's scripts when it loads the package, not per request.
# ---------------------------------------------------------------------------
install_java_compile_stage() {
  local pkg=/piston/packages/java/15.0.2
  echo "installing the Java compile stage"
  docker exec piston sh -c "[ -f $pkg/run.original.bak ] || cp $pkg/run $pkg/run.original.bak"
  docker cp "$(dirname "$0")/packages/java/compile" piston:$pkg/compile
  docker cp "$(dirname "$0")/packages/java/run" piston:$pkg/run
  docker exec piston chmod +x $pkg/compile $pkg/run
  docker compose restart piston
  echo "  restarted; give it a few seconds"
}
