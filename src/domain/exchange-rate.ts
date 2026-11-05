const MS_PER_DAY = 86_400_000;
const MAX_RATE_AGE_DAYS = 7;
const USD_KRW_RANGE = [500, 5000];
const JPY_KRW_RANGE = [3, 30];

export type MarketRates = {
  asOf: string;
  usdKrw: number;
  jpyKrw: number;
};

export function yenToKrw(yen: number, jpyKrw: number): number {
  return Math.round(yen * jpyKrw);
}

export function parseRateInput(input: string): number | null {
  const normalized = input.replace(/[,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const rate = Number(normalized);
  return rate > 0 ? rate : null;
}

export function isRateStale(asOf: string, today: string): boolean {
  if (today === "") return false;
  return (Date.parse(today) - Date.parse(asOf)) / MS_PER_DAY > MAX_RATE_AGE_DAYS;
}

function inRange(value: number, [min, max]: number[]): boolean {
  return value >= min && value <= max;
}

/** Reads a dollar-based response from the market rate API. */
export function parseMarketRates(response: unknown): MarketRates | null {
  if (typeof response !== "object" || response === null) return null;
  const { base, date, rates } = response as {
    base?: unknown;
    date?: unknown;
    rates?: { JPY?: unknown; KRW?: unknown };
  };

  if (base !== "USD") return null;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const usdKrw = rates?.KRW;
  const usdJpy = rates?.JPY;
  if (typeof usdKrw !== "number" || typeof usdJpy !== "number") return null;

  const jpyKrw = Math.round((usdKrw / usdJpy) * 10_000) / 10_000;
  if (!inRange(usdKrw, USD_KRW_RANGE) || !inRange(jpyKrw, JPY_KRW_RANGE)) {
    return null;
  }
  return { asOf: date, usdKrw, jpyKrw };
}
