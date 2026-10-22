import hmac
import io
import json
import mimetypes
import os
import tempfile
import time
import traceback
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import boto3
import requests
from flask import Flask, jsonify, request, send_file

from convert import ConvertError, convert

app = Flask(__name__)
SECRET = os.environ.get("CONVERTER_SHARED_SECRET", "")


def authorized() -> bool:
    got = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    return bool(SECRET) and hmac.compare_digest(got, SECRET)


def r2():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['CLOUDFLARE_R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["CLOUDFLARE_R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["CLOUDFLARE_R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def error_body(e: Exception) -> dict:
    if isinstance(e, ConvertError):
        return {"ok": False, "code": e.code, "message": e.message}
    traceback.print_exc()
    return {"ok": False, "code": "INTERNAL", "message": f"変換中にエラーが発生しました（{e}）"}


@app.get("/")
def health():
    return "ok"


def progress_writer(s3, bucket: str, prefix: str):
    """進み具合を R2 の progress.json に書く（1 秒に 1 回まで。段階が変わったときと最後は必ず書く）"""
    state = {"t": 0.0, "stage": None}

    def write(stage, done=0, total=0):
        now = time.time()
        if stage == state["stage"] and now - state["t"] < 1 and done != total:
            return
        state.update(t=now, stage=stage)
        try:
            s3.put_object(Bucket=bucket, Key=f"{prefix}/progress.json", ContentType="application/json",
                          Body=json.dumps({"stage": stage, "done": done, "total": total, "at": now}).encode("utf-8"))
        except Exception:
            traceback.print_exc()
    return write


@app.post("/convert")
def convert_r2():
    """VPS からの変換依頼。R2 から取得 → 変換 → R2 に保存 → callbackUrl に通知"""
    if not authorized():
        return jsonify({"ok": False, "message": "unauthorized"}), 401
    body = request.get_json(force=True)
    job_id, prefix, callback = body["jobId"], body["outPrefix"].rstrip("/"), body.get("callbackUrl")
    bucket = os.environ["CLOUDFLARE_R2_BUCKET_NAME"]
    s3 = r2()

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        try:
            s3.download_file(bucket, body["pptxKey"], str(work / "in.pptx"))
            s3.download_file(bucket, body["pdfKey"], str(work / "in.pdf"))
            progress = progress_writer(s3, bucket, prefix)
            manifest, files = convert(work / "in.pptx", work / "in.pdf", work, progress)
            def put(item):
                name, path = item
                ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
                s3.upload_file(str(path), bucket, f"{prefix}/{name}", ExtraArgs={"ContentType": ctype})

            progress("upload", 0, len(files))
            with ThreadPoolExecutor(8) as ex:
                for i, _ in enumerate(as_completed([ex.submit(put, it) for it in files.items()]), start=1):
                    _.result()
                    progress("upload", i, len(files))
            manifest_key = f"{prefix}/manifest.json"
            s3.put_object(Bucket=bucket, Key=manifest_key, ContentType="application/json",
                          Body=json.dumps(manifest, ensure_ascii=False).encode("utf-8"))
            result = {"ok": True, "jobId": job_id, "manifestKey": manifest_key}
        except Exception as e:
            result = {**error_body(e), "jobId": job_id}

    if callback:
        try:
            requests.post(callback, json=result, headers={"Authorization": f"Bearer {SECRET}"}, timeout=30)
        except Exception:
            traceback.print_exc()
    return jsonify(result), 200 if result["ok"] else 422


@app.post("/convert-direct")
def convert_direct():
    """検証用。multipart で pptx / pdf を受け取り、manifest と画像を zip で返す"""
    if not authorized():
        return jsonify({"ok": False, "message": "unauthorized"}), 401
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        request.files["pptx"].save(work / "in.pptx")
        request.files["pdf"].save(work / "in.pdf")
        try:
            manifest, files = convert(work / "in.pptx", work / "in.pdf", work)
        except Exception as e:
            return jsonify(error_body(e)), 422
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
            for name, path in files.items():
                z.write(path, name)
        buf.seek(0)
        return send_file(buf, mimetype="application/zip", download_name="converted.zip")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")))
