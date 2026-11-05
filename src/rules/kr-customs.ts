import type { Rule } from "./types";

const VERIFIED = "2026-11-05";
const RATES_SOURCE = "S13";

function amount(id: string, value: number, unit: string, sourceId = "S5"): Rule<number> {
  return { id, value, unit, sourceId, lastVerified: VERIFIED };
}

export const KR_BASE_EXEMPTION_USD = amount("kr-base-exemption", 800, "USD");
export const KR_ALCOHOL_MAX_USD = amount("kr-alcohol-max-usd", 400, "USD");
export const KR_ALCOHOL_MAX_ML = amount("kr-alcohol-max-ml", 2000, "ml");
export const KR_PERFUME_MAX_ML = amount("kr-perfume-max-ml", 100, "ml");
export const KR_DECLARATION_REDUCTION_PERCENT = amount(
  "kr-declaration-reduction",
  30,
  "percent",
);
export const KR_DECLARATION_REDUCTION_MAX_KRW = amount(
  "kr-declaration-reduction-max",
  200_000,
  "KRW",
  "S6",
);
export const KR_UNDECLARED_PENALTY_PERCENT = amount(
  "kr-undeclared-penalty",
  40,
  "percent",
);
export const KR_REPEAT_UNDECLARED_PENALTY_PERCENT = amount(
  "kr-repeat-undeclared-penalty",
  60,
  "percent",
);
export const KR_VAT_PERCENT = amount(
  "kr-vat",
  10,
  "percent",
  RATES_SOURCE,
);

export type KrGoodsRate =
  | { kind: "simplified"; percent: number; maxPriceKrw: number }
  | { kind: "vat-only" };

const DEFAULT_MAX_KRW = 10_000_000;

function simplified(
  id: string,
  percent: number,
  maxPriceKrw = DEFAULT_MAX_KRW,
): Rule<KrGoodsRate> {
  return {
    id,
    value: { kind: "simplified", percent, maxPriceKrw },
    unit: "percent",
    sourceId: RATES_SOURCE,
    lastVerified: VERIFIED,
  };
}

export const KR_GOODS_RATES = {
  clothing: simplified("kr-rate-clothing", 18),
  shoes: simplified("kr-rate-shoes", 18),
  fur: simplified("kr-rate-fur", 19, 4_310_345),
  bag: simplified("kr-rate-bag", 15, 1_923_000),
  watch: simplified("kr-rate-watch", 15, 1_923_000),
  jewelry: simplified("kr-rate-jewelry", 15, 4_808_000),
  cosmetics: simplified("kr-rate-cosmetics", 15),
  food: simplified("kr-rate-food", 15),
  sunglasses: simplified("kr-rate-sunglasses", 15),
  accessory: simplified("kr-rate-accessory", 15),
  other: simplified("kr-rate-other", 15),
  electronics: {
    id: "kr-rate-electronics",
    value: { kind: "vat-only" },
    unit: "percent",
    sourceId: RATES_SOURCE,
    lastVerified: VERIFIED,
  },
} satisfies Record<string, Rule<KrGoodsRate>>;

export const KR_PERFUME_RATE = simplified("kr-rate-perfume", 15);

export const KR_CUSTOMS_RULES: Rule<unknown>[] = [
  KR_BASE_EXEMPTION_USD,
  KR_ALCOHOL_MAX_USD,
  KR_ALCOHOL_MAX_ML,
  KR_PERFUME_MAX_ML,
  KR_DECLARATION_REDUCTION_PERCENT,
  KR_DECLARATION_REDUCTION_MAX_KRW,
  KR_UNDECLARED_PENALTY_PERCENT,
  KR_REPEAT_UNDECLARED_PENALTY_PERCENT,
  KR_VAT_PERCENT,
  KR_PERFUME_RATE,
  ...Object.values(KR_GOODS_RATES),
];
