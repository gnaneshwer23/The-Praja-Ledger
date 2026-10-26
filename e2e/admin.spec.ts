import { expect, test } from "@playwright/test";

test("editor sign-in screen renders in English and Telugu", async ({ page }) => {
  await page.goto("/en/admin/sign-in");
  await expect(page.getByRole("heading", { name: "Editor console" })).toBeVisible();

  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.getByRole("alert")).toContainText("Enter an email address.");
  await expect(page.getByText("a sign-in link is on its way")).toHaveCount(0);

  await page.getByLabel("Authenticator code").fill("000000");
  await page.getByRole("button", { name: "Check code" }).click();
  await expect(page.getByText("That code was not accepted.")).toBeVisible();

  await page.goto("/te/admin/sign-in");
  await expect(page.getByRole("heading", { name: "ఎడిటర్ కన్సోల్" })).toBeVisible();
  await expect(page.getByRole("button", { name: "సైన్-ఇన్ లింక్ పంపండి" })).toBeVisible();
});
