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
  const body = JSON.stringify({
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
  });

  // Retry up to 2 times on failure
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

      const res = await fetch(`${API_BASE}/api/messaging/channels/${cid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      const text = data.agentResponse?.text || "";
      if (text) return text;

      // Empty response — retry with new channel
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      return "";
    } catch {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw new Error("Agent unreachable after retries");
    }
  }
  return "";
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

  // Find agent name in prose — never use Atlas prose as task
  const nameMatch = response.match(/\b(Rex|Luna|Victor|Mia|Sam|Alex|Zara)\b/i);
  if (nameMatch) {
    return [{ delegate: nameMatch[1], task: "__USE_ORIGINAL_REQUEST__" }];
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
      // Send clean message to Atlas (without session context that confuses routing)
      const atlasMessage = message.replace(/\[Session context:[\s\S]*?\]/, "").trim();
      const atlasRaw = await callAgent(ATLAS_ID, atlasMessage, crypto.randomUUID());
      delegations = parseAtlasDelegations(atlasRaw);
    } catch {}

    // Post-process: detect missing agents for multi-agent tasks
    // Strip session context to avoid false keyword matches from previous tasks
    const cleanMessage = message.replace(/\[Session context:[\s\S]*?\]/, "").trim();
    const lower = cleanMessage.toLowerCase();
    const hasAgent = (name: string) => delegations.some(d => d.delegate.toLowerCase() === name);

    const isDeployOnly = /^(deploy|deploya|desplega)\b/i.test(lower.trim());
    const needsFrontend = !isDeployOnly && /landing|page|frontend|\bui\b|website|\bcss\b|\bhtml\b|react|component/i.test(lower);
    const needsBackend = /api|backend|endpoint|catalog|database|rest|graphql|server/i.test(lower);
    const needsDeploy = /deploy|deploya|desplega|production|infrastructure|docker/i.test(lower);
    const needsWeb3 = /block\s*chain|blockchain|blockch|solidity|solana|smart\s*contract|web3|defi|token|anchor|crypto/i.test(lower);
    const needsDesign = /design|ux|wireframe|figma|prototype/i.test(lower);
    const needsPM = /roadmap|okr|user\s+stor|sprint|product\s+manag/i.test(lower);

    if (needsFrontend && !hasAgent("mia")) {
      delegations.push({ delegate: "Mia", task: `Build the frontend. User request: ${message}` });
    }
    if (needsBackend && !hasAgent("sam")) {
      delegations.push({ delegate: "Sam", task: `Build the backend API. User request: ${message}` });
    }
    if (needsDeploy && !hasAgent("rex")) {
      delegations.push({ delegate: "Rex", task: `Deploy to production. User request: ${message}` });
    }
    if (needsWeb3 && !hasAgent("zara")) {
      delegations.push({ delegate: "Zara", task: `Build the Web3/blockchain component. User request: ${message}` });
    }
    if (needsDesign && !hasAgent("luna")) {
      delegations.push({ delegate: "Luna", task: `Design the UX/UI. User request: ${message}` });
    }
    if (needsPM && !hasAgent("alex")) {
      delegations.push({ delegate: "Alex", task: `Plan the project. User request: ${message}` });
    }

    // Filter out agents that don't match the request
    const relevantAgents = new Set<string>();
    if (needsFrontend) relevantAgents.add("mia");
    if (needsBackend) relevantAgents.add("sam");
    if (needsDeploy) relevantAgents.add("rex");
    if (needsWeb3) relevantAgents.add("zara");
    if (needsDesign) relevantAgents.add("luna");
    if (needsPM) relevantAgents.add("alex");

    const beforeCount = delegations.length;
    if (relevantAgents.size > 0) {
      delegations = delegations.filter(d => relevantAgents.has(d.delegate.toLowerCase()));
    }
    console.log(`[ATLAS] Filter: ${beforeCount} → ${delegations.length} agents. Relevant: [${[...relevantAgents].join(",")}]`);

    // Ensure every task includes the original user request
    for (const d of delegations) {
      if (d.task === "__USE_ORIGINAL_REQUEST__" || !d.task || d.task.length < 10) {
        d.task = message;
      }
      // Always append original request if not present
      if (!d.task.toLowerCase().includes(message.toLowerCase().slice(0, 20))) {
        d.task = `${d.task}. Original request: ${message}`;
      }
    }

    return NextResponse.json({ delegations });
  }

  // ── Step 2: Execute a single agent task ──
  if (step === "execute") {
    if (!agentId) {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    // Determine the agent's role for role-specific instructions
    const agentName = Object.entries(AGENT_IDS).find(([, id]) => id === agentId)?.[0] || "agent";
    const isRex = agentName === "rex";

    const taskMsg = isRex
      ? `Deploy the EXISTING project to production. Do NOT create a new project. Do NOT explain Kubernetes. Just deploy and return the result. Task: ${task || message}`
      : `The user asked: "${message}"

Your task: ${task || message}

CRITICAL RULES:
1. Your output MUST be about "${message}" — if user asked for "landing de perros", build a DOG landing page, NOT a counter or random template
2. Write complete code with real content related to the request
3. No questions. No asking for details. Use realistic sample data
4. Start with code immediately`;

    // SSE stream for a single agent execution
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        }

        try {
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
    // Victor reviews locally — the x402 LLM is too weak for reliable reviews
    const hasCode = /```|file:|function |const |import |class |def |app\./i.test(message);

    // Extract the original user request from the review summary
    const originalRequestMatch = message.match(/Original request: (.+?)(?:\n|$)/i)
      || message.match(/User request: (.+?)(?:\n|$)/i);
    const originalRequest = originalRequestMatch?.[1]?.toLowerCase() || "";

    // Build automated review
    const issues: string[] = [];

    // ── Relevance check: does the code match what the user asked for? ──
    if (originalRequest && hasCode) {
      const codeContent = message.toLowerCase();
      // Extract key words from user request (skip common words)
      const keyWords = originalRequest.split(/\s+/).filter((w: string) =>
        w.length > 3 && !["hazme","hacer","haz","una","con","para","please","build","make","create","the","and","with"].includes(w)
      );
      const relevantWords = keyWords.filter((w: string) => codeContent.includes(w));
      if (keyWords.length > 0 && relevantWords.length === 0) {
        issues.push(`RELEVANCE: Code does not match the user request "${originalRequest}". The output should be about: ${keyWords.join(", ")}`);
      }

      // Check for generic templates that ignore the request
      if (/counter|todo.?list|hello.?world/i.test(codeContent) && !/counter|todo|hello/i.test(originalRequest)) {
        issues.push("RELEVANCE: Generic template detected (counter/todo/hello world) — code should be specific to the user's request");
      }
    }

    // ── Security checks ──
    if (/eval\(|innerHTML|dangerouslySetInnerHTML/i.test(message)) issues.push("XSS risk: eval/innerHTML/dangerouslySetInnerHTML detected");
    if (/password|secret|api.?key|private.?key/i.test(message) && !/process\.env|env\./i.test(message)) issues.push("Hardcoded secrets detected — use environment variables");
    if (/SELECT.*\+.*req\.|query\s*\(/i.test(message) && !/\$\d|\?/i.test(message)) issues.push("Potential SQL injection — use parameterized queries");
    if (/http:\/\/(?!localhost|127\.0\.0\.1)/i.test(message)) issues.push("Using HTTP instead of HTTPS for external URLs");
    if (/TODO|FIXME|HACK/i.test(message)) issues.push("Contains TODO/FIXME comments — incomplete implementation");
    if (/console\.log/i.test(message)) issues.push("Console.log statements left in code — remove for production");
    if (!hasCode) issues.push("No code was provided by the agents");

    // Relevance issues are critical — always reject
    const hasRelevanceIssue = issues.some(i => i.startsWith("RELEVANCE"));
    const verdict = hasRelevanceIssue ? "NEEDS CHANGES" : issues.length > 2 ? "NEEDS CHANGES" : "APPROVED";
    const reviewResponse = issues.length > 0
      ? `${verdict}\n\n${issues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}`
      : "APPROVED — code looks clean, no issues detected.";


    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        function send(event: string, data: unknown) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        }

        send("thinking", { agent: "Victor", status: "reviewing" });
        send("agent_response", { agent: "Victor", agentId: AGENT_IDS["victor"], task: "Code review", response: reviewResponse });
        send("done", { status: "complete" });
        controller.close();
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
