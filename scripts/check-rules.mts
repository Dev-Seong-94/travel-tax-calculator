import { findStaleRules } from "../src/rules/freshness.ts";
import { JP_REFUND_RULES } from "../src/rules/jp-refund.ts";

const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);

for (const rule of findStaleRules(JP_REFUND_RULES, today)) {
  console.warn(
    `[rules] ${rule.id} was last verified on ${rule.lastVerified}. Check ${rule.sourceId} again.`,
  );
}
