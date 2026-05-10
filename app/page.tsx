"use client";

import { useEffect, useRef, useState } from "react";
import {
  type Subject,
  SUBJECT_LABELS,
} from "@/lib/system-prompts/types";

type Msg = { role: "user" | "assistant"; content: string };

const PASSCODE_KEY = "wm_passcode";
const notesKey = (s: Subject) => `wm_notes_${s}`;

const SUBJECT_DESCRIPTIONS: Record<Subject, string> = {
  wiskunde: "Hoofdstuk doornemen, oefenen, denkfouten herkennen.",
  frans:
    "Woordjes en grammatica drillen. Plak je woordenlijst aan het begin voor de beste sessie.",
  nederlands:
    "Werkwoordspelling, grammatica, begrijpend lezen, woordenschat.",
};

const SUBJECT_OPENING_HINT: Record<Subject, string> = {
  wiskunde:
    "Tip: begin met het hoofdstuk en de paragraaf waar je nu mee bezig bent.",
  frans:
    "Tip: heb je een woordenlijst voor de toets? Plak die hier in je eerste bericht — dan oefent de mentor met de juiste woorden.",
  nederlands:
    "Tip: vertel of het over werkwoordspelling, grammatica, of een tekst gaat. Bij een tekst kun je die hier plakken.",
};

