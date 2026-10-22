import posixpath
import shutil
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import fitz
import numpy as np
from PIL import Image

import render_pkg
from pptx_parse import parse_presentation

SHORT_SIDE = 1080
ALPHA_MIN = 3
NO_TEXT_OVERLAY = {"chart", "picture", "media"}
VIDEO_OK = {".mp4", ".m4v", ".mov"}
AUDIO_OK = {".mp3", ".m4a", ".wav", ".aac"}


class ConvertError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def render_size(w: float, h: float) -> tuple:
    if w >= h:
        return int(round(SHORT_SIDE * w / h / 2) * 2), SHORT_SIDE
    return SHORT_SIDE, int(round(SHORT_SIDE * h / w / 2) * 2)


def rasterize(page, size, alpha=False) -> np.ndarray:
    W, H = size
    pix = page.get_pixmap(matrix=fitz.Matrix(W / page.rect.width, H / page.rect.height), alpha=alpha)
    img = Image.frombytes("RGBA" if alpha else "RGB", (pix.width, pix.height), pix.samples)
    if img.size != (W, H):
        img = img.resize((W, H), Image.LANCZOS)
    return np.asarray(img)


def matte(black: np.ndarray, white: np.ndarray) -> np.ndarray:
    b = black.astype(np.float32)
    w = white.astype(np.float32)
    a = np.clip(1.0 - (w - b).mean(axis=2) / 255.0, 0.0, 1.0)
    # LibreOffice のページ端は半端なピクセルになり黒白で差が出るため、外周の薄い色は消す
    edge = np.zeros(a.shape, dtype=bool)
    edge[:2, :] = edge[-2:, :] = edge[:, :2] = edge[:, -2:] = True
    a[edge & (a < 0.25)] = 0
    rgb = np.where(a[..., None] > 1 / 255, b / np.maximum(a[..., None], 1e-6), 0)
    return np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)


def text_only(pdf_path: Path) -> fitz.Document:
    doc = fitz.open(pdf_path)
    for page in doc:
        page.add_redact_annot(page.rect, fill=False)
        page.apply_redactions(
            images=fitz.PDF_REDACT_IMAGE_REMOVE,
            graphics=fitz.PDF_REDACT_LINE_ART_REMOVE_IF_TOUCHED,
            text=fitz.PDF_REDACT_TEXT_NONE,
        )
    return doc


def text_spans(page) -> list:
    spans = []
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b["lines"]:
            for s in line["spans"]:
                if s["text"].strip():
                    spans.append(fitz.Rect(s["bbox"]))
    return spans


