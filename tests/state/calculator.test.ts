import { describe, expect, it } from "vitest";
import {
  calculatorReducer,
  createInitialState,
  deriveSummary,
  formatYenInput,
  parseYenInput,
} from "@/state/calculator";

const TODAY = "2026-11-05";

function stateWithItem(
  priceInput: string,
  category: "other" | "food" = "other",
  purchaseDate = "",
) {
  const initial = createInitialState();
  const store = initial.stores[0];
  const withDate = calculatorReducer(initial, {
    type: "updateStore",
    storeId: store.id,
    changes: { purchaseDate },
  });
  return calculatorReducer(withDate, {
    type: "updateItem",
    storeId: store.id,
    itemId: store.items[0].id,
    changes: { priceInput, category },
  });
}

describe("parseYenInput", () => {
  it("accepts commas and surrounding spaces", () => {
    expect(parseYenInput(" 12,000 ")).toEqual({ status: "valid", yen: 12000 });
  });

  it("treats a blank value as empty", () => {
    expect(parseYenInput("  ")).toEqual({ status: "empty" });
  });

  it.each(["-1", "1.5", "abc", "1000000000"])("rejects %s", (input) => {
    expect(parseYenInput(input)).toEqual({ status: "invalid" });
  });
});

describe("formatYenInput", () => {
  it("adds thousands separators to a valid price", () => {
    expect(formatYenInput("12000")).toBe("12,000");
  });

  it("leaves an invalid price for the user to fix", () => {
    expect(formatYenInput("12a")).toBe("12a");
  });
});

describe("calculatorReducer", () => {
  it("starts with one store and one item", () => {
    const state = createInitialState();

    expect(state.stores).toHaveLength(1);
    expect(state.stores[0].items).toHaveLength(1);
  });

  it("adds stores and items with unique ids", () => {
    let state = createInitialState();
    state = calculatorReducer(state, { type: "addStore" });
    state = calculatorReducer(state, {
      type: "addItem",
      storeId: state.stores[1].id,
    });

    const ids = state.stores.flatMap((store) => [
      store.id,
      ...store.items.map(({ id }) => id),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(state.stores[1].items).toHaveLength(2);
  });

  it("removes an item", () => {
    const initial = createInitialState();
    const store = initial.stores[0];

    const state = calculatorReducer(initial, {
      type: "removeItem",
      storeId: store.id,
      itemId: store.items[0].id,
    });

    expect(state.stores[0].items).toEqual([]);
  });

  it("removes a store", () => {
    const initial = createInitialState();

    const state = calculatorReducer(initial, {
      type: "removeStore",
      storeId: initial.stores[0].id,
    });

    expect(state.stores).toEqual([]);
  });
});

describe("deriveSummary", () => {
  it("uses today when no purchase date is entered", () => {
    const summary = deriveSummary(stateWithItem("5500"), TODAY);

    expect(summary.stores[0]).toMatchObject({
      status: "calculated",
      purchaseDate: TODAY,
      refund: { meetsMinimum: true, maxRefundYen: 500 },
    });
  });

  it("waits for a date until today is known", () => {
    const summary = deriveSummary(stateWithItem("5500"), "");

    expect(summary.stores[0].status).toBe("needs-date");
  });

  it("treats a store without prices as empty", () => {
    const summary = deriveSummary(createInitialState(), TODAY);

    expect(summary.stores[0].status).toBe("empty");
  });

  it("uses the 8% rate for food", () => {
    const summary = deriveSummary(stateWithItem("5400", "food"), TODAY);

    expect(summary.stores[0]).toMatchObject({
      refund: { maxRefundYen: 400 },
    });
  });

  it("uses the 1% food rate from 2027-04-01", () => {
    const summary = deriveSummary(
      stateWithItem("5050", "food", "2027-04-01"),
      TODAY,
    );

    expect(summary.stores[0]).toMatchObject({
      refund: { maxRefundYen: 50 },
    });
  });

  it("flags an invalid price and leaves it out of the totals", () => {
    const summary = deriveSummary(stateWithItem("abc"), TODAY);

    expect(summary.stores[0].status).toBe("invalid-price");
    expect(summary.totalPaidYen).toBe(0);
  });

  it("flags purchases before the refund scheme started", () => {
    const summary = deriveSummary(
      stateWithItem("5500", "other", "2026-10-31"),
      TODAY,
    );

    expect(summary.stores[0].status).toBe("before-refund-scheme");
  });

  it("flags food purchases after the confirmed tax period", () => {
    const summary = deriveSummary(
      stateWithItem("5500", "food", "2029-04-01"),
      TODAY,
    );

    expect(summary.stores[0].status).toBe("tax-rate-unknown");
  });

  it("adds totals across stores and applies the fee", () => {
    let state = stateWithItem("11000");
    state = calculatorReducer(state, { type: "addStore" });
    const second = state.stores[1];
    state = calculatorReducer(state, {
      type: "updateItem",
      storeId: second.id,
      itemId: second.items[0].id,
      changes: { priceInput: "1100" },
    });
    state = calculatorReducer(state, { type: "setFee", feeInput: "10" });

    const summary = deriveSummary(state, TODAY);

    expect(summary).toMatchObject({
      feeValid: true,
      totalPaidYen: 12100,
      totalMaxRefundYen: 1000,
      totalExpectedRefundYen: 900,
      qualifyingStoreCount: 1,
    });
  });

  it.each(["101", "-1", "abc"])("ignores an invalid fee of %s", (feeInput) => {
    const state = calculatorReducer(stateWithItem("11000"), {
      type: "setFee",
      feeInput,
    });

    const summary = deriveSummary(state, TODAY);

    expect(summary.feeValid).toBe(false);
    expect(summary.totalExpectedRefundYen).toBe(1000);
  });
});

describe("exchange rates", () => {
  it("starts from the bundled rates and converts totals to won", () => {
    const summary = deriveSummary(stateWithItem("5500"), TODAY);

    expect(summary.rates).toMatchObject({
      valid: true,
      edited: false,
      jpyKrw: 8.4305,
      usdKrw: 1328.56,
    });
    expect(summary.totalPaidKrw).toBe(46368);
    expect(summary.totalMaxRefundKrw).toBe(4215);
    expect(summary.totalExpectedRefundKrw).toBe(4215);
  });

  it("uses an edited rate per 100 yen", () => {
    const state = calculatorReducer(stateWithItem("5500"), {
      type: "setRate",
      changes: { jpyPer100Input: "900" },
    });

    const summary = deriveSummary(state, TODAY);

    expect(summary.rates).toMatchObject({ edited: true, jpyKrw: 9 });
    expect(summary.totalPaidKrw).toBe(49500);
  });

  it("falls back to the bundled rate when an edit is invalid", () => {
    const state = calculatorReducer(stateWithItem("5500"), {
      type: "setRate",
      changes: { usdInput: "abc" },
    });

    const summary = deriveSummary(state, TODAY);

    expect(summary.rates).toMatchObject({ valid: false, usdKrw: 1328.56 });
  });

  it("restores the bundled rates", () => {
    let state = calculatorReducer(stateWithItem("5500"), {
      type: "setRate",
      changes: { jpyPer100Input: "900", usdInput: "1500" },
    });
    state = calculatorReducer(state, { type: "resetRates" });

    expect(deriveSummary(state, TODAY).rates).toMatchObject({
      edited: false,
      jpyKrw: 8.4305,
    });
  });

  it("flags a stale bundled rate", () => {
    const summary = deriveSummary(stateWithItem("5500"), "2027-01-01");

    expect(summary.rates.stale).toBe(true);
  });
});
