# EasyOCR Service for Next.js
# Run this with: pip install fastapi uvicorn easyocr pillow numpy
# Usage: python ocr_service.py

import base64
import io
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import easyocr
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
import re

app = FastAPI()


def preprocess_image(img: Image.Image) -> np.ndarray:
    img_gray = img.convert('L')
    img_contrast = ImageEnhance.Contrast(img_gray).enhance(1.8)
    img_sharp = ImageEnhance.Sharpness(img_contrast).enhance(2.0)
    img_filtered = img_sharp.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
    return np.array(img_filtered)

# Initialize EasyOCR (Thai and English)
print("Loading EasyOCR models (Thai & English)...")
reader = easyocr.Reader(['th', 'en'], gpu=False)

class OCRRequest(BaseModel):
    image: str  # Base64 string

def normalize_date(date_str: str) -> str:
    date_str = date_str.strip()
    date_str = re.sub(r'[^0-9ก-ฮ๐-๙\/\.\-\s]', '', date_str)
    date_str = re.sub(r'\s+', ' ', date_str).strip()

    month_map = {
        'ม.ค.': '01', 'ม.ค': '01', 'มค.': '01', 'มค': '01', 'มกราคม': '01',
        'ก.พ.': '02', 'ก.พ': '02', 'กพ.': '02', 'กพ': '02', 'กุมภาพันธ์': '02',
        'มี.ค.': '03', 'มี.ค': '03', 'มีค.': '03', 'มีค': '03', 'มีนาคม': '03',
        'เม.ย.': '04', 'เม.ย': '04', 'เมย.': '04', 'เมย': '04', 'เมษายน': '04',
        'พ.ค.': '05', 'พ.ค': '05', 'พค.': '05', 'พค': '05', 'พฤษภาคม': '05',
        'มิ.ย.': '06', 'มิ.ย': '06', 'มิย.': '06', 'มิย': '06', 'มิถุนายน': '06',
        'ก.ค.': '07', 'ก.ค': '07', 'กค.': '07', 'กค': '07', 'กรกฎาคม': '07',
        'ส.ค.': '08', 'ส.ค': '08', 'สค.': '08', 'สค': '08', 'สิงหาคม': '08',
        'ก.ย.': '09', 'ก.ย': '09', 'กย.': '09', 'กย': '09', 'กันยายน': '09',
        'ต.ค.': '10', 'ต.ค': '10', 'ตค.': '10', 'ตค': '10', 'ตุลาคม': '10',
        'พ.ย.': '11', 'พ.ย': '11', 'พย.': '11', 'พย': '11', 'พฤศจิกายน': '11',
        'ธ.ค.': '12', 'ธ.ค': '12', 'ธค.': '12', 'ธค': '12', 'ธันวาคม': '12',
    }

    numeric_match = re.match(r'^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$', date_str)
    if numeric_match:
        day, month, year = numeric_match.groups()
        day = day.zfill(2)
        month = month.zfill(2)
        year = int(year)
        if year < 100:
            year = year + 2500 - 543
        elif year > 2500:
            year = year - 543
        return f"{year:04d}-{month}-{day}"

    thai_match = re.search(r'(\d{1,2})\s*([ก-ฮ\.]+)\s*(\d{2,4})', date_str)
    if thai_match:
        day = thai_match.group(1).zfill(2)
        raw_month = thai_match.group(2).strip()
        month = month_map.get(raw_month)
        if month:
            year = int(thai_match.group(3))
            if year < 100:
                year = year + 2500 - 543
            elif year > 2500:
                year = year - 543
            return f"{year:04d}-{month}-{day}"

    return date_str


def normalize_amount(amount_text: str) -> str:
    amount_text = amount_text.replace(',', '.').replace('บาท', '').strip()
    amount_text = re.sub(r'[^0-9\.]', '', amount_text)
    try:
        return f"{float(amount_text):.2f}"
    except ValueError:
        return '0.00'


