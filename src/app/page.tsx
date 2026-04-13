"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AgentSprite, OrchestratorSprite } from "@/components/PixelSprites";

const t = {
  en: {
    badge: "8 AI agents ready to work",
    h1_1: "Your AI",
    h1_2: "engineering team",
    subtitle: "Tell Atlas what you need built. He assigns the right agents — backend, frontend, devops, web3. Watch them work in a virtual office.",
    cta: "Enter the office",
    howLink: "How it works",
    meetTitle: "Meet the team",
    meetSub: "Each agent is specialized. Atlas orchestrates — you talk to him, he delegates to whoever fits best.",
    howTitle: "How it works",
    howSub: "One chat. Multiple agents. Real output.",
    talkTitle: "Talk naturally",
    talkSub: "No tickets. No Jira. Just tell Atlas what you want in plain language. He figures out who should do what.",
    ctaTitle: "The office is open",
    ctaSub: "Walk in, tell Atlas what you need. No sign-up, no waiting.",
    agents: [
      { name: "Atlas", role: "Orchestrator", desc: "Receives your request, breaks it down, assigns the right agents", color: "#fbbf24" },
      { name: "Sam", role: "Backend", desc: "Node.js, Python, APIs, databases, microservices", color: "#22c55e" },
      { name: "Mia", role: "Frontend", desc: "React, TypeScript, responsive UIs, web performance", color: "#3b82f6" },
      { name: "Rex", role: "DevOps", desc: "Docker, Kubernetes, CI/CD, Terraform, AWS", color: "#f97316" },
      { name: "Luna", role: "UX/UI", desc: "Figma to code, design systems, accessibility", color: "#a855f7" },
      { name: "Alex", role: "PM", desc: "Roadmaps, user stories, sprint planning, specs", color: "#ec4899" },
      { name: "Zara", role: "Web3", desc: "Solidity, Anchor, smart contracts, DeFi", color: "#06b6d4" },
      { name: "Victor", role: "Auditor", desc: "Code review, security audits, best practices", color: "#ef4444" },
    ],
    steps: [
      { n: "01", title: "Tell Atlas what you need", desc: "\"Build me an API with auth\" — Atlas understands your request and plans the work." },
      { n: "02", title: "Agents get assigned", desc: "Atlas delegates to the right specialists. Sam handles the API, Rex sets up the infra." },
      { n: "03", title: "Watch them work", desc: "Agents move to their desks in the virtual office. You see who's working and what they're doing." },
      { n: "04", title: "Get results", desc: "Code, configs, designs — delivered in the chat. Every task paid in USDC via x402." },
    ],
    chatExample: {
      user: "I need a login page with Google OAuth and a PostgreSQL user table",
      atlas: "Got it. I'll assign this across the team:",
      tasks: ["→ Luna: design the login UI", "→ Mia: implement the frontend", "→ Sam: set up OAuth + DB schema"],
      routes: [
        '> "deploy this to production" → Rex',
        '> "write a REST API for users" → Sam',
        '> "make the landing page responsive" → Mia',
        '> "audit this Solidity contract" → Victor + Zara',
        '> "design a settings page" → Luna',
      ],
    },
    demoAtlas: "Delegating to Sam...",
    demoUser: "Build me an auth API",
    demoSam: "Here's the auth endpoint...",
  },
  es: {
    badge: "8 agentes AI listos para trabajar",
    h1_1: "Tu equipo de",
    h1_2: "ingeniería AI",
    subtitle: "Dile a Atlas lo que necesitás construir. Él asigna los agentes correctos — backend, frontend, devops, web3. Mirá cómo trabajan en una oficina virtual.",
    cta: "Entrar a la oficina",
    howLink: "Cómo funciona",
    meetTitle: "Conocé al equipo",
    meetSub: "Cada agente es especializado. Atlas orquesta — vos hablás con él y él delega a quien corresponda.",
    howTitle: "Cómo funciona",
    howSub: "Un chat. Múltiples agentes. Resultados reales.",
    talkTitle: "Hablá naturalmente",
    talkSub: "Sin tickets. Sin Jira. Solo decile a Atlas lo que querés en lenguaje natural. Él decide quién hace qué.",
    ctaTitle: "La oficina está abierta",
    ctaSub: "Entrá, decile a Atlas lo que necesitás. Sin registro, sin espera.",
    agents: [
      { name: "Atlas", role: "Orquestador", desc: "Recibe tu pedido, lo descompone y asigna a los agentes correctos", color: "#fbbf24" },
      { name: "Sam", role: "Backend", desc: "Node.js, Python, APIs, bases de datos, microservicios", color: "#22c55e" },
      { name: "Mia", role: "Frontend", desc: "React, TypeScript, interfaces responsive, rendimiento web", color: "#3b82f6" },
      { name: "Rex", role: "DevOps", desc: "Docker, Kubernetes, CI/CD, Terraform, AWS", color: "#f97316" },
      { name: "Luna", role: "UX/UI", desc: "Figma a código, design systems, accesibilidad", color: "#a855f7" },
      { name: "Alex", role: "PM", desc: "Roadmaps, user stories, planificación de sprints, specs", color: "#ec4899" },
      { name: "Zara", role: "Web3", desc: "Solidity, Anchor, contratos inteligentes, DeFi", color: "#06b6d4" },
      { name: "Victor", role: "Auditor", desc: "Revisión de código, auditorías de seguridad, buenas prácticas", color: "#ef4444" },
    ],
    steps: [
      { n: "01", title: "Decile a Atlas lo que necesitás", desc: "\"Haceme una API con auth\" — Atlas entiende tu pedido y planifica el trabajo." },
      { n: "02", title: "Se asignan los agentes", desc: "Atlas delega a los especialistas correctos. Sam maneja la API, Rex configura la infra." },
      { n: "03", title: "Mirá cómo trabajan", desc: "Los agentes se mueven a sus escritorios en la oficina virtual. Ves quién trabaja y en qué." },
      { n: "04", title: "Recibí los resultados", desc: "Código, configs, diseños — entregados en el chat. Cada tarea pagada en USDC vía x402." },
    ],
    chatExample: {
      user: "Necesito una página de login con Google OAuth y una tabla de usuarios en PostgreSQL",
      atlas: "Listo. Voy a asignar esto al equipo:",
      tasks: ["→ Luna: diseñar el UI del login", "→ Mia: implementar el frontend", "→ Sam: configurar OAuth + esquema de DB"],
      routes: [
        '> "deployá esto a producción" → Rex',
        '> "escribí una REST API de usuarios" → Sam',
        '> "hacé la landing responsive" → Mia',
        '> "auditá este contrato Solidity" → Victor + Zara',
        '> "diseñá una página de settings" → Luna',
      ],
    },
    demoAtlas: "Delegando a Sam...",
    demoUser: "Haceme una API de auth",
    demoSam: "Acá está el endpoint de auth...",
  },
};

