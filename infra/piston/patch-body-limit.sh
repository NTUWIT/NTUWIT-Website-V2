#!/usr/bin/env bash
# Raises Piston's request size limit from 100 KB to 2 MB.
#
# Piston builds its API with `body_parser.json()` and no limit, which
# body-parser treats as 100 KB, and there is no setting for it. A test with a
# LeetCode-sized input (n = 100,000) is several hundred KB, so the judge
# refused it outright. compose.yml mounts a patched copy of the API's
# index.js over the image's own.
#
# Run on the droplet, in the directory holding compose.yml, after pulling a new
# Piston image: the patch is taken from whatever index.js that image ships.
set -euo pipefail

docker compose up -d piston
# Copy the image's original, not a file that may already be the mounted patch.
docker run --rm --entrypoint cat ghcr.io/engineer-man/piston:latest /piston_api/src/index.js > piston-api-index.js

count=$(grep -c "app.use(body_parser.json());" piston-api-index.js || true)
if [ "$count" != "1" ]; then
  echo "expected exactly one 'app.use(body_parser.json());' line, found $count; the image changed, patch by hand" >&2
  exit 1
fi
sed -i "s/app.use(body_parser.json());/app.use(body_parser.json({ limit: '2mb' }));/" piston-api-index.js
grep -n "body_parser.json" piston-api-index.js

docker compose up -d --force-recreate piston
echo "patched; the judge now accepts requests up to 2 MB"
