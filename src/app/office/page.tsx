"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { AgentSprite, OrchestratorSprite, Desk, Chair, CoffeeMachine, ServerRack, Plant } from "@/components/PixelSprites";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

interface AgentDef {
  id: string; name: string; role: string; rate: number; spriteIndex: number;
  skills: string[]; description: string; completedTasks: number; rating: number;
  deskPos: { x: number; y: number };
  thoughts: string[];
}

const agentDefs: AgentDef[] = [
  { id: "alex", name: "Alex", role: "PM", rate: 0.04, spriteIndex: 0,
    skills: ["Roadmaps", "OKRs", "User Stories", "Stakeholders"], description: "Product manager — roadmaps, OKRs, user stories.",
    completedTasks: 512, rating: 4.8, deskPos: { x: 10, y: 25 },
    thoughts: ["prioritizing backlog", "writing user stories", "sprint planning"] },
  { id: "luna", name: "Luna", role: "UX/UI", rate: 0.05, spriteIndex: 1,
    skills: ["Figma", "Design Systems", "Accessibility", "Prototyping"], description: "Senior UX/UI designer obsessed with accessibility.",
    completedTasks: 847, rating: 4.9, deskPos: { x: 50, y: 18 },
    thoughts: ["color contrast...", "design tokens", "this spacing is off"] },
  { id: "mia", name: "Mia", role: "Frontend", rate: 0.06, spriteIndex: 2,
    skills: ["React", "TypeScript", "Performance", "Testing"], description: "Senior frontend — React, TypeScript, web performance.",
    completedTasks: 1087, rating: 4.7, deskPos: { x: 32, y: 48 },
    thoughts: ["bundle size 😤", "writing tests", "React 19 hooks"] },
  { id: "rex", name: "Rex", role: "DevOps", rate: 0.05, spriteIndex: 3,
    skills: ["Docker", "K8s", "CI/CD", "Terraform", "AWS"], description: "Senior DevOps — 15 years in the trenches.",
    completedTasks: 956, rating: 4.9, deskPos: { x: 65, y: 35 },
    thoughts: ["kubectl apply 🙏", "fixing pipeline", "writing Terraform"] },
  { id: "sam", name: "Sam", role: "Backend", rate: 0.06, spriteIndex: 4,
    skills: ["Node", "Python", "APIs", "Databases", "Auth"], description: "Backend engineer — APIs, databases, auth.",
    completedTasks: 1203, rating: 4.8, deskPos: { x: 10, y: 65 },
    thoughts: ["optimizing query", "designing schema", "auth flow"] },
  { id: "victor", name: "Victor", role: "Auditor", rate: 0.08, spriteIndex: 5,
    skills: ["Code Review", "Security", "Testing", "Standards"], description: "Auditor — reviews code, checks security, enforces standards.",
    completedTasks: 412, rating: 5.0, deskPos: { x: 50, y: 55 },
    thoughts: ["reviewing PR...", "found a vuln", "writing test cases"] },
  { id: "zara", name: "Zara", role: "Web3", rate: 0.07, spriteIndex: 0,
    skills: ["Solidity", "Anchor", "Smart Contracts", "DeFi", "NFTs"], description: "Web3 developer — Solidity, Anchor, smart contracts, DeFi.",
    completedTasks: 738, rating: 4.9, deskPos: { x: 65, y: 55 },
    thoughts: ["writing Solidity", "testing on devnet", "gas optimization"] },
  { id: "sage", name: "Sage", role: "Curator", rate: 0.02, spriteIndex: 3,
    skills: ["Prompt Curation", "Context Gathering", "Query Optimization"], description: "Prompt curator — refines your requests before they reach Atlas.",
    completedTasks: 2100, rating: 4.9, deskPos: { x: 38, y: 38 },
    thoughts: ["curating prompt...", "adding context", "reformulating query"] },
];

// Bench positions (lounge area — bottom right)
// Lounge — spread across bottom of the office
const benchPositions = [
  { x: 20, y: 82 }, { x: 30, y: 82 }, { x: 40, y: 82 },
  { x: 50, y: 82 }, { x: 60, y: 82 }, { x: 70, y: 82 },
  { x: 80, y: 82 }, { x: 90, y: 82 },
];

const orchestratorPos = { x: 45, y: 42 };

