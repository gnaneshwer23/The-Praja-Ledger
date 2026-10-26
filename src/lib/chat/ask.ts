"use server";

import { getEntries, getLeaders, getManifestos, getSeats } from "@/lib/data";
import { answerQuestion, type ChatState } from "./answer";
import { passagesFromEdition } from "./passages";

export async function askRegister(_previous: ChatState, formData: FormData): Promise<ChatState> {
  const question = String(formData.get("question") ?? "");
  if (question.trim().length < 2) return { status: "empty", passages: [] };

  const [leaders, entries, seats, manifestos] = await Promise.all([
    getLeaders(),
    getEntries(),
    getSeats(),
    getManifestos(),
  ]);
  const answer = answerQuestion(question, passagesFromEdition({ leaders, entries, seats, manifestos }));
  if (answer.status === "missing") return { status: "missing", passages: [] };
  return { status: "cited", passages: answer.passages };
}
