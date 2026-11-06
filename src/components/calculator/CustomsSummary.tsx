import type { KrCustomsResult, KrUnsupportedReason } from "@/domain/kr-customs";
import { KR_BASE_EXEMPTION_USD, KR_PERFUME_MAX_ML } from "@/rules/kr-customs";
import { formatNumber, type CustomsSummary as Customs } from "@/state/calculator";

const CUSTOMS_CALCULATOR_URL =
  "https://www.customs.go.kr/kcs/ad/tax/ItemTaxCalculation.do";

const UNSUPPORTED_MESSAGES: Record<KrUnsupportedReason, string> = {
  "price-above-simplified-rate":
    "고가 가방·시계·귀금속 등은 세금 계산 방식이 달라 여기서 계산하지 않아요.",
  "alcohol-over-limit":
    "주류가 면세 범위(합계 2L 이하, 미화 400달러 이하)를 넘어 여기서 세금을 계산하지 않아요.",
  "minor-alcohol": "만 19세 미만은 주류 면세가 적용되지 않아요.",
};

type CustomsSummaryProps = {
  customs: Customs;
  usdKrw: number;
  hasRefundProof: boolean;
  isMinor: boolean;
  onRefundProofChange: (value: boolean) => void;
  onMinorChange: (value: boolean) => void;
};

function OfficialLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      className="underline hover:text-foreground"
      href={CUSTOMS_CALCULATOR_URL}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

function LimitUsage({ result }: { result: KrCustomsResult }) {
  const percent = Math.min(
    (result.generalTotalKrw / result.exemptionLimitKrw) * 100,
    100,
  );

  return (
    <div className="mt-3">
      <p className="text-sm">
        {KR_BASE_EXEMPTION_USD.value}달러 한도 사용:{" "}
        <strong className="font-semibold">
          ₩{formatNumber(result.generalTotalKrw)}
        </strong>{" "}
        / ₩{formatNumber(result.exemptionLimitKrw)}
      </p>
      <div aria-hidden className="mt-1 h-2 rounded bg-border">
        <div
          className={`h-2 rounded ${result.withinLimit ? "bg-accent" : "bg-danger"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-sm">
        {result.withinLimit ? (
          "✓ 면세 한도 안이에요."
        ) : (
          <strong className="font-semibold text-danger">
            ! 한도를 ₩{formatNumber(result.overLimitKrw)} 넘었어요.
          </strong>
        )}
      </p>
    </div>
  );
}

function TaxResult({ tax }: { tax: KrCustomsResult["tax"] }) {
  if (tax.status === "unsupported") {
    return (
      <div className="mt-3 space-y-1 text-sm">
        {tax.reasons.map((reason) => (
          <p key={reason}>{UNSUPPORTED_MESSAGES[reason]}</p>
        ))}
        <p>
          세금은 <OfficialLink>관세청 예상세액 조회</OfficialLink>에서 확인해
          주세요.
        </p>
      </div>
    );
  }

  if (tax.undeclaredKrw === 0) {
    return <p className="mt-3 text-sm">예상 세금은 없어요.</p>;
  }

  return (
    <dl className="mt-3 space-y-1">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm font-medium">자진신고 시 예상 세금</dt>
        <dd className="font-semibold">₩{formatNumber(tax.declaredKrw)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm text-muted">미신고 적발 시</dt>
        <dd className="text-sm">₩{formatNumber(tax.undeclaredKrw)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm text-muted">2년 내 2회 이상 적발 시</dt>
        <dd className="text-sm">₩{formatNumber(tax.repeatUndeclaredKrw)}</dd>
      </div>
    </dl>
  );
}

export function CustomsSummary({
  customs,
  usdKrw,
  hasRefundProof,
  isMinor,
  onRefundProofChange,
  onMinorChange,
}: CustomsSummaryProps) {
  return (
    <section
      aria-labelledby="customs-heading"
      className="rounded border border-border bg-surface p-4"
    >
      <h2 id="customs-heading" className="font-semibold">
        귀국 세금 (한국)
      </h2>

      <div aria-live="polite">
        {customs.status === "empty" && (
          <p className="mt-2 text-sm text-muted">
            품목을 입력하면 면세 한도와 예상 세금을 보여 드려요.
          </p>
        )}
        {customs.status === "needs-volume" && (
          <p className="mt-2 text-sm">
            주류와 향수는 용량이 있어야 계산할 수 있어요. 품목의 총 용량을
            입력해 주세요.
          </p>
        )}
        {customs.status === "ready" && (
          <>
            <LimitUsage result={customs.result} />
            {customs.hasAlcohol && (
              <p className="mt-2 text-sm">
                주류:{" "}
                {customs.result.alcoholExempt
                  ? "✓ 별도 면세 범위 안이에요."
                  : "별도 면세 범위 밖이에요."}
              </p>
            )}
            {customs.hasPerfume && (
              <p className="mt-2 text-sm">
                향수: 별도 면세 {customs.result.perfumeExemptMl}ml /{" "}
                {KR_PERFUME_MAX_ML.value}ml
              </p>
            )}
            <TaxResult tax={customs.result.tax} />
            {customs.dependsOnRefundProof && (
              <p className="mt-2 text-sm font-medium">
                환급 증빙 여부에 따라 결과가 달라져요. 영수증과 환급 내역을
                챙겨 두세요.
              </p>
            )}
            {customs.excludedStoreCount > 0 && (
              <p className="mt-2 text-sm text-danger">
                오류가 있는 매장 {customs.excludedStoreCount}곳은 빠져 있어요.
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-4 space-y-3 border-t border-border pt-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0"
            checked={hasRefundProof}
            onChange={(event) => onRefundProofChange(event.target.checked)}
          />
          <span>
            입국할 때 환급액을 증명할 수 있어요.
            <span className="block text-muted">
              영수증 등으로 확인되면 환급액을 뺀 금액으로 과세될 수 있어요.
              귀국 후 입금되는 환급은 증빙이 어려울 수 있어요.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0"
            checked={isMinor}
            onChange={(event) => onMinorChange(event.target.checked)}
          />
          <span>만 19세 미만이에요.</span>
        </label>
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted">
        <p>
          예상치입니다. 실제 세액은 세관 판단과 통관 시점 환율(1달러 약{" "}
          {formatNumber(usdKrw)}원 기준으로 계산)에 따라 달라져요. 1인 기준이며,
          출국 전 면세점 구매품도 한도에 합산돼요.
        </p>
        {customs.status === "ready" && customs.hasFood && (
          <p>
            농축수산물과 한약재는 금액·중량 제한이 따로 있어요. 반입 가능
            여부를 확인해 주세요.
          </p>
        )}
        <p>
          정확한 세액은 <OfficialLink>관세청 예상세액 조회</OfficialLink>에서
          확인하세요.
        </p>
      </div>
    </section>
  );
}
