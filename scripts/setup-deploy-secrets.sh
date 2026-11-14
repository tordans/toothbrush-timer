#!/usr/bin/env bash
# Guided setup of the GitHub environment secrets for the deploy workflow (docs/central-storage.md).
# Asks for the FTP and database values and for the invite word (or makes one up), and stores
# everything with `gh secret set --env production`. Only the SHA-256 of the invite word goes to
# GitHub. Family keys are not part of this: the server makes one for each family. Secrets are not
# printed and nothing is written to disk. The deploy stays off until you set the repository
# variable DEPLOY_ENABLED=true yourself (last step, see the end of this script's output).
#
# Usage: [FTP_SERVER=... FTP_USERNAME=... DB_HOST=... DB_NAME=... DB_USER=...] scripts/setup-deploy-secrets.sh [owner/repo]
# Values given as environment variables are not asked for; passwords always are.
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
ENV_NAME=production
SITE_URL=https://brush.ingsparks.de
cd "$(dirname "$0")/.."

ask() { # ask <prompt> <default>
  local answer
  read -r -p "$1${2:+ [$2]}: " answer
  printf '%s' "${answer:-$2}"
}
ask_secret() { # ask_secret <prompt>
  local answer
  read -r -s -p "$1 (input hidden): " answer
  echo >&2
  [ -n "$answer" ] || { echo "Empty. Aborted." >&2; exit 1; }
  printf '%s' "$answer"
}
random_word() { # 12 characters without look-alikes (no l, o, 0, 1), written like abcd-efgh-jkmn
  local raw
  raw=$(openssl rand -base64 96 | tr -dc 'a-km-np-z2-9')
  printf '%s-%s-%s' "${raw:0:4}" "${raw:4:4}" "${raw:8:4}"
}
sha256() { printf '%s' "$1" | shasum -a 256 | cut -d' ' -f1; }
put() { printf '%s' "$2" | gh secret set "$1" --env "$ENV_NAME" --repo "$REPO" >/dev/null && echo "  ok $1"; }

echo "Secrets for $REPO (environment: $ENV_NAME)"
echo
echo "1/3 FTP (KAS > FTP users; the user's root must be the folder brush.ingsparks.de/)"
FTP_SERVER=${FTP_SERVER:-$(ask "  Server name" "")}
FTP_USERNAME=${FTP_USERNAME:-$(ask "  User name" "")}
FTP_PASSWORD=$(ask_secret "  Password")
echo
echo "2/3 Database (KAS > Databases)"
DB_HOST=${DB_HOST:-$(ask "  Host" "localhost")}
DB_NAME=${DB_NAME:-$(ask "  Database" "")}
DB_USER=${DB_USER:-$(ask "  Login" "$DB_NAME")}
DB_PASSWORD=$(ask_secret "  Password")
echo
echo "3/3 Invite word (whoever knows it can create a family)"
read -r -s -p "  Invite word (input hidden, empty = make one up): " INVITE
echo >&2
GENERATED=
if [ -z "$INVITE" ]; then
  INVITE=$(random_word)
  GENERATED=1
fi

echo
echo "Saving secrets in GitHub ..."
# The environment has to exist before it can hold secrets; this does nothing if it is there already.
gh api --method PUT "repos/$REPO/environments/$ENV_NAME" >/dev/null
put FTP_SERVER "$FTP_SERVER"
put FTP_USERNAME "$FTP_USERNAME"
put FTP_PASSWORD "$FTP_PASSWORD"
put DB_HOST "$DB_HOST"
put DB_NAME "$DB_NAME"
put DB_USER "$DB_USER"
put DB_PASSWORD "$DB_PASSWORD"
put INVITE_SHA256 "$(sha256 "$INVITE")"

if [ -n "$GENERATED" ]; then
  echo
  echo "Made-up invite word. Put it into your password manager now, it is shown only this once"
  echo "(GitHub only holds its hash):"
  echo
  echo "  $INVITE"
else
  echo
  echo "The invite word you typed is not shown again. GitHub only holds its hash."
fi

cat <<DONE

Last step, when everything in docs/central-storage.md is done (KAS subdomain, PHP, database, FTP user):
  gh variable set DEPLOY_ENABLED --body true --repo $REPO
Until then a push to main does not deploy. After the first deploy:
  1. Open $SITE_URL.
  2. In the app, create the family with the invite word.
  3. Keep the family link in your password manager and hand it to the family.

Then clear this terminal (Cmd+K).
DONE
