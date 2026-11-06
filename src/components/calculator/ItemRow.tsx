import {
  ITEM_CATEGORIES,
  formatYenInput,
  isVolumeRequired,
  type ItemCategory,
  type ItemDraft,
} from "@/state/calculator";
import { fieldClass, labelClass } from "./field-styles";

type ItemRowProps = {
  item: ItemDraft;
  position: number;
  invalid: boolean;
  invalidVolume: boolean;
  onChange: (
    changes: Partial<Pick<ItemDraft, "priceInput" | "category" | "mlInput">>,
  ) => void;
  onRemove: () => void;
};

export function ItemRow({
  item,
  position,
  invalid,
  invalidVolume,
  onChange,
  onRemove,
}: ItemRowProps) {
  const priceId = `${item.id}-price`;
  const errorId = `${item.id}-error`;

  return (
    <li className="grid grid-cols-[1fr_auto] items-end gap-x-2 gap-y-3 border-t border-border py-3 sm:grid-cols-[1fr_1fr_auto]">
      <div className="col-span-2 sm:col-span-1">
        <label className={labelClass} htmlFor={`${item.id}-category`}>
          품목 {position} 분류
        </label>
        <select
          id={`${item.id}-category`}
          className={fieldClass}
          value={item.category}
          onChange={(event) =>
            onChange({ category: event.target.value as ItemCategory })
          }
        >
          {ITEM_CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor={priceId}>
          품목 {position} 결제 금액 (세금 포함, 엔)
        </label>
        <input
          id={priceId}
          className={fieldClass}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="예: 5,500"
          value={item.priceInput}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => onChange({ priceInput: event.target.value })}
          onBlur={() => onChange({ priceInput: formatYenInput(item.priceInput) })}
        />
      </div>
      <button
        type="button"
        className="min-h-11 rounded px-3 text-sm text-muted underline hover:text-foreground"
        aria-label={`품목 ${position} 삭제`}
        onClick={onRemove}
      >
        삭제
      </button>
      {isVolumeRequired(item.category) && (
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass} htmlFor={`${item.id}-ml`}>
            품목 {position} 총 용량 (ml)
          </label>
          <input
            id={`${item.id}-ml`}
            className={fieldClass}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="예: 750"
            value={item.mlInput}
            aria-invalid={invalidVolume}
            aria-describedby={invalidVolume ? `${item.id}-ml-error` : undefined}
            onChange={(event) => onChange({ mlInput: event.target.value })}
          />
          {invalidVolume && (
            <p id={`${item.id}-ml-error`} className="mt-1 text-sm text-danger">
              용량은 1 이상의 정수로 입력해 주세요.
            </p>
          )}
        </div>
      )}
      {invalid && (
        <p id={errorId} className="col-span-full text-sm text-danger">
          0 이상 10억 엔 미만의 숫자로 입력해 주세요.
        </p>
      )}
    </li>
  );
}
