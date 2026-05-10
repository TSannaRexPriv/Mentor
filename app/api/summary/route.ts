import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SUMMARY_SYSTEM_PROMPT } from "@/lib/system-prompts";
import { checkAuth } from "@/lib/auth";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no api key" }, { status: 500 });
  }

  const { messages } = (await req.json()) as { messages: Msg[] };
  if (!Array.isArray(messages) || messages.length < 2) {
    return NextResponse.json({ summary: null });
  }

  const transcript = messages
    .map((m) => `${m.role === "user" ? "LEERLING" : "MENTOR"}: ${m.content}`)
    .join("\n\n");

  const client = new Anthropic({ apiKey });
  const result = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system: SUMMARY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: transcript }],
  });

  const text = result.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("\n")
    .trim();

  return NextResponse.json({ summary: text });
}
