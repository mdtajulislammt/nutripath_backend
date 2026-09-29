const BANGLA_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

const BANGLA_WORD_NUMBERS: Record<string, number> = {
  'এক': 1,
  'একটা': 1,
  'একটি': 1,
  'দুই': 2,
  'দুটি': 2,
  'দুটো': 2,
  'তিন': 3,
  'তিনটি': 3,
  'তিনটা': 3,
  'চার': 4,
  'চারটি': 4,
  'চারটা': 4,
  'পাঁচ': 5,
  'পাঁচটি': 5,
  'পাঁচটা': 5,
  'ছয়': 6,
  'ছয়টি': 6,
  'ছয়টা': 6,
  'সাত': 7,
  'আট': 8,
  'নয়': 9,
  'দশ': 10,
  'অর্ধেক': 0.5,
  'হাফ': 0.5,
  'দেড়': 1.5,
  'দেড়টা': 1.5,
  'আড়াই': 2.5,
  'আড়াইটা': 2.5,
};

export function convertBanglaToEnglishDigits(str: string): string {
  return str.replace(/[০-৯]/g, (match) => BANGLA_DIGITS[match] || match);
}

export function parseBanglaQuantity(qtyText: string): number {
  if (!qtyText) return 1;
  const clean = qtyText.trim().toLowerCase();

  if (BANGLA_WORD_NUMBERS[clean] !== undefined) {
    return BANGLA_WORD_NUMBERS[clean];
  }

  // Convert any Bengali numerals (e.g. ২, ১.৫)
  const converted = convertBanglaToEnglishDigits(clean);
  const match = converted.match(/(\d+(\.\d+)?)/);
  if (match) {
    const val = parseFloat(match[1]);
    return isNaN(val) || val <= 0 ? 1 : val;
  }

  return 1;
}
