# Piston judge

Executes untrusted participant code. Nothing else in the stack runs submitted code.

## Why a real VM and not Fly.io

Piston's entrypoint refuses to start unless `/sys/fs/cgroup` is **pure cgroup v2**.
Fly.io's Firecracker VMs mount a hybrid v1+v2 layout and pin `cpu,cpuacct` to a
v1 hierarchy that cannot be unmounted (`target is busy` — Fly's own init lives in
it), so the v2 root is left with only `hugetlb` and `pids`. Remounting on top
does not help: the controllers stay bound to v1. Verified on a deployed machine,
2026-09-05. The same constraint rules out most container-only hosts; Piston needs
a box where you control the kernel's cgroup layout.

## Provision the VM (DigitalOcean, Singapore)

Any VM with a kernel you control works; these steps assume DigitalOcean because
its signup is the least painful. Oracle Cloud Always Free is the same setup and
costs nothing, but its card verification frequently rejects valid cards.

1. Create a droplet: **Singapore (SGP1)**, **Ubuntu 24.04 (LTS)**, Basic /
   Regular, **$6/mo (1 GB)**. Authenticate with an **SSH key**, not a password.
2. In the droplet's **Networking → Firewall** (or the cloud firewall), allow
   inbound TCP **80** and **443**. DigitalOcean images have no host firewall
   enabled by default, so there is nothing to do on the box itself.
3. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   ```
   DigitalOcean droplets log in as `root`, so no `usermod` step is needed.

1 GB is enough for Python, JavaScript, and C++. Java compilation is memory-hungry;
if `javac` gets OOM-killed, add swap rather than resizing:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Run it

Copy `compose.yml` and `Caddyfile` to the box, then:

```bash
export PISTON_HOST=<public-ip-with-dashes>.sslip.io   # e.g. 203-0-113-5.sslip.io
export PISTON_TOKEN=$(openssl rand -hex 32)           # keep this, it goes in .env
echo "PISTON_HOST=$PISTON_HOST" > .env
echo "PISTON_TOKEN=$PISTON_TOKEN" >> .env

docker compose up -d
```

`sslip.io` resolves any `1-2-3-4.sslip.io` to that IP, which gives Caddy a real
hostname to get a Let's Encrypt certificate for — no domain purchase needed.

Caddy rejects any request without the `X-Piston-Token` header, and Piston itself
is never published to the host, so the only way in is through the proxy. **This
matters:** the public Piston API was taken offline on 2026-08-31 precisely
because an open execution endpoint was abused.

## Install runtimes

Piston ships empty; each language is installed at runtime. The versions below
must match `RUNTIME` in `lib/judge/piston.ts` exactly — a mismatch fails every
execution with an unrecognised-runtime error.

From your laptop, with `PISTON_URL` and `PISTON_TOKEN` set in `.env`:

```bash
./infra/piston/install-runtimes.sh
```

The script reports each runtime as it goes, skips any already installed, lists
what ended up on the box, and finishes with an execute smoke test. It is safe to
re-run — if a terminal closes mid-install, just run it again.

## Verify by hand

```bash
curl -sX POST "$PISTON_URL/api/v2/execute" \
  -H 'Content-Type: application/json' \
  -H "X-Piston-Token: $PISTON_TOKEN" -d '{
  "language":"python","version":"3.12.0",
  "files":[{"name":"main.py","content":"import sys\nprint(sum(int(x) for x in sys.stdin.read().split()))"}],
  "stdin":"1 2 3\n","run_timeout":3000
}'
```

Expect `run.stdout` of `"6\n"` and `run.code` of `0`. The same call without the
token header must return `401`.

## Hardening

What is in place, and what it is for:

- **Piston is never published to the host.** Only Caddy can reach port 2000, so
  the address alone gets nobody an execution endpoint.
- **Caddy refuses anything without `X-Piston-Token`**, on every path, not just
  `/execute`. Verify with the curl above and its no-token twin.
- **Rate limited to 300 requests a minute per address.** This is above what the
  box can execute, so it never throttles a real event; it exists to stop
  somebody with a leaked token mining here around the clock. The image is built
  from `caddy.Dockerfile` because stock Caddy has no rate limiter.
- **fail2ban**, `bantime 1h` after 5 failures in 10 minutes. SSH is key-only so
  the roughly 3,000 daily brute-force attempts cannot succeed; the jail stops
  them burning CPU and journal space on a 1 vCPU box mid-event.
- **`unattended-upgrades`** is on, so security patches land without anyone
  remembering to log in.

Still worth doing, and only doable from the DigitalOcean console:

- **A cloud firewall** allowing inbound 22, 80 and 443 only. Use the cloud
  firewall rather than `ufw`: Docker writes its own iptables rules and bypasses
  `ufw` entirely, so `ufw` here would be false confidence.

**`privileged: true` cannot be removed.** isolate needs cgroup control, which is
the whole reason this runs on a VM rather than a container host. It means a
container escape is root on this box, so the mitigation is to keep the box
worthless: the only secret here is `PISTON_TOKEN` itself. Never put the database
URL or the Clerk keys on this machine.

### Rotating the token

```bash
NEW=$(openssl rand -hex 32)
ssh <box> "sed -i 's/^PISTON_TOKEN=.*/PISTON_TOKEN=$NEW/' ~/.env && cd ~ && docker compose up -d"
# then update PISTON_TOKEN in Vercel and in your local .env, and redeploy
```

Rotate if the token is ever pasted somewhere public, or after anyone leaves the
committee.

## Scale for the event

One instance handles roughly 10 concurrent executions. The Always Free ARM shape
gives 4 OCPUs total, so raise the instance's cores rather than adding a second
box, and re-run the load test.
