import { expect, test } from "@playwright/test";

test("root moves to the Korean calculator", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/ko\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(
    page.getByRole("heading", { level: 1, name: "일본 쇼핑 실속 계산기" }),
  ).toBeVisible();
});

test("Korean page has no horizontal scroll at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/ko/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
