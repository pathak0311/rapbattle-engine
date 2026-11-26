#!/usr/bin/env bash
# Render the rap battle video with production settings.
# Flags: --concurrency=1 --image-format=jpeg --jpeg-quality=85 --crf=23
# Run with an exec timeout of at least 900 seconds on Raspberry Pi 5.
set -euo pipefail

cd "$(dirname "$0")/.."

SLUG="${1:-jensen_vs_trump_viz}"
COMP="RapBattlePro"
RAW_OUT="out/raw.mp4"
OUT="out/${SLUG}.mp4"

echo "🎬 Rendering $COMP → $RAW_OUT"

npx remotion render src/index.tsx "$COMP" "$RAW_OUT" \
  --concurrency=1 \
  --image-format=jpeg \
  --jpeg-quality=85 \
  --crf=23 \
  --chromium-options="--disable-dev-shm-usage" \
  --overwrite

echo "✓ Render complete: $RAW_OUT"

export PATH="$HOME/.local/bin:$HOME/.local/share/mamba/envs/manim/bin:$PATH"

# Verify output
if [[ ! -f "$RAW_OUT" ]]; then
  echo "✗ Output file missing"
  exit 1
fi

SIZE=$(stat -c%s "$RAW_OUT")
SIZE_MB=$((SIZE / 1024 / 1024))
echo "📦 File size: ${SIZE_MB}MB"

echo "🔧 Compressing with production settings..."
ffmpeg -y -i "$RAW_OUT" \
  -c:v libx264 -crf 28 -preset fast \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  "$OUT"

rm -f "$RAW_OUT"

SIZE=$(stat -c%s "$OUT")
SIZE_MB=$((SIZE / 1024 / 1024))
echo "📦 Compressed size: ${SIZE_MB}MB"

if [[ $SIZE -gt 15728640 ]]; then  # 15MB
  echo "✗ Final output exceeds 15MB"
  exit 1
fi

# Verify with ffprobe
echo "🔍 Verifying..."
PROBE=$(ffprobe -v error -show_entries format=duration,size,bit_rate \
  -show_entries stream=codec_type,codec_name,width,height \
  -of json "$OUT")
echo "$PROBE"

python3 - "$OUT" <<'PY'
import json
import subprocess
import sys

path = sys.argv[1]
result = subprocess.run(
    [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration,size,bit_rate",
        "-show_entries", "stream=codec_type,codec_name,width,height",
        "-of", "json", path,
    ],
    check=True,
    capture_output=True,
    text=True,
)
data = json.loads(result.stdout)
streams = data.get("streams", [])
video = [s for s in streams if s.get("codec_type") == "video"]
audio = [s for s in streams if s.get("codec_type") == "audio"]
if len(video) != 1 or len(audio) != 1:
    raise SystemExit(f"Expected exactly one video and one audio stream; got {streams}")
size = int(data["format"]["size"])
if size >= 15 * 1024 * 1024:
    raise SystemExit(f"Output is not under 15MB: {size} bytes")
print(f"✓ Verified video + audio streams; {size} bytes")
PY

echo "✓ Render verified: $OUT"
