/** ISO 4217 codes supported for projects and global defaults. */
export const COMMON_CURRENCY_CODES = [
  "USD",
  "EUR",
  "SAR",
  "AED",
  "GBP",
  "INR",
  "QAR",
  "OMR",
  "BHD",
  "KWD",
  "CNY",
  "JPY",
] as const;

export type CurrencyCode = (typeof COMMON_CURRENCY_CODES)[number];

const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
  SAR: "SAR (﷼)",
  AED: "AED (د.إ)",
  GBP: "GBP (£)",
  INR: "INR (₹)",
  QAR: "QAR (﷼)",
  OMR: "OMR (﷼)",
  BHD: "BHD (.د.ب)",
  KWD: "KWD (د.ك)",
  CNY: "CNY (¥)",
  JPY: "JPY (¥)",
};

export function isCurrencyCode(code: string): code is CurrencyCode {
  return (COMMON_CURRENCY_CODES as readonly string[]).includes(code);
}

export function resolveCurrencyCode(code: string | null | undefined): CurrencyCode {
  const upper = (code ?? "USD").toUpperCase();
  return isCurrencyCode(upper) ? upper : "USD";
}

export function getCurrencyLabel(code: CurrencyCode): string {
  return CURRENCY_LABELS[code] ?? code;
}
