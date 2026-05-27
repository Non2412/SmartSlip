# PaddleOCR Service for Thai Receipt Extraction
# Run with: pip install paddleocr paddlepaddle fastapi uvicorn pillow
# Usage: python paddle_ocr_service.py

import os
os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['PADDLE_DISABLE_MKLDNN'] = '1'

import base64
import io
import re

import numpy as np

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image, ImageEnhance, ImageFilter

try:
    import paddleocr
    print("Initializing PaddleOCR (Thai)...")
    ocr = paddleocr.PaddleOCR(
        use_textline_orientation=False,
        lang='th',
        enable_mkldnn=False,
        cpu_threads=4,
    )
    print("OK: PaddleOCR loaded successfully")
except Exception as e:
    print(f"ERROR: PaddleOCR init failed: {e}")
    print("Install with: pip install paddleocr paddlepaddle")
    ocr = None

app = FastAPI()

class OCRRequest(BaseModel):
    image: str  # Base64 string


MAX_SIDE = 1280  # Limit image size to reduce OCR processing time

def preprocess_image(img: Image.Image) -> Image.Image:
    # Resize to limit max dimension — keeps aspect ratio, drastically reduces CPU time
    w, h = img.size
    if max(w, h) > MAX_SIDE:
        scale = MAX_SIDE / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    img_gray = img.convert('L')
    img_contrast = ImageEnhance.Contrast(img_gray).enhance(1.8)
    img_sharp = ImageEnhance.Sharpness(img_contrast).enhance(2.0)
    img_filtered = img_sharp.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
    # Convert back to RGB so numpy array has shape (H, W, 3) as PaddleOCR expects
    return img_filtered.convert('RGB')


def normalize_date(date_str: str) -> str:
    date_str = date_str.strip()

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

    # Try Thai month format on ORIGINAL string first (before any modifications that break abbreviations)
    thai_match = re.search(r'(\d{1,2})\s*([ก-ฮ\.]+)\s*(\d{2,4})', date_str)
    if thai_match:
        day = thai_match.group(1).zfill(2)
        raw_month = thai_match.group(2).strip()
        month = month_map.get(raw_month)
        if month:
            year = int(thai_match.group(3))
            if year < 100:
                year += 2500 - 543
            elif year > 2500:
                year -= 543
            return f"{year:04d}-{month}-{day}"

    # Fall back to numeric format after cleaning
    date_str = date_str.replace('.', '/').replace('-', '/').replace(' ', '/')
    date_str = re.sub(r'[^0-9ก-ฮ\/]+', '', date_str)
    date_str = re.sub(r'/+', '/', date_str).strip('/')

    numeric_match = re.match(r'^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$', date_str)
    if numeric_match:
        day, month, year = numeric_match.groups()
        day = day.zfill(2)
        month = month.zfill(2)
        year = int(year)
        if year < 100:
            year += 2500 - 543
        elif year > 2500:
            year -= 543
        return f"{year:04d}-{month}-{day}"

    return date_str


def normalize_amount(amount_text: str) -> str:
    amount_text = amount_text.replace('บาท', '').strip()
    # Remove thousands-separator commas (e.g. "1,000.00" → "1000.00") instead of replacing with dot
    amount_text = re.sub(r',(?=\d)', '', amount_text)
    amount_text = re.sub(r'[^0-9\.]', '', amount_text)
    try:
        return f"{float(amount_text):.2f}"
    except ValueError:
        return '0.00'


