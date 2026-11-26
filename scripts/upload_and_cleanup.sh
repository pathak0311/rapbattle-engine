#!/usr/bin/env bash
# Upload a rap battle video to YouTube, verify it registered, then delete the local copy.
# (Replaces the old Google Drive/rclone flow; the Drive version is in git history.)
# Usage: ./scripts/upload_and_cleanup.sh <local_file> [--privacy unlisted|private|public] [--title T] [--slug S]
# Default privacy is unlisted (or $RAPBATTLE_YT_PRIVACY). Use --privacy public only when the owner OKs a public post.
# Set KEEP_LOCAL=1 to skip the local delete.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shorts-poc venv already has google-api-python-client + google-auth-oauthlib
PY="${YT_PYTHON:-/home/harshit/.openclaw/workspace/shorts-poc/venv/bin/python}"

LOCAL_FILE="${1:?usage: upload_and_cleanup.sh <local_file> [--privacy ...]}"
shift || true

if [[ ! -f "$LOCAL_FILE" ]]; then
  echo "✗ File not found: $LOCAL_FILE"
  exit 1
fi

echo "📤 Uploading $LOCAL_FILE ($(stat -c%s "$LOCAL_FILE") bytes) → YouTube"
LOG=$(mktemp)
trap 'rm -f "$LOG"' EXIT
"$PY" "$HERE/upload_youtube.py" upload "$LOCAL_FILE" "$@" 2>&1 | tee "$LOG"
OUT=$(cat "$LOG")

YT_URL=$(printf '%s\n' "$OUT" | sed -n 's/^YOUTUBE_URL=//p' | tail -1)
if [[ -z "$YT_URL" ]]; then
  echo "✗ Upload did not return a YouTube URL; keeping local file"
  exit 1
fi

echo "✅ Verification passed: video registered on channel"
echo "🔗 YouTube link: $YT_URL"

if [[ "${KEEP_LOCAL:-0}" == "1" ]]; then
  echo "ℹ️  KEEP_LOCAL=1, local file kept"
else
  echo "🗑️  Deleting local file..."
  rm -f "$LOCAL_FILE"
  echo "✅ Local file deleted"
fi
echo "✅ Upload and cleanup complete"
