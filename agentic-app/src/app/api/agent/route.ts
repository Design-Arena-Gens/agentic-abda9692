import { NextResponse } from "next/server";
import { runAgent, emptyAgentState, AgentState } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = typeof body.input === "string" ? body.input : "";
    const incomingState: AgentState | undefined = body.state;

    const response = runAgent(input, incomingState);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Agent error:", error);

    return NextResponse.json(
      {
        message: {
          role: "assistant",
          content:
            "Something went wrong on my end, but I’m ready to try again.",
        },
        state: emptyAgentState(),
        meta: { actions: ["error"] },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: {
      role: "assistant",
      content: "Send a POST request with { input, state } to control the agent.",
    },
    state: emptyAgentState(),
    meta: { actions: ["info"] },
  });
}
