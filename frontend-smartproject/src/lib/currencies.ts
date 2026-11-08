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

/** Currency shared by projects linked as estimation, planning, and execution. */
export function linkedProjectCurrency(
  projects: { id: number; currency?: string | null }[],
  estimationId?: number | null,
  planningId?: number | null,
): { currency: CurrencyCode | null; conflict: boolean } {
  const codes = [estimationId, planningId]
    .filter((id): id is number => id != null)
    .map((id) => projects.find((project) => project.id === id)?.currency)
    .filter((code): code is string => Boolean(code))
    .map((code) => resolveCurrencyCode(code));
  const unique = Array.from(new Set(codes));
  if (unique.length > 1) return { currency: null, conflict: true };
  return { currency: unique[0] ?? null, conflict: false };
}