def assign_spans(spans, objects, to_pt) -> dict:
    """文字のかたまりを、中心を含む最前面のオブジェクトに割り当てる（文字を持つものを優先）。どれにも入らなければ最寄り"""
    out = {}
    boxed = [(o, to_pt(o.box)) for o in objects if o.box]
    for rect in spans:
        cx, cy = (rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2
        hit = [(o, r) for o, r in boxed if r.contains(fitz.Point(cx, cy))]
        pick = next((o for o, _ in reversed(hit) if o.text), None) or (hit[-1][0] if hit else None)
        if pick is None:
            texted = [(o, r) for o, r in boxed if o.text]
            if texted:
                pick = min(texted, key=lambda t: abs(t[1].x0 + t[1].x1 - 2 * cx) + abs(t[1].y0 + t[1].y1 - 2 * cy))[0]
        out.setdefault(pick.id if pick else None, []).append(rect)
    return out


def overlay_text(rgba: np.ndarray, layer: np.ndarray, rects, scale) -> np.ndarray:
    if not rects:
        return rgba
    H, W = rgba.shape[:2]
    mask = np.zeros((H, W), dtype=bool)
    sx, sy = scale
    for r in rects:
        x0, y0 = max(0, int(r.x0 * sx) - 3), max(0, int(r.y0 * sy) - 3)
        x1, y1 = min(W, int(r.x1 * sx) + 4), min(H, int(r.y1 * sy) + 4)
        mask[y0:y1, x0:x1] = True
    top = layer.copy()
    top[~mask, 3] = 0
    return np.asarray(Image.alpha_composite(Image.fromarray(rgba, "RGBA"), Image.fromarray(top, "RGBA")))


def crop_alpha(rgba: np.ndarray):
    ys, xs = np.where(rgba[..., 3] > ALPHA_MIN)
    if len(xs) == 0:
        return None, None
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    return rgba[y0:y1, x0:x1], (x0, y0, x1 - x0, y1 - y0)


def convert(pptx_path: Path, pdf_path: Path, work: Path, progress=lambda stage, done=0, total=0: None) -> tuple:
    """戻り値: (manifest, {出力ファイル名: ローカルパス})。progress(stage, done, total) で進み具合を知らせる"""
    t0 = time.time()
    progress("parse")
    src = work / "src"
    try:
        with zipfile.ZipFile(pptx_path) as z:
            z.extractall(src)
        (cx, cy), slides = parse_presentation(src)
    except Exception as e:
        raise ConvertError("INVALID_PPTX", f"パワーポイントファイルを読み込めませんでした（{e}）")

    try:
        pdf = fitz.open(pdf_path)
    except Exception as e:
        raise ConvertError("INVALID_PDF", f"PDF を読み込めませんでした（{e}）")
    if pdf.page_count != len(slides):
        raise ConvertError("SLIDE_COUNT_MISMATCH",
                           f"スライド枚数（{len(slides)} 枚）と PDF のページ数（{pdf.page_count} ページ）が合いません。"
                           "ノート付き・配布資料形式ではなく、スライドのみを PDF に書き出してください")
    for i, page in enumerate(pdf):
        if abs(page.rect.width / page.rect.height - cx / cy) > 0.01:
            raise ConvertError("PAGE_SIZE_MISMATCH", f"{i + 1} ページ目の縦横比がスライドと合いません")

    size = render_size(cx, cy)
    W, H = size
    pw, ph = pdf[0].rect.width, pdf[0].rect.height
    scale = (W / pw, H / ph)
    to_pt = lambda b: fitz.Rect(b[0] * pw / cx, b[1] * ph / cy, (b[0] + b[2]) * pw / cx, (b[1] + b[3]) * ph / cy)

    progress("render", 0, len(slides))
    targets = [(s, o) for s in slides for o in s.objects]
    black_pages = [(s, render_pkg.background_slide(s)) for s in slides] + \
                  [(s, render_pkg.object_slide(s, o, "000000")) for s, o in targets]
    white_pages = [(s, render_pkg.object_slide(s, o, "FFFFFF")) for s, o in targets]
    (work / "black").mkdir()
    (work / "white").mkdir()
    black_pptx = render_pkg.build(src, work / "black", "render", black_pages)
    white_pptx = render_pkg.build(src, work / "white", "render", white_pages)
    with ThreadPoolExecutor(2) as ex:
        black_pdf, white_pdf = ex.map(render_pkg.to_pdf, [black_pptx, white_pptx])
    t_lo = time.time()

    black, white = fitz.open(black_pdf), fitz.open(white_pdf)
    texts = text_only(pdf_path)
    out_dir = work / "out"
    out_dir.mkdir()
    files, warnings, manifest_slides = {}, [], []
    obj_page = 0

    for s in slides:
        progress("objects", s.no - 1, len(slides))
        tpage = texts[s.no - 1]
        layer = rasterize(tpage, size, alpha=True)
        by_obj = assign_spans(text_spans(tpage), [o for o in s.objects if o.kind not in ("media",)], to_pt)
        anim_by_id = {}
        for a in s.animations:
            owner = next((o for o in s.objects if a["spid"] in o.ids), None)
            if owner:
                anim_by_id.setdefault(owner.id, []).append({k: v for k, v in a.items() if k != "spid"})

        sdir = f"s{s.no}"
        bg = rasterize(black[s.no - 1], size).copy()
        bg_rgba = overlay_text(np.dstack([bg, np.full(bg.shape[:2], 255, np.uint8)]), layer, by_obj.get(None), scale)
        bg_name = f"{sdir}/bg.jpg"
        files[bg_name] = save(Image.fromarray(bg_rgba[..., :3], "RGB"), out_dir / bg_name, "JPEG")

        objs = []
        for z, o in enumerate(s.objects, start=1):
            i = len(slides) + obj_page
            j = obj_page
            obj_page += 1
            rgba = matte(rasterize(black[i], size), rasterize(white[j], size))
            if o.kind not in NO_TEXT_OVERLAY:
                rgba = overlay_text(rgba, layer, by_obj.get(o.id), scale)
            img, box = crop_alpha(rgba)
            if img is None and o.kind != "media":
                continue
            entry = {"id": o.id, "name": o.name, "kind": o.kind, "z": z, "text": o.text,
                     "placeholder": o.placeholder, "animations": anim_by_id.get(o.id, [])}
            if img is not None:
                name = f"{sdir}/o{o.id}.png"
                files[name] = save(Image.fromarray(img, "RGBA"), out_dir / name, "PNG")
                entry.update(file=name, x=box[0], y=box[1], w=box[2], h=box[3])
            elif o.box:
                r = to_pt(o.box)
                entry.update(x=round(r.x0 * scale[0]), y=round(r.y0 * scale[1]),
                             w=round(r.width * scale[0]), h=round(r.height * scale[1]))
            if o.image_part and (src / o.image_part).exists():
                name = f"{sdir}/src{o.id}{posixpath.splitext(o.image_part)[1].lower()}"
                files[name] = copy_to(src / o.image_part, out_dir / name)
                entry["source"] = name
            if o.media and (src / o.media["part"]).exists():
                ext = posixpath.splitext(o.media["part"])[1].lower()
                name = f"{sdir}/m{o.id}{ext}"
                files[name] = copy_to(src / o.media["part"], out_dir / name)
                entry["media"] = {"file": name, "type": o.media["type"]}
                if ext not in (VIDEO_OK if o.media["type"] == "video" else AUDIO_OK):
                    warnings.append({"slide": s.no, "code": "MEDIA_FORMAT", "message": f"{s.no} 枚目の {ext} は書き出しで使えない可能性があります"})
            objs.append(entry)

        if not s.notes.strip():
            warnings.append({"slide": s.no, "code": "EMPTY_NOTES", "message": f"{s.no} 枚目のノートが空です（無音になります）"})
        manifest_slides.append({"no": s.no, "title": s.title, "notes": s.notes, "transition": s.transition,
                                "background": bg_name, "objects": objs})

    progress("objects", len(slides), len(slides))
    manifest = {
        "version": 1,
        "width": W, "height": H,
        "slideSize": {"cx": cx, "cy": cy},
        "slides": manifest_slides,
        "warnings": warnings,
        "timing": {"libreofficeMs": int((t_lo - t0) * 1000), "totalMs": int((time.time() - t0) * 1000)},
    }
    return manifest, files


def save(img: Image.Image, path: Path, fmt: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "JPEG":
        img.save(path, fmt, quality=92)
    else:
        img.save(path, fmt, optimize=False, compress_level=6)
    return path


def copy_to(src: Path, dst: Path) -> Path:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    return dst
