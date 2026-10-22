"""LibreOffice で描画するための作業用 pptx を作る。

1 オブジェクト = 1 スライドに分け、背景を黒・白の 2 通りで描画して透明度を求める（差分マット）。
文字は PDF から重ねるので、ここでは文字・箇条書き記号を透明にしておく（グラフは除く）。
"""
import copy
import shutil
import subprocess
import zipfile
from pathlib import Path

from lxml import etree

from pptx_parse import NS, P, A, R, REL_NOTES, REL_SLIDE, rels_path, shape_children

CT = "{http://schemas.openxmlformats.org/package/2006/content-types}"
SLIDE_CT = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml"

FILL_TAGS = {A + t for t in ("noFill", "solidFill", "gradFill", "blipFill", "pattFill", "grpFill")}
RPR_DROP = FILL_TAGS | {A + "ln", A + "effectLst", A + "effectDag", A + "highlight"}
BU_TAGS = {A + t for t in ("buNone", "buAutoNum", "buChar", "buBlip")}
PPR_AFTER_BU = {A + "tabLst", A + "defRPr", A + "extLst"}

PDF_FILTER = ('pdf:impress_pdf_Export:{"UseLosslessCompression":{"type":"boolean","value":"true"},'
              '"ReduceImageResolution":{"type":"boolean","value":"false"},'
              '"ExportNotesPages":{"type":"boolean","value":"false"}}')


def hide_text(el):
    for run in list(el.iter(A + "r")) + list(el.iter(A + "fld")):
        rpr = run.find(A + "rPr")
        if rpr is None:
            rpr = etree.Element(A + "rPr")
            run.insert(0, rpr)
        for c in list(rpr):
            if c.tag in RPR_DROP:
                rpr.remove(c)
        rpr.insert(0, etree.Element(A + "noFill"))
    for p in el.iter(A + "p"):
        ppr = p.find(A + "pPr")
        if ppr is None:
            ppr = etree.Element(A + "pPr")
            p.insert(0, ppr)
        for c in list(ppr):
            if c.tag in BU_TAGS:
                ppr.remove(c)
        pos = next((i for i, c in enumerate(ppr) if c.tag in PPR_AFTER_BU), len(ppr))
        ppr.insert(pos, etree.Element(A + "buNone"))


def solid_bg(color: str):
    bg = etree.Element(P + "bg")
    pr = etree.SubElement(bg, P + "bgPr")
    fill = etree.SubElement(pr, A + "solidFill")
    etree.SubElement(fill, A + "srgbClr", val=color)
    etree.SubElement(pr, A + "effectLst")
    return bg


def base_copy(root):
    out = copy.deepcopy(root)
    out.attrib.pop("show", None)
    for c in list(out):
        if c.tag not in (P + "cSld", P + "clrMapOvr"):
            out.remove(c)
    return out


def background_slide(slide):
    out = base_copy(slide.root)
    tree = out.find("./p:cSld/p:spTree", NS)
    for c in shape_children(tree):
        tree.remove(c)
    return out


def object_slide(slide, obj, color: str):
    out = base_copy(slide.root)
    out.set("showMasterSp", "0")
    csld = out.find("p:cSld", NS)
    old = csld.find("p:bg", NS)
    if old is not None:
        csld.remove(old)
    csld.insert(0, solid_bg(color))
    tree = csld.find("p:spTree", NS)
    for i, c in enumerate(shape_children(tree)):
        if i != obj.index:
            tree.remove(c)
        elif obj.kind != "chart":
            hide_text(c)
    return out


def write_xml(path: Path, root):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True))


def build(src: Path, work: Path, name: str, pages: list) -> Path:
    """pages: [(slide, xml_root)]。src を複製して pages だけのスライド構成にした pptx を返す"""
    pkg = work / name
    if pkg.exists():
        shutil.rmtree(pkg)
    shutil.copytree(src, pkg)

    for d in pkg.glob("ppt/diagrams/*.xml"):
        if d.name.startswith(("drawing", "data")):
            root = etree.parse(str(d)).getroot()
            hide_text(root)
            write_xml(d, root)

    pres_part = "ppt/presentation.xml"
    pres = etree.parse(str(pkg / pres_part)).getroot()
    prels_file = pkg / rels_path(pres_part)
    prels = etree.parse(str(prels_file)).getroot()
    for r in list(prels):
        if r.get("Type") == REL_SLIDE:
            prels.remove(r)

    ct_file = pkg / "[Content_Types].xml"
    ct = etree.parse(str(ct_file)).getroot()

    lst = pres.find("p:sldIdLst", NS)
    for c in list(lst):
        lst.remove(c)
    for tag in ("custShowLst",):
        el = pres.find("p:" + tag, NS)
        if el is not None:
            pres.remove(el)
    for ext in pres.findall("./p:extLst/p:ext", NS):
        if ext.find(".//{*}sectionLst") is not None:
            ext.getparent().remove(ext)

    for n, (slide, root) in enumerate(pages, start=1):
        part = f"ppt/slides/render{n}.xml"
        write_xml(pkg / part, root)

        src_rels = src / rels_path(slide.part)
        rels = etree.parse(str(src_rels)).getroot() if src_rels.exists() else etree.Element("{%s}Relationships" % NS["pr"])
        for r in list(rels):
            if r.get("Type") == REL_NOTES:
                rels.remove(r)
        write_xml(pkg / rels_path(part), rels)

        rid = f"rIdRender{n}"
        etree.SubElement(prels, "{%s}Relationship" % NS["pr"], Id=rid, Type=REL_SLIDE, Target=f"slides/render{n}.xml")
        sid = etree.SubElement(lst, P + "sldId", id=str(1000 + n))
        sid.set(R + "id", rid)
        etree.SubElement(ct, CT + "Override", PartName="/" + part, ContentType=SLIDE_CT)

    write_xml(pkg / pres_part, pres)
    write_xml(prels_file, prels)
    write_xml(ct_file, ct)

    out = work / f"{name}.pptx"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        ct_path = pkg / "[Content_Types].xml"
        z.write(ct_path, "[Content_Types].xml")
        for f in sorted(pkg.rglob("*")):
            if f.is_file() and f != ct_path:
                z.write(f, f.relative_to(pkg).as_posix())
    shutil.rmtree(pkg)
    return out


def to_pdf(pptx: Path, timeout: int = 600) -> Path:
    profile = pptx.parent / "lo-profile"
    subprocess.run(
        ["soffice", f"-env:UserInstallation=file://{profile.as_posix()}", "--headless", "--norestore",
         "--convert-to", PDF_FILTER, "--outdir", str(pptx.parent), str(pptx)],
        check=True, timeout=timeout, capture_output=True,
    )
    pdf = pptx.with_suffix(".pdf")
    if not pdf.exists():
        raise RuntimeError(f"LibreOffice の PDF 変換に失敗しました: {pptx.name}")
    return pdf
