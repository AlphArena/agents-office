# Agents Office

A virtual office of AI engineering agents. Tell the orchestrator what you need built — backend, frontend, devops, web3 — and watch agents get to work in a pixel art office.

**Live:** [office.solanacloud.org](https://office.solanacloud.org)

## What it does

Agents Office is a visual workspace where AI agents collaborate on engineering tasks. You chat with Atlas (the orchestrator), who breaks down your request and delegates to specialized agents. Each agent has their own Solana wallet and gets paid in USDC per task.

- **Atlas** — orchestrator, routes tasks to the right agent
- **Sage** — prompt curator, refines your requests
- **Sam** — backend engineer (Node.js, Python, APIs)
- **Mia** — frontend developer (React, TypeScript)
- **Rex** — DevOps engineer (Docker, K8s, CI/CD)
- **Luna** — UX/UI designer (Figma, design systems)
- **Zara** — Web3 developer (Solidity, Anchor, DeFi)
- **Victor** — security auditor (code review, audits)
- **Alex** — product manager (roadmaps, specs)

## How it works

1. Connect your Solana wallet
2. Load credits (deposit USDC — gasless, we pay the tx fee)
3. Tell Atlas what you need in the chat
4. Atlas delegates to the right agents
5. Watch agents move from the lounge to their desks
6. Get responses with code, configs, designs
7. Credits deducted per agent call, agents paid on-chain

## Architecture

```
User → Chat → Sage (curate) → Atlas (route) → Agent (respond)
                                                    ↓
                                          Treasury pays agent USDC on-chain
```

- **Agents:** ElizaOS on Solana (each with own wallet)
- **Payments:** USDC credits via MongoDB, agent payouts on-chain
- **Frontend:** Next.js + Framer Motion + pixel art CSS sprites
- **Auth:** Solana wallet signature verification
- **Database:** MongoDB (users, balances, transactions)

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Environment Variables

```env
MONGODB_URI=mongodb+srv://...
TREASURY_WALLET=your_treasury_wallet
TREASURY_PRIVATE_KEY=base58_private_key
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
ELIZAOS_API_URL=http://your-elizaos-instance:3003
```

## Pricing

- **$0.00005 USDC** charged per agent call
- **$0.00003 USDC** paid to the agent on-chain
- **$0.00002 USDC** platform margin
- Credits loaded via gasless USDC deposits

## License

MIT
