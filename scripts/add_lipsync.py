#!/usr/bin/env python3
"""Add per-frame lip-sync mouth levels (0 closed,1 half,2 open) to public/battle.json.
Vocal-band (300-3400 Hz) RMS, gated by word timings, so mouths only move on real words."""
import json, numpy as np, librosa
from pathlib import Path
R = Path(__file__).resolve().parent.parent
m = json.loads((R/"public/battle.json").read_text())
fps = m["fps"]; n = m["audio"]["durationInFrames"]
y, sr = librosa.load(str(R/"public"/m["audio"]["src"]), sr=22050, mono=True)
hop = sr // fps
S = np.abs(librosa.stft(y, n_fft=1024, hop_length=hop))
f = librosa.fft_frequencies(sr=sr, n_fft=1024)
band = S[(f >= 300) & (f <= 3400)].mean(axis=0)
band = np.pad(band, (0, max(0, n - len(band))))[:n]
words = [(w["start"], w["end"]) for c in m["captions"] for w in c["words"]]
gate = np.zeros(n, bool)
for s, e in words:
    gate[max(0, int((s - 0.03) * fps)):min(n, int(np.ceil((e + 0.02) * fps)))] = True
ref = np.percentile(band[gate], 90) if gate.any() else 1.0
v = np.clip(band / max(ref, 1e-9), 0, 1.2)
# local contrast: compare to short moving average so syllables pop
avg = np.convolve(v, np.ones(5) / 5, mode="same")
lvl = np.where(~gate, 0, np.where((v > 0.62) | (v > avg * 1.15) & (v > 0.4), 2, np.where(v > 0.22, 1, 0)))
# avoid 1-frame flicker: closed frames inside words get half-open
for i in range(1, n - 1):
    if gate[i] and lvl[i] == 0 and lvl[i - 1] > 0 and lvl[i + 1] > 0:
        lvl[i] = 1
m["audio"]["mouth"] = "".join(str(int(x)) for x in lvl)
(R/"public/battle.json").write_text(json.dumps(m, indent=2))
u, c = np.unique(lvl, return_counts=True)
print("frames", n, dict(zip(u.tolist(), c.tolist())), "gated", int(gate.sum()))

