#!/bin/sh
# Publica o APK mais recente do ATHG Gravador (Android) no painel admin da ATHG.
#
# Pega o último build com sucesso do workflow "Android APK" no GitHub e envia para o
# bucket privado "gravador" do Supabase (só admins baixam, em /admin).
#
# Uso: sh tools/publish-gravador-apk.sh <versão> "<o que mudou>" [branch]
# Precisa de:
#   - credencial do GitHub no git (git credential) para baixar o artefato do Actions;
#   - token de envio em ~/.config/athg/gravador-upload-token (só o hash fica no banco).
set -e
VERSION="$1"
NOTES="$2"
BRANCH="${3:-codex/android-recorder}"
REPO="antonycorp11-blip/athg"
FUNCTION="https://kdcgdkzdjdkebadnupgu.supabase.co/functions/v1/gravador-upload"
[ -n "$VERSION" ] || { echo "uso: $0 <versão> \"<notas>\" [branch]"; exit 1; }

GH_TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill | sed -n 's/^password=//p')
UPLOAD_TOKEN=$(tr -d '\n' < "$HOME/.config/athg/gravador-upload-token")
api() { curl -fsSL -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" "$@"; }

BRANCH_Q=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$BRANCH")
RUN=$(api "https://api.github.com/repos/$REPO/actions/workflows/android-apk.yml/runs?branch=$BRANCH_Q&status=success&per_page=1" |
  python3 -c 'import json,sys; r=json.load(sys.stdin)["workflow_runs"]; print(r[0]["id"] if r else "")')
[ -n "$RUN" ] || { echo "nenhum build com sucesso em $BRANCH"; exit 1; }
ART=$(api "https://api.github.com/repos/$REPO/actions/runs/$RUN/artifacts" |
  python3 -c 'import json,sys; a=json.load(sys.stdin)["artifacts"]; print(a[0]["archive_download_url"] if a else "")')
[ -n "$ART" ] || { echo "build $RUN sem artefato"; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
api -o "$TMP/apk.zip" "$ART"
unzip -q "$TMP/apk.zip" -d "$TMP/out"
APK=$(find "$TMP/out" -name '*.apk' | head -1)
[ -n "$APK" ] || { echo "artefato sem APK"; exit 1; }

Q=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.urlencode({"version":sys.argv[1],"notes":sys.argv[2]}))' "$VERSION" "$NOTES")
curl -fsS -X POST "$FUNCTION?$Q" -H "x-upload-token: $UPLOAD_TOKEN" -H "Content-Type: application/vnd.android.package-archive" --data-binary @"$APK"
echo
echo "Publicado (build $RUN): baixe em /admin"
