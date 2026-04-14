import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, Transaction } from "@/lib/models";
import { payAgent } from "@/lib/pay-agent";
import { USER_COST, AGENT_PAY } from "@/lib/agent-wallets";

const API_BASE = "http://72.62.176.85:3003";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const SAGE_ID = "c3bd776c-4465-037f-9c7a-bf94dfba78d9";
const ATLAS_ID = "8bd28d90-f59e-0ecb-828f-fecb287d3a0a";

async function callAgent(agentId: string, message: string, channelId: string): Promise<string> {
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
  return data.agentResponse?.text || "";
}

async function getAgentIdByName(name: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/agents`);
  const data = await res.json();
  const agent = data.data?.agents?.find(
    (a: { name: string }) => a.name.toLowerCase() === name.toLowerCase()
  );
  return agent?.id || null;
}

export async function POST(req: NextRequest) {
  const { message, agentId, channelId, walletAddress } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Check user balance if wallet provided
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

  const cid = channelId || crypto.randomUUID();

  // Direct agent request (skip Atlas)
  if (agentId) {
    const text = await callAgent(agentId, message, cid);
    return NextResponse.json({ text: text || "No response", agentId });
  }

  // Step 0: Sage curates the message
  const sageCid = crypto.randomUUID();
  const sageRaw = await callAgent(SAGE_ID, message, sageCid);
  const curatedMessage = sageRaw || message; // fallback to original if Sage fails

  // Step 1: Call Atlas with curated message
  const atlasCid = crypto.randomUUID();
  const atlasRaw = await callAgent(ATLAS_ID, curatedMessage, atlasCid);

  // Step 2: Try to parse delegation JSON from Atlas's response
  let delegation: { delegate?: string; task?: string } | null = null;
  let atlasText = atlasRaw;

  // Atlas might return: "Some text {"delegate": "Sam", ...}" or just the JSON
  const jsonMatch = atlasRaw.match(/\{[\s\S]*"delegate"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      delegation = JSON.parse(jsonMatch[0]);
      // Clean Atlas text — remove the JSON part
      atlasText = atlasRaw.replace(jsonMatch[0], "").trim();
      if (!atlasText) {
        atlasText = `Delegating to ${delegation?.delegate}...`;
      }
    } catch {
      // Not valid JSON, treat as regular text
    }
  }

  // No delegation — return Atlas's response directly
  if (!delegation?.delegate) {
    return NextResponse.json({
      text: atlasText || "No response",
      agentName: "Atlas",
      curatedBy: "Sage",
      curatedMessage: curatedMessage !== message ? curatedMessage : null,
      delegatedTo: null,
      delegatedResponse: null,
    });
  }

  // Step 3: Find the delegated agent's ID
  const targetId = await getAgentIdByName(delegation.delegate);

  if (!targetId) {
    return NextResponse.json({
      text: atlasText,
      agentName: "Atlas",
      delegatedTo: delegation.delegate.toLowerCase(),
      delegatedResponse: `Could not find agent: ${delegation.delegate}`,
    });
  }

  // Step 4: Call the delegated agent with the task
  const agentCid = crypto.randomUUID();
  const taskMsg = `Respond directly with the full answer, include all code if applicable. Do not delegate or generate images. Task: ${delegation.task || message}`;
  const agentResponse = await callAgent(targetId, taskMsg, agentCid);

  // Deduct credits + pay agent
  let newBalance: number | undefined;
  let agentPaymentTx: string | undefined;
  if (walletAddress && agentResponse) {
    try {
      await connectDB();
      const user = await User.findOneAndUpdate(
        { walletAddress, balance: { $gte: USER_COST } },
        { $inc: { balance: -USER_COST, totalSpent: USER_COST } },
        { new: true }
      );
      if (user) {
        newBalance = user.balance;
        await Transaction.create({
          walletAddress,
          type: "spend",
          amount: USER_COST,
          agentName: delegation.delegate,
          task: delegation.task || message,
        });

        // Pay the agent on-chain (async, don't block response)
        payAgent(delegation.delegate).then((result) => {
          if (result.success) {
            console.log(`Paid ${delegation!.delegate}: ${result.txSignature}`);
          } else {
            console.error(`Failed to pay ${delegation!.delegate}: ${result.error}`);
          }
        });
      }
    } catch {
      // Don't fail the response if billing fails
    }
  }

  return NextResponse.json({
    text: atlasText,
    agentName: "Atlas",
    curatedBy: "Sage",
    curatedMessage: curatedMessage !== message ? curatedMessage : null,
    delegatedTo: delegation.delegate.toLowerCase(),
    delegatedAgentId: targetId,
    delegatedResponse: agentResponse || "No response from agent",
    balance: newBalance,
    cost: USER_COST,
    agentPay: AGENT_PAY,
  });
}
