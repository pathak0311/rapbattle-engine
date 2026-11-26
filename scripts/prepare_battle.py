#!/usr/bin/env python3
"""
Generate battle.json manifest from audio, captions, and beat data.
Creates a fully data-driven manifest that requires ZERO .tsx edits for new battles.
Usage: python3 scripts/prepare_battle.py <audio.mp3> <captions.json> <beat_data.json> <output.json>
"""
import sys
import json
from pathlib import Path


def load_captions(path: Path) -> list:
    data = json.loads(path.read_text())
    return data

def load_beats(path: Path) -> list:
    data = json.loads(path.read_text())
    return data.get('beats', [])

def build_energy_curve(energy_data: list, duration: float) -> list:
    """Downsample energy data to ~20 points."""
    if not energy_data:
        return [{'t': i * duration / 19, 'v': 0.5} for i in range(20)]
    # Take every Nth point to get ~20 points
    step = max(1, len(energy_data) // 20)
    energy_points = []
    for i in range(0, len(energy_data), step):
        pt = energy_data[i]
        energy_points.append({'t': round(pt['t'], 3), 'v': round(pt['v'], 3)})
    return energy_points[:20]

def main():
    if len(sys.argv) != 5:
        print(f"Usage: {sys.argv[0]} <audio.mp3> <captions.json> <beat_data.json> <output.json>", file=sys.stderr)
        sys.exit(1)

    audio_path = Path(sys.argv[1])
    captions_path = Path(sys.argv[2])
    beats_path = Path(sys.argv[3])
    output_path = Path(sys.argv[4])

    # Duration from beat_data.json (accurate)
    beat_data = json.loads(beats_path.read_text())
    duration = beat_data.get('duration', 121.78279166666667)
    bpm = beat_data.get('bpm', 89)
    beats = beat_data.get('beats', [])
    energy_raw = beat_data.get('energy', [])
    energy = build_energy_curve(energy_raw, duration)
    fps = 30
    duration_in_frames = int(round(duration * fps))

    captions = load_captions(captions_path)
    beats = load_beats(beats_path)
    bpm = round(60 / (sum(beats[i+1]-beats[i] for i in range(len(beats)-1)) / (len(beats)-1))) if len(beats) > 1 else 89
    energy = build_energy_curve(energy_raw, duration)

    # Split captions by speaker
    fighter1_lines = [c for c in captions if c.get('speaker') == 'ELON']
    fighter2_lines = [c for c in captions if c.get('speaker') == 'SAM']
    both_lines = [c for c in captions if c.get('speaker') == 'BOTH']

    # Build manifest
    manifest = {
        "schemaVersion": 1,
        "slug": "elon_vs_sam",
        "title": "ELON VS SAM",
        "hashtag": "#AIWARS",
        "fps": fps,
        "width": 1080,
        "height": 1920,
        "audio": {
            "src": "audio/battle.mp3",
            "duration": round(duration, 3),
            "durationInFrames": duration_in_frames,
            "bpm": bpm,
            "beats": beats,
            "energy": energy,
        },
        "intro": {
            "start": 0.0,
            "end": 4.0,
            "hostLine": "WELCOME TO THE ARENA OF IDEAS"
        },
        "outro": {
            "start": duration - 4.0,
            "end": duration,
            "hostLine": "THE FUTURE IS UNWRITTEN",
            "cta": "SUBSCRIBE FOR MORE BATTLES"
        },
        "fighters": {
            "fighter1": {
                "id": "fighter1",
                "name": "ELON MUSK",
                "badge": "TECH TITAN",
                "color": "#FF2E63",
                "svg": "assets/elon.svg"
            },
            "fighter2": {
                "id": "fighter2",
                "name": "SAM ALTMAN",
                "badge": "AI ARCHITECT",
                "color": "#08D9D6",
                "svg": "assets/sam.svg"
            }
        },
        "hypeBreaks": [
            {"start": 16.8, "end": 21.14, "next": "fighter1", "text": "ELON MUSK • OPENING MIC"},
            {"start": 42.5, "end": 52.84, "next": "fighter2", "text": "SAM ALTMAN • COUNTER STRIKE"},
            {"start": 74.5, "end": 85.98, "next": "both", "text": "CLOSING HOOK • NO HOLDS BARRED"},
        ],
        "captions": [
            {
                "id": i,
                "speaker": "fighter1" if c.get('speaker') == 'ELON' else "fighter2" if c.get('speaker') == 'SAM' else "both",
                "start": c['start'],
                "end": c['end'],
                "text": c['text'],
                "words": [{"text": w.get('text') or w.get('word', ''), "start": w['start'], "end": w['end']} for w in c.get('words', [])],
                "punchline": c.get('punchline', False),
            }
            for i, c in enumerate(captions)
        ],
    }

    output_path.write_text(json.dumps(manifest, indent=2))
    print(f"✓ Manifest written to {output_path}")
    print(f"  Duration: {duration:.2f}s ({duration_in_frames} frames @ {fps}fps)")
    print(f"  BPM: {bpm}")
    print(f"  Beats: {len(beats)}")
    print(f"  Captions: {len(captions)}")
    print(f"  Energy points: {len(energy)}")

if __name__ == '__main__':
    main()