import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.ELIZAOS_API_URL || "http://72.62.176.85:3003";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const SAGE_ID = "c3bd776c-4465-037f-9c7a-bf94dfba78d9";
const ATLAS_ID = "8bd28d90-f59e-0ecb-828f-fecb287d3a0a";

// ── Agent IDs ────────────────────────────────────────────────────────
const AGENT_IDS: Record<string, string> = {
  atlas: ATLAS_ID,
  sage: SAGE_ID,
  rex: "fbcb8622-9d6e-04c8-b68b-f1bc7afd05a4",
  luna: "baaf10f1-b483-0977-a616-3141ffd45a62",
  mia: "3aa06745-f0af-0361-b73e-af8315d72561",
  sam: "265dc298-e876-0361-b7e4-07e746c90f39",
  victor: "b6877f3b-c660-0b25-afb9-10b73ade3a30",
  zara: "3e08adeb-e59f-0076-bf8e-6510fd82289f",
  alex: "64542dba-bb81-0fd4-86e0-cf4f319567c7",
};

// ── Call agent via ElizaOS API ────────────────────────────────────────

async function callAgent(agentId: string, message: string, channelId?: string): Promise<string> {
  const cid = channelId || crypto.randomUUID();
  const res = await fetch(`${API_BASE}/api/messaging/channels/${cid}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channelId: cid,
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
  return data.agentResponse?.text || "";
}

// ── Keyword routing fallback ─────────────────────────────────────────

function routeByKeywords(text: string): string {
  const lower = text.toLowerCase();
  if (/solidity|solana|blockchain|defi|smart\s*contract|token|web3|dao/i.test(lower)) return "zara";
  if (/audit|security\s+review|vulnerability|exploit|reentrancy/i.test(lower)) return "victor";
  if (/css|html|react|redux|tailwind|vue|angular|next\.?js|frontend|landing/i.test(lower)) return "mia";
  if (/deploy|ci.?cd|kubernetes|docker|terraform|devops|infrastructure/i.test(lower)) return "rex";
  if (/design|ux|wireframe|figma|prototype|user\s+flow|accessibility/i.test(lower)) return "luna";
  if (/roadmap|okr|user\s+stor|sprint|stakeholder|product|agile/i.test(lower)) return "alex";
  if (/node|python|java|api|database|backend|express|server/i.test(lower)) return "sam";
  return "sam";
}

// ── Parse Atlas delegation (single or array) ─────────────────────────

interface Delegation {
  delegate: string;
  task: string;
}

function parseAtlasDelegations(response: string): Delegation[] {
  const results: Delegation[] = [];

  // Try JSON array
  try {
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.delegate && item.task) results.push(item);
        }
        if (results.length > 0) return results;
      }
    }
  } catch {}

  // Try single JSON
  try {
    const jsonMatch = response.match(/\{[\s\S]*?"delegate"[\s\S]*?"task"[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.delegate && parsed.task) return [parsed];
    }
  } catch {}

  // Find all individual objects
  try {
    const allMatches = response.matchAll(/\{"delegate"\s*:\s*"(\w+)"\s*,\s*"task"\s*:\s*"([^"]+)"\}/gi);
    for (const m of allMatches) {
      results.push({ delegate: m[1], task: m[2] });
    }
    if (results.length > 0) return results;
  } catch {}

  // Find agent name in prose
  const nameMatch = response.match(/\b(Rex|Luna|Victor|Mia|Sam|Alex|Zara)\b/i);
  if (nameMatch) {
    return [{ delegate: nameMatch[1], task: response }];
  }

  return [];
}

// ── API Route ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { message, agentId, channelId, step } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // ── Direct agent call ──
  if (agentId) {
    const text = await callAgent(agentId, message, channelId);
    return NextResponse.json({ text: text || "No response", agentId });
  }

  // ── Atlas routing with streaming ──
  if (step === "atlas" || !step) {
    const stream = step === "atlas"; // stream when called from frontend

    if (stream) {
      // SSE: send events as each agent responds
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          function send(event: string, data: unknown) {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          }

          try {
            // 1. Atlas routing
            send("thinking", { agent: "Atlas", status: "routing" });
            const atlasCid = crypto.randomUUID();
            const atlasRaw = await callAgent(ATLAS_ID, message, atlasCid);
            const delegations = parseAtlasDelegations(atlasRaw);

            if (delegations.length === 0) {
              const fallbackAgent = routeByKeywords(message);
              delegations.push({ delegate: fallbackAgent, task: message });
            }

            send("delegations", { delegations });

            // 2. Call each agent and stream responses
            for (const delegation of delegations) {
              const agentName = delegation.delegate.toLowerCase();
              const targetId = AGENT_IDS[agentName];

              if (!targetId) {
                send("agent_error", { agent: delegation.delegate, error: `Agent not found` });
                continue;
              }

              send("thinking", { agent: delegation.delegate, status: "working", task: delegation.task });

              try {
                const agentCid = crypto.randomUUID();
                const taskMsg = `Respond directly with the full answer, include all code if applicable. Do not delegate or generate images. Task: ${delegation.task || message}`;
                const response = await callAgent(targetId, taskMsg, agentCid);
                send("agent_response", {
                  agent: delegation.delegate,
                  agentId: targetId,
                  task: delegation.task,
                  response: response || "No response",
                });
              } catch (err: unknown) {
                const errorMsg = err instanceof Error ? err.message : "Unknown error";
                send("agent_error", { agent: delegation.delegate, error: errorMsg });
              }
            }

            send("done", { status: "complete" });
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            send("error", { error: errorMsg });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming fallback
    const atlasCid = crypto.randomUUID();
    const atlasRaw = await callAgent(ATLAS_ID, message, atlasCid);
    const delegations = parseAtlasDelegations(atlasRaw);

    if (delegations.length === 0) {
      const fallbackAgent = routeByKeywords(message);
      delegations.push({ delegate: fallbackAgent, task: message });
    }

    const agentResponses = await executeDelegations(delegations, message);

    return NextResponse.json({
      step: "complete",
      atlasResponse: atlasRaw,
      delegations,
      agentResponses,
      text: formatResponses(agentResponses),
    });
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}

// ── Execute delegations ──────────────────────────────────────────────

async function executeDelegations(delegations: Delegation[], originalMessage: string) {
  const agentResponses: Array<{
    agent: string;
    agentId: string;
    task: string;
    response: string;
    error?: string;
  }> = [];

  for (const delegation of delegations) {
    const agentName = delegation.delegate.toLowerCase();
    const targetId = AGENT_IDS[agentName];

    if (!targetId) {
      agentResponses.push({
        agent: delegation.delegate,
        agentId: "",
        task: delegation.task,
        response: "",
        error: `Agent "${delegation.delegate}" not found`,
      });
      continue;
    }

    try {
      const agentCid = crypto.randomUUID();
      const taskMsg = `Respond directly with the full answer, include all code if applicable. Do not delegate or generate images. Task: ${delegation.task || originalMessage}`;
      const response = await callAgent(targetId, taskMsg, agentCid);
      agentResponses.push({
        agent: delegation.delegate,
        agentId: targetId,
        task: delegation.task,
        response: response || "No response",
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      agentResponses.push({
        agent: delegation.delegate,
        agentId: targetId,
        task: delegation.task,
        response: "",
        error: errorMsg,
      });
    }
  }

  return agentResponses;
}

// ── Format responses for display ─────────────────────────────────────

function formatResponses(
  agentResponses: Array<{ agent: string; response: string; error?: string }>,
): string {
  return agentResponses
    .map((r) => {
      const header = `**${r.agent}:**`;
      const body = r.error ? `Error: ${r.error}` : r.response;
      return `${header}\n${body}`;
    })
    .join("\n\n---\n\n");
}
