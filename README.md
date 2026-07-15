# PromptOps Evaluation Dashboard (Project 5 Capstone)

An enterprise-ready **PromptOps Evaluation Dashboard** built for prompt engineering verification, automated metrics benchmarks, latency/cost tracking, regression checks, and human feedback annotation.

## 🚀 Features

- **Prompt Library & Version Control**: Write, store, and manage system prompts and templates. Version increments are tracked automatically, with full side-by-side git-like code diffing.
- **Test Suite Builder**: Define input variables, expected target strings, and check assertions (`contains`, `length_less_than`).
- **Parallel Multi-Model Benchmarking**: Compare responses across models (Gemini 1.5 Pro, Gemini 1.5 Flash, Claude 3.5 Sonnet, GPT-4o) with realistic simulated network speeds, token consumption, and model pricing.
- **Metrics & Automated Analytics**: Tracks Correctness, Schema Validation, Coherence, Latency, and Costs. Visualizes stats using Interactive Chart.js charts.
- **Regression Detection**: Flags prompt updates that degrade response quality relative to previous runs of the same suite.
- **Human Annotation loop**: Rate individual outputs (1-5 stars) and record text commentary, immediately persisting feedback to the server database.

---

## 📂 Folder Structure

```
promptops_dashboard/
├── backend/
│   ├── server.js            # Express REST backend
│   ├── package.json         # Node configurations & scripts
│   └── database/            # Local JSON database (prompts, suites, runs)
├── frontend/
│   ├── index.html           # SPA entry point with responsive dashboard
│   ├── style.css            # Premium dark-theme glassmorphic CSS rules
│   └── app.js               # Event routing, API handler, Chart.js renderers
├── prompts/                 # Folder for committed raw prompt text files
├── evaluators/              # Metrics formulations documentation
├── benchmarks/              # Benchmarks configuration records
├── reports/                 # Export folder for evaluation outputs
├── analytics/               # Aggregation files documentation
├── tests/                   # API validation test script
└── README.md                # Project documentation
```

---

## 🛠️ Installation & Execution

### 1. Backend Server Setup
From the `backend/` directory, install packages and start the API:
```bash
cd backend
npm install
npm run dev
```
The API server will launch on `http://localhost:5000`.

### 2. Launching the Frontend Application
Since the frontend consists of static assets, you can run it directly:
- Simply open the `frontend/index.html` file in your preferred web browser, or:
- Use any local dev server, such as Live Server in VS Code, or python:
```bash
cd frontend
python -m http.server 3000
```
Then navigate to `http://localhost:3000`.

---

## 🧪 Running Integration Tests
Make sure the Express API server is running on port 5000:
```bash
cd backend
npm test
```
This executes the integration tests inside `tests/api.test.js`, validating prompt CRUD operations, test suite retrieves, and dashboard analytics endpoints.

---

## 🔌 API Reference

### Prompts
- `GET /api/prompts` - Retrieve prompt list.
- `POST /api/prompts` - Create new prompt or commit next version.

### Test Suites
- `GET /api/test-suites` - Retrieve list of suites.
- `POST /api/test-suites` - Create a suite.
- `PUT /api/test-suites/:id` - Update test cases.
- `DELETE /api/test-suites/:id` - Delete suite.

### Evaluations & Runs
- `GET /api/evaluations` - Retrieve evaluations history.
- `GET /api/evaluations/:id` - Retrieve run details.
- `POST /api/evaluations/run` - Trigger automated benchmark pipeline.
- `POST /api/evaluations/:id/feedback` - Save rating and reviewer commentary.

### Analytics
- `GET /api/analytics/dashboard` - Aggregated average metrics for KPIs and timeline charts.
