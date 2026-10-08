#!/usr/bin/env bash
# heros.cloud deploy: build -> release dir -> probe -> atomic symlink switch.
# PM2 `cosmo-clawagent` serves $BASE/current; `npm run build` alone no longer goes live.
#
#   scripts/deploy.sh               build, release, switch
#   scripts/deploy.sh --from-out    release the existing out/ without building
#   scripts/deploy.sh --rollback    point current at the previous release
#
# Plan: plans/release-symlink-deploy-plan.md
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${COSMO_RELEASES:-/root/workspace/meine-website/cosmo-releases}"
KEEP=5
PROBE_PORT=4398
ROUTES=(/ /demo/ /market/ /market/work/ /cosmo/ /portfolio/ /media/cosmo-promo-15s-v1.mp4)
LIVE_URL="${COSMO_LIVE_URL:-https://heros.cloud}"

die() { echo "deploy: $*" >&2; exit 1; }

check_routes() { # $1 = base url
  local r code
  for r in "${ROUTES[@]}"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -r 0-0 "$1$r")
    [[ "$code" == 200 || "$code" == 206 ]] || die "$1$r -> $code"
  done
  code=$(curl -s -o /dev/null -w '%{http_code}' "$1/__no_such_route__/")
  [[ "$code" == 404 ]] || die "$1/__no_such_route__/ -> $code (expected 404)"
}

switch_to() { # $1 = release dir name
  ln -sfn "releases/$1" "$BASE/current.tmp"
  mv -Tf "$BASE/current.tmp" "$BASE/current"
  echo "deploy: current -> releases/$1"
}

mkdir -p "$BASE/releases"
cd "$REPO"

if [[ "${1:-}" == "--rollback" ]]; then
  cur=$(basename "$(readlink "$BASE/current")")
  prev=$(ls -1 "$BASE/releases" | sort | grep -B1 -x "$cur" | head -n1)
  [[ -n "$prev" && "$prev" != "$cur" ]] || die "no release before $cur"
  switch_to "$prev"
  check_routes "$LIVE_URL"
  echo "deploy: rollback ok"
  exit 0
fi

if [[ "${1:-}" != "--from-out" ]]; then
  npm run build
fi

for f in index.html 404.html demo/index.html market/work/index.html; do
  [[ -f "out/$f" ]] || die "out/$f missing"
done

sha=$(git rev-parse --short HEAD)
dirty=""
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || dirty="-dirty"
id="$(date +%Y%m%d-%H%M%S)-$sha$dirty"
rel="$BASE/releases/$id"

cp -a out "$rel"
printf 'sha=%s\ndirty=%s\nbuilt=%s\n' "$(git rev-parse HEAD)" "${dirty:+yes}" "$(date -Is)" > "$rel/.release"

# Old hashed chunks stay reachable for browsers holding cached HTML.
if [[ -d "$BASE/current/_next/static" ]]; then
  cp -a --update=none "$BASE/current/_next/static/." "$rel/_next/static/"
fi

# Probe the new release on a side port before switching.
serve "$rel" -l "$PROBE_PORT" >/dev/null 2>&1 &
probe_pid=$!
trap 'kill $probe_pid 2>/dev/null || true' EXIT
for _ in $(seq 20); do curl -s -o /dev/null "http://127.0.0.1:$PROBE_PORT/" && break; sleep 0.25; done
check_routes "http://127.0.0.1:$PROBE_PORT"
kill $probe_pid; trap - EXIT

switch_to "$id"
check_routes "$LIVE_URL"

ls -1 "$BASE/releases" | sort | head -n -"$KEEP" | while read -r old; do
  [[ "$old" == "$id" ]] || rm -rf "${BASE:?}/releases/$old"
done
echo "deploy: ok ($id)"
