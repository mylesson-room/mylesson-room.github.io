#!/usr/bin/env python3
"""Fetch ten authentic, CC BY-SA 4.0 Barcelona Marathon 2026 photos.
Photos by Jorge Jaramillo / JJxFile (Wikimedia Commons).
Original image URLs and licenses remain linked under each page's photo.
Files go into the local static-site build, so students do not rely on third-party
image servers during a lesson. A failed/invalid download blocks publication.
"""
import hashlib
import os
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

FILES = {
    "race-start.jpg": "Barcelona Marathon 2026 at Passeig de Gracia.jpg",
    "city-runners.jpg": "Barcelona Marathon runners near Sagrada Familia by JJxFile.jpg",
    "race-pack.jpg": "Barcelona Marathon 2026 at Passeig de Gracia 02.jpg",
    "finish-line.jpg": "Barcelona Marathon finish line at Arc de Triomf by JJxFile.jpg",
    "women-podium.jpg": "Barcelona Marathon women podium by JJxFile.jpg",
    "men-podium.jpg": "Barcelona Marathon men podium by JJxFile.jpg",
    "podium-review.jpg": "Barcelona Marathon women podium by JJxFile - 02.jpg",
    "winner-portrait.jpg": "Barcelona Marathon winner portrait by JJxFile.jpg",
    "podium-questions.jpg": "Barcelona Marathon women podium by JJxFile - 03.jpg",
    "podium-response.jpg": "Barcelona Marathon men podium by JJxFile- 02.jpg",
}
ROOT = Path(__file__).resolve().parent.parent / "assets" / "sports-b2-photos"
ROOT.mkdir(parents=True, exist_ok=True)
AGENT = "GoStudyEducationalPlatform/1.0 (GitHub: mylesson-room/mylesson-room.github.io; educational photos with Commons attribution)"

for output_name, file_name in FILES.items():
    target = ROOT / output_name
    if target.exists() and target.read_bytes().startswith(b"\xff\xd8\xff"):
        print(f"PHOTO CACHED {output_name}")
        continue
    canonical = file_name.replace(" ", "_")
    digest = hashlib.md5(canonical.encode("utf-8")).hexdigest()
    encoded = quote(canonical, safe="()")
    url = (f"https://upload.wikimedia.org/wikipedia/commons/thumb/"
           f"{digest[:1]}/{digest[:2]}/{encoded}/1024px-{encoded}")
    print(f"PHOTO GET {output_name} <- {url}", flush=True)
    request = Request(url, headers={"User-Agent": AGENT, "Accept": "image/jpeg,image/*"})
    with urlopen(request, timeout=30) as response:
        data = response.read(4_000_001)
        if len(data) > 4_000_000:
            raise RuntimeError(f"Unexpectedly large thumbnail: {output_name}")
        if not response.headers.get("Content-Type", "").startswith("image/"):
            raise RuntimeError(f"Not an image: {output_name}")
    if not data.startswith(b"\xff\xd8\xff") or len(data) < 20_000:
        raise RuntimeError(f"Invalid or empty JPEG: {output_name}")
    temporary = target.with_suffix(".tmp")
    temporary.write_bytes(data)
    os.replace(temporary, target)
    print(f"PHOTO READY {output_name} ({len(data):,} bytes)", flush=True)

assert len(list(ROOT.glob("*.jpg"))) >= len(FILES)
print("BARCELONA PHOTO PACK READY: 10 original, source-credited photographs")
