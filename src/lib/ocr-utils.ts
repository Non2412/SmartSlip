export function getBase64AndMimeType(image: string) {
  const trimmed = image.trim();
  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    return { base64: match[2], mimeType: match[1] };
  }

  return { base64: trimmed.replace(/\s+/g, ''), mimeType: 'image/jpeg' };
}

export function normalizeDate(dateText: string) {
  const cleaned = dateText.replace(/[\s\.]/g, '/').replace(/[^0-9\/\-]/g, '').trim();
  const match = cleaned.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
  if (!match) return dateText;

  const [, first, second, third] = match;
  let day = first;
  let month = second;
  let year = third;

  if (first.length === 4) {
    year = first;
    month = second;
    day = third;
  }

  day = day.padStart(2, '0');
  month = month.padStart(2, '0');
  let yearNum = parseInt(year, 10);

  if (yearNum < 100) {
    yearNum += 2000;
  } else if (yearNum > 2500) {
    yearNum -= 543;
  }

  return `${yearNum.toString().padStart(4, '0')}-${month}-${day}`;
}

export function normalizeAmount(amountText: string) {
  const cleaned = amountText
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '')
    .replace(/\.(?=.*\.)/g, '');

  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

export function identifyDuplicateReceipts(receipts: any[]): { duplicateIds: Set<string>; allDuplicateIds: Set<string> } {
  const duplicateIds = new Set<string>();
  const allDuplicateIds = new Set<string>();
  const seenReceiptNos = new Map<string, string>(); // cleanRef -> originalId
  
  // Sort receipts by createdAt ascending (oldest first) so the oldest remains as original
  const sorted = [...receipts].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Keep track of receipts without receiptNo to check for duplicates based on amount, time, and store
  const processedNoRef: { id: string; amount: number; time: number; store: string }[] = [];

  sorted.forEach(r => {
    const id = r._id || r.id || '';
    const receiptNo = r.extractedData?.receiptNo || r.receiptNo;
    const amount = r.amount !== undefined ? r.amount : r.totalAmount;
    const time = new Date(r.createdAt).getTime();
    const store = (r.storeName || '').toLowerCase().trim();

    if (receiptNo && receiptNo.trim() !== '') {
      const cleanRef = receiptNo.trim();
      if (seenReceiptNos.has(cleanRef)) {
        duplicateIds.add(id);
        allDuplicateIds.add(id);
        const originalId = seenReceiptNos.get(cleanRef);
        if (originalId) allDuplicateIds.add(originalId);
      } else {
        seenReceiptNos.set(cleanRef, id);
      }
    } else if (amount !== undefined && !isNaN(time)) {
      // Fallback heuristic: same amount, created within 10 minutes, and similar store name
      const numericAmount = parseFloat(amount.toString());
      
      let matchedPrev: any = null;
      for (const prev of processedNoRef) {
        const timeDiff = Math.abs(time - prev.time);
        const amountMatch = Math.abs(numericAmount - prev.amount) < 0.01;
        
        // Normalize store names to match e.g. "wedrink" vs "WEDRINK", "inthanin" vs "Inthanin Patched Path", "BIg c" vs "BIGC SISAKET"
        const cleanStore1 = store.replace(/\s+/g, '');
        const cleanStore2 = prev.store.replace(/\s+/g, '');
        const storeMatch = cleanStore1.includes(cleanStore2) || 
                           cleanStore2.includes(cleanStore1) ||
                           cleanStore1.substring(0, 4) === cleanStore2.substring(0, 4);

        if (amountMatch && timeDiff <= 10 * 60 * 1000 && storeMatch) {
          matchedPrev = prev;
          break;
        }
      }

      if (matchedPrev) {
        duplicateIds.add(id);
        allDuplicateIds.add(id);
        allDuplicateIds.add(matchedPrev.id);
      } else {
        processedNoRef.push({
          id: id,
          amount: numericAmount,
          time: time,
          store: store
        });
      }
    }
  });

  return { duplicateIds, allDuplicateIds };
}


