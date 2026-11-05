import { JP_MIN_PURCHASE_EX_TAX } from "@/rules/jp-refund";
import { formatNumber, type StoreSummary } from "@/state/calculator";

const MESSAGES = {
  empty: "금액을 입력하면 환급 조건을 확인해 드려요.",
  "needs-date": "구매일을 선택해 주세요.",
  "invalid-price": "결제 금액을 확인해 주세요.",
  "before-refund-scheme":
    "2026년 11월 1일 이전 구매분은 새 환급 방식의 계산 대상이 아니에요.",
  "tax-rate-unknown":
    "2029년 4월 이후 식품 세율은 아직 확인되지 않아 계산할 수 없어요.",
} as const;

export function StoreStatus({ summary }: { summary?: StoreSummary }) {
  if (!summary) return null;

  if (summary.status !== "calculated") {
    const isError =
      summary.status !== "empty" && summary.status !== "needs-date";
    return (
      <p className={`text-sm ${isError ? "text-danger" : "text-muted"}`}>
        {MESSAGES[summary.status]}
      </p>
    );
  }

  const { refund } = summary;
  const minimum = formatNumber(JP_MIN_PURCHASE_EX_TAX.value);

  return refund.meetsMinimum ? (
    <p className="text-sm">
      <strong className="font-semibold text-accent">✓ 환급 조건 충족</strong>
      <span className="block text-muted sm:inline sm:before:content-['_·_']">
        세금 제외 ¥{formatNumber(refund.exTaxYen)}, 최대 환급 ¥
        {formatNumber(refund.maxRefundYen)}
      </span>
    </p>
  ) : (
    <p className="text-sm">
      <strong className="font-semibold">환급 조건 미달</strong>
      <span className="block text-muted sm:inline sm:before:content-['_·_']">
        세금 제외 ¥{minimum} 기준에서 ¥{formatNumber(refund.shortfallYen)} 부족
      </span>
    </p>
  );
}
