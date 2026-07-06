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
  const seenImageHashes = new Map<string, string>(); // hash -> originalId
  
  // Sort receipts by createdAt ascending (oldest first) so the oldest remains as original
  const sorted = [...receipts].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Keep track of receipts without receiptNo/imageHash to check for fallback duplicates
  const processedNoRef: { id: string; amount: number; txDate: string; store: string; createdAtTime: number }[] = [];

  const getTransactionDateString = (r: any): string => {
    const rawDate = r.extractedData?.date || r.date || r.issueDate;
    if (!rawDate) return '';
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {}
    return String(rawDate).split('T')[0].trim();
  };

  sorted.forEach(r => {
    const id = r._id || r.id || '';
    const receiptNo = r.extractedData?.receiptNo || r.receiptNo;
    const imageHash = r.imageHash;
    const amount = r.amount !== undefined ? r.amount : r.totalAmount;
    const time = new Date(r.createdAt).getTime();
    const store = (r.storeName || '').toLowerCase().trim();

    let isDuplicate = false;
    let matchedOriginalId: string | null = null;

    // 1. Check by receiptNo (if present)
    if (receiptNo && receiptNo.trim() !== '') {
      const cleanRef = receiptNo.trim();
      if (seenReceiptNos.has(cleanRef)) {
        isDuplicate = true;
        matchedOriginalId = seenReceiptNos.get(cleanRef) || null;
      } else {
        seenReceiptNos.set(cleanRef, id);
      }
    }

    // 2. Check by imageHash (if present and not already marked duplicate)
    if (!isDuplicate && imageHash && imageHash.trim() !== '') {
      const cleanHash = imageHash.trim();
      if (seenImageHashes.has(cleanHash)) {
        isDuplicate = true;
        matchedOriginalId = seenImageHashes.get(cleanHash) || null;
      } else {
        seenImageHashes.set(cleanHash, id);
      }
    }

    // 3. Fallback check (amount, store, transaction date / createdAt time)
    if (!isDuplicate && amount !== undefined) {
      const numericAmount = parseFloat(amount.toString());
      const txDate = getTransactionDateString(r);
      
      let matchedPrev: any = null;
      for (const prev of processedNoRef) {
        const amountMatch = Math.abs(numericAmount - prev.amount) < 0.01;
        
        // Normalize store names to match e.g. "wedrink" vs "WEDRINK"
        const cleanStore1 = store.replace(/\s+/g, '');
        const cleanStore2 = prev.store.replace(/\s+/g, '');
        const storeMatch = cleanStore1.includes(cleanStore2) || 
                           cleanStore2.includes(cleanStore1) ||
                           cleanStore1.substring(0, 4) === cleanStore2.substring(0, 4);

        let timeOrDateMatch = false;
        if (txDate !== '' && prev.txDate !== '') {
          // If both have transaction dates, compare them directly (upload time doesn't matter)
          timeOrDateMatch = (txDate === prev.txDate);
        } else {
          // Fallback if transaction dates are not available: upload time within 10 minutes
          timeOrDateMatch = (Math.abs(time - prev.createdAtTime) <= 10 * 60 * 1000);
        }

        if (amountMatch && storeMatch && timeOrDateMatch) {
          matchedPrev = prev;
          break;
        }
      }

      if (matchedPrev) {
        isDuplicate = true;
        matchedOriginalId = matchedPrev.id;
      } else {
        processedNoRef.push({
          id: id,
          amount: numericAmount,
          txDate: txDate,
          store: store,
          createdAtTime: time
        });
      }
    }

    if (isDuplicate) {
      duplicateIds.add(id);
      allDuplicateIds.add(id);
      if (matchedOriginalId) {
        allDuplicateIds.add(matchedOriginalId);
      }
    }
  });

  return { duplicateIds, allDuplicateIds };
}


