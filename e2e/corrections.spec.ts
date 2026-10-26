import { expect, test } from "@playwright/test";

test("correction form fails closed in English and Telugu", async ({ page }) => {
  await page.goto("/en/corrections");
  await expect(page.getByRole("heading", { name: "Corrections", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Send correction" }).click();
  await expect(page.getByText("The correction is in the queue.")).toHaveCount(0);

  await page.getByLabel("Record id").fill("PL-C-01");
  await page.getByLabel("What is wrong").fill("The hearing date does not match the report.");
  await page.getByRole("button", { name: "Send correction" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("The correction is in the queue.")).toHaveCount(0);

  await page.goto("/te/corrections");
  await expect(page.getByRole("heading", { name: "సవరణలు", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "సవరణ పంపండి" })).toBeVisible();
  await expect(page.getByText("సవరణ వరుసలో ఉంది.")).toHaveCount(0);
});
