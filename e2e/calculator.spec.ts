import { expect, test } from "@playwright/test";

const FIRST_PRICE = "품목 1 결제 금액 (세금 포함, 엔)";

test.beforeEach(async ({ page }) => {
  await page.goto("/ko/");
});

test("shows the refund once a store meets the minimum", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("5500");

  await expect(page.getByText("✓ 환급 조건 충족")).toBeVisible();
  await expect(
    page.getByRole("definition").filter({ hasText: "¥500" }),
  ).toBeVisible();
});

test("shows the shortfall below the minimum", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("5499");

  await expect(page.getByText("환급 조건 미달")).toBeVisible();
  await expect(page.getByText(/¥1 부족/)).toBeVisible();
});

test("explains an invalid price", async ({ page }) => {
  const price = page.getByLabel(FIRST_PRICE);
  await price.fill("abc");

  await expect(price).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("0 이상 10억 엔 미만")).toBeVisible();
});

test("adds a store and totals both", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("5500");
  await page.getByRole("button", { name: "매장 추가" }).click();

  const secondStore = page.getByRole("region", { name: "매장 2" });
  await expect(secondStore.getByLabel("매장 이름 (선택)")).toBeFocused();
  await secondStore.getByLabel(FIRST_PRICE).fill("11000");

  await expect(page.getByText("2곳")).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "¥1,500" })).toBeVisible();
});

test("applies a fee", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("11000");
  await page.getByLabel("환급 수수료 (%, 선택)").fill("10");

  await expect(page.getByText("수수료 뺀 예상 환급액")).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "¥900" })).toBeVisible();
});

test("adds an item with focus and removes it", async ({ page }) => {
  await page.getByRole("button", { name: "품목 추가" }).click();

  const secondPrice = page.getByLabel("품목 2 결제 금액 (세금 포함, 엔)");
  await expect(secondPrice).toBeFocused();

  await page.getByRole("button", { name: "품목 2 삭제" }).click();

  await expect(secondPrice).toHaveCount(0);
  await expect(page.getByRole("button", { name: "품목 추가" })).toBeFocused();
});

test("keeps input entered on a slow connection", async ({ page }) => {
  await page.route("**/_next/static/**/*.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.continue();
  });
  await page.goto("/ko/", { waitUntil: "commit" });

  const price = page.getByLabel(FIRST_PRICE);
  await price.fill("5500");

  await expect(page.getByText("✓ 환급 조건 충족")).toBeVisible();
  await expect(price).toHaveValue("5500");
});

test("explains the locked form while scripts load", async ({ page }) => {
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/ko/", { waitUntil: "commit" });

  await expect(page.getByText("계산기를 불러오는 중이에요")).toBeVisible();
  await expect(page.getByLabel(FIRST_PRICE)).toBeDisabled();
});

test("hides the loading message once ready", async ({ page }) => {
  await expect(page.getByLabel(FIRST_PRICE)).toBeEnabled();
  await expect(page.getByText("계산기를 불러오는 중이에요")).toHaveCount(0);
});

test("shows won amounts using the default rate and its source", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("5500");

  await expect(page.getByText("약 ₩46,368")).toBeVisible();
  await expect(page.getByText("약 ₩4,215")).toBeVisible();
  await expect(page.getByRole("link", { name: "관세청 과세환율" })).toBeVisible();
  await expect(page.getByText("2026-11-05 기준")).toBeVisible();
});

test("recalculates with an edited rate and restores the default", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("5500");
  const rate = page.getByLabel("100엔당 (원)");

  await rate.fill("900");
  await expect(page.getByText("약 ₩49,500")).toBeVisible();
  await expect(page.getByText("직접 입력한 환율로 계산 중이에요.")).toBeVisible();

  await page.getByRole("button", { name: "기본 환율로 되돌리기" }).click();
  await expect(page.getByText("약 ₩46,368")).toBeVisible();
  await expect(rate).toHaveValue("843.05");
});

test("explains an invalid rate and keeps calculating", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("5500");
  await page.getByLabel("1달러당 (원)").fill("abc");

  await expect(page.getByText("환율은 0보다 큰 숫자로")).toBeVisible();
  await expect(page.getByText("약 ₩46,368")).toBeVisible();
});

test("shows tax, penalties, and net cost above the limit", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("150000");
  await page.getByLabel("품목 1 분류").selectOption("clothing");

  const customs = page.getByRole("region", { name: "귀국 세금 (한국)" });
  await expect(customs.getByText("한도를 ₩201,727 넘었어요")).toBeVisible();
  await expect(customs.getByText("₩25,410")).toBeVisible();
  await expect(customs.getByText("미신고 적발 시")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "최종 실지출" }).getByText("약 ₩1,175,027"),
  ).toBeVisible();
});

test("recalculates when refund proof is available", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("150000");
  await page.getByLabel("품목 1 분류").selectOption("clothing");

  await expect(page.getByText("환급 증빙 여부에 따라 결과가 달라져요")).toBeVisible();
  await page.getByLabel(/입국할 때 환급액을 증명할 수 있어요/).check();

  await expect(page.getByText("약 ₩1,160,547")).toBeVisible();
});

test("shows no tax within the limit", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("5500");

  await expect(page.getByText("✓ 면세 한도 안이에요.")).toBeVisible();
  await expect(page.getByText("예상 세금은 없어요.")).toBeVisible();
  await expect(page.getByText("약 ₩42,153")).toBeVisible();
});

test("asks for a volume for perfume and then calculates", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("10000");
  await page.getByLabel("품목 1 분류").selectOption("perfume");

  await expect(page.getByText("주류와 향수는 용량이 있어야")).toBeVisible();
  await expect(page.getByText("세금이 아직 계산되지 않았어요.")).toBeVisible();

  await page.getByLabel("품목 1 총 용량 (ml)").fill("50");

  await expect(page.getByText("향수: 별도 면세 50ml / 100ml")).toBeVisible();
  await expect(page.getByText("세금이 아직 계산되지 않았어요.")).toHaveCount(0);
});

test("explains an invalid volume", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("10000");
  await page.getByLabel("품목 1 분류").selectOption("alcohol");
  await page.getByLabel("품목 1 총 용량 (ml)").fill("abc");

  await expect(page.getByText("용량은 1 이상의 정수로")).toBeVisible();
});

test("sends unsupported goods to the official calculator", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("300000");
  await page.getByLabel("품목 1 분류").selectOption("bag");

  await expect(page.getByText("고가 가방·시계·귀금속 등은")).toBeVisible();
  await expect(page.getByText("세금이 아직 계산되지 않았어요.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "관세청 예상세액 조회" }).first(),
  ).toHaveAttribute("href", /customs\.go\.kr/);
});

test("removes the alcohol exemption for minors", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("5000");
  await page.getByLabel("품목 1 분류").selectOption("alcohol");
  await page.getByLabel("품목 1 총 용량 (ml)").fill("500");

  await expect(page.getByText("주류: ✓ 별도 면세 범위 안이에요.")).toBeVisible();
  await page.getByLabel("만 19세 미만이에요.").check();

  await expect(page.getByText("만 19세 미만은 주류 면세가 적용되지 않아요.")).toBeVisible();
});

test("defaults the purchase date to today", async ({ page }) => {
  await expect(page.getByLabel("구매일")).not.toHaveValue("");
});

test("has no horizontal scroll with several items at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.getByRole("button", { name: "품목 추가" }).click();
  await page.getByLabel(FIRST_PRICE).fill("123456789");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
