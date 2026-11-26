#!/usr/bin/env python3
"""
End-to-end Audio Sync & Manifest Builder for rapbattle-engine.
Uses ~/venv_audio (librosa + optional whisper) or Suno word-level timestamps to:
1. Parse exact word-level timestamps per lyric line
2. Trim dead-air intro/outro (max 3.5s before first vocal, max 3.5s after last vocal with 1.5s fade-out)
3. Shift all timestamps by the exact trimmed offset
4. Detect real BPM, beat timestamps, and RMS energy curve via librosa
5. Output public/audio/battle.mp3 and public/battle.json (with SVG assets wired)
"""
import argparse
import json
import math
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path
import librosa
import numpy as np

FFPROBE = '/home/harshit/.local/share/mamba/envs/manim/bin/ffprobe'
FFMPEG = '/home/harshit/.local/share/mamba/envs/manim/bin/ffmpeg'


def clean_word(w: str) -> str:
    return "".join(ch.lower() for ch in w if ch.isalnum())


def parse_suno_aligned_words(suno_json_path: Path):
    """Flatten Suno alignedWords into individual word tokens with start/end seconds."""
    data = json.loads(suno_json_path.read_text())
    aw = (data.get("data") or {}).get("alignedWords") or []
    tokens = []
    for item in aw:
        raw = item.get("word", "")
        # remove bracketed tags like [Verse 1: Jensen Huang]
        cleaned = re.sub(r"\[.*?\]", " ", raw)
        parts = [p.strip() for p in cleaned.split() if p.strip()]
        start_s = float(item.get("startS", 0.0))
        end_s = float(item.get("endS", start_s + 0.15))
        if not parts:
            continue
        if len(parts) == 1:
            tokens.append({"word": parts[0], "start": start_s, "end": end_s})
        else:
            # Split duration proportionally if two words were merged by newline (e.g. default\nH100 + s,)
            step = (end_s - start_s) / len(parts)
            for idx, p in enumerate(parts):
                tokens.append({
                    "word": p,
                    "start": round(start_s + idx * step, 3),
                    "end": round(start_s + (idx + 1) * step, 3),
                })

    # Merge split token like "H100" + "s," -> "H100s,"
    merged = []
    for tok in tokens:
        if merged and tok["word"].lower() in ("s", "s,", "s.") and merged[-1]["word"].upper().endswith("100"):
            merged[-1]["word"] = merged[-1]["word"] + tok["word"]
            merged[-1]["end"] = tok["end"]
        else:
            merged.append(tok)
    return merged


def align_lines_to_tokens(known_lines, tokens):
    """Map known lines to exact word tokens sequentially."""
    t_clean = [clean_word(t["word"]) for t in tokens]
    cursor = 0
    n_t = len(tokens)
    captions = []

    for idx, line in enumerate(known_lines):
        speaker = line["speaker"]
        text = line["text"].strip()
        punchline = bool(line.get("punchline", False))
        target_words = text.split()
        target_clean = [clean_word(w) for w in target_words]
        L = len(target_words)

        # Find best matching window near cursor
        best_score = -1.0
        best_span = (cursor, min(n_t, cursor + L))
        for start_i in range(max(0, cursor - 2), min(n_t, cursor + 6)):
            for length in range(max(1, L - 2), L + 3):
                end_i = min(n_t, start_i + length)
                if end_i <= start_i:
                    continue
                cand_str = " ".join(t_clean[start_i:end_i])
                targ_str = " ".join(target_clean)
                score = SequenceMatcher(None, targ_str, cand_str).ratio() - abs(start_i - cursor) * 0.02
                if score > best_score:
                    best_score = score
                    best_span = (start_i, end_i)

        s_i, e_i = best_span
        matched_tokens = tokens[s_i:e_i]
        cursor = e_i

        if matched_tokens:
            words_out = [
                {"text": t["word"], "start": round(t["start"], 3), "end": round(t["end"], 3)}
                for t in matched_tokens
            ]
            l_start = words_out[0]["start"]
            l_end = words_out[-1]["end"]
        else:
            prev_end = captions[-1]["end"] if captions else 3.5
            l_start = round(prev_end + 0.1, 3)
            l_end = round(l_start + 2.5, 3)
            words_out = [{"text": w, "start": l_start, "end": l_end} for w in target_words]

        captions.append({
            "id": idx,
            "speaker": speaker,
            "start": l_start,
            "end": l_end,
            "text": " ".join(w["text"] for w in words_out),
            "words": words_out,
            "punchline": punchline,
        })

    return captions


