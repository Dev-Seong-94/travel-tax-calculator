import {
  KR_ALCOHOL_MAX_ML,
  KR_ALCOHOL_MAX_USD,
  KR_BASE_EXEMPTION_USD,
  KR_DECLARATION_REDUCTION_MAX_KRW,
  KR_DECLARATION_REDUCTION_PERCENT,
  KR_GOODS_RATES,
  KR_PERFUME_MAX_ML,
  KR_PERFUME_RATE,
  KR_REPEAT_UNDECLARED_PENALTY_PERCENT,
  KR_UNDECLARED_PENALTY_PERCENT,
  KR_VAT_PERCENT,
  type KrGoodsRate,
} from "@/rules/kr-customs";

export type KrGoodsCategory = keyof typeof KR_GOODS_RATES;

type Priced = {
  paidKrw: number;
  /** Refund for this item. Only subtracted when refund proof is available. */
  refundKrw?: number;
};

export type KrGoods = Priced & { category: KrGoodsCategory };
export type KrBottle = Priced & { ml: number };

export type KrCustomsInput = {
  /** Won per US dollar. */
  usdKrw: number;
  isMinor?: boolean;
  goods: KrGoods[];
  alcohol?: KrBottle[];
  perfume?: KrBottle[];
};

export type KrUnsupportedReason =
  | "price-above-simplified-rate"
  | "alcohol-over-limit"
  | "minor-alcohol";

export type KrTaxEstimate =
  | {
      status: "calculated";
      declaredKrw: number;
      undeclaredKrw: number;
      repeatUndeclaredKrw: number;
    }
  | { status: "unsupported"; reasons: KrUnsupportedReason[] };

export type KrCustomsResult = {
  exemptionLimitKrw: number;
  generalTotalKrw: number;
  overLimitKrw: number;
  withinLimit: boolean;
  alcoholExempt: boolean;
  perfumeExemptMl: number;
  tax: KrTaxEstimate;
};

export type KrCustomsEstimate = {
  withoutRefundProof: KrCustomsResult;
  withRefundProof: KrCustomsResult;
  dependsOnRefundProof: boolean;
};

type Taxable = { taxableKrw: number; rate: KrGoodsRate };

function floorTo10(krw: number): number {
  return Math.floor(krw / 10) * 10;
}

function assertPriced({ paidKrw, refundKrw = 0 }: Priced): void {
  if (!Number.isSafeInteger(paidKrw) || paidKrw < 0) {
    throw new RangeError(`Invalid price: ${paidKrw}`);
  }
  if (!Number.isSafeInteger(refundKrw) || refundKrw < 0 || refundKrw > paidKrw) {
    throw new RangeError(`Invalid refund: ${refundKrw}`);
  }
}

function assertBottle(bottle: KrBottle): void {
  assertPriced(bottle);
  if (!Number.isSafeInteger(bottle.ml) || bottle.ml <= 0) {
    throw new RangeError(`Invalid volume: ${bottle.ml}`);
  }
}

function usdToKrw(usd: number, usdKrw: number): number {
  return Math.round(usd * usdKrw);
}

function sumBy<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

/** Picks bottles within the volume limit that exempt the most value. */
function pickExemptPerfume(prices: number[], volumes: number[]): Set<number> {
  const limit = KR_PERFUME_MAX_ML.value;
  let best = new Map<number, { value: number; picked: number[] }>([
    [0, { value: 0, picked: [] }],
  ]);

  volumes.forEach((ml, index) => {
    const next = new Map(best);
    for (const [used, { value, picked }] of best) {
      const total = used + ml;
      if (total > limit) continue;
      const candidate = value + prices[index];
      const existing = next.get(total);
      if (!existing || candidate > existing.value) {
        next.set(total, { value: candidate, picked: [...picked, index] });
      }
    }
    best = next;
  });

  const winner = [...best.values()].reduce((a, b) =>
    b.value > a.value ? b : a,
  );
  return new Set(winner.picked);
}

function deductExemption(
  goods: { priceKrw: number; rate: KrGoodsRate }[],
  limitKrw: number,
): Taxable[] {
  const percent = ({ rate }: { rate: KrGoodsRate }) =>
    rate.kind === "simplified" ? rate.percent : 0;
  const ordered = [...goods].sort(
    (a, b) => percent(b) - percent(a) || b.priceKrw - a.priceKrw,
  );

  let remainingKrw = limitKrw;
  return ordered.map(({ priceKrw, rate }) => {
    const deductedKrw = Math.min(priceKrw, remainingKrw);
    remainingKrw -= deductedKrw;
    return { taxableKrw: priceKrw - deductedKrw, rate };
  });
}

function exactDuty({ taxableKrw, rate }: Taxable): number {
  return rate.kind === "simplified" ? (taxableKrw * rate.percent) / 100 : 0;
}

function vat({ taxableKrw, rate }: Taxable): number {
  return rate.kind === "vat-only"
    ? floorTo10((taxableKrw * KR_VAT_PERCENT.value) / 100)
    : 0;
}

