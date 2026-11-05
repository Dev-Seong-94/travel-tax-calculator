import { describe, expect, it } from "vitest";
import {
  isRateStale,
  parseMarketRates,
  parseRateInput,
  yenToKrw,
} from "@/domain/exchange-rate";

describe("yenToKrw", () => {
  it("converts yen to won and rounds to the nearest won", () => {
    expect(yenToKrw(5500, 8.4305)).toBe(46368);
  });

  it("converts zero", () => {
    expect(yenToKrw(0, 8.4305)).toBe(0);
  });
});

describe("parseRateInput", () => {
  it("accepts decimals and commas", () => {
    expect(parseRateInput("1,328.56")).toBe(1328.56);
  });

  it.each(["", "abc", "0", "-1", "1.2.3"])("rejects %j", (input) => {
    expect(parseRateInput(input)).toBeNull();
  });
});

describe("isRateStale", () => {
  it("keeps a rate from exactly 7 days ago", () => {
    expect(isRateStale("2026-11-05", "2026-11-12")).toBe(false);
  });

  it("flags a rate older than 7 days", () => {
    expect(isRateStale("2026-11-05", "2026-11-13")).toBe(true);
  });

  it("does not judge before today is known", () => {
    expect(isRateStale("2026-11-05", "")).toBe(false);
  });
});

describe("parseMarketRates", () => {
  const response = {
    base: "USD",
    date: "2026-11-04",
    rates: { JPY: 158.25, KRW: 1338.58 },
  };

  it("derives won rates from a dollar-based response", () => {
    expect(parseMarketRates(response)).toEqual({
      asOf: "2026-11-04",
      usdKrw: 1338.58,
      jpyKrw: 8.4586,
    });
  });

  it.each([
    ["missing rates", { base: "USD", date: "2026-11-04" }],
    ["another base", { ...response, base: "EUR" }],
    ["a bad date", { ...response, date: "yesterday" }],
    ["an implausible won rate", { ...response, rates: { JPY: 158.25, KRW: 1.3 } }],
    ["an implausible yen rate", { ...response, rates: { JPY: 1, KRW: 1338.58 } }],
    ["not an object", null],
  ])("rejects %s", (_name, value) => {
    expect(parseMarketRates(value)).toBeNull();
  });
});
