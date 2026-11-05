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
  await expect(page.getByText("¥1,500", { exact: true })).toBeVisible();
});

test("applies a fee", async ({ page }) => {
  await page.getByLabel(FIRST_PRICE).fill("11000");
  await page.getByLabel("환급 수수료 (%, 선택)").fill("10");

  await expect(page.getByText("수수료 뺀 예상 환급액")).toBeVisible();
  await expect(page.getByText("¥900", { exact: true })).toBeVisible();
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
