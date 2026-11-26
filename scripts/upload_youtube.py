#!/usr/bin/env python3
"""Upload a rap battle video to the owner's YouTube channel (YouTube Data API v3).

One-time setup (OAuth as the channel owner):
  1. Google Cloud console: enable "YouTube Data API v3", create an OAuth client of type
     "Desktop app", save the JSON as ~/.config/rapbattle/client_secret.json
     (falls back to ~/.config/jee-shorts/client_secret.json if that one exists).
     Add the channel's Google account as a test user on the consent screen.
  2. On the Pi:  scripts/upload_youtube.py auth
     (prints a URL; from the Mac run `ssh -L 8766:localhost:8766 <pi>` first, then open it).
     Pick the account/channel that should own the battles.

Usage:
  upload_youtube.py auth
  upload_youtube.py status
  upload_youtube.py upload <video.mp4> [--slug S] [--title T] [--privacy unlisted|private|public]

Privacy defaults to "unlisted" (env RAPBATTLE_YT_PRIVACY overrides) so nothing goes public
without an explicit `--privacy public`.
On success prints `YOUTUBE_URL=<url>` and `YOUTUBE_ID=<id>` as the last lines.
"""
import argparse
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")  # loopback http redirect
CONFIG_DIR = Path(os.environ.get("RAPBATTLE_YT_DIR", Path.home() / ".config" / "rapbattle"))
TOKEN = CONFIG_DIR / "youtube_token.json"
_SECRET_CANDIDATES = [CONFIG_DIR / "client_secret.json",
                      Path.home() / ".config" / "jee-shorts" / "client_secret.json"]
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",  # show which channel the token belongs to
]
AUTH_PORT = 8766
ENGINE = Path(__file__).resolve().parent.parent
MUSIC_CATEGORY = "10"


def _libs():
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
    except ImportError as e:  # pragma: no cover
        sys.exit(f"missing Google client libs ({e}); run via scripts/upload_and_cleanup.sh "
                 "or ~/.openclaw/workspace/shorts-poc/venv/bin/python")
    return Request, Credentials, InstalledAppFlow, build, MediaFileUpload


def credentials():
    Request, Credentials, _, _, _ = _libs()
    if not TOKEN.exists():
        sys.exit(f"YouTube not configured: no {TOKEN}. Run: scripts/upload_youtube.py auth")
    creds = Credentials.from_authorized_user_file(str(TOKEN), SCOPES)
    if not creds.valid and creds.refresh_token:
        creds.refresh(Request())
        TOKEN.write_text(creds.to_json())
    return creds


def auth():
    _, _, InstalledAppFlow, _, _ = _libs()
    secret = next((p for p in _SECRET_CANDIDATES if p.exists()), None)
    if not secret:
        sys.exit("missing client_secret.json (see the module docstring)")
    flow = InstalledAppFlow.from_client_secrets_file(str(secret), SCOPES)
    creds = flow.run_local_server(
        host="localhost", port=AUTH_PORT, open_browser=False,
        authorization_prompt_message=(
            f"With `ssh -L {AUTH_PORT}:localhost:{AUTH_PORT}` open, visit this URL on your Mac:\n{{url}}"),
    )
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    TOKEN.write_text(creds.to_json())
    TOKEN.chmod(0o600)
    print(f"token saved to {TOKEN}")
    status()


STATE = CONFIG_DIR / "auth_state.json"
REDIRECT = f"http://localhost:{AUTH_PORT}/"


def _flow():
    _, _, InstalledAppFlow, _, _ = _libs()
    secret = next((p for p in _SECRET_CANDIDATES if p.exists()), None)
    if not secret:
        sys.exit("missing client_secret.json (see the module docstring)")
    return InstalledAppFlow.from_client_secrets_file(str(secret), SCOPES, redirect_uri=REDIRECT)


def auth_url():
    """Step 1 of tunnel-free auth: print a URL to open in any browser."""
    flow = _flow()
    url, state = flow.authorization_url(access_type="offline", prompt="consent")
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps({"state": state, "code_verifier": flow.code_verifier}))
    STATE.chmod(0o600)
    print(url)


