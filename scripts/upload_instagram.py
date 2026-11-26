#!/usr/bin/env python3
"""Publish a rap battle video as an Instagram Reel via the Instagram Graph API.

Config: ~/.config/rapbattle/instagram.json  (chmod 600)
  {"ig_user_id": "1784...", "access_token": "<long-lived token>",
   "public_dir": "/var/www/rb", "public_base": "https://example.com/rb"}   # public_* only if not using --video-url
Graph API needs a PUBLIC https URL to the mp4 (no file upload). Either pass --video-url, or the script
copies the file into public_dir, uses public_base/<name>, and removes it after publishing.
Reels must be <= 15 min (script refuses longer unless --force).

Usage: upload_instagram.py post <video.mp4> [--slug S] [--caption C] [--video-url URL] [--share-to-feed] [--force]
       upload_instagram.py status      # shows the linked IG username + token check
Prints IG_PERMALINK=<url> on success.
"""
import argparse, json, shutil, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

CFG = Path.home() / ".config" / "rapbattle" / "instagram.json"
ENGINE = Path(__file__).resolve().parent.parent
GRAPH = "https://graph.facebook.com/v21.0"


def cfg():
    if not CFG.exists():
        sys.exit(f"Instagram not configured: missing {CFG}")
    return json.loads(CFG.read_text())


def call(method, path, token, **params):
    params["access_token"] = token
    data = urllib.parse.urlencode(params).encode()
    url = f"{GRAPH}/{path}"
    req = urllib.request.Request(url + ("?" + data.decode() if method == "GET" else ""),
                                 data=None if method == "GET" else data, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"Graph API error {e.code}: {e.read().decode()[:600]}")


def duration(video):
    try:
        o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
                           capture_output=True, text=True, timeout=30)
        return float(o.stdout.strip())
    except Exception:
        return None


def caption_for(slug):
    p = ENGINE / "references" / f"{slug}_config.json"
    if not p.exists():
        return "AI rap battle #RapBattle #AIRapBattle"
    c = json.loads(p.read_text())
    names = [f["name"] for f in c.get("fighters", {}).values() if f.get("name")]
    tag = (c.get("hashtag") or "#CAGEMATCH")
    return f"{' vs '.join(names)} - AI rap battle.\n\n{tag} #RapBattle #AIRapBattle #Reels"


def status():
    c = cfg()
    r = call("GET", c["ig_user_id"], c["access_token"], fields="username,media_count")
    print("instagram:", r)


def post(a):
    c = cfg()
    video = a.video
    if not video.is_file():
        sys.exit(f"file not found: {video}")
    d = duration(video)
    if d and d > 900 and not a.force:
        sys.exit(f"video is {d:.1f}s; Reels max is 15 min. Trim it or pass --force to try anyway.")
    slug = a.slug or video.stem.removesuffix("_viz")
    staged = None
    url = a.video_url
    if not url:
        if not (c.get("public_dir") and c.get("public_base")):
            sys.exit("no public URL: pass --video-url or set public_dir/public_base in instagram.json")
        staged = Path(c["public_dir"]) / video.name
        shutil.copy2(video, staged)
        url = f"{c['public_base'].rstrip('/')}/{video.name}"
    try:
        tok, uid = c["access_token"], c["ig_user_id"]
        r = call("POST", f"{uid}/media", tok, media_type="REELS", video_url=url,
                 caption=a.caption or caption_for(slug), share_to_feed=str(a.share_to_feed).lower())
        cid = r["id"]
        print("container", cid, flush=True)
        for _ in range(60):  # up to ~10 min
            s = call("GET", cid, tok, fields="status_code,status")
            print(" ", s.get("status_code"), flush=True)
            if s.get("status_code") == "FINISHED":
                break
            if s.get("status_code") in ("ERROR", "EXPIRED"):
                sys.exit(f"container failed: {s}")
            time.sleep(10)
        else:
            sys.exit("timed out waiting for Instagram to process the video")
        pub = call("POST", f"{uid}/media_publish", tok, creation_id=cid)
        link = call("GET", pub["id"], tok, fields="permalink").get("permalink", "")
        print(f"IG_MEDIA_ID={pub['id']}\nIG_PERMALINK={link}")
    finally:
        if staged:
            staged.unlink(missing_ok=True)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("status")
    p = sub.add_parser("post")
    p.add_argument("video", type=Path)
    p.add_argument("--slug")
    p.add_argument("--caption")
    p.add_argument("--video-url")
    p.add_argument("--share-to-feed", action="store_true")
    p.add_argument("--force", action="store_true")
    a = ap.parse_args()
    status() if a.cmd == "status" else post(a)


if __name__ == "__main__":
    main()