function calculateTax(items: Taxable[]): KrTaxEstimate {
  const maxReduction = (duty: number) =>
    Math.min(
      (duty * KR_DECLARATION_REDUCTION_PERCENT.value) / 100,
      KR_DECLARATION_REDUCTION_MAX_KRW.value,
    );

  // The reduction limit comes from the truncated duty, while the final amount
  // truncates the exact duty minus the reduction.
  const exactDuties = items
    .map(exactDuty)
    .sort((a, b) => maxReduction(floorTo10(b)) - maxReduction(floorTo10(a)));
  const vatKrw = sumBy(items, vat);

  let remainingReduction = KR_DECLARATION_REDUCTION_MAX_KRW.value;
  let declaredDutyKrw = 0;
  for (const duty of exactDuties) {
    const reduction = Math.min(maxReduction(floorTo10(duty)), remainingReduction);
    remainingReduction -= reduction;
    declaredDutyKrw += floorTo10(duty - reduction);
  }

  const baseTaxKrw = sumBy(exactDuties, floorTo10) + vatKrw;
  const withPenalty = (percent: number) =>
    baseTaxKrw + floorTo10((baseTaxKrw * percent) / 100);

  return {
    status: "calculated",
    declaredKrw: declaredDutyKrw + vatKrw,
    undeclaredKrw: withPenalty(KR_UNDECLARED_PENALTY_PERCENT.value),
    repeatUndeclaredKrw: withPenalty(KR_REPEAT_UNDECLARED_PENALTY_PERCENT.value),
  };
}

function exceedsSimplifiedRate(rate: KrGoodsRate, priceKrw: number): boolean {
  return rate.kind === "simplified" && priceKrw > rate.maxPriceKrw;
}

function calculateResult(
  input: KrCustomsInput,
  price: (item: Priced) => number,
): KrCustomsResult {
  const { usdKrw, isMinor = false, goods, alcohol = [], perfume = [] } = input;
  const reasons: KrUnsupportedReason[] = [];

  const exemptionLimitKrw = usdToKrw(KR_BASE_EXEMPTION_USD.value, usdKrw);
  const pricedGoods = goods.map((item) => ({
    priceKrw: price(item),
    rate: KR_GOODS_RATES[item.category].value,
  }));
  const generalTotalKrw = sumBy(pricedGoods, ({ priceKrw }) => priceKrw);
  const overLimitKrw = Math.max(generalTotalKrw - exemptionLimitKrw, 0);

  if (
    pricedGoods.some(({ rate, priceKrw }) =>
      exceedsSimplifiedRate(rate, priceKrw),
    )
  ) {
    reasons.push("price-above-simplified-rate");
  }

  const alcoholWithinLimit =
    sumBy(alcohol, ({ ml }) => ml) <= KR_ALCOHOL_MAX_ML.value &&
    sumBy(alcohol, price) <= usdToKrw(KR_ALCOHOL_MAX_USD.value, usdKrw);
  if (alcohol.length > 0 && isMinor) {
    reasons.push("minor-alcohol");
  } else if (!alcoholWithinLimit) {
    reasons.push("alcohol-over-limit");
  }

  const perfumePrices = perfume.map(price);
  const exemptPerfume = pickExemptPerfume(
    perfumePrices,
    perfume.map(({ ml }) => ml),
  );
  const perfumeRate = KR_PERFUME_RATE.value;
  const taxablePerfume: Taxable[] = perfumePrices
    .filter((_, index) => !exemptPerfume.has(index))
    .map((taxableKrw) => ({ taxableKrw, rate: perfumeRate }));
  if (
    taxablePerfume.some(({ taxableKrw }) =>
      exceedsSimplifiedRate(perfumeRate, taxableKrw),
    )
  ) {
    reasons.push("price-above-simplified-rate");
  }

  return {
    exemptionLimitKrw,
    generalTotalKrw,
    overLimitKrw,
    withinLimit: overLimitKrw === 0,
    alcoholExempt: alcoholWithinLimit && !(isMinor && alcohol.length > 0),
    perfumeExemptMl: sumBy([...exemptPerfume], (index) => perfume[index].ml),
    tax:
      reasons.length > 0
        ? { status: "unsupported", reasons: [...new Set(reasons)] }
        : calculateTax([
            ...deductExemption(pricedGoods, exemptionLimitKrw),
            ...taxablePerfume,
          ]),
  };
}

export function calculateKrCustoms(input: KrCustomsInput): KrCustomsEstimate {
  if (!(input.usdKrw > 0)) {
    throw new RangeError(`Invalid exchange rate: ${input.usdKrw}`);
  }
  input.goods.forEach(assertPriced);
  input.alcohol?.forEach(assertBottle);
  input.perfume?.forEach(assertBottle);

  const withoutRefundProof = calculateResult(input, ({ paidKrw }) => paidKrw);
  const withRefundProof = calculateResult(
    input,
    ({ paidKrw, refundKrw = 0 }) => paidKrw - refundKrw,
  );

  return {
    withoutRefundProof,
    withRefundProof,
    dependsOnRefundProof:
      JSON.stringify(withoutRefundProof.tax) !==
        JSON.stringify(withRefundProof.tax) ||
      withoutRefundProof.withinLimit !== withRefundProof.withinLimit,
  };
}
