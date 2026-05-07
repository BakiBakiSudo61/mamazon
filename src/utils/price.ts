// 日本語大数単位（万進法、万〜無量大数）
const JP_UNITS_CORRECT: { value: bigint; name: string }[] = [
  { value: 10n ** 68n, name: '無量大数' },
  { value: 10n ** 64n, name: '不可思議' },
  { value: 10n ** 60n, name: '那由他' },
  { value: 10n ** 56n, name: '阿僧祇' },
  { value: 10n ** 52n, name: '恒河沙' },
  { value: 10n ** 48n, name: '極' },
  { value: 10n ** 44n, name: '載' },
  { value: 10n ** 40n, name: '正' },
  { value: 10n ** 36n, name: '澗' },
  { value: 10n ** 32n, name: '溝' },
  { value: 10n ** 28n, name: '穰' },
  { value: 10n ** 24n, name: '秭' },
  { value: 10n ** 20n, name: '垓' },
  { value: 10n ** 16n, name: '京' },
  { value: 10n ** 12n, name: '兆' },
  { value: 10n ** 8n, name: '億' },
  { value: 10n ** 4n, name: '万' },
];

/**
 * 価格文字列（または数値）を ¥XXX万YYY形式にフォーマット
 */
export function formatPrice(price: string | number): string {
  let val: bigint;
  try {
    val = BigInt(String(price).replace(/[^0-9\-]/g, '') || '0');
  } catch {
    val = 0n;
  }
  if (val < 0n) return '¥0';
  if (val === 0n) return '¥0';

  // 1万未満はそのまま3桁区切り
  if (val < 10000n) {
    return '¥' + val.toLocaleString();
  }

  const parts: string[] = [];
  let remaining = val;

  for (const unit of JP_UNITS_CORRECT) {
    if (remaining >= unit.value) {
      const quotient = remaining / unit.value;
      remaining = remaining % unit.value;
      parts.push(quotient.toLocaleString() + unit.name);
    }
  }

  // 1万未満の端数
  if (remaining > 0n) {
    parts.push(remaining.toLocaleString());
  }

  return '¥' + parts.join('');
}

/**
 * BigInt同士の掛け算（数量×価格）
 */
export function multiplyPrice(price: string | number, quantity: number): bigint {
  try {
    return BigInt(String(price).replace(/[^0-9\-]/g, '') || '0') * BigInt(quantity);
  } catch {
    return 0n;
  }
}

/**
 * 複数のBigIntを合算
 */
export function sumPrices(...values: bigint[]): bigint {
  return values.reduce((a, b) => a + b, 0n);
}

/**
 * BigInt価格を文字列に変換（DB保存用）
 */
export function priceToString(price: bigint | string | number): string {
  try {
    return BigInt(String(price).replace(/[^0-9\-]/g, '') || '0').toString();
  } catch {
    return '0';
  }
}

/**
 * 入力値を検証（0以上の整数文字列か）
 */
export function isValidPrice(value: string): boolean {
  // 1無量大数(10^68)未満 = 最大68桁
  return /^\d+$/.test(value) && value.length <= 68;
}
