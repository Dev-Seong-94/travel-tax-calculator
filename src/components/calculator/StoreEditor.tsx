import { useEffect, useRef } from "react";
import { JP_REFUND_SCHEME_START } from "@/rules/jp-refund";
import type {
  CalculatorAction,
  StoreDraft,
  StoreSummary,
} from "@/state/calculator";
import { ItemRow } from "./ItemRow";
import { StoreStatus } from "./StoreStatus";
import { fieldClass, labelClass, secondaryButtonClass } from "./field-styles";

type StoreEditorProps = {
  store: StoreDraft;
  position: number;
  today: string;
  summary?: StoreSummary;
  dispatch: (action: CalculatorAction) => void;
  onRemove: () => void;
};

export function StoreEditor({
  store,
  position,
  today,
  summary,
  dispatch,
  onRemove,
}: StoreEditorProps) {
  const headingId = `${store.id}-heading`;
  const listRef = useRef<HTMLUListElement>(null);
  const addItemRef = useRef<HTMLButtonElement>(null);
  const previousItemCount = useRef(store.items.length);

  useEffect(() => {
    if (store.items.length > previousItemCount.current) {
      listRef.current
        ?.querySelector<HTMLInputElement>("li:last-child input")
        ?.focus();
    }
    previousItemCount.current = store.items.length;
  }, [store.items.length]);

  const invalidItemIds =
    summary?.status === "invalid-price" ? summary.invalidItemIds : [];

  return (
    <section
      aria-labelledby={headingId}
      data-store
      className="rounded border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={headingId} className="font-semibold">
          매장 {position}
        </h3>
        <button
          type="button"
          className="min-h-11 rounded px-3 text-sm text-muted underline hover:text-foreground"
          aria-label={`매장 ${position} 삭제`}
          onClick={onRemove}
        >
          매장 삭제
        </button>
      </div>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor={`${store.id}-name`}>
            매장 이름 (선택)
          </label>
          <input
            id={`${store.id}-name`}
            className={fieldClass}
            type="text"
            autoComplete="off"
            placeholder="예: 돈키호테 신주쿠점"
            value={store.name}
            onChange={(event) =>
              dispatch({
                type: "updateStore",
                storeId: store.id,
                changes: { name: event.target.value },
              })
            }
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${store.id}-date`}>
            구매일
          </label>
          <input
            id={`${store.id}-date`}
            className={fieldClass}
            type="date"
            min={JP_REFUND_SCHEME_START}
            value={store.purchaseDate || today}
            onChange={(event) =>
              dispatch({
                type: "updateStore",
                storeId: store.id,
                changes: { purchaseDate: event.target.value },
              })
            }
          />
        </div>
      </div>

      {store.items.length > 0 ? (
        <ul ref={listRef} className="mt-4">
          {store.items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              position={index + 1}
              invalid={invalidItemIds.includes(item.id)}
              onChange={(changes) =>
                dispatch({
                  type: "updateItem",
                  storeId: store.id,
                  itemId: item.id,
                  changes,
                })
              }
              onRemove={() => {
                dispatch({
                  type: "removeItem",
                  storeId: store.id,
                  itemId: item.id,
                });
                addItemRef.current?.focus();
              }}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-t border-border pt-3 text-sm text-muted">
          아직 품목이 없어요.
        </p>
      )}

      <button
        ref={addItemRef}
        type="button"
        className={`${secondaryButtonClass} mt-1 w-full sm:w-auto`}
        onClick={() => dispatch({ type: "addItem", storeId: store.id })}
      >
        품목 추가
      </button>

      <div className="mt-4 border-t border-border pt-3" aria-live="polite">
        <StoreStatus summary={summary} />
      </div>
    </section>
  );
}
