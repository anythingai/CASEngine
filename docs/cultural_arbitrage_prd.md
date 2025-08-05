# Cultural Arbitrage Signal Engine — Product Requirements Document (PRD)

**Tagline:** *Trade the trend before it trends — with taste‑powered alpha.*  
**Team/Startup:** Anything.ai  
**Hackathon:** [Qloo LLM Hackathon 2025](https://qloo-hackathon.devpost.com/)  
**Tech Stack (MVP → product):** React + shadcn/ui (dark, minimal), TailwindCSS, Node.js (TypeScript, Express/Fastify), Qloo Taste AI, OpenAI/Claude, CoinGecko, OpenSea, Twitter/X & Farcaster.

---

## Table of Contents

1. [Overview & Purpose](#overview--purpose)
2. [Problem & Market Opportunity](#problem--market-opportunity)
3. [Goals & Success Criteria](#goals--success-criteria)
4. [Target Personas](#target-personas)
5. [Core Features (MVP)](#core-features-mvp)
6. [User Flows & UX](#user-flows--ux)
7. [System Architecture](#system-architecture)
8. [APIs & Data Integrations](#apis--data-integrations)
9. [Data Model (Types)](#data-model-types)
10. [Backend API Endpoints](#backend-api-endpoints)
11. [Demo Scope & Video Outline](#demo-scope--video-outline)
12. [Non‑Functional Requirements](#non-functional-requirements)
13. [Monetization & Pricing](#monetization--pricing)
14. [Milestones & First Steps](#milestones--first-steps)
15. [Risks & Mitigations](#risks--mitigations)
16. [Repository Structure](#repository-structure)
17. [Setup & Environment](#setup--environment)
18. [Acceptance Criteria & Test Checklist](#acceptance-criteria--test-checklist)
19. [Roadmap (Post‑Hackathon)](#roadmap-post-hackathon)

---

## Overview & Purpose

**Cultural Arbitrage Signal Engine** is a web3 trend‑intelligence platform that maps **emerging cultural “vibes”** (via Qloo’s Taste AI) to **onchain opportunities** (tokens, NFTs, DAOs). It helps traders, collectors, and analysts act on “**taste alpha**” before it becomes market consensus.  
**Purpose for hackathon:** deliver a compelling MVP that demonstrates end‑to‑end cultural→crypto correlation with a polished, dark, minimal UI and a <3‑minute demo.

---

## Problem & Market Opportunity

- Crypto/NFT markets are **narrative‑driven**, but tools lean on technicals or raw social chatter without **cultural context**.  
- Users struggle to **detect pre‑viral trends** and map them to investable assets.  
- Opportunity: a **first‑in‑category** product that fuses **taste graphs** with **onchain data**, creating differentiated, explainable discovery and signals.

---

## Goals & Success Criteria

### Hackathon Goals (2–3 weeks)

- Working MVP: **Qloo + LLM + asset scan** + visual dashboard.  
- **Demo‑able** UX (React + shadcn/ui dark theme); public URL + GitHub repo + <3‑min video.  
- Show 2–3 curated themes with **explainable** cultural→asset mappings.

**Success =** Judges can input a vibe → see a clear **taste map** → view **relevant tokens/NFTs** with concise explanations and (optional) simulated PnL.

### Post‑Hackathon (0–6 months)

- Alpha launch to early users; measure retention and willingness to pay.  
- Add notifications, saved “vibe” watchlists, and creator “scout” marketplace.  
- Explore **SaaS + data licensing**; evaluate an onchain **Taste Index** product.

---

## Target Personas

| Persona | Goals | Pain Points | How We Help |
|---|---|---|---|
| **Crypto “Alpha” Trader** | Find early narratives; act before pump | Noise overload, late entries | Taste→asset correlations + early signal flags |
| **NFT Collector/Curator** | Discover culturally aligned mints | Hard to assess non‑financial value | Taste map + NFT matches with rationale |
| **Cultural/Trend Analyst** | Track culture→onchain | Fragmented sources, no bridge | Unified, explainable cultural graph + asset lens |

---

## Core Features (MVP)

1. **AI Theme Expansion** – LLM expands a user’s vibe (e.g., *“gothcore futurism”*) into related entities (films, music, subcultures).  
2. **Qloo Taste Correlations** – Query Qloo to retrieve statistically correlated entities across domains.  
3. **Multi‑Source Asset Scan** – Map expanded taste entities to:  
   - **OpenSea** (collections/items by names/keywords)  
   - **CoinGecko** (tokens by name/description; market data)  
   - **Twitter/X & Farcaster** (trending mentions, high‑engagement posts)  
4. **Taste Map Visualization** – Interactive graph linking **theme → cultural nodes → assets**.  
5. **Signal Cards** – Asset cards with relevance rationale, basic metrics (price/volume/floor), and links out (OpenSea, CoinGecko).  
6. **(Optional) Simulated Trade Log** – Quick “what‑if” basket/ROI simulation for selected assets.

**Non‑MVP (planned):** alerts, saved watchlists, scout marketplace, Taste Index, user auth.

---

## User Flows & UX

**Primary flow:**  

1) User enters a **vibe** →  
2) LLM expands →  
3) Qloo returns correlated entities →  
4) Backend scans OpenSea/CoinGecko/Twitter/Farcaster →  
5) UI shows **taste map** + **signal cards** →  
6) User explores details or simulates a basket.

**UI (React + shadcn/ui, dark minimal):**

- Header with brand, **Theme toggle** (default dark), and “Examples” (e.g., *solarpunk*, *Y2K*, *Afrofuturism*).  
- Search bar → results page with:  
  - **Graph canvas** (center): nodes for vibe, cultural entities, and assets.  
  - **Right panel**: Signal cards (token/NFT), score, rationale, links.  
  - **Bottom sheet**: Selected assets → quick **simulate** basket.

---

## System Architecture

**Frontend**

- **React** (Vite or Next.js), **TypeScript**, **TailwindCSS**, **shadcn/ui** (Radix‑based components), **next-themes** for dark mode.  
- Viz: **D3/visx/react-force-graph** for network; **Recharts/Plotly** for charts.

**Backend**

- **Node.js + TypeScript**; **Express** (or **Fastify**) for REST.  
- Services: `gptService`, `qlooService`, `openseaService`, `coingeckoService`, `socialService` (Twitter/Farcaster).  
- **Parallel async orchestration**, response normalization, scoring.  
- **Caching**: in‑memory + optional **Redis**.  
- **Deploy**: Vercel (FE), Railway/Render/AWS (BE). Docker‑ready.

**Data Flow**

```
Client (vibe) → /expand (LLM) → /taste (Qloo) → /assets (OpenSea/CoinGecko/Social)
→ fused JSON → Graph + Cards on UI
```

---

## APIs & Data Integrations

- **Qloo Taste AI** – correlated entities across culture domains.  
- **OpenAI/Claude** – prompt‑engineered theme expansion; optional rationale text.  
- **OpenSea** – search collections/items; basic market stats.  
- **CoinGecko** – token search + price/volume/market cap + sparkline.  
- **Twitter/X & Farcaster** – search mentions; count engagements; optional top posts.

**Key notes:**  

- Keep prompts **deterministic** (JSON output where possible).  
- Respect rate limits; cache frequent queries; pre‑curate 2–3 demo vibes.  
- Never expose API keys on client; all calls proxied via backend.

---

## Data Model (Types)

```ts
// Shared types (packages/shared or server/src/types.ts)
export type ThemeExpansion = {
  input: string;
  keywords: string[];        // canonicalized
  entities: { type: 'artist'|'film'|'brand'|'genre'|'other'; name: string }[];
};

export type AssetMatch = {
  id: string;                // token id / collection slug
  kind: 'token'|'nft'|'dao';
  name: string;
  source: 'opensea'|'coingecko'|'manual';
  relevance: number;         // 0..1 composite score
  rationale: string;         // short “why included”
  metrics?: { price?: number; change24h?: number; volume24h?: number; floorEth?: number };
  links?: { opensea?: string; coingecko?: string; website?: string; twitter?: string };
};

export type TrendResult = {
  theme: string;
  expanded: ThemeExpansion;
  assets: AssetMatch[];
  graph: {
    nodes: { id: string; label: string; type: 'theme'|'entity'|'asset' }[];
    edges: { from: string; to: string; kind: 'expands'|'correlates'|'mapsTo' }[];
  };
  createdAt: string;
};
```

---

## Backend API Endpoints

```
POST /api/expand
  body: { theme: string }
  resp: ThemeExpansion

POST /api/taste
  body: { expansion: ThemeExpansion }
  resp: { entities: ThemeExpansion['entities'] }

POST /api/assets
  body: { expansion: ThemeExpansion }
  resp: { assets: AssetMatch[] }

POST /api/search   // full pipeline for UI
  body: { theme: string }
  resp: TrendResult

POST /api/simulate
  body: { assets: { id: string, weight?: number }[] }
  resp: { basket: { valueNow: number, valuePrev: number, roiPct: number } }
```

---

## Demo Scope & Video Outline

**Scope (judging‑friendly):**

- 2–3 curated vibes (e.g., *solarpunk*, *gothcore futurism*, *Y2K revival*).  
- Live calls: LLM expansion + Qloo correlations + at least one asset source.  
- Graph + cards + (optional) quick simulation.

**<3‑Minute Video Outline:**

1. **Hook (0:00–0:15):** “Culture moves markets. We map vibes to crypto alpha.”  
2. **Input (0:15–0:35):** Enter a vibe → see expansion terms.  
3. **Taste (0:35–1:10):** Qloo entities populate; explain cross‑domain traversal.  
4. **Assets (1:10–2:10):** Tokens/NFTs appear with rationales; quick chart peeks.  
5. **Sim/CTA (2:10–2:50):** Simulate basket; link‑out to OpenSea/CoinGecko.  
6. **Close (2:50–3:00):** “Trade the trend before it trends — taste‑powered alpha.”

---

## Non‑Functional Requirements

- **Performance:** First content within **2–3s**; progressive reveal; target <8s full pipeline.  
- **Reliability:** Graceful fallbacks if any API fails; retries; partial results OK.  
- **Security:** Keys server‑side; HTTPS; CORS locked to FE origin.  
- **Accessibility:** Radix primitives via shadcn/ui; keyboard nav; sufficient contrast.  
- **Observability:** Basic request logs; error tracking (Sentry); simple metrics.

---

## Monetization & Pricing

- **SaaS (Freemium → Pro $29–$99/mo):** higher limits, alerts, deeper metrics.  
- **B2B/Data API:** feeds for funds, platforms, or media (monthly licensing).  
- **Scout Marketplace:** creator strategies/signals with revenue share.  
- **Onchain Taste Index (exploratory):** tokenized index of top “vibe baskets.”

---

## Milestones & First Steps

| Phase | Milestone | Outcome |
|---|---|---|
| Week 0 | PRD sign‑off, repo scaffold | Monorepo + envs set |
| Week 1 | LLM + Qloo wired, mock UI | End‑to‑end text JSON |
| Week 2 | OpenSea + CoinGecko + Social | Asset cards populated |
| Week 3 | Graph viz + polish (shadcn) | Demo‑ready build |
| Week 4 | Deploy + video + Devpost | Public URL + GitHub + <3‑min video |

**Immediate next steps:**  

- Generate API keys; stub endpoints; ship `/api/search` returning mock TrendResult; wire UI to mocks; replace mocks incrementally.

---

## Risks & Mitigations

- **API latency/costs** → Parallelize, cache, cap free tier, pre‑curate demo.  
- **Noisy/irrelevant matches** → Prompt guardrails, top‑N filters, confidence scores.  
- **LLM hallucination** → JSON schema prompts, verification heuristics.  
- **UX complexity** → Example vibes, tooltips, minimal steps, strong defaults.  
- **Dependence on data vendors** → Modular services; alt sources; prefetch/caching.

---

## Repository Structure

```
cultural-arbitrage/
├─ apps/
│  ├─ web/                 # React + shadcn/ui (Vite/Next)
│  └─ api/                 # Node TS (Express/Fastify)
├─ packages/
│  ├─ shared/              # types, utils
│  └─ ui/                  # (optional) shared UI primitives
├─ .github/workflows/      # CI (lint/test/deploy)
└─ README.md
```

---

## Setup & Environment

**Frontend**

```bash
npx create-next-app@latest web --ts
cd web && npm i tailwindcss @radix-ui/react-icons class-variance-authority clsx tailwind-merge lucide-react next-themes
npx shadcn-ui@latest init
# add components: button, card, input, dialog, sheet, tabs, table, tooltip, toast
```

**Backend**

```bash
mkdir api && cd api
npm init -y && npm i express zod axios dotenv pino cors
npm i -D typescript ts-node-dev @types/express @types/node
npx tsc --init
```

**.env (api)**

```
QLOO_API_KEY=...
OPENAI_API_KEY=...
OPENSEA_API_KEY=...
COINGECKO_BASE=https://api.coingecko.com/api/v3
TWITTER_BEARER=... (optional)
FARCASTER_API_KEY=... (optional)
ALLOWED_ORIGIN=https://your-frontend.app
```

---

## Acceptance Criteria & Test Checklist

- [ ] Entering a vibe returns **expanded terms** (LLM) within 2–3s.  
- [ ] Qloo returns **correlated entities** that appear on the graph.  
- [ ] At least **one asset** (NFT or token) is mapped with rationale.  
- [ ] Graph interactions (hover/focus) + cards open details reliably.  
- [ ] Links out (OpenSea/CoinGecko) work; no keys exposed.  
- [ ] Demo examples (2–3 vibes) produce **compelling, believable** results.  
- [ ] README includes run steps; Devpost page includes story + media.

---

## Roadmap (Post‑Hackathon)

- **Alerts & Watchlists**, **auth** (wallet or email), **multi‑query compare**.  
- **Scout marketplace** (publish/share strategies; revenue share).  
- **Deeper data** (Discord/Reddit sentiment; Dune/on‑chain metrics).  
- **Taste Index** backtesting, index token pilot, and partner integrations.
