import gc
import os
import re
import tempfile
from typing import Optional, Tuple

import cv2
import easyocr
import requests
import uvicorn
from deepface import DeepFace
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field

# --- CONFIGURATION ---
# gpu=False is critical for the local CPU-only setup.
reader = easyocr.Reader(["en"], gpu=False)

app = FastAPI(title="Optimized KYC Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_TIMEOUT_SEC = int(os.environ.get("KYC_DOWNLOAD_TIMEOUT_SEC", "20"))
MAX_DOWNLOAD_BYTES = int(os.environ.get("KYC_MAX_DOWNLOAD_BYTES", str(8 * 1024 * 1024)))  # 8MB


# --- AUTO-LOAD FRONTEND ---
@app.get("/", response_class=HTMLResponse)
def get_index():
    """Serve the optional dev test page (index.html alongside main.py)."""
    file_path = os.path.join(BASE_DIR, "index.html")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return (
            "<h1>KYC engine is running.</h1>"
            "<p>POST /verify-kyc-urls with JSON {id_card_url, live_face_url, researcher_id}.</p>"
        )


# --- HELPERS ---
def _download_to_tempfile(url: str, suffix: str = ".jpg") -> str:
    """Stream a Cloudinary (or other) URL into a temp file and return its path.

    Caller is responsible for deleting the file. We bound the size with
    MAX_DOWNLOAD_BYTES so a malicious URL can't fill the disk.
    """
    if not url or not isinstance(url, str):
        raise HTTPException(status_code=400, detail="Missing image URL")

    try:
        resp = requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT_SEC)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=400, detail=f"Could not fetch image: {exc}") from exc

    tmp = tempfile.NamedTemporaryFile(prefix="kyc_", suffix=suffix, delete=False)
    bytes_read = 0
    try:
        for chunk in resp.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            bytes_read += len(chunk)
            if bytes_read > MAX_DOWNLOAD_BYTES:
                raise HTTPException(status_code=413, detail="Image exceeds maximum size")
            tmp.write(chunk)
        tmp.flush()
        return tmp.name
    except Exception:
        tmp.close()
        try:
            os.remove(tmp.name)
        except OSError:
            pass
        raise
    finally:
        tmp.close()


def _decode_and_resize(image_path: str, max_width: int = 1000):
    try:
        img = cv2.imread(image_path)
        if img is None:
            return None
        h, w = img.shape[:2]
        if w > max_width:
            scale = max_width / w
            img = cv2.resize(img, (max_width, int(h * scale)))
        return img
    except Exception:
        return None


def _is_valid_pakistani_doc(img) -> bool:
    try:
        results = reader.readtext(img, detail=0)
        full_text = " ".join(results).upper()
        print(f"OCR Text: {full_text}")

        keywords = [
            "PAKISTAN",
            "ISLAMIC REPUBLIC",
            "GOVERNMENT OF PAKISTAN",
            "CNIC",
            "IDENTITY CARD",
        ]
        if any(k in full_text for k in keywords):
            return True

        if re.search(r"\d{5}[\s-]?\d{7}[\s-]?\d{1}", full_text):
            return True

        return False
    except Exception as exc:
        print(f"OCR Error: {exc}")
        return False


def _verify_pair(id_card_path: str, live_face_path: str) -> Tuple[bool, float, Optional[str]]:
    """Run OCR + face verification. Returns (success, confidence, error_code)."""
    img_id = _decode_and_resize(id_card_path)
    img_live = _decode_and_resize(live_face_path)

    if img_id is None or img_live is None:
        return False, 0.0, "INVALID_IMAGE"

    if not _is_valid_pakistani_doc(img_id):
        return False, 0.0, "INVALID_DOCUMENT"

    try:
        result = DeepFace.verify(
            img1_path=img_id,
            img2_path=img_live,
            model_name="Facenet512",
            detector_backend="opencv",
            distance_metric="euclidean_l2",
            enforce_detection=False,
            align=True,
        )
    except Exception as exc:
        print(f"DeepFace Error: {exc}")
        return False, 0.0, "FACE_ENGINE_ERROR"
    finally:
        try:
            del img_id, img_live
        except Exception:
            pass
        gc.collect()

    verified = bool(result.get("verified", False))
    distance = float(result.get("distance", 1.0))
    # Euclidean L2 max is 2.0 → normalize to a 0-100 confidence band.
    confidence = round((1 - (distance / 2.0)) * 100, 2)
    final_verdict = verified and confidence > 60
    return final_verdict, confidence, None


