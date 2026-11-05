import type { CalculatorState, RateInputs, RateSummary } from "@/state/calculator";
import { fieldClass, labelClass } from "./field-styles";

type RateInputProps = {
  rates: RateSummary;
  inputs: Pick<CalculatorState, keyof RateInputs>;
  onChange: (changes: Partial<RateInputs>) => void;
  onReset: () => void;
};

export function RateInput({ rates, inputs, onChange, onReset }: RateInputProps) {
  return (
    <fieldset className="mt-4 border-t border-border pt-3">
      <legend className="float-left w-full font-medium">환율</legend>
      <div className="clear-both grid grid-cols-2 gap-2 pt-2">
        <div>
          <label className={labelClass} htmlFor="rate-jpy">
            100엔당 (원)
          </label>
          <input
            id="rate-jpy"
            className={fieldClass}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={inputs.jpyPer100Input}
            aria-invalid={!rates.jpyValid}
            aria-describedby={rates.valid ? "rate-source" : "rate-error"}
            onChange={(event) =>
              onChange({ jpyPer100Input: event.target.value })
            }
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="rate-usd">
            1달러당 (원)
          </label>
          <input
            id="rate-usd"
            className={fieldClass}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={inputs.usdInput}
            aria-invalid={!rates.usdValid}
            aria-describedby={rates.valid ? "rate-source" : "rate-error"}
            onChange={(event) => onChange({ usdInput: event.target.value })}
          />
        </div>
      </div>

      {!rates.valid && (
        <p id="rate-error" className="mt-2 text-sm text-danger">
          환율은 0보다 큰 숫자로 입력해 주세요. 지금은 기본 환율로 계산했어요.
        </p>
      )}
      <p id="rate-source" className="mt-2 text-sm text-muted">
        {rates.edited ? (
          "직접 입력한 환율로 계산 중이에요."
        ) : (
          <>
            {rates.asOf} 기준{" "}
            <a
              className="underline hover:text-foreground"
              href={rates.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {rates.sourceLabel}
            </a>
          </>
        )}
      </p>
      {rates.stale && (
        <p className="mt-1 text-sm text-danger">
          환율 기준일이 일주일 넘게 지났어요. 최신 환율을 직접 입력해 주세요.
        </p>
      )}
      {rates.edited && (
        <button
          type="button"
          className="mt-1 min-h-11 text-sm text-muted underline hover:text-foreground"
          onClick={onReset}
        >
          기본 환율로 되돌리기
        </button>
      )}
      <p className="mt-2 text-sm text-muted">
        원화 금액은 참고용이에요. 실제 결제액은 카드사 환율, 세금은 통관 시점의
        관세청 과세환율에 따라 달라져요.
      </p>
    </fieldset>
  );
}
