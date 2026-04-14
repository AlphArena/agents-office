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

// ── GitHub per agent (user + token for API access) ──────────────────
const GITHUB_AGENTS: Record<string, { user: string; token: string }> = {
  mia: { user: "solanacloud-mia", token: process.env.MIA_GITHUB_TOKEN || "" },
  sam: { user: "solanacloud-sam", token: process.env.SAM_GITHUB_TOKEN || "" },
  rex: { user: "solanacloud-rex", token: process.env.REX_GITHUB_TOKEN || "" },
  victor: { user: "solanacloud-victor", token: process.env.VICTOR_GITHUB_TOKEN || "" },
  zara: { user: "solanacloud-zara", token: process.env.ZARA_GITHUB_TOKEN || "" },
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

// ── Smart keyword routing (instant, no LLM needed) ───────────────────

function routeByKeywords(text: string): Delegation[] {
  const lower = text.toLowerCase();
  const delegations: Delegation[] = [];

  // Multi-agent detection
  const hasFrontend = /landing|page|frontend|ui|component|css|react|tailwind|html|website/i.test(lower);
  const hasBackend = /api|backend|server|database|endpoint|rest|graphql|node|express/i.test(lower);
  const hasDevOps = /deploy|ci.?cd|kubernetes|docker|terraform|devops|infrastructure/i.test(lower);
  const hasDesign = /design|ux|wireframe|figma|prototype|user\s+flow|accessibility/i.test(lower);
  const hasWeb3 = /solidity|solana|blockchain|defi|smart\s*contract|token|web3|dao|rust.*solana/i.test(lower);
  const hasAudit = /audit|security\s+review|vulnerability|exploit|reentrancy/i.test(lower);
  const hasPM = /roadmap|okr|user\s+stor|sprint|stakeholder|product\s+manag|agile/i.test(lower);

  if (hasFrontend) delegations.push({ delegate: "Mia", task: `Build a complete landing page with hero, features, and footer using React + Tailwind CSS. User request: ${text}` });
  if (hasBackend) delegations.push({ delegate: "Sam", task: `Build the REST API with all endpoints, models, and routes. User request: ${text}` });
  if (hasDevOps) delegations.push({ delegate: "Rex", task: `Deploy the project to production with Docker. User request: ${text}` });
  if (hasDesign) delegations.push({ delegate: "Luna", task: `Design the UX/UI wireframes and component specs. User request: ${text}` });
  if (hasWeb3 && !hasAudit) delegations.push({ delegate: "Zara", task: `Build the smart contract / Web3 integration. User request: ${text}` });
  if (hasAudit) delegations.push({ delegate: "Victor", task: `Audit the code for security vulnerabilities. User request: ${text}` });
  if (hasPM) delegations.push({ delegate: "Alex", task: `Create the project roadmap and user stories. User request: ${text}` });

  // Default to Sam if nothing matched
  if (delegations.length === 0) {
    delegations.push({ delegate: "Sam", task: text });
  }

  return delegations;
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
  const { message, agentId, channelId, step, walletAddress, task } = await req.json();

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

  // ── Step 1: Atlas planning — returns task list only ──
  if (step === "atlas") {
    let delegations: Delegation[] = [];

    try {
      const atlasPrompt = `You are a task router. Given the user request below, decide which agents should handle it and what each should do. Include the user's specific request in each task.

Available agents:
- Mia: frontend (React, Tailwind CSS, landing pages, UI components)
- Sam: backend (Node.js, APIs, databases, auth)
- Rex: DevOps (deploy, Docker, CI/CD, infrastructure)
- Luna: UX/UI design (wireframes, design systems, accessibility)
- Zara: Web3 (Solidity, Anchor, smart contracts, DeFi)
- Victor: security auditor (code review, vulnerabilities)
- Alex: product manager (roadmaps, user stories, OKRs)

Respond ONLY with a JSON array. No explanation, no markdown, no text before or after. Example:
[{"delegate":"Mia","task":"Build a landing page for a motorcycle shop with hero, catalog, and contact sections using React + Tailwind CSS"},{"delegate":"Rex","task":"Deploy the motorcycle landing page to production with Docker"}]

User request: ${message}`;

      const atlasRaw = await callAgent(ATLAS_ID, atlasPrompt, crypto.randomUUID());
      delegations = parseAtlasDelegations(atlasRaw);
    } catch {}

    return NextResponse.json({ delegations });
  }

  // ── Step 2: Execute a single agent task ──
  if (step === "execute") {
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const taskMsg = `${task || message}

You MUST include the complete code in your response. Write every file with full contents using this format:

file: src/App.tsx
\`\`\`tsx
// full code here
\`\`\`

RULES:
- Write ALL files with ALL the code. Every component, every style, every config.
- Do NOT ask questions or ask for clarification.
- Do NOT just describe what you will build — write the actual code.
- Do NOT delegate to other agents.
- No placeholders, no TODOs.
- You may also use CREATE_PROJECT, but the code MUST appear in your text response too.`;

    // SSE stream for a single agent execution
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        }

        try {
          const agentName = Object.entries(AGENT_IDS).find(([, id]) => id === agentId)?.[0] || "agent";
          const displayName = agentName.charAt(0).toUpperCase() + agentName.slice(1);

          send("thinking", { agent: displayName, status: "working", task });

          let response = "";
          const maxRetries = 2;
          const progressMessages = [
            "paying for inference...",
            "waiting for LLM response...",
            "generating code...",
            "still working...",
            "almost there...",
          ];

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            let progressIdx = 0;
            const heartbeat = setInterval(() => {
              const msg = progressMessages[progressIdx % progressMessages.length];
              send("progress", { agent: displayName, message: msg });
              progressIdx++;
            }, 5000);

            try {
              const agentCid = channelId || crypto.randomUUID();
              response = await callAgent(agentId, taskMsg, agentCid);
              clearInterval(heartbeat);
              if (response) break;
            } catch {
              clearInterval(heartbeat);
            }

            if (attempt < maxRetries) {
              send("thinking", { agent: displayName, status: "retrying" });
              await new Promise(r => setTimeout(r, 5000));
            }
          }

          if (response) {
            // Charge user + pay agent
            let newBalance: number | undefined;
            if (walletAddress && response) {
              const result = await chargeUser(walletAddress, displayName, task || message);
              if (result) newBalance = result.balance;
            }

            send("agent_response", {
              agent: displayName,
              agentId,
              task: task || message,
              response,
              balance: newBalance,
              cost: USER_COST,
            });

            // Detect repo creation
            const githubAgent = GITHUB_AGENTS[agentName];
            if (githubAgent) {
              const mentionsRepo = /repo|project|created|creating|check out|scaffold|commit|stand by|building/i.test(response);
              const hasCodeBlocks = /```|file:/i.test(response);

              if (mentionsRepo || hasCodeBlocks) {
                send("progress", { agent: displayName, message: "pushing to GitHub..." });
                await new Promise(r => setTimeout(r, 10000));

                let repoFound = false;
                if (githubAgent.token) {
                  for (let check = 0; check < 3 && !repoFound; check++) {
                    try {
                      const reposRes = await fetch(`https://api.github.com/user/repos?sort=created&per_page=3`, {
                        headers: { Authorization: `Bearer ${githubAgent.token}` },
                      });
                      const repos = await reposRes.json();
                      if (Array.isArray(repos)) {
                        for (const repo of repos) {
                          const createdAt = new Date(repo.created_at).getTime();
                          if (Date.now() - createdAt < 600000) {
                            send("action", {
                              type: "repo_created",
                              agent: displayName,
                              repo: repo.full_name,
                              url: `https://github.com/${repo.full_name}`,
                            });
                            repoFound = true;
                            break;
                          }
                        }
                      }
                    } catch {}
                    if (!repoFound) await new Promise(r => setTimeout(r, 5000));
                  }
                }

                if (!repoFound && mentionsRepo) {
                  const repoNameMatch = response.match(/(?:solanacloud-\w+\/[\w-]+)/i)
                    || response.match(/(?:repo|repository)\s+(?:named?\s+)?["']?([\w-]+)/i);
                  if (repoNameMatch) {
                    const repoName = repoNameMatch[0].includes('/') ? repoNameMatch[0] : `${githubAgent.user}/${repoNameMatch[1]}`;
                    send("action", {
                      type: "repo_created",
                      agent: displayName,
                      repo: repoName,
                      url: `https://github.com/${repoName}`,
                    });
                  }
                  // No fallback — don't show a fake repo link
                }
              }
            }
          } else {
            send("agent_error", { agent: displayName, error: "No response after retries" });
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

  // ── Step 3: Victor reviews (called after all tasks complete) ──
  if (step === "review") {
    const victorId = AGENT_IDS["victor"];
    const reviewMsg = `Review the code below. Start your response with APPROVED or NEEDS CHANGES, then list up to 5 specific issues you found (bugs, security, missing error handling). Do NOT create repos, do NOT ask for more code, do NOT delegate. Just review what you see.\n\n${message}`;

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        }

        try {
          send("thinking", { agent: "Victor", status: "reviewing" });

          const heartbeat = setInterval(() => {
            send("progress", { agent: "Victor", message: "reviewing code..." });
          }, 5000);

          const response = await callAgent(victorId, reviewMsg, crypto.randomUUID());
          clearInterval(heartbeat);

          if (response) {
            if (walletAddress) {
              await chargeUser(walletAddress, "Victor", "Code review");
            }
            send("agent_response", { agent: "Victor", agentId: victorId, task: "Code review", response });
          } else {
            send("agent_error", { agent: "Victor", error: "No response" });
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

  // ── Direct agent call (legacy) ──
  if (agentId) {
    const text = await callAgent(agentId, message, channelId);
    return NextResponse.json({ text: text || "No response", agentId });
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}
