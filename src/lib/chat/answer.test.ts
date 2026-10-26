import { expect, test } from "vitest";
import { seats } from "../../data/constituencies";
import { entries, leaders } from "../../data/ledger";
import { manifestos } from "../../data/manifestos";
import { answerQuestion } from "./answer";
import { passagesFromEdition } from "./passages";

const passages = passagesFromEdition({ leaders, entries, seats, manifestos });

test("an unsourced affidavit total does not return an invented figure", () => {
  const answer = answerQuestion(
    "What is the combined total of the affidavits that were left out?",
    passages,
  );

  expect(answer.status).toBe("missing");
  expect(answer.passages).toEqual([]);
  expect(JSON.stringify(answer)).not.toMatch(/\d/);
});

test("Formula E and Kodangal cite compiled lines only", () => {
  const formula = answerQuestion("Formula E", passages);
  expect(formula.status).toBe("cited");
  expect(formula.passages.some((passage) => passage.id === "PL-C-01")).toBe(true);
  expect(formula.passages.some((passage) => passage.href === "/cases/formula-e")).toBe(true);

  const asked = answerQuestion("What is on record about Formula E?", passages);
  expect(asked.status).toBe("cited");
  expect(asked.passages.some((passage) => passage.id === "PL-C-01")).toBe(true);
  expect(asked.passages.some((passage) => passage.id === "PL-H-02")).toBe(false);

  const kodangal = answerQuestion("Kodangal", passages);
  expect(kodangal.status).toBe("cited");
  expect(
    kodangal.passages.some((passage) => passage.href === "/constituencies/ac-kodangal"),
  ).toBe(true);

  for (const passage of [...formula.passages, ...kodangal.passages]) {
    expect(passage.href.startsWith("/")).toBe(true);
    expect(passage.id.length).toBeGreaterThan(0);
    expect(passage.text.length).toBeGreaterThan(0);
  }
});
