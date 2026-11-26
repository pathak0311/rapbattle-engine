#!/usr/bin/env bash
# Memory-safe chunked render from a PRE-BUNDLED site (no webpack in the render process).
# Usage: render_chunked_bundle.sh <bundleDir> <compositionId> <slug> <totalFrames> [chunk=240]
set -uo pipefail
cd "$(dirname "$0")/.."
BUNDLE="$1"; COMP="$2"; SLUG="$3"; TOTAL="$4"; STEP="${5:-240}"
export PATH="$HOME/.local/bin:$PATH"
P=out/parts_$SLUG; mkdir -p "$P"; : > "$P/list.txt"  # resume: finished chunks are kept
i=0
for ((s=0; s<TOTAL; s+=STEP)); do
  e=$((s+STEP-1)); ((e>=TOTAL)) && e=$((TOTAL-1))
  f="$P/p$(printf %03d $i).mp4"
  if [[ -s "$f" && -f "$f.ok" ]]; then echo "== chunk $i frames $s-$e already done"; echo "file '$PWD/$f'" >> "$P/list.txt"; i=$((i+1)); continue; fi
  rm -f "$f"
  for try in 1 2 3; do
    echo "== chunk $i frames $s-$e try $try"
    if npx remotion render "$BUNDLE" "$COMP" "$f" --frames=$s-$e --muted --concurrency=1 --image-format=jpeg --jpeg-quality=85 --crf=23 --chromium-options="--disable-dev-shm-usage" --overwrite; then break; fi
    sleep 5
  done
  [[ -f "$f" ]] || { echo "CHUNK_FAILED $i"; exit 1; }
  touch "$f.ok"
  echo "file '$PWD/$f'" >> "$P/list.txt"
  i=$((i+1))
done
ffmpeg -y -f concat -safe 0 -i "$P/list.txt" -c copy "$P/video.mp4" || exit 1
ffmpeg -y -i "$P/video.mp4" -i public/audio/battle.mp3 -map 0:v -map 1:a -c:v libx264 -crf 28 -preset fast -maxrate 1800k -bufsize 3600k -c:a aac -b:a 128k -shortest -movflags +faststart out/formats/$SLUG.mp4 || exit 1
echo "SIZE $(stat -c%s out/formats/$SLUG.mp4)"
echo "ALL_DONE"
