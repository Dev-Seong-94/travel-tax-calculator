import { describe, expect, it } from "vitest";
import { calculateKrCustoms } from "@/domain/kr-customs";

const USD_KRW = 1420;
const LIMIT_KRW = 1_136_000;

function estimateGoods(
  goods: Parameters<typeof calculateKrCustoms>[0]["goods"],
) {
  return calculateKrCustoms({ usdKrw: USD_KRW, goods }).withoutRefundProof;
}

describe("basic exemption limit", () => {
  it("is tax free at exactly 800 dollars", () => {
    const result = estimateGoods([
      { category: "clothing", paidKrw: LIMIT_KRW },
    ]);

    expect(result.exemptionLimitKrw).toBe(LIMIT_KRW);
    expect(result.withinLimit).toBe(true);
    expect(result.overLimitKrw).toBe(0);
    expect(result.tax).toMatchObject({ status: "calculated", declaredKrw: 0 });
  });

  it("reports the amount over the limit", () => {
    const result = estimateGoods([
      { category: "clothing", paidKrw: LIMIT_KRW + 1 },
    ]);

    expect(result.withinLimit).toBe(false);
    expect(result.overLimitKrw).toBe(1);
  });
});

describe("simplified tax", () => {
  it("applies the rate, the 30% declaration reduction, and 10-won truncation", () => {
    const result = estimateGoods([
      { category: "clothing", paidKrw: 2_000_000 },
    ]);

    expect(result.tax).toEqual({
      status: "calculated",
      declaredKrw: 108_860,
      undeclaredKrw: 217_720,
      repeatUndeclaredKrw: 248_830,
    });
  });

  it("truncates after subtracting the reduction from the untruncated duty", () => {
    const result = estimateGoods([
      { category: "clothing", paidKrw: LIMIT_KRW + 5_645 },
    ]);

    expect(result.tax).toMatchObject({ declaredKrw: 710 });
  });

  it("deducts the highest-rate goods first", () => {
    const result = estimateGoods([
      { category: "cosmetics", paidKrw: 1_000_000 },
      { category: "clothing", paidKrw: 1_000_000 },
    ]);

    expect(result.tax).toMatchObject({ declaredKrw: 90_720 });
  });

  it("applies VAT without a reduction to VAT-only goods and deducts them last", () => {
    const result = estimateGoods([
      { category: "electronics", paidKrw: 2_000_000 },
      { category: "cosmetics", paidKrw: 1_000_000 },
    ]);

    expect(result.tax).toMatchObject({ declaredKrw: 186_400 });
  });

  it("caps the reduction at 200,000 won", () => {
    const result = estimateGoods([
      { category: "clothing", paidKrw: 9_000_000 },
    ]);

    expect(result.tax).toMatchObject({ declaredKrw: 1_215_520 });
  });

  it("shares the 200,000 won cap across goods", () => {
    const result = estimateGoods([
      { category: "clothing", paidKrw: 5_000_000 },
      { category: "shoes", paidKrw: 4_000_000 },
    ]);

    expect(result.tax).toMatchObject({ declaredKrw: 1_215_520 });
  });
});

describe("goods outside the simplified calculation", () => {
  it("calculates a bag at the 1,923,000 won ceiling", () => {
    const result = estimateGoods([{ category: "bag", paidKrw: 1_923_000 }]);

    expect(result.tax.status).toBe("calculated");
  });

  it("marks a bag above the ceiling as unsupported but still reports usage", () => {
    const result = estimateGoods([{ category: "bag", paidKrw: 1_923_001 }]);

    expect(result.overLimitKrw).toBe(787_001);
    expect(result.tax).toEqual({
      status: "unsupported",
      reasons: ["price-above-simplified-rate"],
    });
  });
});

describe("perfume", () => {
  it("exempts the most valuable bottles within 100ml", () => {
    const { withoutRefundProof: result } = calculateKrCustoms({
      usdKrw: USD_KRW,
      goods: [],
      perfume: [
        { paidKrw: 100_000, ml: 50 },
        { paidKrw: 150_000, ml: 60 },
        { paidKrw: 120_000, ml: 50 },
      ],
    });

    expect(result.perfumeExemptMl).toBe(100);
    expect(result.tax).toMatchObject({ declaredKrw: 15_750 });
  });

  it("taxes a bottle larger than 100ml", () => {
    const { withoutRefundProof: result } = calculateKrCustoms({
      usdKrw: USD_KRW,
      goods: [],
      perfume: [{ paidKrw: 200_000, ml: 150 }],
    });

    expect(result.perfumeExemptMl).toBe(0);
    expect(result.tax).toMatchObject({ declaredKrw: 21_000 });
  });

  it("does not count perfume toward the 800 dollar limit", () => {
    const { withoutRefundProof: result } = calculateKrCustoms({
      usdKrw: USD_KRW,
      goods: [],
      perfume: [{ paidKrw: 2_000_000, ml: 100 }],
    });

    expect(result.generalTotalKrw).toBe(0);
    expect(result.tax).toMatchObject({ declaredKrw: 0 });
  });
});

