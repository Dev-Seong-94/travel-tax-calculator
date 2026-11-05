import { describe, expect, it } from "vitest";
import { calculatePurchaseRefund, jpTaxRatePercent } from "@/domain/jp-refund";

describe("jpTaxRatePercent", () => {
  it("uses 10% for standard goods", () => {
    expect(jpTaxRatePercent("standard", "2026-11-01")).toBe(10);
    expect(jpTaxRatePercent("standard", "2030-01-01")).toBe(10);
  });

  it("uses 8% for food through 2027-03-31", () => {
    expect(jpTaxRatePercent("reduced", "2026-11-01")).toBe(8);
    expect(jpTaxRatePercent("reduced", "2027-03-31")).toBe(8);
  });

  it("uses 1% for food from 2027-04-01 through 2029-03-31", () => {
    expect(jpTaxRatePercent("reduced", "2027-04-01")).toBe(1);
    expect(jpTaxRatePercent("reduced", "2029-03-31")).toBe(1);
  });

  it("rejects dates before the refund scheme started", () => {
    expect(() => jpTaxRatePercent("standard", "2026-10-31")).toThrow(RangeError);
  });

  it("rejects food purchases after the confirmed period", () => {
    expect(() => jpTaxRatePercent("reduced", "2029-04-01")).toThrow(RangeError);
  });

  it("rejects malformed dates", () => {
    expect(() => jpTaxRatePercent("standard", "2026/11/01")).toThrow(RangeError);
  });
});

describe("calculatePurchaseRefund minimum purchase", () => {
  it("qualifies at exactly 5,000 yen before tax", () => {
    const result = calculatePurchaseRefund({
      purchaseDate: "2026-11-05",
      items: [{ priceIncTaxYen: 5500, taxClass: "standard" }],
    });

    expect(result.exTaxYen).toBe(5000);
    expect(result.meetsMinimum).toBe(true);
    expect(result.shortfallYen).toBe(0);
  });

  it("does not qualify just below 5,000 yen before tax", () => {
    const result = calculatePurchaseRefund({
      purchaseDate: "2026-11-05",
      items: [{ priceIncTaxYen: 5499, taxClass: "standard" }],
    });

    expect(result.exTaxYen).toBe(4999);
    expect(result.meetsMinimum).toBe(false);
    expect(result.shortfallYen).toBe(1);
  });

  it("qualifies food at the 8% boundary", () => {
    const result = calculatePurchaseRefund({
      purchaseDate: "2026-11-05",
      items: [{ priceIncTaxYen: 5400, taxClass: "reduced" }],
    });

    expect(result.meetsMinimum).toBe(true);
  });

  it("combines goods at different tax rates", () => {
    const result = calculatePurchaseRefund({
      purchaseDate: "2026-11-05",
      items: [
        { priceIncTaxYen: 3300, taxClass: "standard" },
        { priceIncTaxYen: 2160, taxClass: "reduced" },
      ],
    });

    expect(result.exTaxYen).toBe(5000);
    expect(result.meetsMinimum).toBe(true);
    expect(result.maxRefundYen).toBe(460);
  });

  it("applies the 1% food rate to purchases on or after 2027-04-01", () => {
    const result = calculatePurchaseRefund({
      purchaseDate: "2027-04-01",
      items: [{ priceIncTaxYen: 5050, taxClass: "reduced" }],
    });

    expect(result.exTaxYen).toBe(5000);
    expect(result.maxRefundYen).toBe(50);
  });

  it("reports the full shortfall for an empty purchase", () => {
    const result = calculatePurchaseRefund({
      purchaseDate: "2026-11-05",
      items: [],
    });

    expect(result.meetsMinimum).toBe(false);
    expect(result.shortfallYen).toBe(5000);
  });
});

describe("calculatePurchaseRefund amounts", () => {
  it("refunds nothing when the minimum is not met", () => {
    const result = calculatePurchaseRefund({
      purchaseDate: "2026-11-05",
      items: [{ priceIncTaxYen: 1100, taxClass: "standard" }],
    });

    expect(result.consumptionTaxYen).toBe(100);
    expect(result.maxRefundYen).toBe(0);
    expect(result.expectedRefundYen).toBe(0);
  });

  it("treats the default fee as zero", () => {
    const result = calculatePurchaseRefund({
      purchaseDate: "2026-11-05",
      items: [{ priceIncTaxYen: 11000, taxClass: "standard" }],
    });

    expect(result.maxRefundYen).toBe(1000);
    expect(result.expectedRefundYen).toBe(1000);
  });

  it("subtracts a percentage fee", () => {
    const result = calculatePurchaseRefund(
      {
        purchaseDate: "2026-11-05",
        items: [{ priceIncTaxYen: 11000, taxClass: "standard" }],
      },
      { feePercent: 15 },
    );

    expect(result.feeYen).toBe(150);
    expect(result.expectedRefundYen).toBe(850);
  });

  it("rounds the fee up so the estimate stays conservative", () => {
    const result = calculatePurchaseRefund(
      {
        purchaseDate: "2026-11-05",
        items: [{ priceIncTaxYen: 11011, taxClass: "standard" }],
      },
      { feePercent: 10 },
    );

    expect(result.maxRefundYen).toBe(1001);
    expect(result.feeYen).toBe(101);
    expect(result.expectedRefundYen).toBe(900);
  });
});

describe("calculatePurchaseRefund validation", () => {
  it.each([-1, 1.5, Number.NaN])("rejects a price of %s", (priceIncTaxYen) => {
    expect(() =>
      calculatePurchaseRefund({
        purchaseDate: "2026-11-05",
        items: [{ priceIncTaxYen, taxClass: "standard" }],
      }),
    ).toThrow(RangeError);
  });

  it.each([-1, 101, Number.NaN])("rejects a fee of %s%%", (feePercent) => {
    expect(() =>
      calculatePurchaseRefund(
        { purchaseDate: "2026-11-05", items: [] },
        { feePercent },
      ),
    ).toThrow(RangeError);
  });
});
