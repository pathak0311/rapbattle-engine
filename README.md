# rapbattle-engine

Data-driven hip-hop rap battle video factory. One data drop per battle (audio, lyrics, fighters), one render, one vertical 1080x1920 video.

Lyrics → AI-generated audio → word-level lip-sync manifest → [Remotion](https://www.remotion.dev/) render → compress → YouTube upload.

## What's in here

- `src/` - Remotion compositions. `RapBattle.tsx` is the base battle; `src/formats/` holds themed variants (anime, chat, comic, conquest, files, spot-kick, terminal, VHS).
- `src/components/` - reusable pieces: audio visualizer, kinetic lyrics, fighter and host avatars, stage and battle FX, intro/outro.
- `scripts/` - the pipeline around the renderer:
  - `suno_generate.py` - generate the battle audio
  - `whisper_words.py`, `prepare_battle.py`, `analyze_and_build_battle.py` - word timings and beat data → `public/battle.json`
  - `make_fighter_svg.py`, `make_mouth_variants.py`, `add_lipsync.py` - turn portraits into traced SVG fighters with mouth shapes
  - `render_battle.sh`, `render_chunked.sh`, `render_chunked_bundle.sh` - renders (chunked for low-memory machines)
  - `upload_youtube.py`, `upload_and_cleanup.sh`, `upload_instagram.py` - delivery
- `public/` - fighter assets, fonts, and `battle.json` (the per-battle data file the compositions read).
- `references/` - earlier versions and sample beat/caption data.

## Run it

```bash
npm ci
pip install -r requirements.txt     # vtracer, pillow, requests (asset prep)
npm run typecheck
npx remotion studio                 # preview
npm run render                      # bash scripts/render_battle.sh
```

Needs Node 20+, ffmpeg, and Python 3. On a Raspberry Pi, render with `--concurrency=1 --chromium-options="--disable-dev-shm-usage"` to avoid shared-memory crashes.

Audio generation and uploads need your own credentials (Suno, YouTube OAuth). None are stored in this repo; the scripts read them from `~/.config/rapbattle/`.

## Credits

Portraits are vector-traced from Wikimedia Commons photos. Sources and licenses are listed in `public/assets/portrait-credits.md`. This is satire/parody content; no affiliation with anyone depicted.
