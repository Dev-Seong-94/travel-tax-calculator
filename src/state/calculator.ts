import bundledRates from "@/data/rates.json";
import {
  isRateStale,
  parseRateInput,
  yenToKrw,
} from "@/domain/exchange-rate";
import {
  calculatePurchaseRefund,
  jpTaxRatePercent,
  type JpRefundResult,
  type JpTaxClass,
} from "@/domain/jp-refund";
import type { KrGoodsCategory } from "@/domain/kr-customs";
import { JP_REFUND_SCHEME_START } from "@/rules/jp-refund";
import type { IsoDate } from "@/rules/types";

export type ItemCategory = KrGoodsCategory | "alcohol" | "perfume";

export const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: "clothing", label: "의류·섬유제품" },
  { value: "shoes", label: "신발" },
  { value: "bag", label: "가방·지갑" },
  { value: "watch", label: "시계" },
  { value: "jewelry", label: "보석·귀금속" },
  { value: "fur", label: "모피 제품" },
  { value: "accessory", label: "액세서리" },
  { value: "sunglasses", label: "선글라스" },
  { value: "cosmetics", label: "화장품" },
  { value: "perfume", label: "향수" },
  { value: "food", label: "식품·건강식품" },
  { value: "alcohol", label: "주류" },
  { value: "electronics", label: "스마트폰·컴퓨터" },
  { value: "other", label: "그 외" },
];

export type ItemDraft = {
  id: string;
  priceInput: string;
  category: ItemCategory;
};

export type StoreDraft = {
  id: string;
  name: string;
  /** Empty means today. */
  purchaseDate: IsoDate;
  items: ItemDraft[];
};

export type CalculatorState = {
  nextId: number;
  feeInput: string;
  jpyPer100Input: string;
  usdInput: string;
  stores: StoreDraft[];
};

export type RateInputs = Pick<CalculatorState, "jpyPer100Input" | "usdInput">;

export type CalculatorAction =
  | { type: "addStore" }
  | { type: "removeStore"; storeId: string }
  | {
      type: "updateStore";
      storeId: string;
      changes: Partial<Pick<StoreDraft, "name" | "purchaseDate">>;
    }
  | { type: "addItem"; storeId: string }
  | { type: "removeItem"; storeId: string; itemId: string }
  | {
      type: "updateItem";
      storeId: string;
      itemId: string;
      changes: Partial<Pick<ItemDraft, "priceInput" | "category">>;
    }
  | { type: "setFee"; feeInput: string }
  | { type: "setRate"; changes: Partial<RateInputs> }
  | { type: "resetRates" };

const MAX_PRICE_YEN = 999_999_999;

type ParsedYen =
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "valid"; yen: number };

export function parseYenInput(input: string): ParsedYen {
  const normalized = input.replace(/[,\s]/g, "");
  if (normalized === "") return { status: "empty" };
  if (!/^\d+$/.test(normalized)) return { status: "invalid" };

  const yen = Number(normalized);
  return yen <= MAX_PRICE_YEN ? { status: "valid", yen } : { status: "invalid" };
}

const numberFormat = new Intl.NumberFormat("ko-KR");

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatYenInput(input: string): string {
  const parsed = parseYenInput(input);
  return parsed.status === "valid" ? formatNumber(parsed.yen) : input;
}

function createItem(id: number): ItemDraft {
  return { id: `item-${id}`, priceInput: "", category: "other" };
}

function createStore(storeId: number, itemId: number): StoreDraft {
  return {
    id: `store-${storeId}`,
    name: "",
    purchaseDate: "",
    items: [createItem(itemId)],
  };
}

const DEFAULT_RATE_INPUTS: RateInputs = {
  jpyPer100Input: String(Math.round(bundledRates.jpyKrw * 10_000) / 100),
  usdInput: String(bundledRates.usdKrw),
};

export function createInitialState(): CalculatorState {
  return {
    nextId: 3,
    feeInput: "",
    ...DEFAULT_RATE_INPUTS,
    stores: [createStore(1, 2)],
  };
}

function updateStore(
  state: CalculatorState,
  storeId: string,
  update: (store: StoreDraft) => StoreDraft,
): StoreDraft[] {
  return state.stores.map((store) =>
    store.id === storeId ? update(store) : store,
  );
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case "addStore":
      return {
        ...state,
        nextId: state.nextId + 2,
        stores: [...state.stores, createStore(state.nextId, state.nextId + 1)],
      };
    case "removeStore":
      return {
        ...state,
        stores: state.stores.filter(({ id }) => id !== action.storeId),
      };
    case "updateStore":
      return {
        ...state,
        stores: updateStore(state, action.storeId, (store) => ({
          ...store,
          ...action.changes,
        })),
      };
    case "addItem":
      return {
        ...state,
        nextId: state.nextId + 1,
        stores: updateStore(state, action.storeId, (store) => ({
          ...store,
          items: [...store.items, createItem(state.nextId)],
        })),
      };
    case "removeItem":
      return {
        ...state,
        stores: updateStore(state, action.storeId, (store) => ({
          ...store,
          items: store.items.filter(({ id }) => id !== action.itemId),
        })),
      };
    case "updateItem":
      return {
        ...state,
        stores: updateStore(state, action.storeId, (store) => ({
          ...store,
          items: store.items.map((item) =>
            item.id === action.itemId ? { ...item, ...action.changes } : item,
          ),
        })),
      };
    case "setFee":
      return { ...state, feeInput: action.feeInput };
    case "setRate":
      return { ...state, ...action.changes };
    case "resetRates":
      return { ...state, ...DEFAULT_RATE_INPUTS };
  }
}

