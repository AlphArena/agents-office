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

async function callAgentWithTimeout(agentId: string, message: string, timeoutMs: number = 60000, channelId?: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await callAgent(agentId, message, channelId);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return "";
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

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

// ── Detect if Sage is asking questions vs providing improved prompt ──

function parseSageResponse(sageText: string): {
  type: "questions" | "ready";
  questions?: string[];
  improvedPrompt?: string;
} {
  // Check for IMPROVED PROMPT
  const improvedMatch = sageText.match(/IMPROVED PROMPT:\s*([\s\S]*?)(?:ASSUMPTIONS:|$)/i);
  if (improvedMatch) {
    return { type: "ready", improvedPrompt: improvedMatch[1].trim() };
  }

  // Check for question patterns
  if (/\?\s*$/m.test(sageText) || /\d+\.\s+\w/m.test(sageText)) {
    return { type: "questions" };
  }

  // Default: treat as ready with the raw text as prompt
  return { type: "ready", improvedPrompt: sageText };
}

// ── API Route ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const {
    message,
    agentId,
    channelId,
    step,           // "sage" | "atlas" | "full"
    sageContext,     // previous Sage conversation for context
  } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // ── Direct agent call ──
  if (agentId) {
    const text = await callAgent(agentId, message, channelId);
    return NextResponse.json({ text: text || "No response", agentId });
  }

  // ── Step 1: SAGE (curate the prompt) ──
  if (!step || step === "sage") {
    // Build context from previous conversation with Sage
    let sageMessage = message;
    if (sageContext) {
      sageMessage = `Original request: ${sageContext}\nAdditional details from user: ${message}\n\nBased on the above, write a detailed improved version. Start with "IMPROVED PROMPT:" followed by the detailed version. End with "ASSUMPTIONS:". Do not ask questions.`;
    }

    const sageCid = crypto.randomUUID();
    const sageRaw = await callAgentWithTimeout(SAGE_ID, sageMessage, 45000, sageCid);
    // If Sage didn't respond (timeout/error), skip to Atlas
    if (!sageRaw) {
      const atlasCid = crypto.randomUUID();
      const atlasRaw = await callAgent(ATLAS_ID, message, atlasCid);
      const delegations = parseAtlasDelegations(atlasRaw);
      if (delegations.length === 0) {
        delegations.push({ delegate: routeByKeywords(message), task: message });
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

    const parsed = parseSageResponse(sageRaw);

    if (parsed.type === "questions") {
      // Sage is asking questions — return them to the frontend and STOP
      return NextResponse.json({
        step: "sage_questions",
        sageResponse: sageRaw,
        originalMessage: sageContext || message,
      });
    }

    // Sage produced an improved prompt — continue to Atlas
    const curatedMessage = parsed.improvedPrompt || message;

    // Fall through to Atlas
    const atlasCid = crypto.randomUUID();
    const atlasRaw = await callAgent(ATLAS_ID, curatedMessage, atlasCid);
    const delegations = parseAtlasDelegations(atlasRaw);

    if (delegations.length === 0) {
      const fallbackAgent = routeByKeywords(curatedMessage);
      delegations.push({ delegate: fallbackAgent, task: curatedMessage });
    }

    // Call each delegated agent
    const agentResponses = await executeDelegations(delegations, message);

    return NextResponse.json({
      step: "complete",
      curatedMessage,
      sageResponse: sageRaw,
      atlasResponse: atlasRaw,
      delegations,
      agentResponses,
      text: formatResponses(agentResponses),
    });
  }

  // ── Step 2: ATLAS only (skip Sage, go direct) ──
  if (step === "atlas") {
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

  // ── Default: full pipeline ──
  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}

// ── Execute delegations ──────────────────────────────────────────────

async function executeDelegations(
  delegations: Delegation[],
  originalMessage: string,
) {
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
