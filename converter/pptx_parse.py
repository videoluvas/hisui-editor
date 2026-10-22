import posixpath
from dataclasses import dataclass, field
from pathlib import Path

from lxml import etree

NS = {
    "p":   "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a":   "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r":   "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "mc":  "http://schemas.openxmlformats.org/markup-compatibility/2006",
    "p14": "http://schemas.microsoft.com/office/powerpoint/2010/main",
    "pr":  "http://schemas.openxmlformats.org/package/2006/relationships",
}
P = "{%s}" % NS["p"]
A = "{%s}" % NS["a"]
R = "{%s}" % NS["r"]
MC = "{%s}" % NS["mc"]

REL_SLIDE  = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
REL_LAYOUT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"
REL_MASTER = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster"
REL_NOTES  = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"

SHAPE_TAGS = {P + "sp", P + "pic", P + "grpSp", P + "graphicFrame", P + "cxnSp", P + "contentPart"}

GRAPHIC_KIND = {
    "http://schemas.openxmlformats.org/drawingml/2006/table":   "table",
    "http://schemas.openxmlformats.org/drawingml/2006/chart":   "chart",
    "http://schemas.openxmlformats.org/drawingml/2006/diagram": "diagram",
}


@dataclass
class Rel:
    id: str
    type: str
    target: str  # パッケージ内の絶対パス（先頭 / なし）。外部リンクはそのまま
    external: bool


@dataclass
class SlideObject:
    index: int               # spTree 内の位置（nvGrpSpPr / grpSpPr を除いた何番目か）
    id: str
    name: str
    kind: str                # text / shape / picture / media / table / chart / diagram / group / connector / other
    box: tuple | None        # (x, y, w, h) EMU
    text: str
    ids: set = field(default_factory=set)   # グループ内の子も含む cNvPr id
    media: dict | None = None               # {"part": ..., "type": "video"|"audio"}
    image_part: str | None = None
    placeholder: str | None = None


@dataclass
class Slide:
    no: int                  # 表示されるスライドの通し番号（1 始まり）
    part: str
    root: etree._Element
    rels: dict
    objects: list
    title: str
    notes: str
    transition: dict | None
    animations: list


def read_xml(base: Path, part: str) -> etree._Element:
    return etree.parse(str(base / part)).getroot()


def rels_path(part: str) -> str:
    d, f = posixpath.split(part)
    return posixpath.join(d, "_rels", f + ".rels")


def read_rels(base: Path, part: str) -> dict:
    path = base / rels_path(part)
    if not path.exists():
        return {}
    out = {}
    for el in etree.parse(str(path)).getroot():
        ext = el.get("TargetMode") == "External"
        tgt = el.get("Target")
        if not ext:
            tgt = posixpath.normpath(posixpath.join(posixpath.dirname(part), tgt)).lstrip("/")
        out[el.get("Id")] = Rel(el.get("Id"), el.get("Type"), tgt, ext)
    return out


def unwrap(el):
    """mc:AlternateContent は Choice（なければ Fallback）の中身を返す"""
    if el.tag != MC + "AlternateContent":
        return el
    for branch in (el.find("mc:Choice", NS), el.find("mc:Fallback", NS)):
        if branch is not None and len(branch):
            return branch[0]
    return el


def shape_children(sp_tree):
    return [c for c in sp_tree if c.tag not in (P + "nvGrpSpPr", P + "grpSpPr", P + "extLst")]


def cnv_pr(el):
    return el.find("./*/p:cNvPr", NS)


def xfrm_box(el):
    x = el.find("./p:spPr/a:xfrm", NS)
    if x is None: x = el.find("./p:grpSpPr/a:xfrm", NS)
    if x is None: x = el.find("./p:xfrm", NS)
    if x is None:
        return None
    off, ext = x.find("a:off", NS), x.find("a:ext", NS)
    if off is None or ext is None:
        return None
    return (int(off.get("x")), int(off.get("y")), int(ext.get("cx")), int(ext.get("cy")))


def ph_info(el):
    ph = el.find("./*/p:nvPr/p:ph", NS)
    if ph is None:
        return None
    return (ph.get("type", "obj"), ph.get("idx"))


def find_ph_box(root, ph):
    if root is None:
        return None
    ptype, idx = ph
    tree = root.find("./p:cSld/p:spTree", NS)
    if tree is None:
        return None
    by_type = None
    for c in tree.iter(P + "sp", P + "pic", P + "graphicFrame"):
        info = ph_info(c)
        if info is None:
            continue
        if idx is not None and info[1] == idx and xfrm_box(c):
            return xfrm_box(c)
        if by_type is None and info[0] == ptype and xfrm_box(c):
            by_type = xfrm_box(c)
    return by_type


def para_text(el) -> str:
    lines = []
    for p in el.iter(A + "p"):
        t = "".join(x.text or "" for x in p.iter(A + "t")).strip()
        if t:
            lines.append(t)
    return "\n".join(lines)


def classify(el) -> str:
    tag = etree.QName(el).localname
    if tag == "pic":
        nvpr = el.find("./p:nvPicPr/p:nvPr", NS)
        if nvpr is not None and (nvpr.find("a:videoFile", NS) is not None or nvpr.find("a:audioFile", NS) is not None
                                 or nvpr.find(".//p14:media", NS) is not None):
            return "media"
        return "picture"
    if tag == "graphicFrame":
        gd = el.find(".//a:graphicData", NS)
        return GRAPHIC_KIND.get(gd.get("uri") if gd is not None else "", "other")
    if tag == "grpSp":
        return "group"
    if tag == "cxnSp":
        return "connector"
    if tag == "sp":
        if el.find("./p:nvSpPr/p:cNvSpPr", NS) is not None and el.find("./p:nvSpPr/p:cNvSpPr", NS).get("txBox") == "1":
            return "text"
        if ph_info(el) is not None:
            return "text"
        return "shape"
    return "other"


