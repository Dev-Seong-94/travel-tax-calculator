import type { IsoDate, Rule } from "./types";

const MS_PER_DAY = 86_400_000;
const MAX_AGE_DAYS = 90;

export function findStaleRules<T>(rules: Rule<T>[], today: IsoDate): Rule<T>[] {
  const todayMs = Date.parse(today);
  return rules.filter(
    (rule) =>
      (todayMs - Date.parse(rule.lastVerified)) / MS_PER_DAY > MAX_AGE_DAYS,
  );
}
