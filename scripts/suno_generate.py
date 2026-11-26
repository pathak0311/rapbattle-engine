#!/usr/bin/env python3
"""Generate a rap battle track via Suno (apibox) and save raw mp3 + timestamped lyrics.
Usage: suno_generate.py <config.json> <slug>
"""
import json, os, re, sys, time, requests
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
def load_key():
    for p in [Path.home()/".openclaw/workspace/rapbattle-reel/.env"]:
        for line in p.read_text().splitlines():
            if line.startswith("SUNO_API_KEY="):
                return line.split("=",1)[1].strip().strip('"')
    y = (Path.home()/".openclaw/workspace/rapbattle-reel/config/settings.yaml").read_text()
    m = re.search(r'api_key:\s*"?([^"\n]+)', y); return m.group(1).strip()
KEY = os.environ.get("SUNO_API_KEY") or load_key()
BASE = "https://apibox.erweima.ai/api/v1"
H = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
cfg = json.loads(Path(sys.argv[1]).read_text()); slug = sys.argv[2]
f1, f2 = cfg["fighters"]["fighter1"]["name"].title(), cfg["fighters"]["fighter2"]["name"].title()
v1 = "\n".join(l["text"] for l in cfg["lines"] if l["speaker"]=="fighter1")
v2 = "\n".join(l["text"] for l in cfg["lines"] if l["speaker"]=="fighter2")
lyrics = f"[Verse 1: {f1}]\n{v1}\n\n[Verse 2: {f2}]\n{v2}\n\n[End]"
payload = {"prompt": lyrics, "customMode": True, "instrumental": False, "model": "V4_5",
  "title": cfg["title"].title(),
  "style": cfg.get("sunoStyle") or "hardcore boom bap rap battle, 92 bpm, punchy drums, deep 808, dark piano stabs, two male rappers, verse 1 smooth calm baritone, verse 2 brash raspy loud, rap verses only, no chorus, no announcer, no hype man, no spoken intro, no spoken outro, abrupt ending",
  "negativeTags": "announcer, host, hype man, spoken word, narration, chorus, singing, female vocals, crowd",
  "callBackUrl": "https://example.com/noop"}
if os.environ.get("RESUME_TASK"):
    task = os.environ["RESUME_TASK"]; print("resuming taskId", task, flush=True)
else:
    r = requests.post(f"{BASE}/generate", headers=H, json=payload, timeout=60).json()
    print("generate:", {k: r.get(k) for k in ("code","msg")}, flush=True)
    if r.get("code") != 200: sys.exit(2)
    task = r["data"]["taskId"]; print("taskId", task, flush=True)
(ROOT/f"references/{slug}_suno_task_id.txt").write_text(task)
t0 = time.time(); data = None
while time.time()-t0 < 900:
    d = requests.get(f"{BASE}/generate/record-info", headers=H, params={"taskId": task}, timeout=30).json().get("data") or {}
    st = d.get("status"); print("status", st, int(time.time()-t0), flush=True)
    if st == "SUCCESS": data = d; break
    if st and ("FAIL" in st or "ERROR" in st or "SENSITIVE" in st):
        print("FAILED", d.get("errorMessage")); sys.exit(3)
    time.sleep(12)
if not data: print("TIMEOUT"); sys.exit(4)
tracks = data["response"]["sunoData"]
(ROOT/f"references/{slug}_suno_record.json").write_text(json.dumps(data, indent=2))
for i, t in enumerate(tracks):
    url = t.get("audioUrl") or t.get("sourceAudioUrl")
    out = ROOT/f"references/{slug}_raw{'' if i==0 else '_alt'+str(i)}.mp3"
    out.write_bytes(requests.get(url, timeout=120).content)
    ts = requests.post(f"{BASE}/generate/get-timestamped-lyrics", headers=H, json={"taskId": task, "audioId": t["id"]}, timeout=60).json()
    (ROOT/f"references/{slug}_suno_timestamps{'' if i==0 else '_alt'+str(i)}.json").write_text(json.dumps(ts, indent=2))
    print("saved", out.name, "dur", t.get("duration"), "ts_code", ts.get("code"), flush=True)
print("DONE")

