"use client";

import { useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import {
  calculatorReducer,
  createInitialState,
  deriveSummary,
} from "@/state/calculator";
import { CustomsSummary } from "./CustomsSummary";
import { NetCostSummary } from "./NetCostSummary";
import { RefundSummary } from "./RefundSummary";
import { StoreEditor } from "./StoreEditor";
import { secondaryButtonClass } from "./field-styles";

const subscribeToNothing = () => () => {};

function getLocalToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function Calculator() {
  const [state, dispatch] = useReducer(
    calculatorReducer,
    undefined,
    createInitialState,
  );
  // Static pages have no "today" at build time, so it is read in the browser.
  // It is empty until hydration, when typed input would otherwise be lost.
  const today = useSyncExternalStore(subscribeToNothing, getLocalToday, () => "");
  const isReady = today !== "";
  const summary = deriveSummary(state, today);
  const invalidVolumeItemIds =
    summary.customs.status === "needs-volume"
      ? summary.customs.invalidVolumeItemIds
      : [];

  const storesRef = useRef<HTMLDivElement>(null);
  const addStoreRef = useRef<HTMLButtonElement>(null);
  const previousStoreCount = useRef(state.stores.length);

  useEffect(() => {
    if (state.stores.length > previousStoreCount.current) {
      storesRef.current
        ?.querySelector<HTMLInputElement>("[data-store]:last-child input")
        ?.focus();
    }
    previousStoreCount.current = state.stores.length;
  }, [state.stores.length]);

  return (
    <fieldset
      disabled={!isReady}
      className="mt-6 grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]"
    >
      {!isReady && (
        <p role="status" className="text-sm text-muted lg:col-span-2">
          계산기를 불러오는 중이에요. 입력칸이 계속 잠겨 있으면 페이지를 새로고침해
          주세요.
        </p>
      )}
      <noscript>
        <p className="rounded border border-danger bg-surface p-4 text-sm lg:col-span-2">
          이 계산기를 사용하려면 브라우저에서 JavaScript를 켜 주세요.
        </p>
      </noscript>
      <section aria-labelledby="stores-heading" className="min-w-0">
        <h2 id="stores-heading" className="font-semibold">
          구매 내역
        </h2>
        <p className="mt-1 text-sm text-muted">
          환급 조건은 매장과 구매일별로 따져요. 같은 매장이라도 날짜가 다르면
          매장을 따로 추가해 주세요.
        </p>

        <div ref={storesRef} className="mt-3 space-y-4">
          {state.stores.map((store, index) => (
            <StoreEditor
              key={store.id}
              store={store}
              position={index + 1}
              today={today}
              summary={summary.stores.find(
                ({ storeId }) => storeId === store.id,
              )}
              invalidVolumeItemIds={invalidVolumeItemIds}
              dispatch={dispatch}
              onRemove={() => {
                dispatch({ type: "removeStore", storeId: store.id });
                addStoreRef.current?.focus();
              }}
            />
          ))}
          {state.stores.length === 0 && (
            <p className="rounded border border-border bg-surface p-4 text-sm text-muted">
              아직 매장이 없어요. 매장을 추가해 구매 내역을 입력해 보세요.
            </p>
          )}
        </div>

        <button
          ref={addStoreRef}
          type="button"
          className={`${secondaryButtonClass} mt-4 w-full bg-surface sm:w-auto`}
          onClick={() => dispatch({ type: "addStore" })}
        >
          매장 추가
        </button>
      </section>

      <div className="min-w-0 space-y-4">
        <NetCostSummary summary={summary} />
        <RefundSummary
          summary={summary}
          feeInput={state.feeInput}
          onFeeChange={(feeInput) => dispatch({ type: "setFee", feeInput })}
          rateInputs={state}
          onRateChange={(changes) => dispatch({ type: "setRate", changes })}
          onRateReset={() => dispatch({ type: "resetRates" })}
        />
        <CustomsSummary
          customs={summary.customs}
          usdKrw={summary.rates.usdKrw}
          hasRefundProof={state.hasRefundProof}
          isMinor={state.isMinor}
          onRefundProofChange={(hasRefundProof) =>
            dispatch({ type: "setRefundProof", hasRefundProof })
          }
          onMinorChange={(isMinor) => dispatch({ type: "setMinor", isMinor })}
        />
      </div>
    </fieldset>
  );
}