def main():
    parser = argparse.ArgumentParser(description="Analyze battle audio and build battle.json")
    parser.add_argument("--audio", required=True, help="Input raw MP3 path")
    parser.add_argument("--config", required=True, help="Battle config JSON with fighters & known lines")
    parser.add_argument("--suno-timestamps", help="Optional Suno get-timestamped-lyrics JSON path")
    parser.add_argument("--out-audio", default="public/audio/battle.mp3", help="Trimmed output MP3")
    parser.add_argument("--out-manifest", default="public/battle.json", help="Output battle.json path")
    parser.add_argument("--lead", type=float, default=3.5, help="Max seconds of beat kept before first vocal")
    parser.add_argument("--tail", type=float, default=-1.0, help="Seconds kept after last fighter word. Default -1 = keep the complete beat until the music naturally ends")
    parser.add_argument("--cut-at", type=float, default=None, help="Hard end (raw-audio seconds), e.g. just before stray host/announcer vocals found by Whisper")
    parser.add_argument("--outro-hold", type=float, default=3.0, help="Silent visual outro seconds appended after audio ends")
    args = parser.parse_args()

    raw_audio = Path(args.audio)
    cfg = json.loads(Path(args.config).read_text())

    if args.suno_timestamps and Path(args.suno_timestamps).exists():
        print(f"🎯 Using exact Suno word timestamps from {args.suno_timestamps}...")
        tokens = parse_suno_aligned_words(Path(args.suno_timestamps))
    else:
        import whisper
        print(f"🎤 Transcribing {raw_audio} with Whisper base...")
        model = whisper.load_model("base")
        prompt_text = " ".join(l["text"] for l in cfg.get("lines", []))[:220]
        w_res = model.transcribe(str(raw_audio), word_timestamps=True, language="en", initial_prompt=prompt_text)
        tokens = []
        for seg in w_res.get("segments", []):
            for wd in seg.get("words", []):
                w_str = (wd.get("word") or "").strip()
                if w_str:
                    tokens.append({
                        "word": w_str,
                        "start": float(wd.get("start", 0.0)),
                        "end": float(wd.get("end", 0.0)),
                    })

    print(f"✓ Extracted {len(tokens)} aligned words")

    res = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(raw_audio)],
        capture_output=True, text=True, check=True
    )
    raw_duration = float(res.stdout.strip())

    captions = align_lines_to_tokens(cfg["lines"], tokens)

    first_word_start = captions[0]["start"] if captions else 3.5
    last_word_end = captions[-1]["end"] if captions else raw_duration - 3.5

    # Use complete audio by default (no start trim, no afade that can cut off verses).
    # Note: in ffmpeg, placing -ss AFTER -i does not reset PTS for afade, which previously caused afade to mute the last ~6.5s of the track!
    start_trim = 0.0
    end_at = raw_duration if args.cut_at is None else min(raw_duration, args.cut_at)
    new_duration = max(10.0, end_at - start_trim)
    print(f"🎼 Using COMPLETE audio: raw={raw_duration:.2f}s, first_word={first_word_start:.2f}s, last_word={last_word_end:.2f}s -> start_trim={start_trim:.2f}s, duration={new_duration:.2f}s (no fade cutoff)")

    out_audio = Path(args.out_audio)
    out_audio.parent.mkdir(parents=True, exist_ok=True)
    tmp_audio = out_audio.with_name("battle_trimmed_tmp.mp3")

    subprocess.run([
        FFMPEG, "-y",
        "-ss", str(start_trim),
        "-i", str(raw_audio),
        "-t", str(new_duration),
        "-c:a", "libmp3lame", "-q:a", "2",
        str(tmp_audio)
    ], check=True, capture_output=True)
    tmp_audio.replace(out_audio)

    # Shift timestamps by start_trim and build chunks
    for c in captions:
        c["start"] = round(max(0.0, c["start"] - start_trim), 3)
        c["end"] = round(max(0.0, c["end"] - start_trim), 3)
        for w in c["words"]:
            w["start"] = round(max(0.0, w["start"] - start_trim), 3)
            w["end"] = round(max(0.0, w["end"] - start_trim), 3)
        ws = c["words"]
        chunk_size = max(3, min(5, math.ceil(len(ws) / 3))) if ws else 3
        c["chunks"] = []
        for i in range(0, len(ws), chunk_size):
            cw = ws[i:i + chunk_size]
            c["chunks"].append({
                "start": cw[0]["start"],
                "end": cw[-1]["end"],
                "words": cw,
            })

    # Librosa beat & RMS energy analysis on trimmed audio
    print("🎵 Running librosa beat & RMS energy analysis...")
    y, sr = librosa.load(str(out_audio), sr=None)
    actual_dur = float(librosa.get_duration(y=y, sr=sr))
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, trim=False)
    beats = [round(float(b), 3) for b in librosa.frames_to_time(beat_frames, sr=sr).tolist()]
    bpm_val = int(round(float(tempo[0]) if isinstance(tempo, np.ndarray) else float(tempo)))
    if bpm_val <= 0:
        bpm_val = 92

    # Compute 40-point RMS energy curve
    rms = librosa.feature.rms(y=y)[0]
    rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
    max_rms = float(np.percentile(rms, 98)) if len(rms) > 0 else 1.0
    if max_rms <= 0:
        max_rms = 1.0
    energy_points = []
    num_pts = 40
    for i in range(num_pts):
        t_val = i * actual_dur / (num_pts - 1)
        idx = int(np.argmin(np.abs(rms_times - t_val))) if len(rms_times) > 0 else 0
        win = rms[max(0, idx - 3):min(len(rms), idx + 4)]
        val = float(np.mean(win)) / max_rms if len(win) > 0 else 0.4
        energy_points.append({"t": round(t_val, 3), "v": round(min(1.0, max(0.15, val)), 3)})

    manifest = {
        "schemaVersion": 1,
        "slug": cfg.get("slug", "jensen_vs_trump"),
        "title": cfg.get("title", "JENSEN VS TRUMP"),
        "hashtag": cfg.get("hashtag", "#SILICONWARS"),
        "fps": 30,
        "width": 1080,
        "height": 1920,
        "audio": {
            "src": "audio/battle.mp3",
            "duration": round(actual_dur, 3),
            "durationInFrames": int(round((actual_dur + args.outro_hold) * 30)),
            "bpm": bpm_val,
            "beats": beats,
            "energy": energy_points,
        },
        "intro": {
            "start": 0.0,
            "end": 3.5,
        },
        "outro": {
            "start": round((captions[-1]["end"] + 0.4) if captions else actual_dur - 2.0, 3),
            "end": round(actual_dur + args.outro_hold, 3),
        },
        "fighters": cfg["fighters"],
        "captions": captions,
    }

    out_manifest = Path(args.out_manifest)
    out_manifest.write_text(json.dumps(manifest, indent=2))
    print(f"✓ Wrote manifest to {out_manifest} ({manifest['audio']['durationInFrames']} frames, {actual_dur:.2f}s, {bpm_val} BPM)")
    for c in captions:
        print(f"  [{c['start']:5.2f}s - {c['end']:5.2f}s] ({c['speaker']}): {c['text']}")


if __name__ == "__main__":
    main()
