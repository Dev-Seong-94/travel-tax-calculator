// Refreshes src/data/rates.json from a market rate API. A failed refresh keeps
// the existing file, because the page shows the date of whatever it has.
import { writeFile } from "node:fs/promises";
import { parseMarketRates } from "../src/domain/exchange-rate.ts";

const API_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW,JPY";
const url = process.argv[2] ?? API_URL;
const output = process.argv[3] ?? "src/data/rates.json";

try {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const rates = parseMarketRates(await response.json());
  if (!rates) throw new Error("unexpected response");

  const data = {
    ...rates,
    sourceLabel: "Frankfurter 시장 환율",
    sourceUrl: "https://frankfurter.dev/",
  };
  await writeFile(output, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`[rates] updated to ${rates.asOf}`);
} catch (error) {
  console.warn(`[rates] kept existing rates: ${String(error)}`);
}
