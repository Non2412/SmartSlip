# PaddleOCR Service for Next.js
# Run this with: pip install fastapi uvicorn paddleocr paddlepaddle-tiny
# Usage: python paddle_ocr_service.py

import base64
import io
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from paddleocr import PaddleOCR
from PIL import Image
import numpy as np
import re

app = FastAPI()

# Initialize PaddleOCR (Thai and English)
# Use use_gpu=False if you don't have a CUDA GPU
ocr = PaddleOCR(use_angle_cls=True, lang='th', use_gpu=False)

class OCRRequest(BaseModel):
    image: str  # Base64 string

def extract_data(ocr_result):
    """
    Very simple heuristic to extract receipt data from PaddleOCR results
    In real production, you might want to use a LLM (like Gemini) or more complex regex
    """
    full_text = " ".join([line[1][0] for line in ocr_result[0]])
    print(f"Full Text: {full_text}")
    
    data = {
        "shop_name": "Unknown Shop",
        "date": "-",
        "time": "-",
        "total_amount": "0.00",
        "receipt_no": "-"
    }

    # Simple Regex matches for Thai receipts
    # Date (e.g. 10/03/67 or 10 มี.ค. 67)
    date_match = re.search(r'(\d{1,2}/\d{1,2}/\d{2,4})', full_text)
    if date_match: data["date"] = date_match.group(1)

    # Total Amount (Look for numbers near 'ยอดรวม' or 'Total')
    # This is a very basic fallback
    amount_matches = re.findall(r'(\d+\.\d{2})', full_text)
    if amount_matches:
        data["total_amount"] = amount_matches[-1] # Usually the last amount is the total

    return data

@app.post("/predict")
async def predict(req: OCRRequest):
    try:
        # Decode base64
        img_data = re.sub('^data:image/.+;base64,', '', req.image)
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img_np = np.array(img)

        # Run PaddleOCR
        result = ocr.ocr(img_np, cls=True)
        
        # Post-process
        if not result or not result[0]:
            return {"success": False, "error": "No text detected"}

        extracted = extract_data(result)

        return {
            "success": True,
            "data": extracted,
            "raw": [line[1][0] for line in result[0]] # Return all text detected
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("Starting PaddleOCR Service on http://localhost:5000")
    uvicorn.run(app, host="0.0.0.0", port=5000)
