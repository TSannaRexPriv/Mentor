import { buildWiskundePrompt } from "./wiskunde";
import { buildFransPrompt } from "./frans";
import { buildNederlandsPrompt } from "./nederlands";
import type { Subject } from "./types";

export { type Subject, SUBJECT_LABELS } from "./types";

const STUDENT_NAME = process.env.STUDENT_NAME || "de leerling";
const STUDENT_BOOK_WISKUNDE =
  process.env.STUDENT_BOOK_WISKUNDE || "Getal & Ruimte";

export function buildSystemPrompt(
  subject: Subject,
  previousNotes: string | null,
): string {
  switch (subject) {
    case "wiskunde":
      return buildWiskundePrompt(
        STUDENT_NAME,
        STUDENT_BOOK_WISKUNDE,
        previousNotes,
      );
    case "frans":
      return buildFransPrompt(STUDENT_NAME, previousNotes);
    case "nederlands":
      return buildNederlandsPrompt(STUDENT_NAME, previousNotes);
  }
}

export const SUMMARY_SYSTEM_PROMPT = `Je krijgt een gesprek tussen een leerling en zijn mentor. Schrijf een korte notitie (3-5 zinnen, in het Nederlands) voor de mentor van de volgende sessie.

Beschrijf:
- Welk onderwerp is behandeld (hoofdstuk/paragraaf indien genoemd)
- Wat de leerling al goed kon
- Welke fouten of zwakke punten zijn opgevallen (bij talen: specifieke woorden of regels noemen)
- Wat een goed startpunt is voor de volgende sessie

Schrijf zakelijk en kort. Geen aanhef, geen afsluiting. Alleen de notitie zelf.`;
