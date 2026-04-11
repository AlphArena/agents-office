import { NextRequest, NextResponse } from "next/server";

const API_BASE = "http://72.62.176.85:3003";
const USER_ID = "11111111-1111-1111-1111-111111111111";

const ATLAS_ID = "8bd28d90-f59e-0ecb-828f-fecb287d3a0a";

const AGENTS: Record<string, string> = {
  alex: "64542dba-bb81-0fd4-86e0-cf4f319567c7",
  luna: "baaf10f1-b483-0977-a616-3141ffd45a62",
  mia: "3aa06745-f0af-0361-b73e-af8315d72561",
  rex: "fbcb8622-9d6e-04c8-b68b-f1bc7afd05a4",
  sam: "265dc298-e876-0361-b7e4-07e746c90f39",
  victor: "b6877f3b-c660-0b25-afb9-10b73ade3a30",
  zara: "3e08adeb-e59f-0076-bf8e-6510fd82289f",
};

async function sendToAgent(agentId: string, message: string, channelId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/messaging/channels/${channelId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channelId,
      author_id: USER_ID,
      content: message,
      message_server_id: "00000000-0000-0000-0000-000000000000",
      source_type: "eliza_gui",
      raw_message: { text: message },
      transport: "http",
      metadata: {
        isDm: true,
        targetAgentId: agentId,
        targetUserId: agentId,
        recipientId: agentId,
        user_display_name: "Agents Office",
      },
    }),
  });
  const data = await res.json();
  return data.agentResponse?.text || "No response";
}

export async function POST(req: NextRequest) {
  const { message, agentId, channelId } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const cid = channelId || crypto.randomUUID();

  if (agentId) {
    const text = await sendToAgent(agentId, message, cid);
    return NextResponse.json({ text, agentId });
  }

  const atlasResponse = await sendToAgent(ATLAS_ID, message, cid);

  const mentionedAgent = Object.keys(AGENTS).find((name) =>
    atlasResponse.toLowerCase().includes(name)
  );

  return NextResponse.json({
    text: atlasResponse,
    agentId: ATLAS_ID,
    agentName: "Atlas",
    delegatedTo: mentionedAgent || null,
    delegatedAgentId: mentionedAgent ? AGENTS[mentionedAgent] : null,
  });
}