def auth_finish(redirected: str):
    """Step 2: pass the full http://localhost:8766/?code=... URL the browser ended on (or just the code)."""
    st = json.loads(STATE.read_text())
    flow = _flow()
    flow.code_verifier = st["code_verifier"]
    if redirected.startswith("http"):
        flow.fetch_token(authorization_response=redirected)
    else:
        flow.fetch_token(code=redirected)
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    TOKEN.write_text(flow.credentials.to_json())
    TOKEN.chmod(0o600)
    STATE.unlink(missing_ok=True)
    print(f"token saved to {TOKEN}")
    status()


def status():
    _, _, _, build, _ = _libs()
    yt = build("youtube", "v3", credentials=credentials())
    items = yt.channels().list(part="snippet", mine=True).execute().get("items", [])
    print("authorised for channel(s):", ", ".join(c["snippet"]["title"] for c in items) or "(none)")


def metadata(video: Path, slug: str | None, title: str | None, privacy: str, duration: float | None):
    slug = slug or video.stem.removesuffix("_viz")
    cfg_path = ENGINE / "references" / f"{slug}_config.json"
    names, cfg_title, tag = [], None, "#CAGEMATCH"
    if cfg_path.exists():
        cfg = json.loads(cfg_path.read_text())
        cfg_title = cfg.get("title")
        tag = cfg.get("hashtag") or tag
        names = [f.get("name", "") for f in cfg.get("fighters", {}).values() if f.get("name")]
    title = title or (f"{cfg_title.title()} | AI Rap Battle" if cfg_title
                      else f"{slug.replace('_', ' ').title()} | AI Rap Battle")
    hashtags = [tag.lstrip("#")] + (["shorts"] if duration and duration <= 60 else []) + ["RapBattle", "AIRapBattle"]
    desc_lines = [f"{' vs '.join(names)} - AI rap battle." if names else "AI rap battle.",
                  "Lyrics are satire grounded in public record.", "",
                  " ".join(f"#{h}" for h in hashtags)]
    return {
        "snippet": {
            "title": title[:100],
            "description": "\n".join(desc_lines)[:4900],
            "tags": ["rap battle", "AI rap battle", "diss track", *names],
            "categoryId": MUSIC_CATEGORY,
        },
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
    }


def probe_duration(video: Path):
    import subprocess
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "csv=p=0", str(video)], capture_output=True, text=True, timeout=30)
        return float(out.stdout.strip())
    except Exception:
        return None


def upload(video: Path, slug, title, privacy):
    _, _, _, build, MediaFileUpload = _libs()
    if not video.is_file():
        sys.exit(f"file not found: {video}")
    body = metadata(video, slug, title, privacy, probe_duration(video))
    print(f"uploading {video} ({video.stat().st_size} bytes) as '{body['snippet']['title']}' [{privacy}]")
    yt = build("youtube", "v3", credentials=credentials())
    req = yt.videos().insert(
        part="snippet,status", body=body,
        media_body=MediaFileUpload(str(video), mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True),
    )
    resp = None
    while resp is None:
        prog, resp = req.next_chunk()
        if prog:
            print(f"  {int(prog.progress() * 100)}%", flush=True)
    vid = resp["id"]
    # Verify the video is actually registered on the channel with the right privacy
    chk = yt.videos().list(part="status,contentDetails", id=vid).execute().get("items", [])
    if not chk:
        sys.exit(f"upload returned id {vid} but videos.list can't find it")
    print(f"verified: privacy={chk[0]['status']['privacyStatus']} duration={chk[0]['contentDetails']['duration']}"
          f" uploadStatus={chk[0]['status'].get('uploadStatus')}")
    print(f"YOUTUBE_URL=https://youtu.be/{vid}")
    print(f"YOUTUBE_ID={vid}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("auth")
    sub.add_parser("status")
    sub.add_parser("auth-url")
    af = sub.add_parser("auth-finish")
    af.add_argument("redirected")
    up = sub.add_parser("upload")
    up.add_argument("video", type=Path)
    up.add_argument("--slug")
    up.add_argument("--title")
    up.add_argument("--privacy", choices=["public", "unlisted", "private"],
                    default=os.environ.get("RAPBATTLE_YT_PRIVACY", "unlisted"))
    a = ap.parse_args()
    if a.cmd == "auth":
        auth()
    elif a.cmd == "auth-url":
        auth_url()
    elif a.cmd == "auth-finish":
        auth_finish(a.redirected)
    elif a.cmd == "status":
        status()
    else:
        upload(a.video, a.slug, a.title, a.privacy)


if __name__ == "__main__":
    main()
