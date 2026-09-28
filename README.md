# RECALL-X

> **An AI Agent That Remembers Why Experiments Failed — Before You Repeat Them.**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue.svg)](https://typescriptlang.org)
[![Hindsight](https://img.shields.io/badge/Hindsight-Memory%20System-purple.svg)](https://hindsight.vectorize.io)

---

## The Problem

Engineering teams repeatedly experiment with configurations — API timeouts, database pools, model parameters, deployment settings. The context and consequences of previous experiments are easily forgotten.

**Normal AI systems know general information. RECALL-X remembers YOUR organization's experimental experience.**

---

## Core Idea

RECALL-X stores structured experimental experience:

```
Situation → Hypothesis → Action → Conditions → Observation → Outcome → Side Effects → Decision → Lesson
```

When you propose a new experiment, RECALL-X:
1. **Recalls** relevant historical experiments from Hindsight memory
2. **Compares** historical conditions against your current conditions
3. **Reasons** about whether past outcomes apply to your situation
4. **Recommends** with evidence — not blind rules

---

## Killer Feature: Experiment Preflight

```
User: "I want to increase API timeout from 10s to 15s. Current traffic: 700 rpm, pool: 150."

RECALL-X:
├── Historical Evidence: 15s timeout failed at 2000 rpm with pool=50 (connection pool exhaustion)
├── Condition Comparison: Traffic 700 vs 2000 (significantly different), Pool 150 vs 50 (significantly different)
├── Reasoning: "The historical failure occurred under substantially different traffic and pool conditions. 
│               The previous result is relevant evidence but not a direct prediction."
└── Recommendation: "Proceed with controlled test" (confidence: 60%)
```

---

## Memory Evolution

RECALL-X demonstrates that memory evolves:

| Experiment | Conditions | Outcome | Lesson |
|------------|-----------|---------|--------|
| 1 | 15s timeout, 2000 rpm, pool=50 | ❌ Failure | 15s unsafe under high traffic with small pool |
| 2 | 15s timeout, 700 rpm, pool=150 | ✅ Success | 15s works under low traffic with large pool |

**Combined Understanding:** *"15s timeout caused failures under 2000 rpm with pool=50, but succeeded at 700 rpm with pool=150."*

This conditional knowledge is far more valuable than simple GOOD/BAD labels.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend  │────▶│  FastAPI     │────▶│   Hindsight     │
│  (Next.js)  │     │  Backend     │     │  Memory Bank    │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                    ┌──────┴──────┐
                    │ Preflight   │
                    │ Engine      │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │    LLM      │
                    │  Reasoning  │
                    └─────────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API** | FastAPI + Pydantic | REST endpoints for experiments, preflight, recall |
| **Memory** | Hindsight | Persistent agent memory (retain/recall/reflect) |
| **Reasoning** | Python + LLM | Condition comparison, evidence assessment, recommendation |
| **Frontend** | Next.js 14 + TypeScript + Tailwind | Dashboard, preflight UI, memory explorer, history |
| **Storage** | Hindsight (PostgreSQL) | Experiment memories, observations, entities |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Hindsight running (see below)

### 1. Start Hindsight

```bash
# Clone and start Hindsight (provides memory backend)
git clone https://github.com/hindsight-ai/hindsight-ai
cd hindsight-ai
cp .env.example .env
# Add your LLM_API_KEY to .env
./start_hindsight.sh

# Hindsight runs on http://localhost:8000
```

### 2. Configure RECALL-X Backend

```bash
cd recall-x/backend
cp .env.example .env
# Edit .env with your settings:
# HINDSIGHT_API_URL=http://localhost:8000
# HINDSIGHT_BANK_ID=recall-x-experiments
# LLM_API_KEY=your_openai_key (for reasoning)
```

### 3. Install & Run Backend

```bash
cd recall-x/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### 4. Install & Run Frontend

```bash
cd recall-x/frontend
npm install
cp .env.example .env.local
npm run dev
```

### 5. Seed Demo Data

```bash
cd recall-x
python seed/demo_experiments.py
```

### 6. Open Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

---

## Demo Walkthrough (60 seconds)

1. **Open Dashboard** — See 8 seeded experiments (failures, successes, partials)
2. **Go to Preflight** — Form pre-filled with demo scenario
3. **Run Preflight** — Watch RECALL-X:
   - Retrieve historical 15s timeout failure (2000 rpm, pool=50)
   - Compare conditions (700 rpm, pool=150 vs 2000 rpm, pool=50)
   - Explain why failure may not apply
   - Recommend "Proceed with controlled test"
4. **Ask Memory** — "What happened when we tried 15s timeout?"
5. **Record New Result** — Add outcome, see memory evolve

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/experiments` | Record new experiment |
| `GET` | `/api/experiments` | List all experiments |
| `GET` | `/api/experiments/{id}` | Get experiment details |
| `POST` | `/api/preflight` | Run preflight analysis |
| `POST` | `/api/recall` | Search memory |
| `POST` | `/api/ask` | Ask memory (reflect) |
| `GET` | `/api/stats` | Dashboard statistics |

---

## Project Structure

```
recall-x/
├── backend/
│   ├── app/
│   │   ├── api/routes.py          # FastAPI endpoints
│   │   ├── config/settings.py     # Pydantic settings
│   │   ├── memory/
│   │   │   ├── hindsight_client.py # Hindsight HTTP client
│   │   │   └── experiment_store.py # Experiment ↔ Hindsight
│   │   ├── models/experiment.py   # Pydantic models
│   │   ├── reasoning/preflight.py # Condition comparison + LLM reasoning
│   │   └── main.py                # FastAPI app
│   ├── tests/test_preflight.py    # Unit tests
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Dashboard
│   │   ├── preflight/page.tsx     # Experiment Preflight
│   │   ├── record/page.tsx        # Record Experiment
│   │   ├── explore/page.tsx       # Memory Explorer
│   │   └── history/page.tsx       # Experiment History
│   ├── components/
│   │   ├── Layout.tsx             # Main layout with sidebar
│   │   └── Sidebar.tsx            # Navigation sidebar
│   └── lib/
│       ├── api.ts                 # API client
│       └── utils.ts               # Helpers
├── seed/
│   └── demo_experiments.py        # 8 realistic demo experiments
├── docs/
│   └── architecture.md            # Architecture documentation
└── README.md
```

---

## Environment Variables

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `HINDSIGHT_API_URL` | Hindsight API base URL | `http://localhost:8000` |
| `HINDSIGHT_API_KEY` | Hindsight API key | `` |
| `HINDSIGHT_BANK_ID` | Memory bank ID | `recall-x-experiments` |
| `LLM_API_KEY` | OpenAI-compatible API key | `` |
| `LLM_MODEL_NAME` | Model for reasoning | `gpt-4o-mini` |
| `APP_PORT` | Backend port | `8001` |
| `FRONTEND_URL` | CORS origin | `http://localhost:3000` |

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

Tests cover:
- Experiment creation & validation
- Preflight with no historical evidence
- Preflight with high-similarity failure
- Preflight with different conditions
- Condition comparison logic
- Similarity scoring
- Mixed historical evidence

---

## Hindsight Integration

RECALL-X uses Hindsight's three core operations:

### Retain (Store)
```python
await hindsight_client.retain(content, metadata)
# Extracts facts, entities, builds knowledge graph
```

### Recall (Search)
```python
await hindsight_client.recall(query, limit, filters)
# Multi-strategy: semantic + keyword + graph + temporal
```

### Reflect (Reason)
```python
await hindsight_client.reflect(question, disposition)
# Retrieves relevant memories, applies disposition, LLM reasons
```

The experiment store maps structured experiment data to Hindsight's natural language format, enabling rich retrieval and reasoning.

---

## Team Contributions

| Member | Role | Responsibilities |
|--------|------|------------------|
| **Member 1** | Project Lead / AI & Memory Engineer | Architecture, Hindsight integration, memory schema, reasoning pipeline, LLM integration, deployment |
| **Member 2** | Backend Support Developer | API endpoints, request/response models, database metadata, API testing, bug fixes |
| **Member 3** | Frontend & UI Support Developer | Dashboard, experiment forms, preflight UI, memory explorer, history, responsive UI |
| **Member 4** | Testing & Documentation Support | Test scenarios, edge cases, validation, screenshots, README, demo support |

---

## License

MIT License — See [LICENSE](LICENSE) for details.