import { NextRequest, NextResponse } from "next/server";

const ANYTHING_LLM_URL = process.env.ANYTHING_LLM_URL;
const ANYTHING_LLM_KEY = process.env.ANYTHING_LLM_KEY;
const ANYTHING_LLM_WORKSPACE = process.env.ANYTHING_LLM_WORKSPACE;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history } = body;

    if (!ANYTHING_LLM_URL || !ANYTHING_LLM_KEY) {
      return NextResponse.json({ error: "LLM not configured" }, { status: 500 });
    }

    // System prompt instructing the model to output JSON actions when appropriate
    const systemPrompt = `You are the ANC Engine Controller. You have tools to modify the proposal. When the user asks for something, output a JSON object with the action.
Available Actions:
- { type: 'ADD_SCREEN', payload: { name, width, height, pitch, productType, quantity } }
- { type: 'UPDATE_CLIENT', payload: { name, address } }
- { type: 'SET_MARGIN', payload: { value } }
If no action is needed, reply with plain text. When returning an action, output only the JSON object and nothing else.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []),
      { role: "user", content: message },
    ];

    // Send to AnythingLLM — try a generic /chat/completions endpoint
    const res = await fetch(`${ANYTHING_LLM_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
      },
      body: JSON.stringify({ workspace: ANYTHING_LLM_WORKSPACE, messages }),
    });

    const text = await res.text();

    // Try to parse JSON out of the response (model may return JSON or plain text)
    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({ ok: true, data: parsed });
    } catch (e) {
      // Not JSON, return as text
      return NextResponse.json({ ok: true, text });
    }
  } catch (error: any) {
    console.error("Command route error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
