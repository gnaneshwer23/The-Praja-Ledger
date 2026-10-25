import { expect, test } from "@playwright/test";

const englishBlocks = [
  "Office and history",
  "Education and profession",
  "Declared income",
  "Declared assets and liabilities",
  "Change between affidavits",
  "Later estimates",
  "Criminal cases",
  "Work in the legislature",
  "Work in the constituency",
  "Work as minister",
  "Business interests",
  "Public conduct",
];

const teluguBlocks = [
  "పదవి మరియు చరిత్ర",
  "విద్య మరియు వృత్తి",
  "ప్రకటించిన ఆదాయం",
  "ప్రకటించిన ఆస్తులు మరియు అప్పులు",
  "అఫిడవిట్ల మధ్య మార్పు",
  "తర్వాతి అంచనాలు",
  "క్రిమినల్ కేసులు",
  "శాసనసభలో పని",
  "నియోజకవర్గంలో పని",
  "మంత్రిగా పని",
  "వ్యాపార ప్రయోజనాలు",
  "బహిరంగ ప్రవర్తన",
];

test("leader profile, constituency index, and a seat render in English and Telugu", async ({
  page,
}) => {
  await page.goto("/en/leaders/revanth-reddy");
  for (const name of englishBlocks) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.locator("img")).toHaveCount(0);

  await page.goto("/en/constituencies");
  await expect(page.getByRole("heading", { name: "Constituencies", exact: true })).toBeVisible();
  await expect(page.locator("main a[href*='/constituencies/ac-']")).toHaveCount(119);
  await expect(page.locator("main a[href*='/constituencies/pc-']")).toHaveCount(17);

  await page.goto("/en/constituencies/ac-kodangal");
  await expect(page.getByRole("heading", { name: "Kodangal", exact: true })).toBeVisible();
  await expect(page.getByText("Anumula Revanth Reddy")).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);

  await page.goto("/te/leaders/revanth-reddy");
  for (const name of teluguBlocks) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.locator("img")).toHaveCount(0);

  await page.goto("/te/constituencies");
  await expect(
    page.getByRole("heading", { name: "నియోజకవర్గాలు", exact: true }),
  ).toBeVisible();

  await page.goto("/te/constituencies/ac-kodangal");
  await expect(page.getByRole("heading", { name: "Kodangal", exact: true })).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
});
