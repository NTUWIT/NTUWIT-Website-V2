#!/usr/bin/env bash
# Raises the judge's two size limits on the droplet, in place:
#   - output per run: 1 KB -> 64 KB  (PISTON_OUTPUT_MAX_SIZE in compose.yml)
#   - request body:  100 KB -> 2 MB  (a patched copy of Piston's index.js, mounted)
#
# Run from your laptop:
#   ssh wit-piston 'bash -s' < infra/piston/apply-droplet-limits.sh
#
# Safe to re-run: each step checks whether it is already done. Backs up
# compose.yml first. Only the piston container restarts (a few seconds);
# Caddy is untouched.
set -euo pipefail
cd /root

stamp=$(date +%Y%m%d-%H%M%S)
cp compose.yml "compose.yml.bak-$stamp"
echo "backup: /root/compose.yml.bak-$stamp"

# 1. The patched API entry point, taken from the image's own original.
docker run --rm --entrypoint cat ghcr.io/engineer-man/piston:latest /piston_api/src/index.js > piston-api-index.js
count=$(grep -c "app.use(body_parser.json());" piston-api-index.js || true)
if [ "$count" != "1" ]; then
  echo "expected exactly one 'app.use(body_parser.json());' line, found $count; stopping" >&2
  exit 1
fi
sed -i "s/app.use(body_parser.json());/app.use(body_parser.json({ limit: '2mb' }));/" piston-api-index.js
echo "patched: $(grep -n 'body_parser.json' piston-api-index.js)"

# 2. compose.yml: the output limit and the mount.
python3 - <<'PY'
import pathlib
p = pathlib.Path("/root/compose.yml"); s = p.read_text()
if "PISTON_OUTPUT_MAX_SIZE" not in s:
    old = "      PISTON_COMPILE_TIMEOUT: 10000\n"
    assert s.count(old) == 1, "PISTON_COMPILE_TIMEOUT line not found"
    s = s.replace(old, old + "      # Piston kills a run whose stdout or stderr reaches this many bytes;\n      # the default is 1024. Matches MAX_OUTPUT_BYTES in lib/judge/limits.ts.\n      PISTON_OUTPUT_MAX_SIZE: 65536\n")
if "piston-api-index.js" not in s:
    old = "      - ./data:/piston\n"
    assert s.count(old) == 1, "data volume line not found"
    s = s.replace(old, old + "      # Piston hard-codes a 100 KB request limit; this copy raises it to 2 MB.\n      - ./piston-api-index.js:/piston_api/src/index.js:ro\n")
p.write_text(s)
print("compose.yml ready")
PY

# 3. Recreate piston with both changes, then show that they took.
docker compose up -d piston
sleep 8
docker ps --filter name=piston --format "{{.Names}}: {{.Status}}"
docker exec piston sh -c 'echo "PISTON_OUTPUT_MAX_SIZE=$PISTON_OUTPUT_MAX_SIZE"'
docker exec piston grep -n "body_parser.json" /piston_api/src/index.js
echo "done"
