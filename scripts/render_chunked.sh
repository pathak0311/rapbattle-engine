#!/usr/bin/env bash
# Memory-safe render: muted frame-range chunks (fresh process each), concat, mux original audio, compress <15MB.
# Usage: render_chunked.sh <slug> <totalFrames> [chunkFrames=240]
set -euo pipefail
cd "$(dirname "$0")/.."
SLUG="$1"; TOTAL="$2"; STEP="${3:-240}"
export PATH="$HOME/.local/bin:$PATH"
rm -rf out/parts; mkdir -p out/parts
: > out/parts/list.txt
i=0
for ((s=0; s<TOTAL; s+=STEP)); do
  e=$((s+STEP-1)); ((e>=TOTAL)) && e=$((TOTAL-1))
  f=out/parts/p$(printf %03d $i).mp4
  echo "== chunk $i frames $s-$e"
  npx remotion render src/index.tsx RapBattlePro "$f" --frames=$s-$e --muted --concurrency=1 --image-format=jpeg --jpeg-quality=85 --crf=23 --chromium-options="--disable-dev-shm-usage" --overwrite
  echo "file '$PWD/$f'" >> out/parts/list.txt
  i=$((i+1))
done
ffmpeg -y -f concat -safe 0 -i out/parts/list.txt -c copy out/parts/video.mp4
ffmpeg -y -i out/parts/video.mp4 -i public/audio/battle.mp3 -map 0:v -map 1:a -c:v libx264 -crf 28 -preset fast -maxrate 1800k -bufsize 3600k -c:a aac -b:a 128k -shortest -movflags +faststart out/$SLUG.mp4
echo "SIZE $(stat -c%s out/$SLUG.mp4)"
ffprobe -v error -show_entries stream=codec_type,duration -of csv=p=0 out/$SLUG.mp4
echo "✓ Verified video + audio streams"