type Lang = "en" | "es";

function AgentCard({ agent, index }: { agent: { name: string; role: string; desc: string; color: string }; index: number }) {
  return (
    <motion.div
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all group"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${agent.color}15`, border: `1px solid ${agent.color}30` }}>
          {agent.name === "Atlas"
            ? <span className="text-xs">👑</span>
            : <AgentSprite agentIndex={index - 1} />
          }
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{agent.name}</p>
          <p className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider" style={{ color: agent.color }}>{agent.role}</p>
        </div>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{agent.desc}</p>
    </motion.div>
  );
}

export default function Landing() {
  const [lang, setLang] = useState<Lang>("en");
  const l = t[lang];

  return (
    <main className="flex-1 flex flex-col font-[family-name:var(--font-sans)] grain">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🏢</span>
          <span className="text-sm font-bold tracking-tight text-white">Agents Office</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLang(lang === "en" ? "es" : "en")}
            className="text-[10px] text-zinc-500 hover:text-white border border-white/10 px-2 py-0.5 rounded transition-colors font-[family-name:var(--font-mono)]"
          >
            {lang === "en" ? "ES" : "EN"}
          </button>
          <a href="#agents" className="hidden sm:inline text-xs text-zinc-500 hover:text-white transition-colors">
            {lang === "en" ? "Agents" : "Agentes"}
          </a>
          <a href="#how" className="hidden sm:inline text-xs text-zinc-500 hover:text-white transition-colors">{l.howLink}</a>
          <Link
            href="/office"
            className="bg-[#fbbf24] text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-[#fbbf24]/80 transition-colors"
          >
            {l.cta}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-20 sm:pt-28 pb-16 overflow-hidden">
        {/* Orbs */}
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[#fbbf24]/5 blur-[120px] top-[-10%] left-[5%] pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px] top-[20%] right-[5%] pointer-events-none" />

        <div className="max-w-3xl mx-auto">
          <motion.div
            className="inline-flex items-center gap-2 border border-[#fbbf24]/20 bg-[#fbbf24]/5 text-[#fbbf24] text-[11px] font-medium px-3.5 py-1 rounded-full mb-6 font-[family-name:var(--font-mono)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <span className="w-1.5 h-1.5 bg-[#fbbf24] rounded-full animate-pulse" />
            {l.badge}
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-white max-w-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            {l.h1_1}
            <br />
            {l.h1_2}
          </motion.h1>

          <motion.p
            className="mt-5 text-zinc-400 text-base sm:text-lg max-w-md leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {l.subtitle}
          </motion.p>

          <motion.div
            className="flex gap-3 mt-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link
              href="/office"
              className="bg-[#fbbf24] text-black px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#fbbf24]/80 transition-all"
            >
              {l.cta}
            </Link>
            <a
              href="#how"
              className="border border-white/10 text-zinc-400 px-6 py-2.5 rounded-xl text-sm hover:text-white hover:border-white/20 transition-all"
            >
              {l.howLink}
            </a>
          </motion.div>
        </div>

        {/* Floating pixel agents preview */}
        <motion.div
          className="absolute right-[8%] top-[30%] hidden lg:block float-slow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0c0c14] border border-[#fbbf24]/30 rounded px-2 py-0.5">
              <span className="text-[9px] text-[#fbbf24] font-[family-name:var(--font-mono)]">Atlas</span>
            </div>
            <OrchestratorSprite scale={3} />
          </div>
        </motion.div>
        <motion.div
          className="absolute right-[18%] top-[55%] hidden lg:block float-slow-delay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <AgentSprite agentIndex={2} scale={2} />
        </motion.div>
        <motion.div
          className="absolute right-[4%] top-[60%] hidden lg:block float-slow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <AgentSprite agentIndex={4} scale={2} />
        </motion.div>
      </section>

      {/* Demo preview */}
      <section className="px-6 pb-20 max-w-4xl mx-auto w-full">
        <motion.div
          className="relative rounded-xl overflow-hidden border border-white/[0.06] bg-[#0f0f1a] shadow-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Fake browser bar */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.04] bg-[#0a0a12]">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <span className="ml-3 text-[10px] text-zinc-600 font-[family-name:var(--font-mono)]">agents.office/office</span>
          </div>

          <div className="flex">
            {/* Office mockup */}
            <div className="flex-1 p-4">
              <div className="office-floor rounded-lg border border-[#4a3f35]/30 h-[200px] relative overflow-hidden">
                <div className="absolute top-2 left-3 text-[7px] text-zinc-400/40 font-[family-name:var(--font-mono)] uppercase tracking-widest">engineering floor</div>
                {/* Mini agents */}
                <div className="absolute pixel-bob" style={{ left: "15%", top: "30%" }}><AgentSprite agentIndex={0} /></div>
                <div className="absolute pixel-typing" style={{ left: "40%", top: "25%" }}><AgentSprite agentIndex={1} /></div>
                <div className="absolute pixel-bob" style={{ left: "60%", top: "40%" }}><AgentSprite agentIndex={2} /></div>
                <div className="absolute pixel-idle" style={{ left: "30%", top: "55%" }}><AgentSprite agentIndex={3} /></div>
                <div className="absolute" style={{ left: "50%", top: "35%" }}><OrchestratorSprite /></div>
              </div>
            </div>

            {/* Chat mockup */}
            <div className="w-[220px] border-l border-white/[0.04] p-3">
              <p className="text-[9px] text-white font-bold mb-2">👑 Chat with Atlas</p>
              <div className="space-y-2">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded px-2 py-1 text-right">
                  <p className="text-[8px] text-indigo-300">{l.demoUser}</p>
                </div>
                <div className="bg-white/[0.03] border border-[#fbbf24]/10 rounded px-2 py-1">
                  <p className="text-[7px] text-[#fbbf24] font-bold">Atlas</p>
                  <p className="text-[8px] text-zinc-400">{l.demoAtlas}</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded px-2 py-1">
                  <p className="text-[7px] text-emerald-400 font-bold">Sam</p>
                  <p className="text-[8px] text-emerald-300/70">{l.demoSam}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Agents */}
      <section id="agents" className="border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <motion.div
            className="mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-white mb-3">{l.meetTitle}</h2>
            <p className="text-sm text-zinc-500 max-w-md">{l.meetSub}</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {l.agents.map((agent, i) => (
              <AgentCard key={agent.name} agent={agent} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <motion.div
            className="mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-white mb-3">{l.howTitle}</h2>
            <p className="text-sm text-zinc-500 max-w-md">{l.howSub}</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {l.steps.map((step, i) => (
              <motion.div
                key={step.n}
                className="flex gap-4"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="text-[#fbbf24]/30 text-xs font-[family-name:var(--font-mono)] pt-1 shrink-0 w-6">{step.n}</span>
                <div>
                  <p className="text-sm font-medium text-white mb-1">{step.title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Chat example */}
      <section className="border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <motion.h2
                className="text-2xl font-bold text-white mb-3"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                {l.talkTitle}
              </motion.h2>
              <motion.p
                className="text-sm text-zinc-500 leading-relaxed mb-4"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                {l.talkSub}
              </motion.p>
              <motion.div
                className="space-y-2 text-xs text-zinc-600 font-[family-name:var(--font-mono)]"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                {l.chatExample.routes.map((r, i) => <p key={i}>{r}</p>)}
              </motion.div>
            </div>

            <motion.div
              className="bg-[#0a0a12] border border-white/[0.06] rounded-xl p-4 space-y-3"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 ml-8">
                <p className="text-[11px] text-indigo-300">{l.chatExample.user}</p>
              </div>
              <div className="bg-[#1a1a2e] border border-[#fbbf24]/15 rounded-lg px-3 py-2 mr-8">
                <p className="text-[9px] text-[#fbbf24] font-bold mb-1">👑 Atlas</p>
                <p className="text-[11px] text-zinc-400">{l.chatExample.atlas}</p>
                {l.chatExample.tasks.map((task, i) => <p key={i} className={`text-[10px] text-zinc-500 ${i === 0 ? "mt-1" : ""}`}>{task}</p>)}
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2 mr-8">
                <p className="text-[9px] text-emerald-400 font-bold mb-1">Sam</p>
                <p className="text-[10px] text-emerald-300/60 font-[family-name:var(--font-mono)]">CREATE TABLE users (</p>
                <p className="text-[10px] text-emerald-300/60 font-[family-name:var(--font-mono)]">&nbsp;&nbsp;id UUID PRIMARY KEY,</p>
                <p className="text-[10px] text-emerald-300/60 font-[family-name:var(--font-mono)]">&nbsp;&nbsp;email VARCHAR UNIQUE,</p>
                <p className="text-[10px] text-emerald-300/60 font-[family-name:var(--font-mono)]">&nbsp;&nbsp;...</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <motion.h2
            className="text-2xl sm:text-3xl font-bold text-white mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {l.ctaTitle}
          </motion.h2>
          <motion.p
            className="text-sm text-zinc-500 mb-8 max-w-sm mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {l.ctaSub}
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link
              href="/office"
              className="inline-block bg-[#fbbf24] text-black px-8 py-3 rounded-xl text-sm font-bold hover:bg-[#fbbf24]/80 transition-all"
            >
              {l.cta}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-zinc-700">
          <div className="flex items-center gap-2">
            <span>🏢</span>
            <span>Agents Office</span>
          </div>
          <div className="flex gap-5 font-[family-name:var(--font-mono)]">
            <a href="#agents" className="hover:text-zinc-400 transition-colors">agents</a>
            <a href="#how" className="hover:text-zinc-400 transition-colors">how</a>
            <Link href="/office" className="hover:text-zinc-400 transition-colors">office</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
