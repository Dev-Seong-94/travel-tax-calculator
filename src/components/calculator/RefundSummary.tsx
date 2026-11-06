import {
  formatNumber,
  type CalculatorState,
  type CalculatorSummary,
  type RateInputs,
} from "@/state/calculator";
import { RateInput } from "./RateInput";
import { fieldClass, labelClass } from "./field-styles";

const OFFICIAL_GUIDE_URL =
  "https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00021.html";

type RefundSummaryProps = {
  summary: CalculatorSummary;
  feeInput: string;
  onFeeChange: (feeInput: string) => void;
  rateInputs: Pick<CalculatorState, keyof RateInputs>;
  onRateChange: (changes: Partial<RateInputs>) => void;
  onRateReset: () => void;
};

function Won({ value }: { value: number }) {
  return (
    <span className="block text-right text-sm font-normal text-muted">
      약 ₩{formatNumber(value)}
    </span>
  );
}

export function RefundSummary({
  summary,
  feeInput,
  onFeeChange,
  rateInputs,
  onRateChange,
  onRateReset,
}: RefundSummaryProps) {
  const hasFee = summary.totalExpectedRefundYen !== summary.totalMaxRefundYen;

  return (
    <section
      aria-labelledby="refund-summary-heading"
      className="rounded border border-border bg-surface p-4"
    >
      <h2 id="refund-summary-heading" className="font-semibold">
        환급 결과
      </h2>

      <dl className="mt-3 space-y-2" aria-live="polite">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted">총 결제액</dt>
          <dd className="text-right">
            ¥{formatNumber(summary.totalPaidYen)}
            <Won value={summary.totalPaidKrw} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted">환급 조건 충족</dt>
          <dd>{summary.qualifyingStoreCount}곳</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2">
          <dt className="text-sm font-medium">최대 환급액</dt>
          <dd className="text-right text-2xl font-bold text-accent">
            ¥{formatNumber(summary.totalMaxRefundYen)}
            <Won value={summary.totalMaxRefundKrw} />
          </dd>
        </div>
        {hasFee && (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm font-medium">수수료 뺀 예상 환급액</dt>
            <dd className="text-right font-semibold">
              ¥{formatNumber(summary.totalExpectedRefundYen)}
              <Won value={summary.totalExpectedRefundKrw} />
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4">
        <label className={labelClass} htmlFor="refund-fee">
          환급 수수료 (%, 선택)
        </label>
        <input
          id="refund-fee"
          className={fieldClass}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="매장 안내를 확인해 입력"
          value={feeInput}
          aria-invalid={!summary.feeValid}
          aria-describedby={summary.feeValid ? undefined : "refund-fee-error"}
          onChange={(event) => onFeeChange(event.target.value)}
        />
        {!summary.feeValid && (
          <p id="refund-fee-error" className="mt-1 text-sm text-danger">
            0부터 100 사이의 숫자로 입력해 주세요. 지금은 수수료 없이 계산했어요.
          </p>
        )}
      </div>

      <RateInput
        rates={summary.rates}
        inputs={rateInputs}
        onChange={onRateChange}
        onReset={onRateReset}
      />

      <div className="mt-4 space-y-2 text-sm text-muted">
        <p>
          예상치입니다. 수수료와 환급 수단은 매장마다 다르고, 금액은 영수증과
          조금 다를 수 있어요.
        </p>
        <p>
          위탁 수하물을 맡기기 전에 물품을 모두 가지고 세관 확인을 받아야
          환급받을 수 있어요.{" "}
          <a
            className="underline hover:text-foreground"
            href={OFFICIAL_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
          >
            일본 관광청 안내
          </a>
        </p>
      </div>
    </section>
  );
}
