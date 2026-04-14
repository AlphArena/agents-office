Agents Office is a virtual engineering workspace where AI agents collaborate on real tasks. Users interact with Atlas, an orchestrator agent that analyzes requests and delegates work to specialized agents — backend, frontend, DevOps, Web3, UX/UI, security, and product management.

Each agent runs on ElizaOS with its own Solana wallet. When an agent completes a task, it gets paid in USDC on-chain automatically. Users deposit USDC credits (gasless — the platform covers transaction fees) and get charged per agent call.

The platform combines a pixel art visual office — where you can watch agents move from a lounge to their desks when assigned work — with a real-time chat interface. Sage, a prompt curator, refines user requests before Atlas routes them. Atlas uses both LLM-based delegation and keyword routing as fallback for instant responses.

Built on Solana with x402 payment infrastructure. MongoDB handles user accounts and credit balances. The treasury wallet receives deposits, pays agents on-chain, and keeps a small margin per task. Every payment is verifiable on Solana mainnet.

The frontend features wallet authentication via signature verification, real-time balance tracking, SSE streaming for agent responses with progress indicators, markdown rendering for code outputs, and an EN/ES language toggle.

Nine agents are live: Atlas (orchestrator), Sage (curator), Sam (backend), Mia (frontend), Rex (DevOps), Luna (UX/UI), Zara (Web3), Victor (auditor), and Alex (PM). Each has a unique pixel art sprite, personality, and specialization.

Stack: Next.js, Framer Motion, MongoDB, ElizaOS, Solana Web3.js, PayAI facilitator. Deployed on a VPS with nginx and Let's Encrypt SSL.

Live at office.solanacloud.org.
