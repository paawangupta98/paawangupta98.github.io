from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import yt_dlp, httpx, os, tempfile, atexit, static_ffmpeg

# Add ffmpeg to PATH (installed via pip, no root needed)
static_ffmpeg.add_paths()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://paawangupta98.github.io",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Write YouTube cookies from env var to a temp file once at startup
_cookie_file = None
_cookie_content = os.environ.get("YOUTUBE_COOKIES", "").strip()
if _cookie_content:
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False)
    tmp.write(_cookie_content)
    tmp.close()
    _cookie_file = tmp.name
    atexit.register(lambda: os.unlink(_cookie_file) if os.path.exists(_cookie_file) else None)

def _base_opts(fmt: str) -> dict:
    opts = {
        "format": fmt,
        "noplaylist": True,
        "quiet": True,
        "extractor_args": {"youtube": {"player_client": ["ios"]}},
    }
    if _cookie_file:
        opts["cookiefile"] = _cookie_file
    return opts

class DownloadRequest(BaseModel):
    url: str
    quality: str = "best"
    mode: str = "auto"

@app.get("/")
def root():
    return {"status": "ok", "cookies_loaded": bool(_cookie_file)}

@app.post("/download")
async def download(req: DownloadRequest):
    fmt  = _build_format(req.quality, req.mode)
    opts = _base_opts(fmt)

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info   = ydl.extract_info(req.url, download=False)
            if "entries" in info:
                info = info["entries"][0]
            title  = info.get("title", "video").replace("/", "-")
            ext    = info.get("ext", "mp4")
            dl_url = info.get("url", "")

        headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
            "Referer":    "https://www.youtube.com/",
        }
        client = httpx.AsyncClient(timeout=120, follow_redirects=True)
        resp   = await client.get(dl_url, headers=headers)

        return StreamingResponse(
            resp.aiter_bytes(chunk_size=1024 * 64),
            media_type=resp.headers.get("content-type", "application/octet-stream"),
            headers={"Content-Disposition": f'attachment; filename="{title}.{ext}"'},
        )
    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _build_format(quality: str, mode: str) -> str:
    if mode == "audio" or quality == "audio":
        return "bestaudio[ext=m4a]/bestaudio/best"
    if quality == "best":
        return "bestvideo+bestaudio/best[ext=mp4]/best"
    return f"bestvideo[height<={quality}]+bestaudio/best[height<={quality}][ext=mp4]/best"
