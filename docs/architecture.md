# RECALL-X Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER                                           │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js + React)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │Dashboard │  │ Preflight│  │ Record   │  │ Explore  │  │ History  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTP/JSON
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI + Python)                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      API LAYER (routes.py)                          │   │
│  │  /health  /experiments  /preflight  /recall  /ask  /stats           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                       │
│         ┌──────────────────────────┼──────────────────────────┐           │
│         ▼                          ▼                          ▼           │
│  ┌─────────────┐          ┌─────────────────┐         ┌─────────────┐   │
│  │  Experiment │          │  Preflight      │         │   Memory    │   │
│  │   Store     │          │   Engine        │         │   Client    │   │
│  └─────────────┘          └─────────────────┘         └─────────────┘   │
│         │                          │                          │           │
│         └──────────────────────────┼──────────────────────────┘           │
│                                    ▼                                       │
│                    ┌─────────────────────────────┐                        │
│                    │      HINDSIGHT MEMORY       │                        │
│                    │  ┌───────────────────────┐  │                        │
│                    │  │   Memory Bank         │  │                        │
│                    │  │  (PostgreSQL + Vector)│  │                        │
│                    │  └───────────────────────┘  │                        │
│                    │            │                │                        │
│                    │  ┌─────────┴─────────┐     │                        │
│                    │  │  Retain / Recall /│     │                        │
│                    │  │  Reflect          │     │                        │
│                    │  └───────────────────┘     │                        │
│                    └─────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Record Experiment

```
User Input (Form)
      │
      ▼
Validate (Pydantic)
      │
      ▼
Convert to Natural Language
      │
      ▼
Hindsight Retain API
      │
      ▼
Memory Bank stores:
  - Extracted facts (world/experience/observation)
  - Entity links
  - Temporal relationships
  - Document metadata
      │
      ▼
Return Memory ID
```

### 2. Experiment Preflight

```
User Proposes Experiment
      │
      ▼
Parse: proposed_action + current_conditions + context
      │
      ▼
Hindsight Recall (semantic search)
      │
      ▼
Historical Experiments Retrieved
      │
      ▼
Condition Comparison Engine
      │
      ├── Extract conditions from each historical experiment
      ├── Normalize keys (snake_case)
      ├── Compare each condition: historical vs current
      ├── Score similarity per condition
      └── Compute overall similarity
      │
      ▼
Evidence Assessment
      │
      ├── Categorize by outcome (success/failure/partial)
      ├── Identify key differences & similarities
      ├── Assess applicability of historical outcomes
      │
      ▼
LLM Reasoning (via Hindsight Reflect or direct)
      │
      ├── Known from memory (direct retrieval)
      ├── Inference (reasoning from evidence)
      ├── Unknown (gaps in knowledge)
      │
      ▼
Generate Preflight Response
      │
      ├── Recommendation (4 levels)
      ├── Confidence score
      ├── Reasoning narrative
      ├── Historical evidence with similarity scores
      ├── Condition comparison table
      ├── Risks & side effects
      ├── Suggested test
      └── Evidence classification
```

## Memory Model

### Experiment Schema

```python
Experiment:
  - id: str (Hindsight memory ID)
  - title: str
  - situation: str
  - hypothesis: str
  - action: str
  - conditions: Dict[str, Any]  # Flexible key-value
  - observation: str
  - outcome: Enum[SUCCESS, FAILURE, PARTIAL, UNKNOWN]
  - side_effects: List[str]
  - decision: str
  - lesson: str
  - domain: str
  - tags: List[str]
  - confidence: float (0-1)
  - timestamp: datetime
  - memory_id: str (Hindsight reference)
```

### Hindsight Storage Format

Experiments are stored as natural language documents:

```
Experiment: Increase API timeout from 10s to 15s
Situation: High traffic API service experiencing request failures...
Hypothesis: Increasing timeout will reduce failed requests...
Action: Changed API gateway timeout from 10 seconds to 15 seconds
Conditions: {"traffic_rpm": 2000, "connection_pool": 50, ...}
Observation: Requests stayed alive longer but connection pool exhausted...
Outcome: failure
Side Effects: Connection pool exhaustion, Increased queue depth...
Decision: Reverted to 10s timeout immediately
Lesson: 15s timeout is unsafe under high traffic (2000+ rpm) with small connection pool (50).
Domain: api-configuration
Tags: timeout, connection-pool, high-traffic, failure
Confidence: 0.95
```

Hindsight automatically:
- Extracts semantic facts
- Identifies entities (API, timeout, connection pool, traffic)
- Creates temporal links
- Builds knowledge graph connections

## Preflight Reasoning Pipeline

### Condition Comparison Algorithm

```python
def compare_conditions(historical: Dict, current: Dict) -> List[ConditionComparison]:
    for each condition_key in union(historical.keys(), current.keys()):
        hist_val = historical.get(key)
        curr_val = current.get(key)
        
        if hist_val == curr_val: similarity = "identical"
        elif both numeric:
            diff_pct = abs(hist - curr) / abs(hist) * 100
            similarity = bucket(diff_pct)  # very_similar <10%, similar <30%, etc.
        elif both strings: similarity = "identical" if lower_equal else "different"
        elif missing: similarity = "missing_in_historical" or "missing_in_current"
        else: similarity = "different"
```

### Similarity Scoring

```python
weights = {
    "identical": 1.0,
    "very_similar": 0.9,
    "similar": 0.7,
    "moderately_different": 0.4,
    "significantly_different": 0.2,
    "different": 0.1,
    "missing_in_historical": 0.0,
    "missing_in_current": 0.5,
}

overall_similarity = mean(weights[sim] for sim in all_comparisons)
```

