"""Build responsive hero derivatives, preserving original files and catalog credits."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/hero-optimized"
OUT.mkdir(parents=True, exist_ok=True)
raw = (ROOT / "data/hero-photos-data.js").read_text()
photos = json.JSONDecoder().raw_decode(raw[raw.index("["):])[0]
manifest = {}
for photo in photos:
    url = photo["url"]
    if not url.startswith("assets/"):
        continue
    source = ROOT / url
    if not source.is_file():
        print("Missing original:", url)
        continue
    digest = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
    key = photo["id"]
    if not all(c.isalnum() or c in "-_" for c in key):
        raise ValueError("Invalid hero ID")
    try:
        with Image.open(source) as original:
            im = ImageOps.exif_transpose(original).convert("RGB")
            variants = {}
            for label, width, target in [("mobile", 960, 120000), ("tablet", 1280, 180000), ("desktop", 1920, 300000)]:
                path = OUT / f"{key}-{digest}-{label}.webp"
                if not path.exists():
                    resized = im.copy()
                    resized.thumbnail((width, width), Image.Resampling.LANCZOS)
                    for quality in (86, 82, 78, 74, 70):
                        resized.save(path, "WEBP", quality=quality, method=6)
                        if path.stat().st_size <= target:
                            break
                variants[label] = path.relative_to(ROOT).as_posix()
            manifest[key] = {"original": url, **variants}
            print(key, source.stat().st_size, *( (ROOT / variants[k]).stat().st_size for k in ("mobile","tablet","desktop")))
    except Exception as error:
        print("Could not optimize", url, error)
        raise
(ROOT / "data/hero-optimized.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
