import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, Transaction } from "@/lib/models";
import { payAgent } from "@/lib/pay-agent";
import { USER_COST } from "@/lib/agent-wallets";

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

// ── GitHub users per agent ───────────────────────────────────────────
const GITHUB_USERS: Record<string, string> = {
  mia: "solanacloud-mia",
  sam: "solanacloud-sam",
  rex: "solanacloud-rex",
  victor: "solanacloud-victor",
  zara: "solanacloud-zara",
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

async function chargeUser(walletAddress: string, agentName: string, task: string): Promise<{ balance: number } | null> {
  try {
    await connectDB();
    const user = await User.findOneAndUpdate(
      { walletAddress, balance: { $gte: USER_COST } },
      { $inc: { balance: -USER_COST, totalSpent: USER_COST } },
      { new: true }
    );
    if (!user) return null;

    await Transaction.create({
      walletAddress,
      type: "spend",
      amount: USER_COST,
      agentName,
      task,
    });

    // Pay agent on-chain (async)
    payAgent(agentName).then((r) => {
      if (r.success) console.log(`Paid ${agentName}: ${r.txSignature}`);
      else console.error(`Failed to pay ${agentName}: ${r.error}`);
    });

    return { balance: user.balance };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { message, agentId, channelId, step, walletAddress } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Check balance if wallet provided
  if (walletAddress) {
    await connectDB();
    const user = await User.findOne({ walletAddress });
    if (!user || user.balance < USER_COST) {
      return NextResponse.json({
        error: "Insufficient credits",
        balance: user?.balance || 0,
        required: USER_COST,
      }, { status: 402 });
    }
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

            // 2. Call each agent SEQUENTIALLY with delay + retry
            for (let i = 0; i < delegations.length; i++) {
              const delegation = delegations[i];
              const agentName = delegation.delegate.toLowerCase();
              const targetId = AGENT_IDS[agentName];

              if (!targetId) {
                send("agent_error", { agent: delegation.delegate, error: `Agent not found` });
                continue;
              }

              // Wait between agents to avoid x402 rate limit
              if (i > 0) {
                send("thinking", { agent: delegation.delegate, status: "waiting", task: "waiting for rate limit..." });
                await new Promise(r => setTimeout(r, 8000));
              }

              send("thinking", { agent: delegation.delegate, status: "working", task: delegation.task });

              // Try with retry on failure
              let response = "";
              const maxRetries = 2;

              for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                  const agentCid = crypto.randomUUID();
                  const taskMsg = `Respond directly with the full answer, include all code if applicable. Do not delegate or generate images. Task: ${delegation.task || message}`;
                  response = await callAgent(targetId, taskMsg, agentCid);
                  if (response) break;
                } catch {}

                if (attempt < maxRetries) {
                  send("thinking", { agent: delegation.delegate, status: "retrying", task: `retry ${attempt + 1}/${maxRetries}...` });
                  await new Promise(r => setTimeout(r, 5000));
                }
              }

              if (response) {
                // Charge user + pay agent
                let newBalance: number | undefined;
                if (walletAddress && response) {
                  const result = await chargeUser(walletAddress, delegation.delegate, delegation.task);
                  if (result) newBalance = result.balance;
                }

                send("agent_response", {
                  agent: delegation.delegate,
                  agentId: targetId,
                  task: delegation.task,
                  response,
                  balance: newBalance,
                  cost: USER_COST,
                });
              } else {
                send("agent_error", { agent: delegation.delegate, error: "No response after retries" });
              }

              // Check if agent created a new repo on GitHub
              const githubUser = GITHUB_USERS[agentName];
              if (githubUser && response) {
                await new Promise(r => setTimeout(r, 2000));
                try {
                  const reposRes = await fetch(`https://api.github.com/users/${githubUser}/repos?sort=created&per_page=1`);
                  const repos = await reposRes.json();
                  if (Array.isArray(repos) && repos.length > 0) {
                    const latest = repos[0];
                    // If repo was created in the last 2 minutes, it's probably new
                    const createdAt = new Date(latest.created_at).getTime();
                    if (Date.now() - createdAt < 120000) {
                      send("action", {
                        type: "repo_created",
                        agent: delegation.delegate,
                        repo: latest.full_name,
                        url: latest.html_url,
                      });
                    }
                  }
                } catch {}
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

    const agentResponses = await executeDelegations(delegations, message, walletAddress);

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

async function executeDelegations(delegations: Delegation[], originalMessage: string, walletAddress?: string) {
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

      // Charge user + pay agent
      let newBalance: number | undefined;
      if (walletAddress && response) {
        const result = await chargeUser(walletAddress, delegation.delegate, delegation.task);
        if (result) newBalance = result.balance;
      }

      agentResponses.push({
        agent: delegation.delegate,
        agentId: targetId,
        task: delegation.task,
        response: response || "No response",
        balance: newBalance,
        cost: USER_COST,
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
