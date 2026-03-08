import uvicorn
import os
import re
import gc
import cv2
import numpy as np
import easyocr
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace

# --- CONFIGURATION ---
# gpu=False is critical for your setup to avoid crashing
reader = easyocr.Reader(['en'], gpu=False) 

app = FastAPI(title="Optimized KYC Engine")

# Allow your MERN app to talk to this server if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fix: Get the absolute path of the directory where main.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

# --- AUTO-LOAD FRONTEND ---
@app.get("/", response_class=HTMLResponse)
def get_index():
    """
    This function runs when you open the server URL.
    It reads 'index.html' and sends it to your browser.
    """
    file_path = os.path.join(BASE_DIR, "index.html")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "<h1>Error: index.html not found. Please ensure it is in the same folder as main.py</h1>"

# --- HELPER FUNCTIONS ---
def decode_and_save(file, save_path):
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file, buffer)
        return True
    except Exception as e:
        print(f"File Save Error: {e}")
        return False

def decode_and_resize(image_path, max_width=1000):
    try:
        img = cv2.imread(image_path)
        if img is None: return None
        h, w = img.shape[:2]
        if w > max_width:
            scale = max_width / w
            new_h = int(h * scale)
            img = cv2.resize(img, (max_width, new_h))
        return img
    except Exception:
        return None

def is_valid_pakistani_doc(img):
    try:
        results = reader.readtext(img, detail=0)
        full_text = " ".join(results).upper()
        print(f"OCR Text: {full_text}") # Debugging
        
        # Check Keywords
        keywords = ["PAKISTAN", "ISLAMIC REPUBLIC", "GOVERNMENT OF PAKISTAN", "CNIC", "IDENTITY CARD"]
        if any(k in full_text for k in keywords): return True

        # Check Regex (#####-#######-#)
        if re.search(r"\d{5}[\s-]?\d{7}[\s-]?\d{1}", full_text): return True
        
        return False
    except Exception as e:
        print(f"OCR Error: {e}")
        return False

# --- API ENDPOINT ---
@app.post("/verify-kyc")
def verify_kyc(
    id_card: UploadFile = File(...), 
    live_face: UploadFile = File(...),
    researcher_id: str = Form(...)
):
    img_id = None
    img_live = None
    
    # Create Researcher Folder
    researcher_folder = os.path.join(UPLOADS_DIR, "researchers", researcher_id)
    os.makedirs(researcher_folder, exist_ok=True)
    
    id_path = os.path.join(researcher_folder, f"cnic_{id_card.filename}")
    live_path = os.path.join(researcher_folder, f"live_{live_face.filename}")

    try:
        # 1. Save Files
        with open(id_path, "wb") as f:
            f.write(id_card.file.read())
        
        with open(live_path, "wb") as f:
            f.write(live_face.file.read())
            
        # 2. Process Files
        img_id = decode_and_resize(id_path)
        img_live = decode_and_resize(live_path)

        if img_id is None or img_live is None:
            return JSONResponse(status_code=400, content={"success": False, "message": "Invalid images."})

        # 3. Validate Document
        if not is_valid_pakistani_doc(img_id):
            return JSONResponse(content={"success": False, "error": "INVALID_DOCUMENT", "message": "No Pakistani CNIC detected."})

        # 4. Verify Face
        # result = DeepFace.verify(
        #     img1_path=img_id,
        #     img2_path=img_live,
        #     model_name="Facenet512",
        #     detector_backend="opencv",
        #     enforce_detection=False,
        #     align=True
        # )

        result = DeepFace.verify(
            img1_path=img_id,
            img2_path=img_live,
            model_name="Facenet512",
            detector_backend="opencv",
            distance_metric="euclidean_l2", # <-- Perfect.
            enforce_detection=False,
            align=True
        )

        # verified = result.get("verified", False)
        # distance = result.get("distance", 1.0)
        # confidence = round((1 - distance) * 100, 2)
        # final_verdict = verified and confidence > 70

        # return JSONResponse(content={
        #     "success": final_verdict,
        #     "confidence": confidence,
        #     "verdict": "VERIFIED" if final_verdict else "MATCH FAILED"
        # })

        verified = result.get("verified", False)
        distance = result.get("distance", 1.0)
        
        # NEW MATH: Euclidean L2 distance maxes out at 2.0
        # Divide by 2.0 to normalize it back to a percentage
        confidence = round((1 - (distance / 2.0)) * 100, 2)
        final_verdict = verified and confidence > 60

        return JSONResponse(content={
            "success": final_verdict,
            "confidence": confidence,
            "verdict": "VERIFIED" if final_verdict else "MATCH FAILED"
        })

    except Exception as e:
        print(f"Processing Error: {str(e)}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

    finally:
        # Cleanup memory (not files)
        if 'img_id' in locals(): del img_id
        if 'img_live' in locals(): del img_live
        gc.collect()

if __name__ == "__main__":
    # Runs on Port 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, workers=1)
