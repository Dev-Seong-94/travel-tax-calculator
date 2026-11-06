import { Calculator } from "@/components/calculator/Calculator";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold">일본 쇼핑 실속 계산기</h1>
      <p className="mt-2 text-muted">
        2026년 11월부터 바뀐 일본 면세 환급액과 귀국 세금을 함께 계산해, 실제로 얼마를 쓰는지 확인해 보세요.
      </p>
      <Calculator />
    </main>
  );
}
