import { z } from "zod";

/** ISO 4217 codes supported for projects and global defaults. */
export const SUPPORTED_CURRENCY_CODES = [
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

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number];

export const projectCurrencySchema = z.enum(SUPPORTED_CURRENCY_CODES).default("USD");
