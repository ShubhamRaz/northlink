# NORTHLINK AI ❄️🚛
### Intelligent Winter Logistics Dispatch & Route Intelligence Copilot

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest%20Passed-green.svg?style=flat&logo=vitest)](https://vitest.dev/)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange.svg?style=flat&logo=google)](https://ai.google.dev/)

NORTHLINK AI is a specialized logistics intelligence platform designed for severe winter freight operations in high-latitude and mountainous corridors (e.g., Edmonton to Yellowknife, Trans-Canada Highway, Alaska Highway). It acts as an autonomous copilot for fleet dispatchers, combining deterministic route optimization, live weather safety scoring, real-time dynamic rerouting, and Gemini AI narrative explanations.

---

## 🏛️ Core Architecture Principles

NORTHLINK strictly enforces separation between deterministic safety logic and generative AI:

```
DATA / WEATHER INTEL
        ↓
DETERMINISTIC SAFETY RULES (Black ice, blizzard, mountain pass closures)
        ↓
ROUTE OPTIMIZER (OSRM + Multi-criteria scoring: Safety, Reliability, Speed)
        ↓
GEMINI AI COPILOT (Generates tactical explanations, risk briefs, and trade-off analysis)
        ↓
HUMAN DISPATCHER (Maintains final decision authority)
```

> **Crucial Design Rule**: Gemini is an **explanation and advisory copilot**, NOT a safety authority or route geometry calculator. Deterministic algorithms evaluate road geometry, hazard distances, and risk factors; Gemini interprets these decisions for the human dispatcher.

---

## ✨ Key Capabilities

1. **Shipment-Scoped Isolation**:
   - Manages multiple concurrent winter shipments independently.
   - Zero state leakage between shipments (route candidates, reroute decisions, vehicle positions, active incidents, and simulation timers remain strictly scoped).

2. **Multi-Factor Route Scoring & Optimization**:
   - Integrates with OSRM (Open Source Routing Machine) to generate primary and resilient alternative corridors.
   - Evaluates road segments against temperature, snowfall, precipitation type, wind speeds, and elevation hazard profiles.

3. **Live Vehicle Journey Simulation**:
   - Vehicle proceeds along actual route polyline coordinates.
   - Dynamic waypoint interpolation, distance completed, remaining kilometers, and dynamic ETA calculation.
   - Real-time route-change continuity without telemetry jumps.

4. **Dynamic Current-Position Rerouting**:
   - Detects active road hazards, closures, and severe weather fronts ahead of the truck.
   - Calculates real-time detours starting from the truck's *exact current position* to destination, leaving completed journey segments immutable.

5. **Server-Side Gemini AI Explanation**:
   - Powered by Google Gemini (`gemini-2.5-flash` / `gemini-2.5-flash-lite`).
   - Secure server-side API proxy prevents client credential leakage.
   - Graceful fallback with deterministic fallback explanations if API quotas or offline conditions occur.

6. **Comprehensive Test Suite**:
   - End-to-end deterministic Vitest test suites verifying shipment lifecycle, current-position rerouting, incident handling, and Gemini fallback robustness.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ or Bun
- npm or bun

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/ShubhamRaz/northlink.git
cd northlink

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```env
# Database (SQLite by default for local prototype)
DATABASE_URL="file:./dev.db"

# Google Gemini API Key (Optional: fallback engine activates if omitted)
GEMINI_API_KEY="your_gemini_api_key_here"
```
*(See `.env.example` for reference. The application safely functions with deterministic mock explanations if no key is provided.)*

### 4. Database Setup
```bash
npx prisma generate
npx prisma db push
```

### 5. Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Running Tests
```bash
npm test
```

---

## 🌐 Vercel Deployment & Production Readiness

NORTHLINK is structured to deploy smoothly on **Vercel**:

- **Framework**: Next.js App Router (v16.1.1)
- **Build Command**: `npm run build` (`next build`)
- **Output**: Fully static and serverless edge compatible API routes.

### Prototype Architecture & Deployment Notes:
- **Database (SQLite / Prisma)**: The local prototype uses SQLite (`file:./dev.db`). When deployed to Vercel's serverless lambdas, SQLite functions ephemerally per invocation. For long-term persistent production deployments, point `DATABASE_URL` to a cloud PostgreSQL database (e.g. Supabase, Neon) and run `npx prisma db push`.
- **Telemetry / GPS**: In this hackathon demonstration, vehicle movements are driven by the deterministic client simulation engine along real OSRM road coordinates.
- **Routing**: Uses public OSRM demonstration servers with built-in geometry fallbacks.
- **AI Explanations**: Server-side Route Handler (`/api/ai/explain`) protects `GEMINI_API_KEY`. When deployed on Vercel, set `GEMINI_API_KEY` in the Vercel Project Settings environment variables.

---

## 🧪 Verification & Audit Status

- ✅ **Build**: Next.js clean production build passes.
- ✅ **Automated Tests**: Vitest suite passes (100% test success across core engine modules).
- ✅ **Security**: Zero tracked secrets (`.env` ignored, server-side API key containment).
- ✅ **State Isolation**: Comprehensive per-shipment memory isolation verified.

---

## 📄 License
MIT License. Built for resilient northern freight logistics.
