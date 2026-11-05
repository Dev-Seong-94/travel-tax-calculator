import { JP_MIN_PURCHASE_EX_TAX, JP_TAX_RATES } from "@/rules/jp-refund";
import type { IsoDate } from "@/rules/types";

export type JpTaxClass = keyof typeof JP_TAX_RATES;

export type JpItem = {
  priceIncTaxYen: number;
  taxClass: JpTaxClass;
};

/** Everything bought at one store on one day. */
export type JpPurchase = {
  purchaseDate: IsoDate;
  items: JpItem[];
};

export type JpRefundOptions = {
  feePercent?: number;
};

export type JpRefundResult = {
  exTaxYen: number;
  consumptionTaxYen: number;
  meetsMinimum: boolean;
  shortfallYen: number;
  maxRefundYen: number;
  feeYen: number;
  expectedRefundYen: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function jpTaxRatePercent(
  taxClass: JpTaxClass,
  purchaseDate: IsoDate,
): number {
  if (!ISO_DATE.test(purchaseDate)) {
    throw new RangeError(`Invalid purchase date: ${purchaseDate}`);
  }

  const rules: { value: number; effectiveFrom: string; effectiveTo?: string }[] =
    JP_TAX_RATES[taxClass];
  const rule = rules.find(
    ({ effectiveFrom, effectiveTo }) =>
      effectiveFrom <= purchaseDate &&
      (effectiveTo === undefined || purchaseDate <= effectiveTo),
  );
  if (!rule) {
    throw new RangeError(
      `No confirmed ${taxClass} tax rate for ${purchaseDate}`,
    );
  }
  return rule.value;
}

export function calculatePurchaseRefund(
  purchase: JpPurchase,
  { feePercent = 0 }: JpRefundOptions = {},
): JpRefundResult {
  if (!(feePercent >= 0 && feePercent <= 100)) {
    throw new RangeError(`Invalid fee percent: ${feePercent}`);
  }

  const totalsByRate = new Map<number, number>();
  for (const { priceIncTaxYen, taxClass } of purchase.items) {
    if (!Number.isSafeInteger(priceIncTaxYen) || priceIncTaxYen < 0) {
      throw new RangeError(`Invalid price: ${priceIncTaxYen}`);
    }
    const rate = jpTaxRatePercent(taxClass, purchase.purchaseDate);
    totalsByRate.set(rate, (totalsByRate.get(rate) ?? 0) + priceIncTaxYen);
  }

  let exTaxYen = 0;
  let consumptionTaxYen = 0;
  for (const [rate, total] of totalsByRate) {
    exTaxYen += Math.round((total * 100) / (100 + rate));
    consumptionTaxYen += Math.floor((total * rate) / (100 + rate));
  }

  const minimum = JP_MIN_PURCHASE_EX_TAX.value;
  const meetsMinimum = exTaxYen >= minimum;
  const maxRefundYen = meetsMinimum ? consumptionTaxYen : 0;
  const feeYen = Math.ceil((maxRefundYen * feePercent) / 100);

  return {
    exTaxYen,
    consumptionTaxYen,
    meetsMinimum,
    shortfallYen: Math.max(minimum - exTaxYen, 0),
    maxRefundYen,
    feeYen,
    expectedRefundYen: maxRefundYen - feeYen,
  };
}
