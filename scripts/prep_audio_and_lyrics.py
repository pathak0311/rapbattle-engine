#!/usr/bin/env python3
"""
Prepare audio and lyrics for the visualizer factory.
1. Trims dead-air intro/outro (max 3.5s before first vocal, max 3.5s after last vocal with 1.5s fade-out)
2. Shifts all timestamps in battle.json by the exact trimmed offset
3. Outputs trimmed audio to public/audio/battle.mp3
4. Outputs updated battle.json manifest
Usage: python3 scripts/prep_audio_and_lyrics.py <raw_mp3> <battle_config_json>
"""
import sys
import json
import subprocess
from pathlib import Path
import math

FFPROBE = '/home/harshit/.local/share/mamba/envs/manim/bin/ffprobe'
FFMPEG = '/home/harshit/.local/share/mamba/envs/manim/bin/ffmpeg'


def trim_audio(input_path: Path, output_path: Path, start_trim: float, end_trim: float, fade_out: float = 1.5) -> float:
    """Trim audio and return the new duration."""
    # Get original duration
    result = subprocess.run([
        FFPROBE, '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(input_path)
    ], capture_output=True, text=True)
    original_duration = float(result.stdout.strip())
    
    new_duration = original_duration - start_trim - end_trim
    
    # Trim with ffmpeg - use 1.5s fade out as specified
    fade_start = new_duration - fade_out
    subprocess.run([
        FFMPEG, '-y', '-i', str(input_path),
        '-ss', str(start_trim),
        '-t', str(new_duration),
        '-af', f'afade=t=out:st={fade_start}:d={fade_out}',
        '-c:a', 'libmp3lame', '-q:a', '2',
        str(output_path)
    ], check=True, capture_output=True)
    
    return new_duration


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <raw_mp3> <battle_config_json>", file=sys.stderr)
        sys.exit(1)

    raw_audio = Path(sys.argv[1])
    battle_config = Path(sys.argv[2])

    # Load battle config (contains fighter names, colors, captions with word timings, etc.)
    config = json.loads(battle_config.read_text())

    # Use existing caption data from config
    captions = config.get("captions", [])
    
    # Determine trim points (dead air before first word, after last word)
    all_words = []
    for c in captions:
        all_words.extend(c.get("words", []))
    
    if not all_words:
        print("No word timings found!", file=sys.stderr)
        sys.exit(1)
    
    first_word_start = min(w["start"] for w in all_words)
    last_word_end = max(w["end"] for w in all_words)
    
    # Trim if there's >3.5s dead air at start - leave exactly 3.5s max before first word
    start_trim = max(0, first_word_start - 3.5)
    
    # Get original duration
    result = subprocess.run([
        FFPROBE, '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', str(raw_audio)
    ], capture_output=True, text=True)
    original_duration = float(result.stdout.strip())
    
    # Trim if there's >3.5s dead air at end - leave exactly 3.5s max after last word (with 1.5s fade)
    end_dead_air = original_duration - last_word_end
    end_trim = max(0, end_dead_air - 3.5)
    
    print(f"Original duration: {original_duration:.2f}s")
    print(f"First word at: {first_word_start:.2f}s, Last word ends at: {last_word_end:.2f}s")
    print(f"Trimming: start={start_trim:.2f}s, end={end_trim:.2f}s")
    
    # Trim audio - use temp file to avoid read/write conflict
    trimmed_audio = Path("public/audio/battle.mp3")
    trimmed_audio.parent.mkdir(parents=True, exist_ok=True)
    temp_audio = Path("public/audio/battle_trimmed.mp3")
    
    new_duration = trim_audio(raw_audio, temp_audio, start_trim, end_trim)
    
    # Replace original with trimmed
    temp_audio.replace(trimmed_audio)
    
    # Shift all timestamps by start_trim
    for c in captions:
        c["start"] = max(0, c["start"] - start_trim)
        c["end"] = max(0, c["end"] - start_trim)
        for w in c.get("words", []):
            w["start"] = max(0, w["start"] - start_trim)
            w["end"] = max(0, w["end"] - start_trim)
    
    # Group words into display chunks (3-5 words)
    for c in captions:
        words = c.get("words", [])
        if words:
            chunk_size = max(3, min(5, math.ceil(len(words) / 3)))
            c["chunks"] = []
            for i in range(0, len(words), chunk_size):
                chunk_words = words[i:i + chunk_size]
                c["chunks"].append({
                    "start": chunk_words[0]["start"],
                    "end": chunk_words[-1]["end"],
                    "words": chunk_words
                })
    
    # Build energy curve from caption density (20 points)
    energy_points = []
    step = new_duration / 19
    for i in range(20):
        t = i * step
        # Simple energy approximation from caption density
        v = 0.1
        for c in captions:
            if c["start"] <= t < c["end"]:
                v = 0.5 + 0.4 * (1 - abs(t - (c["start"] + c["end"]) / 2) / ((c["end"] - c["start"]) / 2))
                break
        energy_points.append({"t": round(t, 3), "v": round(v, 3)})
    
    # Build manifest
    manifest = {
        "schemaVersion": 1,
        "slug": config.get("slug", "battle"),
        "title": config.get("title", "BATTLE"),
        "hashtag": config.get("hashtag", "#BATTLE"),
        "fps": 30,
        "width": 1080,
        "height": 1920,
        "audio": {
            "src": "audio/battle.mp3",
            "duration": round(new_duration, 3),
            "durationInFrames": int(round(new_duration * 30)),
            "bpm": config.get("bpm", 90),
            "beats": config.get("beats", []),
            "energy": energy_points,
        },
        "intro": {
            "start": 0.0,
            "end": 3.5,
        },
        "outro": {
            "start": new_duration - 3.5,
            "end": new_duration,
        },
        "fighters": config.get("fighters", {}),
        "captions": [
            {
                "id": i,
                "speaker": c.get("speaker", "fighter1"),
                "start": c["start"],
                "end": c["end"],
                "text": c["text"],
                "words": c.get("words", []),
                "chunks": c.get("chunks", []),
                "punchline": c.get("punchline", False),
            }
            for i, c in enumerate(captions)
        ],
    }

    output_path = Path("public/battle.json")
    output_path.write_text(json.dumps(manifest, indent=2))
    print(f"✓ Manifest written to {output_path}")
    print(f"  Duration: {new_duration:.2f}s ({manifest['audio']['durationInFrames']} frames @ 30fps)")
    print(f"  Intro ends at: 3.5s, Outro starts at: {new_duration - 3.5:.2f}s")
    print(f"  Captions: {len(captions)}")
    print(f"  Energy points: {len(energy_points)}")


if __name__ == '__main__':
    main()