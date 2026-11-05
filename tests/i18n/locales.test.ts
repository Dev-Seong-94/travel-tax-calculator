import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "@/i18n/locales";

describe("isLocale", () => {
  it("accepts supported locales", () => {
    expect(isLocale("ko")).toBe(true);
  });

  it("rejects unsupported locales", () => {
    expect(isLocale("en")).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("includes the default locale", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });
});
