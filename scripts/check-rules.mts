import { findStaleRules } from "../src/rules/freshness.ts";
import { JP_REFUND_RULES } from "../src/rules/jp-refund.ts";
import { KR_CUSTOMS_RULES } from "../src/rules/kr-customs.ts";

const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);

for (const rule of findStaleRules<unknown>([...JP_REFUND_RULES, ...KR_CUSTOMS_RULES], today)) {
  console.warn(
    `[rules] ${rule.id} was last verified on ${rule.lastVerified}. Check ${rule.sourceId} again.`,
  );
}