// Task templates — Nova picks based on user input keywords
const taskTemplates: Record<string, { agentId: string; task: string }[]> = {
  deploy: [{ agentId: "devops", task: "deploy to staging" }],
  landing: [{ agentId: "frontend", task: "build the landing page" }, { agentId: "fullstack", task: "set up the routes" }],
  api: [{ agentId: "backend", task: "build the API endpoint" }],
  database: [{ agentId: "backend", task: "design the schema" }, { agentId: "data", task: "set up migrations" }],
  pipeline: [{ agentId: "data", task: "build the data pipeline" }],
  frontend: [{ agentId: "frontend", task: "implement the UI" }],
  backend: [{ agentId: "backend", task: "write the service layer" }],
  bug: [{ agentId: "fullstack", task: "investigate and fix the bug" }],
  infra: [{ agentId: "devops", task: "provision infrastructure" }],
  default: [{ agentId: "fullstack", task: "handle the task" }],
};

interface ChatMsg { role: "user" | "nova" | "agent"; text: string; agentName?: string }
interface Payment { id: number; agent: string; task: string; amount: string; txSig: string; status: "pending" | "confirmed" }

const API_BASE = "http://72.62.176.85:3003";
const REX_ID = "fbcb8622-9d6e-04c8-b68b-f1bc7afd05a4";
const USER_ID = "11111111-1111-1111-1111-111111111111";

const statusColors = { idle: "#6366f1", working: "#eab308", done: "#22c55e" };

function Clock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, []);
  return <span>{time}</span>;
}