describe("alcohol", () => {
  it("is exempt at exactly 2L and 400 dollars", () => {
    const { withoutRefundProof: result } = calculateKrCustoms({
      usdKrw: USD_KRW,
      goods: [],
      alcohol: [{ paidKrw: 568_000, ml: 2000 }],
    });

    expect(result.alcoholExempt).toBe(true);
    expect(result.tax).toMatchObject({ status: "calculated", declaredKrw: 0 });
  });

  it.each([
    { paidKrw: 568_001, ml: 2000 },
    { paidKrw: 568_000, ml: 2001 },
  ])("is unsupported above the limit: %o", (bottle) => {
    const { withoutRefundProof: result } = calculateKrCustoms({
      usdKrw: USD_KRW,
      goods: [],
      alcohol: [bottle],
    });

    expect(result.alcoholExempt).toBe(false);
    expect(result.tax).toEqual({
      status: "unsupported",
      reasons: ["alcohol-over-limit"],
    });
  });

  it("has no exemption for minors", () => {
    const { withoutRefundProof: result } = calculateKrCustoms({
      usdKrw: USD_KRW,
      isMinor: true,
      goods: [],
      alcohol: [{ paidKrw: 10_000, ml: 500 }],
    });

    expect(result.alcoholExempt).toBe(false);
    expect(result.tax).toEqual({
      status: "unsupported",
      reasons: ["minor-alcohol"],
    });
  });
});

describe("refund proof", () => {
  const input = {
    usdKrw: USD_KRW,
    goods: [
      { category: "clothing" as const, paidKrw: 1_200_000, refundKrw: 109_090 },
    ],
  };

  it("uses the paid amount without proof", () => {
    const { withoutRefundProof } = calculateKrCustoms(input);

    expect(withoutRefundProof.generalTotalKrw).toBe(1_200_000);
    expect(withoutRefundProof.tax).toMatchObject({ declaredKrw: 8_060 });
  });

  it("subtracts the refund with proof", () => {
    const { withRefundProof } = calculateKrCustoms(input);

    expect(withRefundProof.generalTotalKrw).toBe(1_090_910);
    expect(withRefundProof.tax).toMatchObject({ declaredKrw: 0 });
  });

  it("flags results that depend on refund proof", () => {
    expect(calculateKrCustoms(input).dependsOnRefundProof).toBe(true);
  });

  it("does not flag results that match", () => {
    const result = calculateKrCustoms({
      usdKrw: USD_KRW,
      goods: [{ category: "clothing", paidKrw: 100_000, refundKrw: 9_090 }],
    });

    expect(result.dependsOnRefundProof).toBe(false);
  });
});

describe("validation", () => {
  it.each([0, -1, Number.NaN])("rejects an exchange rate of %s", (usdKrw) => {
    expect(() => calculateKrCustoms({ usdKrw, goods: [] })).toThrow(RangeError);
  });

  it.each([-1, 1.5, Number.NaN])("rejects a price of %s", (paidKrw) => {
    expect(() =>
      calculateKrCustoms({
        usdKrw: USD_KRW,
        goods: [{ category: "other", paidKrw }],
      }),
    ).toThrow(RangeError);
  });

  it("rejects a refund larger than the price", () => {
    expect(() =>
      calculateKrCustoms({
        usdKrw: USD_KRW,
        goods: [{ category: "other", paidKrw: 100, refundKrw: 101 }],
      }),
    ).toThrow(RangeError);
  });

  it.each([0, 1.5])("rejects a perfume volume of %s", (ml) => {
    expect(() =>
      calculateKrCustoms({
        usdKrw: USD_KRW,
        goods: [],
        perfume: [{ paidKrw: 100, ml }],
      }),
    ).toThrow(RangeError);
  });
});
