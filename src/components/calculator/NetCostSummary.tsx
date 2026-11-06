import { formatNumber, type CalculatorSummary } from "@/state/calculator";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function NetCostSummary({ summary }: { summary: CalculatorSummary }) {
  const { customs, netCostKrw, netCostBeforeTaxKrw } = summary;
  const hasPurchase = summary.totalPaidYen > 0;
  const declaredKrw =
    customs.status === "ready" && customs.result.tax.status === "calculated"
      ? customs.result.tax.declaredKrw
      : null;

  return (
    <section
      aria-labelledby="net-cost-heading"
      aria-live="polite"
      className="rounded border border-border bg-surface p-4"
    >
      <h2 id="net-cost-heading" className="font-semibold">
        최종 실지출
      </h2>

      {!hasPurchase && (
        <p className="mt-2 text-sm text-muted">
          구매 내역을 입력하면 환급과 세금을 반영한 금액을 보여 드려요.
        </p>
      )}

      {hasPurchase && (
        <>
          {netCostKrw !== null ? (
            <p className="mt-1 text-3xl font-bold text-accent">
              약 ₩{formatNumber(netCostKrw)}
            </p>
          ) : (
            <p className="mt-2 text-sm">
              <strong className="font-semibold">세금이 아직 계산되지 않았어요.</strong>{" "}
              <span className="text-muted">
                아래 귀국 세금 안내를 확인해 주세요.
              </span>
            </p>
          )}
          <dl className="mt-3 space-y-1 border-t border-border pt-3">
            <Line label="결제액" value={`₩${formatNumber(summary.totalPaidKrw)}`} />
            <Line
              label="예상 환급액"
              value={`- ₩${formatNumber(summary.totalExpectedRefundKrw)}`}
            />
            {declaredKrw !== null ? (
              <Line
                label="자진신고 시 예상 세금"
                value={`+ ₩${formatNumber(declaredKrw)}`}
              />
            ) : (
              <Line
                label="세금 반영 전"
                value={`₩${formatNumber(netCostBeforeTaxKrw)}`}
              />
            )}
          </dl>
        </>
      )}
    </section>
  );
}
