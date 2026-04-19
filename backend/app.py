from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import yt_dlp, httpx, os

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

class DownloadRequest(BaseModel):
    url: str
    quality: str = "best"   # best | 1080 | 720 | 480 | 360 | audio
    mode: str = "auto"       # auto | audio | mute

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/resolve")
async def resolve(req: DownloadRequest):
    """Return the direct stream URL — browser downloads straight from YouTube CDN."""
    fmt = _build_format(req.quality, req.mode)
    opts = {"format": fmt, "noplaylist": True, "quiet": True}

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(req.url, download=False)
            if "entries" in info:
                info = info["entries"][0]

            # Pick the best single URL (non-fragmented)
            dl_url = info.get("url")
            for f in reversed(info.get("formats", [])):
                if f.get("url") and f.get("protocol") in ("https", "http"):
                    dl_url = f["url"]
                    break

            return {
                "title": info.get("title", "video"),
                "url":   dl_url,
                "ext":   info.get("ext", "mp4"),
            }
    except yt_dlp.utils.DownloadError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/download")
async def download(req: DownloadRequest):
    """Stream the file through the server — most reliable for any format."""
    fmt = _build_format(req.quality, req.mode)
    opts = {"format": fmt, "noplaylist": True, "quiet": True}

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info  = ydl.extract_info(req.url, download=False)
            if "entries" in info:
                info = info["entries"][0]
            title = info.get("title", "video").replace("/", "-")
            ext   = info.get("ext", "mp4")
            dl_url = info.get("url", "")

        headers = {"User-Agent": "Mozilla/5.0", "Referer": "https://www.youtube.com/"}
        client  = httpx.AsyncClient(timeout=60, follow_redirects=True)
        resp    = await client.get(dl_url, headers=headers)

        return StreamingResponse(
            resp.aiter_bytes(chunk_size=1024 * 64),
            media_type=resp.headers.get("content-type", "application/octet-stream"),
            headers={"Content-Disposition": f'attachment; filename="{title}.{ext}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def _build_format(quality: str, mode: str) -> str:
    if mode == "audio" or quality == "audio":
        return "bestaudio/best"
    if quality == "best":
        return "bestvideo+bestaudio/best"
    return f"bestvideo[height<={quality}]+bestaudio/best"