def media_of(el, rels) -> dict | None:
    nvpr = el.find("./p:nvPicPr/p:nvPr", NS)
    if nvpr is None:
        return None
    m = nvpr.find(".//p14:media", NS)
    rid = m.get(R + "embed") if m is not None else None
    kind = "audio" if nvpr.find("a:audioFile", NS) is not None else "video"
    if rid is None:
        f = nvpr.find("a:videoFile", NS)
        if f is None: f = nvpr.find("a:audioFile", NS)
        rid = f.get(R + "link") if f is not None else None
    rel = rels.get(rid)
    if rel is None or rel.external:
        return None
    return {"part": rel.target, "type": kind}


def parse_animations(root) -> list:
    out = []
    timing = root.find("p:timing", NS)
    if timing is None:
        return out
    main = timing.find(".//p:cTn[@nodeType='mainSeq']", NS)
    if main is None:
        return out
    for click in main.findall("./p:childTnLst/p:par/p:cTn", NS):
        for group in click.findall("./p:childTnLst/p:par/p:cTn", NS):
            gdelay = cond_delay(group)
            for eff in group.findall("./p:childTnLst/p:par/p:cTn", NS):
                tgt = eff.find(".//p:spTgt", NS)
                if tgt is None:
                    continue
                durs = [int(c.get("dur")) for c in eff.iter(P + "cTn") if (c.get("dur") or "").isdigit()]
                out.append({
                    "spid": tgt.get("spid"),
                    "presetClass": eff.get("presetClass"),
                    "presetId": int(eff.get("presetID", "0")),
                    "presetSubtype": int(eff.get("presetSubtype", "0")),
                    "nodeType": eff.get("nodeType"),
                    "start": gdelay + cond_delay(eff),
                    "duration": max(durs) if durs else 0,
                })
    return out


def cond_delay(ctn) -> int:
    c = ctn.find("./p:stCondLst/p:cond", NS)
    d = c.get("delay") if c is not None else None
    return int(d) if d and d.lstrip("-").isdigit() else 0


def parse_transition(root) -> dict | None:
    """p14 などの新しい効果は mc:AlternateContent の Choice / Fallback に分かれるので、両方の種類を集める"""
    found = []
    for el in root:
        if el.tag == P + "transition":
            found.append(el)
        elif el.tag == MC + "AlternateContent":
            found += [t for t in el.iter(P + "transition")]
    if not found:
        return None
    types, attrs, dur, spd = [], {}, None, None
    for t in found:
        dur = dur or t.get("{%s}dur" % NS["p14"]) or t.get("dur")
        spd = spd or t.get("spd")
        for c in t:
            name = etree.QName(c).localname
            if name not in ("sndAc", "extLst"):
                types.append(name)
                for k, v in c.attrib.items():
                    attrs.setdefault(k, v)
    if not types:
        return None
    return {"types": types, "speed": spd, "duration": int(dur) if dur and dur.isdigit() else None, "attrs": attrs}


def parse_notes(base: Path, rels: dict) -> str:
    for rel in rels.values():
        if rel.type == REL_NOTES and not rel.external:
            root = read_xml(base, rel.target)
            for sp in root.iter(P + "sp"):
                ph = ph_info(sp)
                if ph and ph[0] == "body":
                    return para_text(sp)
    return ""


def parse_presentation(base: Path):
    pres = read_xml(base, "ppt/presentation.xml")
    sz = pres.find("p:sldSz", NS)
    size = (int(sz.get("cx")), int(sz.get("cy")))
    prels = read_rels(base, "ppt/presentation.xml")

    slides = []
    for sid in pres.findall("./p:sldIdLst/p:sldId", NS):
        part = prels[sid.get(R + "id")].target
        root = read_xml(base, part)
        if root.get("show") == "0":
            continue
        rels = read_rels(base, part)
        layout = master = None
        lrel = next((r for r in rels.values() if r.type == REL_LAYOUT), None)
        if lrel:
            layout = read_xml(base, lrel.target)
            mrel = next((r for r in read_rels(base, lrel.target).values() if r.type == REL_MASTER), None)
            if mrel:
                master = read_xml(base, mrel.target)

        objects, title = [], ""
        tree = root.find("./p:cSld/p:spTree", NS)
        for i, raw in enumerate(shape_children(tree)):
            el = unwrap(raw)
            pr = cnv_pr(el)
            if pr is None:
                continue
            ph = ph_info(el)
            box = xfrm_box(el)
            if box is None and ph:
                box = find_ph_box(layout, ph) or find_ph_box(master, ph)
            kind = classify(el)
            text = para_text(el) if kind != "chart" else ""
            if ph and ph[0] in ("title", "ctrTitle") and not title:
                title = text
            obj = SlideObject(i, pr.get("id"), pr.get("name", ""), kind, box, text,
                              {c.get("id") for c in el.iter(P + "cNvPr")}, placeholder=ph[0] if ph else None)
            if kind == "media":
                obj.media = media_of(el, rels)
            if kind == "picture":
                blip = el.find(".//a:blip", NS)
                rel = rels.get(blip.get(R + "embed")) if blip is not None else None
                if rel and not rel.external:
                    obj.image_part = rel.target
            objects.append(obj)

        slides.append(Slide(len(slides) + 1, part, root, rels, objects, title,
                            parse_notes(base, rels), parse_transition(root), parse_animations(root)))
    return size, slides
