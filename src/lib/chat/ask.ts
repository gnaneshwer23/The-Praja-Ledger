"use server";

import { getEntries, getLeaders, getManifestos, getSeats } from "@/lib/data";
import { answerQuestion, type ChatState } from "./answer";
import { passagesFromEdition } from "./passages";

export async function askRegister(previous: ChatState, formData: FormData): Promise<ChatState> {
  const question = String(formData.get("question") ?? "").trim().slice(0, 400);
  const prior = previous.turns.slice(-7);

  if (question.length < 2) {
    return { turns: [...prior, { question, status: "empty", passages: [] }] };
  }

  const [leaders, entries, seats, manifestos] = await Promise.all([
    getLeaders(),
    getEntries(),
    getSeats(),
    getManifestos(),
  ]);
  const answer = answerQuestion(question, passagesFromEdition({ leaders, entries, seats, manifestos }));
  if (answer.status === "missing") {
    return { turns: [...prior, { question, status: "missing", passages: [] }] };
  }
  return { turns: [...prior, { question, status: "cited", passages: answer.passages }] };
}
