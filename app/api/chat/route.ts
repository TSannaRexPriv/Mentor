import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { buildSystemPrompt, type Subject } from "@/lib/system-prompts";
import { checkAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };

const VALID_SUBJECTS: Subject[] = ["wiskunde", "frans", "nederlands"];

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("ANTHROPIC_API_KEY not configured", { status: 500 });
  }

  let body: {
    messages: Msg[];
    subject: Subject;
    previousNotes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages, subject, previousNotes } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages required", { status: 400 });
  }
  if (!VALID_SUBJECTS.includes(subject)) {
    return new Response("invalid subject", { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt(subject, previousNotes ?? null);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n\n[Fout: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
