import { expect, test } from "@playwright/test";

test("open data page renders in English and Telugu", async ({ page }) => {
  await page.goto("/en/data");
  await expect(page.getByRole("heading", { name: "Open data", exact: true })).toBeVisible();
  await expect(page.getByText("sha256sum -c hashes.txt")).toBeVisible();
  await expect(page.getByRole("link", { name: "People" })).toHaveAttribute("href", "/data/people.csv");

  await page.goto("/te/data");
  await expect(page.getByRole("heading", { name: "ఓపెన్ డేటా", exact: true })).toBeVisible();
  await expect(page.getByText("sha256sum -c hashes.txt")).toBeVisible();
  await expect(page.getByRole("link", { name: "వ్యక్తులు" })).toHaveAttribute("href", "/data/people.csv");
});
