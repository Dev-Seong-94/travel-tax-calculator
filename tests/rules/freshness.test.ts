import { describe, expect, it } from "vitest";
import { findStaleRules } from "@/rules/freshness";
import { JP_REFUND_RULES } from "@/rules/jp-refund";
import { KR_CUSTOMS_RULES } from "@/rules/kr-customs";

const rule = {
  id: "example",
  value: 1,
  unit: "JPY",
  effectiveFrom: "2026-11-01",
  sourceId: "S1",
  lastVerified: "2026-11-05",
};

describe("findStaleRules", () => {
  it("keeps a rule verified exactly 90 days ago", () => {
    expect(findStaleRules([rule], "2027-02-03")).toEqual([]);
  });

  it("flags a rule verified more than 90 days ago", () => {
    expect(findStaleRules([rule], "2027-02-04")).toEqual([rule]);
  });
});

describe("rule data", () => {
  it("records a source and verification date for every rule", () => {
    for (const item of [...JP_REFUND_RULES, ...KR_CUSTOMS_RULES]) {
      expect(item.sourceId, item.id).toMatch(/^S\d+$/);
      expect(item.lastVerified, item.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
