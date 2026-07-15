# PromptOps Evaluation Dashboard

## Overview

An enterprise-ready **PromptOps Evaluation Dashboard** built for prompt engineering verification, automated metrics benchmarking, latency/cost tracking, regression detection, and human feedback annotation across multiple LLMs.

**Live Demo:**
- Frontend (Vercel): https://prompt-frontend-gamma.vercel.app
- Backend API (Render): https://prompts-b6sy.onrender.com

> Render's free tier spins down when idle — the first API call after inactivity may take 30–60 seconds to respond.

---

## Objectives

- Understand PromptOps workflows
- Build automated prompt evaluation pipelines
- Compare multiple LLMs
- Implement prompt versioning
- Measure quality, latency, and cost
- Design production AI monitoring systems

---

## Features

- Prompt Library
- Version Control
- Test Suite Management
- Multi-Model Benchmarking
- Automated Evaluation
- Regression Detection
- Cost & Token Analytics
- Latency Monitoring
- Human Feedback Collection
- Dashboard & Reports

---

## Architecture

```
Developer → Prompt Repository → Evaluation Engine → LLM APIs → Metrics Collector → Dashboard → Reports
```

**Data flow in this implementation:**
1. Prompts and versions are authored and stored via the Prompt Library (`backend/database/prompts.json`)
2. Test Suites define input variables, expected outputs, and assertions per prompt
3. The Evaluation Engine (`POST /api/evaluations/run`) compiles prompt templates with test variables and dispatches them across selected models (Gemini 1.5 Flash/Pro, Claude 3.5 Sonnet, GPT-4o)
4. The Metrics Collector scores each response on Correctness, Schema Validation, and Coherence, and calculates latency/token cost
5. Results are persisted to `evaluations.json`, checked against the previous run of the same suite for regressions, and surfaced on the Dashboard with Chart.js visualizations
6. Human reviewers can rate outputs (1–5 stars) and leave commentary, which is saved back to the run record

**Deployment architecture:**
```
GitHub (priya7888/prompts)
   ├── backend/  → Render (Express REST API)
   └── frontend/ → Vercel (static HTML/CSS/JS)

Frontend  ──fetch (CORS)──>  Backend API  ──reads/writes──>  JSON database
```

---

## Installation

### 1. Backend Server Setup

```
cd backend
npm install
npm run dev
```

The API server launches on `http://localhost:5000`.

### 2. Frontend Setup

The frontend is static — no build step required.

```
cd frontend
python -m http.server 3000
```

Then open `http://localhost:3000`.

> For local development, update `API_BASE` at the top of `frontend/app.js` to `http://localhost:5000/api`. In production it points to the deployed Render URL.

---

## Usage

1. **Prompt Library** — Create a prompt with system instructions and a user template (use `{variable}` placeholders). Commit new versions as the prompt is refined; compare versions with the built-in diff viewer.
2. **Test Suites** — Attach a test suite to a prompt, define variable values, an expected output, and assertions (`contains`, `length_less_than`).
3. **Run Evaluations** — Select a prompt version, a test suite, and one or more models, then launch a benchmark run. The console streams progress in real time.
4. **Review Results** — Open the results matrix to compare model outputs side by side, view scores/latency/cost per model, and flag regressions.
5. **Give Feedback** — Rate individual model outputs and leave comments to build a human feedback dataset.
6. **Dashboard** — View aggregate KPIs (avg score, avg latency, total cost, run count) and trend charts across all runs.

---

## Evaluation Framework

Each model response is scored on three automated metrics:

| Metric | Description |
|---|---|
| **Correctness** | Word-overlap match against the expected output, plus assertion pass rate (`contains`, `length_less_than`), blended into a single score |
| **Schema Validation** | Checks output structure conforms to expected format |
| **Coherence** | Simulated fluency/consistency score |

The **average score** for a response is the mean of these three metrics. A run is flagged as a **regression** if a test case's average score drops more than 5 points versus the previous run of the same prompt + suite.

Cost is computed from simulated per-model token pricing (input/output rates) applied to estimated prompt and completion token counts.

---

## API Documentation

### Prompts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/prompts` | Retrieve all prompts |
| POST | `/api/prompts` | Create a new prompt, or commit a new version if `id` is provided |

### Test Suites
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/test-suites` | Retrieve all test suites |
| POST | `/api/test-suites` | Create a new test suite |
| PUT | `/api/test-suites/:id` | Update test cases in a suite |
| DELETE | `/api/test-suites/:id` | Delete a test suite |

### Evaluations & Runs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/evaluations` | Retrieve evaluation run history |
| GET | `/api/evaluations/:id` | Retrieve a single run's details |
| POST | `/api/evaluations/run` | Trigger a benchmark run across selected models |
| POST | `/api/evaluations/:id/feedback` | Submit a rating + comment for a test case result |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | Aggregated KPIs and timeline data for the dashboard |

---

## Screenshots

> _Add dashboard, prompt library, and evaluation matrix screenshots here._

---

## Roadmap

- [ ] Replace simulated model responses with real LLM API calls
- [ ] Add scheduled/automated benchmark runs
- [ ] Add alerting on regression detection
- [ ] Move JSON file storage to a proper database
- [ ] Add authentication for multi-user access
- [ ] Store API keys/secrets via environment variables and a secrets manager

---

## Testing Checklist

- [x] Prompt versions
- [x] Multi-model evaluation
- [ ] Score consistency
- [ ] API failures
- [x] Regression detection
- [x] Report generation

---

## Deployment

- Backend deployed on **Render** (Root Directory: `backend`, Build: `npm install`, Start: `npm start`)
- Frontend deployed on **Vercel** (Root Directory: `frontend`, Framework Preset: Other, no build step)
- CORS enabled on the backend to allow cross-origin requests from the Vercel frontend
- Secrets/config: none currently required beyond `PORT` (Render sets this automatically)
- Monitoring, scheduled benchmarks, and alerting: not yet implemented (see Roadmap)

---

## Folder Structure

```
project/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── database/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── prompts/
├── evaluators/
├── benchmarks/
├── reports/
├── analytics/
├── tests/
└── README.md
```