function randomSig() {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  return Array.from({ length: 44 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function Home() {
  const { publicKey, signMessage, connected } = useWallet();
  const { connection } = useConnection();
  const [selected, setSelected] = useState<AgentDef | null>(null);
  const [agentStates, setAgentStates] = useState<Record<string, "idle" | "working" | "done">>({});
  const [agentTasks, setAgentTasks] = useState<Record<string, string>>({});
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [orchestratorBubble, setOrchestratorBubble] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [thinking, setThinking] = useState<string | null>(null);
  const [channelId, setChannelId] = useState(() => crypto.randomUUID());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Session Memory ──
  const [sessionRepos, setSessionRepos] = useState<string[]>([]);
  const [sessionHistory, setSessionHistory] = useState<string[]>([]);

  // ── Task Board ──
  interface TaskItem { id: number; agent: string; task: string; status: "pending" | "working" | "done" | "error" }
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  let taskIdCounter = useRef(0);

  function addTasks(delegations: { delegate: string; task?: string }[]) {
    const newTasks: TaskItem[] = delegations.map(d => ({
      id: taskIdCounter.current++,
      agent: d.delegate,
      task: d.task || "working",
      status: "pending" as const,
    }));
    setTasks(p => [...p, ...newTasks]);
  }

  function updateTaskStatus(agent: string, status: "working" | "done" | "error") {
    setTasks(p => p.map(t =>
      t.agent.toLowerCase() === agent.toLowerCase() && t.status !== "done"
        ? { ...t, status }
        : t
    ));
  }

  // Fetch balance when wallet connects
  useEffect(() => {
    if (!publicKey) {
      setIsAuthenticated(false);
      setBalance(0);
      return;
    }
    fetch(`/api/balance?wallet=${publicKey.toBase58()}`)
      .then((r) => r.json())
      .then((d) => {
        setBalance(d.balance || 0);
        setIsAuthenticated(true);
      })
      .catch(() => {});
  }, [publicKey]);

  // Auth with signature on first connect
  useEffect(() => {
    if (!publicKey || !signMessage || isAuthenticated) return;
    const msg = `Sign in to Agents Office: ${publicKey.toBase58()}`;
    signMessage(new TextEncoder().encode(msg))
      .then(async (sig) => {
        const bs58 = (await import("bs58")).default;
        await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
            signature: bs58.encode(sig),
            message: msg,
          }),
        });
        // Refresh balance
        const res = await fetch(`/api/balance?wallet=${publicKey.toBase58()}`);
        const d = await res.json();
        setBalance(d.balance || 0);
        setIsAuthenticated(true);
      })
      .catch(() => {});
  }, [publicKey, signMessage, isAuthenticated]);

  // Init all agents as idle
  useEffect(() => {
    const states: Record<string, "idle" | "working" | "done"> = {};
    agentDefs.forEach((a) => { states[a.id] = "idle"; });
    setAgentStates(states);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  function getAgentPos(agent: AgentDef): { x: number; y: number } {
    const state = agentStates[agent.id] || "idle";
    if (state === "working") return agent.deskPos;
    // Idle — sit on bench
    const idx = agentDefs.filter((a) => (agentStates[a.id] || "idle") !== "working").indexOf(agent);
    return benchPositions[idx % benchPositions.length] || benchPositions[0];
  }

  function assignTask(agentId: string, task: string) {
    const agent = agentDefs.find((a) => a.id === agentId);
    if (!agent) return;
    if (agentStates[agentId] === "working") return;

    // Move to desk
    setAgentStates((p) => ({ ...p, [agentId]: "working" }));
    setAgentTasks((p) => ({ ...p, [agentId]: task }));
    setBubbles((p) => ({ ...p, [agentId]: "on it! ✓" }));
    setTimeout(() => setBubbles((p) => { const n = { ...p }; delete n[agentId]; return n; }), 2000);

    // Create payment
    const payId = Date.now() + Math.random();
    const amount = `$${agent.rate.toFixed(2)}`;
    setPayments((p) => [...p.slice(-7), {
      id: payId, agent: agent.name, task, amount, txSig: randomSig(), status: "pending",
    }]);

    // Confirm payment + deduct
    setTimeout(() => {
      setPayments((p) => p.map((pay) => pay.id === payId ? { ...pay, status: "confirmed" } : pay));
      setBalance((b) => Math.max(0, parseFloat((b - agent.rate).toFixed(4))));
    }, 1500);

    // Agent stays at desk until finishTask is called
  }

  function finishTask(agentId: string) {
    setAgentStates((p) => ({ ...p, [agentId]: "idle" }));
    setAgentTasks((p) => { const n = { ...p }; delete n[agentId]; return n; });
    setBubbles((p) => ({ ...p, [agentId]: "done ✓" }));
    setTimeout(() => setBubbles((p) => { const n = { ...p }; delete n[agentId]; return n; }), 2000);
  }

  const [sageContext, setSageContext] = useState<string | null>(null);

  // Call a single agent directly via the API
  async function callSingleAgent(agentId: string, message: string): Promise<string> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, agentId, channelId }),
    });
    const data = await res.json();
    return data.text || "";
  }

  async function handleChat() {
    const msg = chatInput.trim();
    if (!msg) return;
    if (!connected || !publicKey) {
      setChat((p) => [...p, { role: "nova", text: "Connect your wallet first" }]);
      return;
    }
    setChatInput("");
    setChat((p) => [...p, { role: "user", text: msg }]);

    try {
      // Build message with session context
      let fullMessage = msg;
      if (sessionRepos.length > 0 || sessionHistory.length > 0) {
        const context: string[] = [];
        if (sessionRepos.length > 0) context.push(`Repos created in this session: ${sessionRepos.join(", ")}`);
        if (sessionHistory.length > 0) context.push(`Previous tasks: ${sessionHistory.slice(-3).join("; ")}`);
        fullMessage = `${msg}\n\n[Session context: ${context.join(". ")}]`;
      }
      setSessionHistory((p) => [...p, msg]);

      // Call Atlas with SSE streaming
      setThinking("Atlas is routing...");
      const atlasRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullMessage, step: "atlas" }),
      });

      // Process SSE stream
      const reader = atlasRes.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setThinking(null);
        setChat((p) => [...p, { role: "nova", text: "Error: no response stream" }]);
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventName = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventName = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventName) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (eventName) {
                case "thinking":
                  if (data.status === "routing") {
                    setThinking("Atlas is routing...");
                  } else if (data.status === "working") {
                    setThinking(`${data.agent} is working...`);
                    setChat((p) => [...p, { role: "nova", text: `⚡ ${data.agent} started working: ${data.task || ""}` }]);
                    updateTaskStatus(data.agent, "working");
                    const agent = agentDefs.find((a) => a.name.toLowerCase() === data.agent.toLowerCase());
                    if (agent) assignTask(agent.id, data.task?.slice(0, 30) || "working");
                  } else if (data.status === "waiting") {
                    setThinking(`Waiting before calling ${data.agent}...`);
                    setChat((p) => [...p, { role: "nova", text: `⏳ Waiting before calling ${data.agent}...` }]);
                  } else if (data.status === "retrying") {
                    setThinking(`${data.agent} — retrying...`);
                    setChat((p) => [...p, { role: "nova", text: `🔄 ${data.agent} — retrying...` }]);
                  }
                  break;

                case "delegations": {
                  const names = data.delegations.map((d: { delegate: string }) => d.delegate).join(" + ");
                  setOrchestratorBubble(`→ ${names}`);
                  setTimeout(() => setOrchestratorBubble(""), 3000);
                  setChat((p) => [...p, { role: "nova", text: `Delegating to ${names}...` }]);
                  addTasks(data.delegations);
                  break;
                }

                case "progress":
                  setThinking(`${data.agent}: ${data.message}`);
                  setChat((p) => {
                    // Update the last progress message instead of adding new ones
                    const last = p[p.length - 1];
                    if (last?.role === "nova" && last.text.startsWith("⏳")) {
                      return [...p.slice(0, -1), { role: "nova" as const, text: `⏳ ${data.agent}: ${data.message}` }];
                    }
                    return [...p, { role: "nova" as const, text: `⏳ ${data.agent}: ${data.message}` }];
                  });
                  break;

                case "agent_response": {
                  setChat((p) => [...p, { role: "agent", text: data.response, agentName: data.agent }]);
                  updateTaskStatus(data.agent, "done");
                  const doneAgent = agentDefs.find((a) => a.name.toLowerCase() === data.agent.toLowerCase());
                  if (doneAgent) finishTask(doneAgent.id);
                  break;
                }

                case "agent_error": {
                  setChat((p) => [...p, { role: "agent", text: `Error: ${data.error}`, agentName: data.agent }]);
                  updateTaskStatus(data.agent, "error");
                  const errAgent = agentDefs.find((a) => a.name.toLowerCase() === data.agent.toLowerCase());
                  if (errAgent) finishTask(errAgent.id);
                  break;
                }

                case "action":
                  if (data.type === "repo_created") {
                    setSessionRepos((p) => [...p, data.repo]);
                    setChat((p) => [...p, {
                      role: "agent",
                      text: `📦 Created repo **${data.repo}** → ${data.url}`,
                      agentName: data.agent,
                    }]);
                  }
                  break;

                case "done":
                  setThinking(null);
                  break;

                case "error":
                  setThinking(null);
                  setChat((p) => [...p, { role: "nova", text: `Error: ${data.error}` }]);
                  break;
              }
            } catch {}
            eventName = "";
          }
        }
      }
      setThinking(null);
    } catch {
      setThinking(null);
      setChat((p) => [...p, { role: "nova", text: "Error: could not reach the agents" }]);
    }
  }

  // showAtlasResults removed — streaming handles everything inline

  return (
    <main className="flex-1 flex flex-col font-[family-name:var(--font-mono)] bg-[#1a1a2e] min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 py-2.5 bg-[#0a0a12]/90 backdrop-blur-md border-b border-[#1e1e2e] text-[11px] sticky top-0 z-40">
        {/* Left — Logo + status */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-sm">🏢</span>
            <span className="text-white font-bold tracking-tight">AGENTS OFFICE</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
            <span className="text-[#3a3a4a]">|</span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[#5a5a6a]">
              {agentDefs.filter((a) => agentStates[a.id] === "working").length} working
            </span>
            <span className="text-[#3a3a4a]">·</span>
            <span className="text-[#4a4a5a]">
              {agentDefs.filter((a) => (agentStates[a.id] || "idle") === "idle").length} idle
            </span>
          </div>
        </div>

        {/* Right — Balance + credits + wallet + clock */}
        <div className="flex items-center gap-2">
          {/* Balance pill */}
          <div className="flex items-center gap-1.5 bg-[#12121e] border border-[#1e1e2e] rounded-lg px-2.5 py-1">
            <div className={`w-1.5 h-1.5 rounded-full ${balance > 100 ? "bg-emerald-500" : balance > 0 ? "bg-[#fbbf24]" : "bg-red-500"}`} />
            <span className={`text-[11px] font-bold tabular-nums ${balance > 100 ? "text-emerald-400" : balance > 0 ? "text-[#fbbf24]" : "text-red-400"}`}>
              {(balance / 1_000_000).toFixed(4)}
            </span>
            <span className="text-[8px] text-[#4a4a5a]">USDC</span>
          </div>

          {/* Credits button */}
          <Link
            href="/office/credits"
            className="flex items-center gap-1 bg-[#fbbf24]/10 hover:bg-[#fbbf24]/20 border border-[#fbbf24]/20 text-[#fbbf24] px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors"
          >
            <span>+</span>
            <span className="hidden sm:inline">Load credits</span>
            <span className="sm:hidden">$</span>
          </Link>

          {/* Wallet */}
          <WalletMultiButton className="!bg-[#12121e] !text-[#8b8ba0] !text-[9px] !font-medium !rounded-lg !h-7 !px-2.5 !border !border-[#1e1e2e] hover:!border-[#3a3a4a] !transition-colors" />

          {/* Clock */}
          <span className="hidden sm:inline text-[10px] text-[#3a3a4a]">
            <Clock />
          </span>
        </div>
      </nav>

      <div className="flex-1 flex">
        {/* Office */}
        <section className="flex-1 flex items-center justify-center p-3">
          <div className="relative office-floor rounded-lg border-2 border-[#4a3f35] overflow-hidden scanline-overlay shadow-2xl w-full"
            style={{ maxWidth: "850px", height: "min(480px, 58vh)" }}>

            {/* Walls */}
            <div className="absolute top-0 left-0 right-0 h-[20px] bg-gradient-to-b from-[#6b5e4f] to-[#5c5043] border-b-2 border-[#3a3025]" />
            <div className="absolute top-0 left-0 w-[14px] h-full bg-gradient-to-r from-[#6b5e4f] to-[#5c5043] border-r-2 border-[#3a3025]" />

            {/* Room label */}
            <div className="absolute top-1 left-5 z-20 text-[8px] text-[#8b8ba0]/40 uppercase tracking-widest">engineering</div>

            {/* Lounge area — bottom strip */}
            <div className="absolute bg-[#8b4513]/8 border-t border-[#8b4513]/10" style={{ left: "0%", top: "76%", width: "100%", height: "24%" }} />
            <div className="absolute text-[7px] text-[#8b8ba0]/30 uppercase tracking-widest" style={{ left: "5%", top: "77%" }}>lounge</div>

            {/* Couch left */}
            <div className="absolute bg-[#4a3828] rounded border border-[#3a2a1a]" style={{ left: "22%", top: "84%", width: "80px", height: "12px" }}>
              <div className="absolute -top-[4px] left-0 w-full h-[4px] bg-[#5c4a32] rounded-t border border-b-0 border-[#4a3a25]" />
            </div>

            {/* Couch right */}
            <div className="absolute bg-[#4a3828] rounded border border-[#3a2a1a]" style={{ left: "52%", top: "84%", width: "80px", height: "12px" }}>
              <div className="absolute -top-[4px] left-0 w-full h-[4px] bg-[#5c4a32] rounded-t border border-b-0 border-[#4a3a25]" />
            </div>

            {/* Coffee table */}
            <div className="absolute bg-[#6b5a42] rounded-sm border border-[#5a4a32]" style={{ left: "40%", top: "86%", width: "30px", height: "16px" }} />

            {/* Vending machine */}
            <div className="absolute" style={{ left: "85%", top: "80%" }}>
              <div className="w-[20px] h-[28px] bg-[#3a3a4a] rounded-sm border border-[#4a4a5a]">
                <div className="w-[12px] h-[8px] bg-[#1a3a5c] mx-auto mt-[3px] rounded-[1px]" />
                <div className="w-1 h-1 bg-emerald-400 rounded-full mx-auto mt-[4px]" />
              </div>
            </div>

            {/* Desks */}
            {agentDefs.map((a) => (
              <div key={`desk-${a.id}`} className="absolute" style={{ left: `${a.deskPos.x - 2}%`, top: `${a.deskPos.y - 5}%` }}>
                <Desk />
                <div className="absolute top-[44px] left-[8px]"><Chair /></div>
              </div>
            ))}

            {/* Coffee */}
            <div className="absolute" style={{ left: "55%", top: "70%" }}>
              <CoffeeMachine />
            </div>

            {/* Server rack */}
            <div className="absolute" style={{ right: "3%", top: "25%" }}>
              <ServerRack />
              <div className="blink-led absolute top-[4px] left-[8px] w-[4px] h-[4px] bg-emerald-400 rounded-full" />
            </div>

            {/* Plants */}
            {[{ x: 2, y: 5 }, { x: 92, y: 5 }, { x: 18, y: 78 }, { x: 48, y: 78 }].map((p, i) => (
              <div key={i} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}><Plant /></div>
            ))}

            {/* Whiteboard */}
            <div className="absolute bg-white border-2 border-[#999] rounded-[1px]"
              style={{ left: "30%", top: "3%", width: "50px", height: "16px" }}>
              <div className="flex gap-[2px] p-[2px]">
                <div className="w-3 h-[2px] bg-red-400/50" />
                <div className="w-4 h-[2px] bg-blue-400/50" />
              </div>
            </div>

            {/* Rug under meeting table */}
            <div className="absolute bg-[#8b4513]/10 border border-[#8b4513]/5 rounded-sm"
              style={{ left: "72%", top: "58%", width: "90px", height: "60px" }} />

            {/* Orchestrator */}
            <div className="absolute agent-clickable"
              style={{ left: `${orchestratorPos.x}%`, top: `${orchestratorPos.y}%`, zIndex: selected ? 1 : 50 }}
              onClick={() => setSelected(null)}>
              <AnimatePresence>
                {orchestratorBubble && (
                  <motion.div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#1a1a2e] border border-[#fbbf24] rounded px-2.5 py-1 shadow-lg pointer-events-none whitespace-nowrap z-40"
                    initial={{ opacity: 0, y: 4, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <span className="text-[10px] text-[#fbbf24]">{orchestratorBubble}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-7 h-2 bg-black/20 rounded-full blur-[1px]" />
              <div className="pixel-bob"><OrchestratorSprite /></div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 flex flex-col items-center">
                <span className="text-[8px] font-bold text-[#fbbf24] bg-[#1a1a2e]/80 px-1.5 rounded whitespace-nowrap border border-[#fbbf24]/20">
                  👑 Atlas
                </span>
              </div>
            </div>

            {/* Agents */}
            {agentDefs.map((agent) => {
              const pos = getAgentPos(agent);
              const state = agentStates[agent.id] || "idle";
              const bubble = bubbles[agent.id];
              const task = agentTasks[agent.id];

              return (
                <div key={agent.id}
                  className="absolute agent-move agent-clickable"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: selected ? 1 : Math.round(pos.y) }}
                  onClick={() => setSelected(agent)}>

                  {/* Bubble */}
                  <AnimatePresence>
                    {bubble && (
                      <motion.div
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#1a1a2e] border border-emerald-500 rounded px-2.5 py-1 shadow-lg pointer-events-none whitespace-nowrap z-40"
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <span className="text-[10px] text-emerald-400">{bubble}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Task label when working */}
                  {state === "working" && task && !bubble && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#1a1a2e] border border-[#fbbf24]/30 rounded px-2 py-0.5 pointer-events-none whitespace-nowrap z-30">
                      <span className="text-[8px] text-[#fbbf24]/70">{task}</span>
                    </div>
                  )}

                  <div className="absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-5 h-1.5 bg-black/15 rounded-full blur-[1px]" />
                  <div className={state === "working" ? "pixel-typing" : "pixel-bob"}>
                    <AgentSprite agentIndex={agent.spriteIndex} />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-[6px] h-[6px] rounded-full border border-[#1a1a2e]"
                    style={{ backgroundColor: statusColors[state] }} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5">
                    <span className="text-[8px] text-[#6a6a8a] bg-[#1a1a2e]/80 px-1 rounded whitespace-nowrap">{agent.name}</span>
                  </div>
                </div>
              );
            })}

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#0f0f1a]/80 border-t border-[#2a2a3a] px-3 py-1 z-30">
              <span className="text-[8px] text-[#4a4a5a]">
                idle agents sit in the lounge · tell Nova what you need ↓
              </span>
            </div>
          </div>
        </section>

        {/* Right panel — Chat + Payments */}
        <aside className="hidden md:flex flex-col w-[280px] border-l border-[#2a2a3a] bg-[#0f0f1a] min-h-0 overflow-hidden">
          {/* Chat with Atlas */}
          <div className="flex-1 flex flex-col border-b border-[#2a2a3a] min-h-0">
            <div className="px-3 py-2 border-b border-[#2a2a3a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px]">👑</span>
                <span className="text-[11px] text-white font-bold">Chat with Atlas</span>
              </div>
              <button
                onClick={() => {
                  setChannelId(crypto.randomUUID());
                  setChat([]);
                  setAgentStates((prev) => {
                    const reset: Record<string, "idle" | "working" | "done"> = {};
                    Object.keys(prev).forEach((k) => { reset[k] = "idle"; });
                    return reset;
                  });
                  setAgentTasks({});
                  setBubbles({});
                }}
                className="text-[9px] text-[#5a5a6a] hover:text-white border border-[#2a2a3a] hover:border-[#4a4a6a] px-2 py-0.5 rounded transition-colors"
              >
                + new chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-[#2a2a3a] scrollbar-track-transparent">
              {chat.length === 0 && (
                <p className="text-[10px] text-[#3a3a4a] italic text-center py-4">
                  Tell Atlas what you need built...
                </p>
              )}
              {chat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] rounded-lg px-2.5 py-1.5 ${
                    msg.role === "user"
                      ? "bg-indigo-500/20 border border-indigo-500/30"
                      : msg.role === "agent"
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-[#1a1a2e] border border-[#fbbf24]/20"
                  }`}>
                    {msg.role === "agent" && (
                      <p className="text-[8px] text-emerald-500 font-bold mb-0.5">{msg.agentName}</p>
                    )}
                    {msg.role === "nova" && (
                      <p className="text-[8px] text-[#fbbf24] font-bold mb-0.5">👑 Atlas</p>
                    )}
                    {msg.role === "agent" ? (
                      <div className="prose prose-sm prose-invert max-w-none text-[10px] leading-relaxed text-emerald-300 [&_p]:my-1 [&_pre]:bg-black/30 [&_pre]:rounded [&_pre]:p-2 [&_pre]:text-[9px] [&_pre]:my-1.5 [&_code]:bg-black/30 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[9px] [&_code]:before:content-none [&_code]:after:content-none [&_strong]:font-bold [&_ul]:ml-3 [&_ol]:ml-3 [&_li]:my-0.5 [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-[11px] [&_a]:text-emerald-400">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className={`text-[10px] whitespace-pre-wrap leading-relaxed ${
                        msg.role === "user" ? "text-indigo-300" : "text-[#bba060]"
                      }`}>{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div className={`rounded-lg px-2.5 py-1.5 ${
                    thinking === "Atlas"
                      ? "bg-[#1a1a2e] border border-[#fbbf24]/20"
                      : "bg-emerald-500/10 border border-emerald-500/20"
                  }`}>
                    <p className={`text-[8px] font-bold mb-0.5 ${
                      thinking === "Atlas" ? "text-[#fbbf24]" : "text-emerald-500"
                    }`}>{thinking === "Atlas" ? "👑 Atlas" : thinking}</p>
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms] ${
                        thinking === "Atlas" ? "bg-[#fbbf24]" : "bg-emerald-400"
                      }`} />
                      <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms] ${
                        thinking === "Atlas" ? "bg-[#fbbf24]" : "bg-emerald-400"
                      }`} />
                      <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms] ${
                        thinking === "Atlas" ? "bg-[#fbbf24]" : "bg-emerald-400"
                      }`} />
                      <span className={`text-[9px] ml-1 ${
                        thinking === "Atlas" ? "text-[#fbbf24]/50" : "text-emerald-400/50"
                      }`}>thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-2 border-t border-[#2a2a3a]">
              <div className="flex gap-1.5">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !thinking) handleChat(); }}
                  placeholder={!connected ? "connect wallet first..." : thinking ? `${thinking} is thinking...` : "build me a landing page..."}
                  disabled={!!thinking || !connected}
                  className="flex-1 bg-[#1a1a2e] border border-[#2a2a3a] rounded px-2 py-1.5 text-[10px] text-white placeholder-[#3a3a4a] outline-none focus:border-[#fbbf24]/30 disabled:opacity-40"
                />
                <button onClick={handleChat}
                  disabled={!!thinking || !connected}
                  className="bg-[#fbbf24] text-black px-2 py-1.5 rounded text-[9px] font-bold hover:bg-[#fbbf24]/80 disabled:opacity-40">
                  {thinking ? "..." : "GO"}
                </button>
              </div>
            </div>
          </div>

          {/* Task Board */}
          {tasks.length > 0 && (
            <div className="max-h-[180px] flex flex-col border-b border-[#2a2a3a]">
              <div className="px-3 py-1.5 border-b border-[#2a2a3a] flex items-center justify-between">
                <span className="text-[10px] text-indigo-400 font-bold">TASK BOARD</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] text-emerald-400">{tasks.filter(t => t.status === "done").length}/{tasks.length} done</span>
                  {tasks.every(t => t.status === "done" || t.status === "error") && (
                    <button onClick={() => setTasks([])} className="text-[8px] text-[#3a3a4a] hover:text-[#5a5a6a]">clear</button>
                  )}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      className="px-3 py-1.5 border-b border-[#1a1a2a] flex items-center gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      {/* Status icon */}
                      {task.status === "done" ? (
                        <span className="text-emerald-400 text-[10px]">✓</span>
                      ) : task.status === "error" ? (
                        <span className="text-red-400 text-[10px]">✗</span>
                      ) : task.status === "working" ? (
                        <span className="w-2 h-2 border border-[#fbbf24] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="w-2 h-2 border border-[#3a3a4a] rounded-full" />
                      )}
                      {/* Agent name */}
                      <span className={`text-[10px] font-bold min-w-[40px] ${
                        task.status === "done" ? "text-emerald-400" :
                        task.status === "error" ? "text-red-400" :
                        task.status === "working" ? "text-[#fbbf24]" :
                        "text-[#5a5a6a]"
                      }`}>
                        {task.agent}
                      </span>
                      {/* Task description */}
                      <span className={`text-[9px] flex-1 truncate ${
                        task.status === "done" ? "text-[#4a4a5a] line-through" :
                        task.status === "error" ? "text-red-400/60" :
                        "text-[#6a6a7a]"
                      }`}>
                        {task.task.slice(0, 50)}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* x402 Payments */}
          <div className="h-[200px] flex flex-col">
            <div className="px-3 py-1.5 border-b border-[#2a2a3a] flex items-center justify-between">
              <span className="text-[10px] text-[#fbbf24] font-bold">x402 PAYMENTS</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[9px] text-emerald-400">{payments.filter((p) => p.status === "confirmed").length} txs</span>
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence initial={false}>
                {payments.map((pay) => (
                  <motion.div key={pay.id} className="px-3 py-2 border-b border-[#1a1a2a]"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-white">{pay.agent}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">{pay.amount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {pay.status === "pending" ? (
                        <span className="text-[8px] text-[#fbbf24] flex items-center gap-1">
                          <span className="w-1 h-1 bg-[#fbbf24] rounded-full animate-pulse" />verifying...
                        </span>
                      ) : (
                        <span className="text-[8px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1 h-1 bg-emerald-400 rounded-full" />confirmed
                        </span>
                      )}
                      <span className="text-[7px] text-[#3a3a4a]">{pay.txSig.slice(0, 6)}..</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {payments.length === 0 && (
                <p className="text-[9px] text-[#3a3a4a] text-center py-6">no payments yet</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setSelected(null)} />
            <motion.div className="relative bg-[#12121e] border border-[#2a2a3a] rounded-lg p-5 max-w-sm w-full shadow-2xl"
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-[#1a1a2e] border border-[#2a2a3a] rounded p-2 shrink-0">
                  <AgentSprite agentIndex={selected.spriteIndex} scale={2} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selected.name}</h3>
                  <p className="text-xs text-[#6a6a8a]">{selected.role}</p>
                </div>
                <div className="ml-auto">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[agentStates[selected.id] || "idle"] }} />
                </div>
              </div>
              <p className="text-xs text-[#8b8ba0] leading-relaxed mb-3">{selected.description}</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {selected.skills.map((s) => (
                  <span key={s} className="text-[10px] bg-[#1a1a2e] text-[#6a6a8a] px-1.5 py-0.5 rounded border border-[#2a2a3a]">{s}</span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-[#1a1a2e] border border-[#2a2a3a] rounded p-2 text-center">
                  <p className="text-sm font-bold text-white">{selected.completedTasks}</p>
                  <p className="text-[8px] text-[#5a5a6a]">TASKS</p>
                </div>
                <div className="bg-[#1a1a2e] border border-[#2a2a3a] rounded p-2 text-center">
                  <p className="text-sm font-bold text-white">★ {selected.rating}</p>
                  <p className="text-[8px] text-[#5a5a6a]">RATING</p>
                </div>
                <div className="bg-[#1a1a2e] border border-[#2a2a3a] rounded p-2 text-center">
                  <p className="text-xs font-bold text-emerald-400">${selected.rate.toFixed(2)}</p>
                  <p className="text-[8px] text-[#5a5a6a]">USDC</p>
                </div>
              </div>
              <button className="w-full py-2.5 rounded text-xs font-bold bg-[#2a2a3a] text-[#5a5a6a]"
                onClick={() => setSelected(null)}>
                CLOSE [ESC]
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
