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

  let [, first, second, third] = match;
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