### Recommendation Logic

| Similarity | Historical Outcomes | Recommendation |
|------------|---------------------|----------------|
| >70% | Only failures | AVOID (80% conf) |
| >70% | Only successes | PROCEED_CONTROLLED (75%) |
| >70% | Mixed | PROCEED_CAUTION (60%) |
| 40-70% | Any | PROCEED_CAUTION (50%) |
| <40% | Any | GATHER_EVIDENCE (40%) |
| No evidence | N/A | GATHER_EVIDENCE (30%) |

### Evidence Classification

Every preflight response classifies information:

- **Known from Memory**: Direct quotes from retrieved experiments
- **Inference**: Reasoning derived from evidence
- **Unknown**: Explicitly acknowledged gaps

This prevents hallucination and builds trust.

## Memory Evolution

### The Problem with Static Labels

Traditional systems label experiments: `GOOD` or `BAD`.

### RECALL-X Approach: Conditional Knowledge

```
Experiment A: 15s timeout @ 2000 rpm, pool=50 → FAILURE
    Lesson: "Unsafe under high traffic with small pool"

Experiment B: 15s timeout @ 700 rpm, pool=150 → SUCCESS  
    Lesson: "Works under low traffic with large pool"

Combined Understanding (via Recall + Reasoning):
    "15s timeout caused failures under 2000 rpm with pool=50,
     but succeeded at 700 rpm with pool=150."
```

### Implementation

1. **Store each experiment independently** with full conditions
2. **Recall retrieves all relevant experiments** for a query
3. **Preflight compares conditions** and presents evidence
4. **LLM Reasoning synthesizes** conditional understanding
5. **Ask Memory** returns synthesized view

No manual "update" needed — the memory evolves through retrieval + reasoning.

## Hindsight Integration Details

### Configuration

```python
# backend/app/config/settings.py
HINDSIGHT_API_URL = "http://localhost:8000"
HINDSIGHT_BANK_ID = "recall-x-experiments"
HINDSIGHT_API_KEY = ""  # Optional for local
```

### Client Methods

| Method | Hindsight Endpoint | Purpose |
|--------|-------------------|---------|
| `retain()` | `POST /banks/{id}/memories` | Store experiment |
| `recall()` | `POST /banks/{id}/recall` | Search relevant experiments |
| `reflect()` | `POST /banks/{id}/reflect` | Ask memory questions |
| `list_memories()` | `GET /banks/{id}/memories/list` | List all for dashboard |

### Bank Disposition

For production, configure bank disposition in Hindsight:

```yaml
# Hindsight bank config
disposition: |
  You are an experimental memory system for engineering teams.
  Focus on: conditions, outcomes, side effects, lessons.
  When reasoning: distinguish known/inferred/unknown.
  Never fabricate historical evidence.
```

## Frontend Architecture

### Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Dashboard | Stats, recent experiments, quick actions |
| `/preflight` | Preflight | Main feature: experiment pre-check |
| `/record` | Record | Form to add experiments |
| `/explore` | Explore | Search memory (recall) |
| `/history` | History | Timeline of all experiments |
| `/history/[id]` | Detail | Full experiment view |

### State Management

- React `useState` / `useEffect` for local state
- API client (`lib/api.ts`) for server communication
- No global state library needed (simple app)

### UI Components

- `Layout` — Main wrapper with sidebar
- `Sidebar` — Navigation + memory status
- Custom components in each page (SectionCard, EvidenceCard, etc.)

## API Design

### Request/Response Models (Pydantic)

```python
# Experiment
ExperimentCreate: title, situation, hypothesis, action, conditions, ...
ExperimentResponse: ExperimentCreate + id, timestamp, memory_id

# Preflight
PreflightRequest: proposed_action, current_conditions, context
PreflightResponse: recommendation, confidence, reasoning, 
                   historical_evidence[], condition_comparison[],
                   risks[], suggested_test,
                   known_from_memory[], inference[], unknown[]

# Recall
RecallRequest: query, limit
RecallResponse: memories[], total
```

### Error Handling

- `422` — Validation error (Pydantic)
- `404` — Experiment not found
- `500` — Hindsight/LLM unavailable
- `503` — Hindsight disconnected

All errors return: `{ "detail": "message" }`

## Deployment Considerations

### Development

```bash
# Terminal 1: Hindsight
cd hindsight-ai && ./start_hindsight.sh

# Terminal 2: Backend
cd recall-x/backend && uvicorn app.main:app --reload --port 8001

# Terminal 3: Frontend
cd recall-x/frontend && npm run dev
```

### Production

1. **Hindsight**: Deploy with Docker Compose (includes PostgreSQL)
2. **Backend**: Containerize FastAPI, run behind reverse proxy
3. **Frontend**: Build Next.js (`npm run build`), serve static or via Node
4. **Environment**: Set all secrets via environment variables
5. **CORS**: Configure `FRONTEND_URL` in backend

### Scaling

- Hindsight handles memory scaling (PostgreSQL + vector index)
- Backend is stateless — horizontal scaling possible
- Frontend is static — CDN deployment

## Security

- No authentication in demo (add OAuth2 Proxy for production)
- Hindsight API key for memory access
- LLM API key stored in backend only
- CORS restricted to frontend origin
- Input validation via Pydantic

## Future Enhancements

1. **Multi-tenant banks** — Separate memory per team/project
2. **Automatic consolidation** — Use Hindsight observations for evolved lessons
3. **Slack/Teams integration** — Preflight in chat
4. **GitOps integration** — Link experiments to PRs/commits
5. **Metric correlation** — Auto-fetch conditions from monitoring
6. **Experiment templates** — Standardized forms per domain