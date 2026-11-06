import { describe, expect, it } from "vitest";
import {
  calculatorReducer,
  createInitialState,
  deriveSummary,
  type CalculatorState,
  type ItemCategory,
} from "@/state/calculator";

const TODAY = "2026-11-05";

type ItemSpec = { priceInput: string; category: ItemCategory; mlInput?: string };

function stateWith(items: ItemSpec[]): CalculatorState {
  let state = createInitialState();
  const storeId = state.stores[0].id;
  items.forEach((_, index) => {
    if (index > 0) state = calculatorReducer(state, { type: "addItem", storeId });
  });
  state.stores[0].items.forEach((item, index) => {
    state = calculatorReducer(state, {
      type: "updateItem",
      storeId,
      itemId: item.id,
      changes: items[index],
    });
  });
  return state;
}

describe("customs summary", () => {
  it("is empty before any price is entered", () => {
    const summary = deriveSummary(createInitialState(), TODAY);

    expect(summary.customs.status).toBe("empty");
    expect(summary.netCostKrw).toBeNull();
  });

  it("is tax free within the limit and subtracts the refund", () => {
    const summary = deriveSummary(
      stateWith([{ priceInput: "5500", category: "other" }]),
      TODAY,
    );

    expect(summary.customs).toMatchObject({
      status: "ready",
      result: {
        exemptionLimitKrw: 1_062_848,
        generalTotalKrw: 46_368,
        withinLimit: true,
        tax: { status: "calculated", declaredKrw: 0 },
      },
    });
    expect(summary.netCostKrw).toBe(42_153);
  });

  it("adds the declared tax to the net cost without refund proof", () => {
    const summary = deriveSummary(
      stateWith([{ priceInput: "150000", category: "clothing" }]),
      TODAY,
    );

    expect(summary.customs).toMatchObject({
      status: "ready",
      dependsOnRefundProof: true,
      result: {
        generalTotalKrw: 1_264_575,
        overLimitKrw: 201_727,
        tax: { declaredKrw: 25_410 },
      },
    });
    expect(summary.netCostKrw).toBe(1_175_027);
  });

  it("subtracts item refunds from the taxable value with refund proof", () => {
    const state = calculatorReducer(
      stateWith([{ priceInput: "150000", category: "clothing" }]),
      { type: "setRefundProof", hasRefundProof: true },
    );

    const summary = deriveSummary(state, TODAY);

    expect(summary.customs).toMatchObject({
      result: {
        generalTotalKrw: 1_149_617,
        tax: { declaredKrw: 10_930 },
      },
    });
    expect(summary.netCostKrw).toBe(1_160_547);
  });

  it("reduces the provable refund by the fee", () => {
    let state = stateWith([{ priceInput: "150000", category: "clothing" }]);
    state = calculatorReducer(state, { type: "setRefundProof", hasRefundProof: true });
    state = calculatorReducer(state, { type: "setFee", feeInput: "10" });

    const summary = deriveSummary(state, TODAY);

    expect(summary.customs).toMatchObject({
      result: { generalTotalKrw: 1_161_116 },
    });
  });

  it("gives no refund credit to a store below the minimum", () => {
    const state = calculatorReducer(
      stateWith([{ priceInput: "5000", category: "clothing" }]),
      { type: "setRefundProof", hasRefundProof: true },
    );

    const summary = deriveSummary(state, TODAY);

    expect(summary.customs).toMatchObject({
      result: { generalTotalKrw: 42_153 },
    });
  });

  it("asks for a volume before calculating perfume", () => {
    const summary = deriveSummary(
      stateWith([{ priceInput: "10000", category: "perfume" }]),
      TODAY,
    );

    expect(summary.customs.status).toBe("needs-volume");
    expect(summary.netCostKrw).toBeNull();
  });

  it.each(["0", "abc", "1.5"])("flags a volume of %s", (mlInput) => {
    const state = stateWith([
      { priceInput: "10000", category: "alcohol", mlInput },
    ]);

    const summary = deriveSummary(state, TODAY);

    expect(summary.customs).toMatchObject({
      status: "needs-volume",
      invalidVolumeItemIds: [state.stores[0].items[0].id],
    });
  });

  it("keeps perfume out of the 800 dollar total", () => {
    const summary = deriveSummary(
      stateWith([{ priceInput: "10000", category: "perfume", mlInput: "50" }]),
      TODAY,
    );

    expect(summary.customs).toMatchObject({
      result: {
        generalTotalKrw: 0,
        perfumeExemptMl: 50,
        tax: { declaredKrw: 0 },
      },
    });
  });

  it("leaves the net cost open when alcohol exceeds the exemption", () => {
    const summary = deriveSummary(
      stateWith([{ priceInput: "10000", category: "alcohol", mlInput: "3000" }]),
      TODAY,
    );

    expect(summary.customs).toMatchObject({
      result: {
        tax: { status: "unsupported", reasons: ["alcohol-over-limit"] },
      },
    });
    expect(summary.netCostKrw).toBeNull();
    expect(summary.netCostBeforeTaxKrw).toBe(76_642);
  });

  it("removes the alcohol exemption for minors", () => {
    const state = calculatorReducer(
      stateWith([{ priceInput: "5000", category: "alcohol", mlInput: "500" }]),
      { type: "setMinor", isMinor: true },
    );

    expect(deriveSummary(state, TODAY).customs).toMatchObject({
      result: {
        tax: { status: "unsupported", reasons: ["minor-alcohol"] },
      },
    });
  });

  it("marks a bag above the simplified ceiling as unsupported", () => {
    const summary = deriveSummary(
      stateWith([{ priceInput: "300000", category: "bag" }]),
      TODAY,
    );

    expect(summary.customs).toMatchObject({
      result: {
        tax: {
          status: "unsupported",
          reasons: ["price-above-simplified-rate"],
        },
      },
    });
  });

  it("counts stores left out of the calculation", () => {
    let state = stateWith([{ priceInput: "5500", category: "other" }]);
    state = calculatorReducer(state, { type: "addStore" });
    const second = state.stores[1];
    state = calculatorReducer(state, {
      type: "updateItem",
      storeId: second.id,
      itemId: second.items[0].id,
      changes: { priceInput: "abc" },
    });

    expect(deriveSummary(state, TODAY).customs).toMatchObject({
      status: "ready",
      excludedStoreCount: 1,
    });
  });

  it("reports food so the agricultural limit can be explained", () => {
    const summary = deriveSummary(
      stateWith([{ priceInput: "5400", category: "food" }]),
      TODAY,
    );

    expect(summary.customs).toMatchObject({ hasFood: true });
  });

  it("uses an edited dollar rate for the limit", () => {
    const state = calculatorReducer(
      stateWith([{ priceInput: "5500", category: "other" }]),
      { type: "setRate", changes: { usdInput: "1500" } },
    );

    expect(deriveSummary(state, TODAY).customs).toMatchObject({
      result: { exemptionLimitKrw: 1_200_000 },
    });
  });
});