function jpTaxClass(category: ItemCategory): JpTaxClass {
  return category === "food" ? "reduced" : "standard";
}

type StoreBase = { storeId: string; purchaseDate: IsoDate };

export type StoreSummary = StoreBase &
  (
    | { status: "empty" | "needs-date" | "before-refund-scheme" | "tax-rate-unknown" }
    | { status: "invalid-price"; invalidItemIds: string[] }
    | { status: "calculated"; paidYen: number; refund: JpRefundResult }
  );

export type RateSummary = {
  jpyKrw: number;
  usdKrw: number;
  jpyValid: boolean;
  usdValid: boolean;
  valid: boolean;
  edited: boolean;
  stale: boolean;
  asOf: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type CalculatorSummary = {
  feeValid: boolean;
  rates: RateSummary;
  stores: StoreSummary[];
  totalPaidYen: number;
  totalMaxRefundYen: number;
  totalExpectedRefundYen: number;
  totalPaidKrw: number;
  totalMaxRefundKrw: number;
  totalExpectedRefundKrw: number;
  qualifyingStoreCount: number;
};

function hasConfirmedRates(items: { taxClass: JpTaxClass }[], date: IsoDate) {
  try {
    items.forEach(({ taxClass }) => jpTaxRatePercent(taxClass, date));
    return true;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

function summarizeStore(
  store: StoreDraft,
  today: IsoDate,
  feePercent: number,
): StoreSummary {
  const purchaseDate = store.purchaseDate || today;
  const base = { storeId: store.id, purchaseDate };

  const parsed = store.items.map((item) => ({
    item,
    price: parseYenInput(item.priceInput),
  }));
  const invalidItemIds = parsed
    .filter(({ price }) => price.status === "invalid")
    .map(({ item }) => item.id);
  if (invalidItemIds.length > 0) {
    return { ...base, status: "invalid-price", invalidItemIds };
  }

  const items = parsed.flatMap(({ item, price }) =>
    price.status === "valid"
      ? [{ priceIncTaxYen: price.yen, taxClass: jpTaxClass(item.category) }]
      : [],
  );
  if (items.length === 0) return { ...base, status: "empty" };
  if (purchaseDate === "") return { ...base, status: "needs-date" };
  if (purchaseDate < JP_REFUND_SCHEME_START) {
    return { ...base, status: "before-refund-scheme" };
  }
  if (!hasConfirmedRates(items, purchaseDate)) {
    return { ...base, status: "tax-rate-unknown" };
  }

  return {
    ...base,
    status: "calculated",
    paidYen: items.reduce((total, item) => total + item.priceIncTaxYen, 0),
    refund: calculatePurchaseRefund({ purchaseDate, items }, { feePercent }),
  };
}

function parseFeePercent(input: string): number | null {
  const normalized = input.trim();
  if (normalized === "") return 0;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const percent = Number(normalized);
  return percent <= 100 ? percent : null;
}

function summarizeRates(state: CalculatorState, today: IsoDate): RateSummary {
  const jpyPer100 = parseRateInput(state.jpyPer100Input);
  const usdKrw = parseRateInput(state.usdInput);
  const edited =
    state.jpyPer100Input !== DEFAULT_RATE_INPUTS.jpyPer100Input ||
    state.usdInput !== DEFAULT_RATE_INPUTS.usdInput;
  const jpyEdited = state.jpyPer100Input !== DEFAULT_RATE_INPUTS.jpyPer100Input;

  return {
    jpyKrw:
      jpyEdited && jpyPer100 !== null ? jpyPer100 / 100 : bundledRates.jpyKrw,
    usdKrw: usdKrw ?? bundledRates.usdKrw,
    jpyValid: jpyPer100 !== null,
    usdValid: usdKrw !== null,
    valid: jpyPer100 !== null && usdKrw !== null,
    edited,
    stale: !edited && isRateStale(bundledRates.asOf, today),
    asOf: bundledRates.asOf,
    sourceLabel: bundledRates.sourceLabel,
    sourceUrl: bundledRates.sourceUrl,
  };
}

export function deriveSummary(
  state: CalculatorState,
  today: IsoDate,
): CalculatorSummary {
  const feePercent = parseFeePercent(state.feeInput);
  const stores = state.stores.map((store) =>
    summarizeStore(store, today, feePercent ?? 0),
  );

  const summary: CalculatorSummary = {
    feeValid: feePercent !== null,
    rates: summarizeRates(state, today),
    stores,
    totalPaidYen: 0,
    totalMaxRefundYen: 0,
    totalExpectedRefundYen: 0,
    totalPaidKrw: 0,
    totalMaxRefundKrw: 0,
    totalExpectedRefundKrw: 0,
    qualifyingStoreCount: 0,
  };
  for (const store of stores) {
    if (store.status !== "calculated") continue;
    summary.totalPaidYen += store.paidYen;
    summary.totalMaxRefundYen += store.refund.maxRefundYen;
    summary.totalExpectedRefundYen += store.refund.expectedRefundYen;
    if (store.refund.meetsMinimum) summary.qualifyingStoreCount += 1;
  }

  const { jpyKrw } = summary.rates;
  summary.totalPaidKrw = yenToKrw(summary.totalPaidYen, jpyKrw);
  summary.totalMaxRefundKrw = yenToKrw(summary.totalMaxRefundYen, jpyKrw);
  summary.totalExpectedRefundKrw = yenToKrw(
    summary.totalExpectedRefundYen,
    jpyKrw,
  );
  return summary;
}
