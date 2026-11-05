import type { Rule } from "./types";

const VERIFIED = "2026-11-05";
export const JP_REFUND_SCHEME_START = "2026-11-01";

export const JP_MIN_PURCHASE_EX_TAX: Rule<number> = {
  id: "jp-min-purchase-ex-tax",
  value: 5000,
  unit: "JPY",
  effectiveFrom: JP_REFUND_SCHEME_START,
  sourceId: "S3",
  lastVerified: VERIFIED,
};

export const JP_TAX_RATES = {
  standard: [
    {
      id: "jp-tax-standard",
      value: 10,
      unit: "percent",
      effectiveFrom: JP_REFUND_SCHEME_START,
      sourceId: "S11",
      lastVerified: VERIFIED,
    },
  ],
  reduced: [
    {
      id: "jp-tax-reduced",
      value: 8,
      unit: "percent",
      effectiveFrom: JP_REFUND_SCHEME_START,
      effectiveTo: "2027-03-31",
      sourceId: "S11",
      lastVerified: VERIFIED,
    },
    {
      id: "jp-tax-food-temporary",
      value: 1,
      unit: "percent",
      effectiveFrom: "2027-04-01",
      effectiveTo: "2029-03-31",
      sourceId: "S12",
      lastVerified: VERIFIED,
    },
  ],
} satisfies Record<string, Rule<number>[]>;

export const JP_REFUND_RULES: Rule<number>[] = [
  JP_MIN_PURCHASE_EX_TAX,
  ...JP_TAX_RATES.standard,
  ...JP_TAX_RATES.reduced,
];
