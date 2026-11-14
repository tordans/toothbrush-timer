#!/usr/bin/env bash
# Checks a deployed site: health with the expected commit, routing, caching, the database (and so
# the migrations), 401 / 403 without key or invite word.
# Usage: deploy/check.sh <base-url> <expected-commit>
# Env:   SUMMARY_FILE optional, a markdown table is appended there (GitHub step summary)
# Nothing is created or changed on the site. The wrong-invite request below counts as one failed
# attempt for the runner's IP address (expires after an hour), the wrong key as one for the throttle.
# Works against the local test stack too: deploy/check.sh http://localhost:8088 dev
set -u

base="${1:?usage: check.sh <base-url> <expected-commit>}"
base="${base%/}"
expected_commit="${2:?usage: check.sh <base-url> <expected-commit>}"
summary="${SUMMARY_FILE:-/dev/null}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
failures=0

{
  echo "### Deploy check for \`$expected_commit\`"
  echo
  echo "| Check | Result |"
  echo "| --- | --- |"
} >>"$summary"

# fetch <curl args...>: stores status in $status, headers in $tmp/headers, body in $tmp/body
fetch() {
  status="$(curl -sS -o "$tmp/body" -D "$tmp/headers" -w '%{http_code}' --max-time 20 "$@" 2>"$tmp/curl-error")" || status="000"
}

# header <name>: value of the last response header with that name
header() {
  grep -i "^$1:" "$tmp/headers" | tail -n 1 | sed 's/^[^:]*:[[:space:]]*//' | tr -d '\r'
}

# result <name> <ok: 0|1> <detail>
result() {
  if [ "$2" = "0" ]; then
    echo "ok    $1 ($3)"
    echo "| $1 | ok: $3 |" >>"$summary"
  else
    echo "FAIL  $1 ($3)"
    echo "| $1 | **FAILED**: $3 |" >>"$summary"
    failures=$((failures + 1))
  fi
}

# Health: the new commit has to be live. PHP or the upload can lag a little, so retry.
live=1
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  fetch "$base/api/health"
  if [ "$status" = "200" ] && grep -q "\"commit\":\"$expected_commit\"" "$tmp/body"; then
    live=0
    break
  fi
  sleep 5
done
result "GET /api/health shows the new commit" "$live" "status $status, $(head -c 200 "$tmp/body" | tr '\n' ' ')"

# The database works and the API migrated it: a wrong invite word is 403 only after the tables exist.
fetch -X POST -H 'Content-Type: application/json' --data '{"invite":"check-with-a-wrong-word"}' "$base/api/families"
result "POST /api/families with a wrong invite word is 403 (database works)" "$([ "$status" = "403" ] && grep -q 'invalid_invite' "$tmp/body" && echo 0 || echo 1)" "status $status, $(head -c 100 "$tmp/body" | tr '\n' ' ')"

fetch "$base/"
index_ok=1
[ "$status" = "200" ] && header content-type | grep -qi 'text/html' && [ "$(header cache-control)" = "no-cache" ] && index_ok=0
result "GET / is HTML and revalidated" "$index_ok" "status $status, cache-control: $(header cache-control)"
csp_ok=1
header content-security-policy | grep -q "default-src 'self'" && csp_ok=0
result "/ sends a Content-Security-Policy (only this site)" "$csp_ok" "$(header content-security-policy | head -c 80)"
cp "$tmp/body" "$tmp/index.html"

asset="$(grep -oE '/assets/[^"'"'"' )]+\.(js|css)' "$tmp/index.html" | head -n 1)"
if [ -n "$asset" ]; then
  fetch "$base$asset"
  asset_ok=1
  [ "$status" = "200" ] && header cache-control | grep -q 'immutable' && asset_ok=0
  result "GET $asset is cached for a year" "$asset_ok" "status $status, cache-control: $(header cache-control)"
else
  result "index.html references a file in /assets/" 1 "none found"
fi

fetch "$base/assets/does-not-exist.js"
result "Missing asset is a real 404" "$([ "$status" = "404" ] && echo 0 || echo 1)" "status $status"

fetch "$base/some/path"
path_ok=1
[ "$status" = "200" ] && header content-type | grep -qi 'text/html' && path_ok=0
result "Unknown path falls back to the app" "$path_ok" "status $status"

fetch "$base/api/state"
result "GET /api/state without key is 401" "$([ "$status" = "401" ] && echo 0 || echo 1)" "status $status"

fetch -H "Authorization: Bearer check-with-a-wrong-key" "$base/api/state"
result "GET /api/state with a wrong key is 401" "$([ "$status" = "401" ] && echo 0 || echo 1)" "status $status"

fetch -X POST "$base/api/family/key"
result "POST /api/family/key without key is 401" "$([ "$status" = "401" ] && echo 0 || echo 1)" "status $status"

for dotfile in /.ftp-deploy-sync-state.json /.htaccess; do
  fetch "$base$dotfile"
  case "$status" in 403 | 404) dot_ok=0 ;; *) dot_ok=1 ;; esac
  result "GET $dotfile is not served" "$dot_ok" "status $status"
done

fetch "$base/"
result "Security headers arrive" "$([ "$(header x-content-type-options)" = "nosniff" ] && echo 0 || echo 1)" "x-content-type-options: $(header x-content-type-options)"

case "$base" in
  https://*)
    fetch "http://${base#https://}/"
    redirect_ok=1
    [ "$status" = "301" ] && header location | grep -q '^https://' && redirect_ok=0
    result "http redirects to https" "$redirect_ok" "status $status"
    ;;
esac

echo >>"$summary"
if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed" >&2
  echo "**$failures check(s) failed.**" >>"$summary"
  exit 1
fi
echo "All checks passed"
echo "All checks passed." >>"$summary"