export default function Home() {
  // Auth
  const [passcode, setPasscode] = useState<string | null>(null);
  const [pcInput, setPcInput] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Subject
  const [subject, setSubject] = useState<Subject | null>(null);

  // Chat
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [previousNotes, setPreviousNotes] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(PASSCODE_KEY);
    if (stored) setPasscode(stored);
    setAuthChecked(true);
  }, []);

  // Load notes when subject changes
  useEffect(() => {
    if (!subject) return;
    const notes = localStorage.getItem(notesKey(subject));
    setPreviousNotes(notes);
    setMessages([]);
  }, [subject]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  async function handlePasscodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-passcode": pcInput,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "ping" }],
        subject: "wiskunde",
      }),
    });
    if (res.status === 401) {
      setAuthError("Wachtwoord klopt niet.");
      return;
    }
    if (res.body) {
      const reader = res.body.getReader();
      while (!(await reader.read()).done) {}
    }
    localStorage.setItem(PASSCODE_KEY, pcInput);
    setPasscode(pcInput);
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming || !subject) return;

    const newMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(passcode ? { "x-passcode": passcode } : {}),
        },
        body: JSON.stringify({
          messages: newMessages,
          subject,
          previousNotes,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Er ging iets mis. Probeer het opnieuw.",
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function endSession() {
    if (messages.length < 2 || streaming || summarizing || !subject) return;
    setSummarizing(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(passcode ? { "x-passcode": passcode } : {}),
        },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      if (data.summary) {
        const dated = `[${new Date().toLocaleDateString("nl-NL")}] ${data.summary}`;
        const combined = previousNotes
          ? `${dated}\n\n${previousNotes}`
              .split("\n\n")
              .slice(0, 5)
              .join("\n\n")
          : dated;
        localStorage.setItem(notesKey(subject), combined);
        setPreviousNotes(combined);
      }
    } finally {
      setMessages([]);
      setSummarizing(false);
    }
  }

  function changeSubject() {
    if (streaming || summarizing) return;
    setSubject(null);
    setMessages([]);
  }

  function clearNotes() {
    if (!subject) return;
    if (!confirm(`Notities voor ${SUBJECT_LABELS[subject]} wissen?`)) return;
    localStorage.removeItem(notesKey(subject));
    setPreviousNotes(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!authChecked) {
    return <div className="min-h-screen" />;
  }

  // ========== Passcode gate ==========
  if (!passcode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <form
          onSubmit={handlePasscodeSubmit}
          className="w-full max-w-sm fade-in"
        >
          <h1 className="font-display text-4xl text-ink mb-2 italic">
            Studie Mentor
          </h1>
          <p className="text-ink-faint text-base mb-8">
            Voer je wachtwoord in om verder te gaan.
          </p>
          <input
            type="password"
            value={pcInput}
            onChange={(e) => setPcInput(e.target.value)}
            autoFocus
            className="w-full bg-transparent border-b-2 border-rule focus:border-accent outline-none py-2 text-lg text-ink placeholder:text-ink-faint transition-colors"
            placeholder="wachtwoord"
          />
          {authError && <p className="mt-3 text-sm text-accent">{authError}</p>}
          <button
            type="submit"
            className="mt-6 text-base font-sans tracking-wide uppercase text-ink hover:text-accent transition-colors"
          >
            doorgaan →
          </button>
        </form>
      </div>
    );
  }

  // ========== Subject picker ==========
  if (!subject) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl fade-in">
          <h1 className="font-display text-5xl italic text-ink mb-3">
            Studie Mentor
          </h1>
          <p className="text-ink-faint text-base mb-12 uppercase tracking-[0.2em] text-xs">
            Kies een vak om mee te beginnen
          </p>

          <div className="space-y-1">
            {(["wiskunde", "frans", "nederlands"] as Subject[]).map((s) => {
              const hasNotes = !!localStorage.getItem(notesKey(s));
              return (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className="w-full text-left py-6 px-2 border-t border-rule hover:border-accent transition-colors group last:border-b"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-display italic text-3xl text-ink group-hover:text-accent transition-colors">
                      {SUBJECT_LABELS[s]}
                    </span>
                    <span className="text-xs uppercase tracking-[0.2em] text-ink-faint">
                      {hasNotes ? "vorige sessie opgeslagen" : "nieuw"}
                    </span>
                  </div>
                  <p className="text-ink-soft mt-2 text-base">
                    {SUBJECT_DESCRIPTIONS[s]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ========== Chat UI ==========
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-rule px-6 md:px-12 py-5 flex items-baseline justify-between">
        <div>
          <button
            onClick={changeSubject}
            disabled={streaming || summarizing}
            className="text-[10px] uppercase tracking-[0.25em] text-ink-faint hover:text-accent transition-colors mb-1 disabled:opacity-30"
          >
            ← andere vak
          </button>
          <h1 className="font-display text-2xl italic text-ink leading-none">
            {SUBJECT_LABELS[subject]} Mentor
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs font-sans uppercase tracking-wider">
          {previousNotes && (
            <button
              onClick={clearNotes}
              className="text-ink-faint hover:text-accent transition-colors"
            >
              wis notities
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={endSession}
              disabled={streaming || summarizing}
              className="text-ink-faint hover:text-accent transition-colors disabled:opacity-30"
            >
              {summarizing ? "opslaan…" : "sessie beëindigen"}
            </button>
          )}
        </div>
      </header>

      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 md:px-12 py-8"
      >
        <div className="max-w-2xl mx-auto space-y-7">
          {messages.length === 0 && (
            <div className="fade-in">
              <p className="text-ink-soft italic text-lg leading-relaxed">
                {SUBJECT_OPENING_HINT[subject]}
              </p>
              {previousNotes && (
                <details className="mt-6 text-sm text-ink-faint">
                  <summary className="cursor-pointer hover:text-accent transition-colors uppercase tracking-wider text-xs">
                    eerdere notities tonen
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap font-serif italic text-ink-soft">
                    {previousNotes}
                  </pre>
                </details>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="fade-in">
              <div className="text-[10px] uppercase tracking-[0.25em] text-ink-faint mb-1">
                {m.role === "user" ? "jij" : "mentor"}
              </div>
              <div
                className={
                  m.role === "user"
                    ? "text-ink-soft text-lg leading-relaxed whitespace-pre-wrap"
                    : "text-ink text-lg leading-relaxed whitespace-pre-wrap border-l-2 border-accent pl-5"
                }
              >
                {m.content}
                {streaming &&
                  i === messages.length - 1 &&
                  m.role === "assistant" &&
                  m.content === "" && (
                    <span>
                      <span className="dot-flashing" />
                      <span className="dot-flashing" />
                      <span className="dot-flashing" />
                    </span>
                  )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-rule px-6 md:px-12 py-5">
        <div className="max-w-2xl mx-auto flex items-end gap-4">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            rows={1}
            placeholder="Schrijf je bericht…"
            className="flex-1 bg-transparent resize-none outline-none text-lg text-ink placeholder:text-ink-faint leading-relaxed disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="text-sm font-sans uppercase tracking-wider text-accent hover:text-ink disabled:opacity-30 disabled:hover:text-accent transition-colors mb-1"
          >
            sturen
          </button>
        </div>
        <p className="max-w-2xl mx-auto text-[10px] uppercase tracking-[0.25em] text-ink-faint mt-3">
          enter om te sturen · shift+enter voor nieuwe regel
        </p>
      </footer>
    </div>
  );
}
