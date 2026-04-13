import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.ELIZAOS_API_URL || "http://72.62.176.85:3003";
const REX_ID = "fbcb8622-9d6e-04c8-b68b-f1bc7afd05a4";

export async function POST(req: NextRequest) {
  const { repo, port } = await req.json();

  if (!repo) {
    return NextResponse.json({ error: "repo is required" }, { status: 400 });
  }

  const message = port
    ? `deploy ${repo} on port ${port}`
    : `deploy ${repo}`;

  const channelId = crypto.randomUUID();

  const res = await fetch(`${API_BASE}/api/messaging/channels/${channelId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channelId,
      author_id: "11111111-1111-1111-1111-111111111111",
      content: message,
      message_server_id: "00000000-0000-0000-0000-000000000000",
      source_type: "eliza_gui",
      raw_message: { text: message },
      transport: "http",
      metadata: {
        isDm: true,
        targetAgentId: REX_ID,
        targetUserId: REX_ID,
        recipientId: REX_ID,
        user_display_name: "Agents Office",
      },
    }),
  });

  const data = await res.json();

  return NextResponse.json({
    text: data.agentResponse?.text || "Deploy initiated",
    agent: "Rex",
    repo,
    port,
  });
}
