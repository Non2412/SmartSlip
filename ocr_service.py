# EasyOCR Service for Next.js
# Run this with: pip install fastapi uvicorn easyocr pillow numpy
# Usage: python ocr_service.py

import base64
import io
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import easyocr
from PIL import Image
import numpy as np
import re

app = FastAPI()

# Initialize EasyOCR (Thai and English)
# gpu=False if you don't have a CUDA GPU
print("Loading EasyOCR models (Thai & English)...")
reader = easyocr.Reader(['th', 'en'], gpu=False)

class OCRRequest(BaseModel):
    image: str  # Base64 string

def extract_receipt_data(ocr_results):
    """
    Extract structured data from EasyOCR results
    EasyOCR return format: [[box, text, confidence], ...]
    """
    # Combine all detected text into one string for regex searching
    full_text = " ".join([res[1] for res in ocr_results])
    print(f"Full Text Extracted: {full_text}")
    
    data = {
        "shop_name": "ไม่พบข้อมูลร้าน",
        "date": "-",
        "time": "-",
        "total_amount": "0.00",
        "receipt_no": "-"
    }

    # 1. Try to find Shop Name (Usually the first few lines)
    if len(ocr_results) > 0:
        data["shop_name"] = ocr_results[0][1]

    # 2. Extract Date (Format: DD/MM/YYYY or DD-MM-YYYY)
    date_pattern = r'(\d{1,2}[/\.-]\d{1,2}[/\.-]\d{2,4})'
    date_match = re.search(date_pattern, full_text)
    if date_match:
        data["date"] = date_match.group(1)

    # 3. Extract Time (Format: HH:MM)
    time_pattern = r'(\d{1,2}:\d{2})'
    time_match = re.search(time_pattern, full_text)
    if time_match:
        data["time"] = time_match.group(1)

    # 4. Extract Total Amount
    # Look for decimals with 2 digits (e.g. 520.00)
    # Often the largest or last number in a receipt
    amount_matches = re.findall(r'(\d+[\.,]\d{2})', full_text)
    if amount_matches:
        # Replace comma with dot and convert to float to find max or last
        amounts = [float(a.replace(',', '.')) for a in amount_matches]
        data["total_amount"] = f"{max(amounts):.2f}"

    return data

@app.post("/predict")
async def predict(req: OCRRequest):
    try:
        # Decode base64 image
        img_data = re.sub('^data:image/.+;base64,', '', req.image)
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img_np = np.array(img)

        # Run EasyOCR
        result = reader.readtext(img_np)
        
        if not result:
            return {"success": False, "error": "No text detected"}

        extracted = extract_receipt_data(result)

        return {
            "success": True,
            "data": extracted,
            "raw": [res[1] for res in result]
        }
    except Exception as e:
        print(f"Error during OCR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("Starting EasyOCR Service on http://localhost:5000")
    uvicorn.run(app, host="0.0.0.0", port=5000)