def extract_receipt_data(ocr_results):
    full_text = ' '.join([res[1] for res in ocr_results if len(res) > 1 and res[1].strip()])
    lines = [res[1].strip() for res in ocr_results if len(res) > 1 and res[1].strip()]
    print(f"Full Text Extracted: {full_text}")

    data = {
        'shop_name': lines[0] if lines else 'ไม่พบข้อมูลร้าน',
        'date': '-',
        'time': '-',
        'total_amount': '0.00',
        'receipt_no': '-',
        'method': 'ไม่ระบุ',
        'receiver': 'ทั่วไป'
    }

    store_keywords = ['ร้าน', 'shop', 'store', '7-eleven', 'tesco', 'big c', 'makro', 'true money', 'k+', 'ธนาคาร']
    for line in lines[:6]:
        if any(keyword in line.lower() for keyword in store_keywords):
            data['shop_name'] = line
            break

    date_priority = next((line for line in lines if re.search(r'วันที่|date|วันที|transaction date|วันที่ทำรายการ', line, re.IGNORECASE)), None)
    if date_priority:
        date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', date_priority)
        if not date_match:
            date_match = re.search(r'(\d{1,2})\s*([ก-ฮ\.]+)\s*(\d{2,4})', date_priority)
        if date_match:
            data['date'] = normalize_date(date_match.group(0))
    if data['date'] == '-':
        date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', full_text)
        if date_match:
            data['date'] = normalize_date(date_match.group(0))
        else:
            thai_date_match = re.search(r'(\d{1,2})\s*([ก-ฮ\.]+)\s*(\d{2,4})', full_text)
            if thai_date_match:
                data['date'] = normalize_date(thai_date_match.group(0))

    time_match = re.search(r'\b\d{1,2}:\d{2}(?::\d{2})?\b', full_text)
    if time_match:
        data['time'] = time_match.group(0)

    amount_patterns = [
        r'(?:ยอดรวม|รวม|total|amount|รวมทั้งสิ้น|ยอดชำระ|จำนวน)\s*[:\-]*\s*([0-9\.,]+)',
        r'([0-9\.,]+)\s*(?:บาท|THB|฿)'
    ]
    for pattern in amount_patterns:
        amount_match = re.search(pattern, full_text, re.IGNORECASE)
        if amount_match:
            data['total_amount'] = normalize_amount(amount_match.group(1))
            break
    if data['total_amount'] == '0.00':
        amount_candidates = re.findall(r'([0-9]{1,3}(?:[\.,][0-9]{3})*(?:[\.,][0-9]{2}))', full_text)
        if amount_candidates:
            values = [float(a.replace(',', '.')) for a in amount_candidates]
            data['total_amount'] = f"{max(values):.2f}"

    method_match = re.search(r'(เงินสด|cash|โอน(?:เงิน)?|transfer|บัตรเครดิต|บัตรเดบิต|credit|debit|promptpay|พร้อมเพย์|prompt pay)', full_text, re.IGNORECASE)
    if method_match:
        data['method'] = method_match.group(1)

    receiver_match = re.search(r'(?:ผู้รับ|รับจาก|payee|receiver)\s*[:\-]?\s*([\w\sก-ฮ]+)', full_text, re.IGNORECASE)
    if receiver_match:
        receiver = receiver_match.group(1).strip()
        if receiver:
            data['receiver'] = receiver

    receipt_match = re.search(r'(?:เลขที่|transaction number|receipt|inv|รายการที่|เลขรายการ|เลขที่รายการ)\s*[:\-]?\s*([A-Z0-9\-\/]+)', full_text, re.IGNORECASE)
    if receipt_match:
        data['receipt_no'] = receipt_match.group(1)

    return data

@app.post("/predict")
async def predict(req: OCRRequest):
    try:
        img_data = re.sub('^data:image/.+;base64,', '', req.image)
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img_processed = preprocess_image(img)

        result = reader.readtext(img_processed, detail=1, paragraph=False)
        
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
