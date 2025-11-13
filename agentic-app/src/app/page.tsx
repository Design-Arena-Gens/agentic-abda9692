"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  AgentMessage,
  AgentResponse,
  AgentState,
} from "@/lib/agent";

type MessageWithId = AgentMessage & { id: string };

const buildInitialMessages = (): MessageWithId[] => [
  {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "I’m your personal action agent. Tell me what you need and I’ll handle the planning, remembering, or tracking for you.",
  },
];

const initialState: AgentState = {
  todos: [],
  notes: [],
  plans: {},
  memory: [],
};

const MessageBubble = ({ message }: { message: MessageWithId }) => {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[90%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm sm:text-base ${
          isAssistant
            ? "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200"
            : "bg-black text-white"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
};

const StateInspector = ({ state }: { state: AgentState }) => {
  const hasTodos = state.todos.length > 0;
  const hasNotes = state.notes.length > 0;
  const hasPlans = Object.keys(state.plans).length > 0;

  return (
    <aside className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white/60 p-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <section>
        <h3 className="text-xs uppercase tracking-wide text-zinc-500">
          Actions I’m Tracking
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-800 dark:text-zinc-200">
          {hasTodos ? (
            state.todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-start gap-2 rounded-xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800/70"
              >
                <span className="mt-1 text-xs">
                  {todo.done ? "✅" : "⬜"}
                </span>
                <span>{todo.text}</span>
              </li>
            ))
          ) : (
            <li className="text-zinc-400 dark:text-zinc-500">
              Nothing yet. Try “Add a todo to book the flights.”
            </li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wide text-zinc-500">
          Notes I Remember
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-800 dark:text-zinc-200">
          {hasNotes ? (
            state.notes.map((note) => (
              <li
                key={note.id}
                className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
              >
                {note.text}
              </li>
            ))
          ) : (
            <li className="text-zinc-400 dark:text-zinc-500">
              Tell me to “remember” something and I’ll keep it safe.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wide text-zinc-500">
          Plans In Motion
        </h3>
        <div className="mt-3 space-y-3">
          {hasPlans ? (
            Object.entries(state.plans).map(([key, plan]) => (
              <div
                key={key}
                className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <p className="text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-100">
                  {plan.title}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {plan.steps.map((step) => (
                    <li key={step.id} className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          step.status === "done"
                            ? "bg-emerald-500"
                            : step.status === "in-progress"
                            ? "bg-sky-500"
                            : "bg-zinc-400"
                        }`}
                      />
                      <span>
                        {step.title}: {step.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Ask me to “plan” something and I’ll draft actionable steps.
            </p>
          )}
        </div>
      </section>
    </aside>
  );
};

export default function Home() {
  const [messages, setMessages] = useState<MessageWithId[]>(() =>
    buildInitialMessages()
  );
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [agentState, setAgentState] = useState<AgentState>(initialState);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const examplePrompts = useMemo(
    () => [
      "Plan a product launch for next month.",
      "Add a todo to schedule the kickoff meeting.",
      "Remember that the budget ceiling is $12k.",
      "Show my current tasks.",
    ],
    []
  );

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || pending) return;

    const userMessage: MessageWithId = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPending(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: trimmed,
          state: agentState,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach the agent.");
      }

      const payload: AgentResponse = await response.json();
      const assistantMessage: MessageWithId = {
        id: crypto.randomUUID(),
        ...payload.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAgentState(payload.state);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error occurred.";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I hit a snag: ${message}. Try again in a moment.`,
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-8">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-2 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Agentic Operator
          </h1>
          <p className="mt-2 text-sm text-zinc-500 sm:text-base">
            Issue instructions and I’ll convert them into plans, todos, and
            memories automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          {examplePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded-full border border-zinc-200 px-3 py-1 transition hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
              onClick={() => setInput(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="flex flex-col rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div
            ref={scrollAreaRef}
            className="flex max-h-[65vh] flex-1 flex-col gap-4 overflow-y-auto rounded-3xl p-6"
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {pending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  Working on it…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={sendMessage}
            className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <div className="relative">
              <textarea
                rows={3}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/30"
                placeholder="Tell the agent what to handle..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <span className="pointer-events-none absolute bottom-3 right-4 text-[11px] uppercase tracking-wide text-zinc-400">
                Enter ⌐╦╦═─
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                I can add todos, remember notes, build plans, and update
                progress.
              </span>
              <button
                type="submit"
                disabled={pending || input.trim().length === 0}
                className="rounded-full bg-black px-5 py-2 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                {pending ? "Working..." : "Send"}
              </button>
            </div>
          </form>
        </div>
        <StateInspector state={agentState} />
      </div>
    </div>
  );
}