def extract_receipt_data(ocr_results):
    texts = []
    for item in ocr_results:
        if not item:
            continue
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            text_value = item[1][0] if isinstance(item[1], (list, tuple)) and item[1] else item[1]
            if isinstance(text_value, str) and text_value.strip():
                texts.append(text_value.strip())
        elif isinstance(item, str):
            texts.append(item.strip())

    full_text = ' '.join(texts)
    lines = [t for t in texts if t]
    print(f'Full Text: {full_text}')

    data = {
        'store': '',
        'sender': '',
        'payee': '',
        'date': '',
        'time': '',
        'amount': '0.00',
        'method': '',
        'receiver': '',
        'receipt_no': ''
    }

    # Detect names from slip lines
    name_lines = [line for line in lines if re.match(r'^(นาย|นางสาว|น\.?ส\.?|นาง|บริษัท|หจก\.?|บจก\.?|ห้าง)\b', line, re.IGNORECASE)]
    if len(name_lines) >= 2:
        data['sender'] = name_lines[0]
        data['payee'] = name_lines[1]
    elif len(name_lines) == 1:
        data['payee'] = name_lines[0]

    # If payee not found, use store keyword heuristics
    store_keywords = ['7-eleven', 'tesco', 'big c', 'makro', 'true', 'k+', 'ร้าน', 'shop', 'store', 'บริษัท', 'หจก', 'บจก', 'ห้าง']
    for line in lines[:6]:
        if any(keyword in line.lower() for keyword in store_keywords):
            data['store'] = line
            break

    # Extract date from explicit labels or any Thai/number date patterns
    for line in lines:
        if re.search(r'วันที่|date|transaction date|date\s*[:\-]|วันที่ทำรายการ|\d{1,2}\s*[ก-ฮ\.]+\s*\d{2,4}', line, re.IGNORECASE):
            date_match = re.search(r'(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})', line)
            if not date_match:
                date_match = re.search(r'(\d{1,2})\s*([ก-ฮ\.]+)\s*(\d{2,4})', line)
            if date_match:
                data['date'] = normalize_date(date_match.group(0))
                break
    if not data['date']:
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
        r'(?:(?:จำนวน|ยอดรวม|รวมทั้งสิ้น|total|amount|grand total|net amount))\s*[:\-]?\s*([0-9\.,]+)',
        r'([0-9\.,]+)\s*(?:บาท|THB|฿)'
    ]
    for pattern in amount_patterns:
        amount_match = re.search(pattern, full_text, re.IGNORECASE)
        if amount_match:
            data['amount'] = normalize_amount(amount_match.group(1))
            break
    if data['amount'] == '0.00':
        numeric_amounts = re.findall(r'([0-9]{1,3}(?:[\.,][0-9]{3})*(?:[\.,][0-9]{2}))', full_text)
        if numeric_amounts:
            values = []
            for m in numeric_amounts:
                try:
                    values.append(float(re.sub(r',(?=\d)', '', m)))
                except ValueError:
                    pass
            if values:
                data['amount'] = f"{max(values):.2f}"

    if not data['method']:
        method_match = re.search(r'(เงินสด|cash|โอน(?:เงิน)?|transfer|promptpay|prompt pay|credit|debit)', full_text, re.IGNORECASE)
        if method_match:
            data['method'] = method_match.group(1)
        elif re.search(r'โอนเงินสำเร็จ|สำเร็จ', full_text, re.IGNORECASE):
            data['method'] = 'โอนเงิน'

    receiver_match = re.search(r'(?:ผู้รับ|รับจาก|payee|receiver|ถึง)\s*[:\-]?\s*([\w\sก-ฮ]+)', full_text, re.IGNORECASE)
    if receiver_match:
        data['receiver'] = receiver_match.group(1).strip()
    if not data['receiver'] and data['payee']:
        data['receiver'] = data['payee']

    receipt_match = re.search(r'(?:เลขที่รายการ|เลขที่|ใบเสร็จ|transaction number|receipt|inv(?:oice)?\s*#?)\s*[:\-]?\s*([A-Z0-9\-/]+)', full_text, re.IGNORECASE)
    if receipt_match:
        data['receipt_no'] = receipt_match.group(1)

    if not data['store']:
        data['store'] = data['payee'] or data['receiver'] or data['sender'] or (lines[0] if lines else 'Unknown Store')

    return data


@app.post('/predict')
async def predict(req: OCRRequest):
    try:
        if ocr is None:
            raise HTTPException(status_code=503, detail='PaddleOCR is not available. Check installation.')

        img_data = re.sub(r'^data:image/.+;base64,', '', req.image)
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        img_processed = preprocess_image(img)

        result = ocr.ocr(np.array(img_processed))
        raw_text = []
        # result structure: [page, ...] where page = [[bbox, (text, conf)], ...]
        for page in (result or []):
            if not page:
                continue
            for item in page:
                if isinstance(item, (list, tuple)) and len(item) >= 2:
                    text_info = item[1]
                    text = text_info[0] if isinstance(text_info, (list, tuple)) and text_info else ''
                    if isinstance(text, str) and text.strip():
                        raw_text.append(text.strip())

        if not raw_text:
            return {'success': False, 'error': 'No text detected'}

        extracted = extract_receipt_data([[None, [text, 0.0]] for text in raw_text])
        return {
            'success': True,
            'data': extracted,
            'raw': raw_text
        }
    except Exception as e:
        print(f'Error: {e}')
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == '__main__':
    print('Starting PaddleOCR Service on http://localhost:5000')
    uvicorn.run(app, host='0.0.0.0', port=5000)