# --- NEW: URL-BASED ENDPOINT (Cloudinary-backed flow) ---
class VerifyKycUrlsRequest(BaseModel):
    id_card_url: str = Field(..., description="Cloudinary URL for the CNIC image")
    live_face_url: str = Field(..., description="Cloudinary URL for the live selfie")
    researcher_id: str = Field(..., description="MongoDB user id for logging")


@app.post("/verify-kyc-urls")
def verify_kyc_urls(payload: VerifyKycUrlsRequest):
    """Run KYC against two Cloudinary-hosted images. No local persistence."""
    id_path: Optional[str] = None
    live_path: Optional[str] = None
    try:
        id_path = _download_to_tempfile(payload.id_card_url, suffix=".jpg")
        live_path = _download_to_tempfile(payload.live_face_url, suffix=".jpg")

        success, confidence, error_code = _verify_pair(id_path, live_path)

        if error_code == "INVALID_IMAGE":
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Invalid images downloaded from Cloudinary."},
            )
        if error_code == "INVALID_DOCUMENT":
            return JSONResponse(
                content={
                    "success": False,
                    "error": "INVALID_DOCUMENT",
                    "message": "No Pakistani CNIC detected.",
                }
            )
        if error_code == "FACE_ENGINE_ERROR":
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": "Face verification engine error."},
            )

        return JSONResponse(
            content={
                "success": success,
                "confidence": confidence,
                "verdict": "VERIFIED" if success else "MATCH FAILED",
            }
        )

    except HTTPException:
        raise
    except Exception as exc:
        print(f"Processing Error: {exc}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})
    finally:
        for path in (id_path, live_path):
            if path:
                try:
                    os.remove(path)
                except OSError:
                    pass
        gc.collect()


# --- LEGACY: DIRECT MULTIPART UPLOAD (kept for backwards compatibility / local testing) ---
@app.post("/verify-kyc")
def verify_kyc(
    id_card: UploadFile = File(...),
    live_face: UploadFile = File(...),
    researcher_id: str = Form(...),
):
    """Original endpoint: files come in as multipart and are written to a tempdir.

    Prefer /verify-kyc-urls in production so the Python service never persists
    sensitive CNIC images.
    """
    id_path = None
    live_path = None
    try:
        with tempfile.NamedTemporaryFile(prefix="kyc_id_", suffix=".jpg", delete=False) as f:
            f.write(id_card.file.read())
            id_path = f.name
        with tempfile.NamedTemporaryFile(prefix="kyc_live_", suffix=".jpg", delete=False) as f:
            f.write(live_face.file.read())
            live_path = f.name

        success, confidence, error_code = _verify_pair(id_path, live_path)

        if error_code == "INVALID_IMAGE":
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Invalid images."},
            )
        if error_code == "INVALID_DOCUMENT":
            return JSONResponse(
                content={
                    "success": False,
                    "error": "INVALID_DOCUMENT",
                    "message": "No Pakistani CNIC detected.",
                }
            )
        if error_code == "FACE_ENGINE_ERROR":
            return JSONResponse(
                status_code=500,
                content={"success": False, "message": "Face verification engine error."},
            )

        return JSONResponse(
            content={
                "success": success,
                "confidence": confidence,
                "verdict": "VERIFIED" if success else "MATCH FAILED",
            }
        )

    except Exception as exc:
        print(f"Processing Error: {exc}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})
    finally:
        for path in (id_path, live_path):
            if path:
                try:
                    os.remove(path)
                except OSError:
                    pass
        gc.collect()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, workers=1)
