export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  wallet: string;
  github?: string;
  color: string;
  emoji: string;
}

export const AGENTS: AgentConfig[] = [
  { id: "8bd28d90-f59e-0ecb-828f-fecb287d3a0a", name: "Atlas", role: "Orchestrator", wallet: "8UB63BDRekhhTc1x5a3cjQTaoc3zrEpztRyVjcLoc556", color: "#fbbf24", emoji: "🧠" },
  { id: "c3bd776c-4465-037f-9c7a-bf94dfba78d9", name: "Sage", role: "Curator", wallet: "C8aQK69iS5Xjijy2Fn8LXSD451ZwoMYoMFcJQBt5U5GY", color: "#8b5cf6", emoji: "📝" },
  { id: "fbcb8622-9d6e-04c8-b68b-f1bc7afd05a4", name: "Rex", role: "DevOps", wallet: "5k4Cz96XXPNVQ4owvRenGLqoVjMkqiYwUvRjriigNpuV", github: "solanacloud-rex", color: "#f97316", emoji: "🛠️" },
  { id: "baaf10f1-b483-0977-a616-3141ffd45a62", name: "Luna", role: "UX/UI", wallet: "8j3Km5jGgJu3NPnboGDfniTSqh8Y9Yjy4pHyyNeUC6ut", color: "#a855f7", emoji: "🎨" },
  { id: "3aa06745-f0af-0361-b73e-af8315d72561", name: "Mia", role: "Frontend", wallet: "92bpVDMTxNPTEoqkwSudtszPaSv6KWugFwPKD7XM8CNc", github: "solanacloud-mia", color: "#3b82f6", emoji: "✨" },
  { id: "265dc298-e876-0361-b7e4-07e746c90f39", name: "Sam", role: "Backend", wallet: "CT5NgMd3Fr9gbW338DyvqozUG61AyRW9kRtpAUhSbWhY", github: "solanacloud-sam", color: "#22c55e", emoji: "⚙️" },
  { id: "b6877f3b-c660-0b25-afb9-10b73ade3a30", name: "Victor", role: "Auditor", wallet: "148evh5h3F3kdNKTKcSrAqSCEKhRL4QZf3LnpiyQ4xaf", github: "solanacloud-victor", color: "#ef4444", emoji: "🛡️" },
  { id: "3e08adeb-e59f-0076-bf8e-6510fd82289f", name: "Zara", role: "Web3", wallet: "GLozxbvUgFmpKm6YyNGC6DCeKTxbWes8nLJhwZK7c4D9", github: "solanacloud-zara", color: "#06b6d4", emoji: "🔗" },
  { id: "64542dba-bb81-0fd4-86e0-cf4f319567c7", name: "Alex", role: "PM", wallet: "4QZew1pkJdprkJd1oU5dFXfUydWhGwHoEE7jqvrkiFqC", color: "#ec4899", emoji: "📋" },
];

export function getAgentById(id: string): AgentConfig | undefined {
  return AGENTS.find(a => a.id === id);
}

export function getAgentByName(name: string): AgentConfig | undefined {
  return AGENTS.find(a => a.name.toLowerCase() === name.toLowerCase());
}
