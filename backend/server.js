const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Paths to our JSON files
const DB_DIR = path.join(__dirname, 'database');
const PROMPTS_FILE = path.join(DB_DIR, 'prompts.json');
const TEST_SUITES_FILE = path.join(DB_DIR, 'test_suites.json');
const EVALUATIONS_FILE = path.join(DB_DIR, 'evaluations.json');

// Ensure DB directory and files exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const initJsonFile = (filePath, defaultData) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
  }
};

initJsonFile(PROMPTS_FILE, []);
initJsonFile(TEST_SUITES_FILE, []);
initJsonFile(EVALUATIONS_FILE, []);

// Helper to read data
function readData(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

// Helper to write data
function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// -------------------------------------------------------------
// Prompts Endpoints
// -------------------------------------------------------------

// Get all prompts
app.get('/api/prompts', (req, res) => {
  const prompts = readData(PROMPTS_FILE);
  res.json(prompts);
});

// Create prompt or add new version
app.post('/api/prompts', (req, res) => {
  const { id, name, description, systemPrompt, userPromptTemplate } = req.body;
  const prompts = readData(PROMPTS_FILE);

  if (id) {
    // Adding a new version to an existing prompt
    const promptIdx = prompts.findIndex(p => p.id === id);
    if (promptIdx === -1) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const prompt = prompts[promptIdx];
    const newVersionNum = prompt.latestVersion + 1;
    const newVersion = {
      version: newVersionNum,
      systemPrompt,
      userPromptTemplate,
      createdAt: new Date().toISOString()
    };

    prompt.latestVersion = newVersionNum;
    prompt.versions.push(newVersion);
    if (description) prompt.description = description;
    if (name) prompt.name = name;

    prompts[promptIdx] = prompt;
    writeData(PROMPTS_FILE, prompts);
    return res.status(200).json(prompt);
  } else {
    // Creating a completely new prompt
    const newId = 'prompt-' + Date.now();
    const newPrompt = {
      id: newId,
      name: name || 'New Prompt',
      description: description || '',
      createdAt: new Date().toISOString(),
      latestVersion: 1,
      versions: [
        {
          version: 1,
          systemPrompt: systemPrompt || '',
          userPromptTemplate: userPromptTemplate || '',
          createdAt: new Date().toISOString()
        }
      ]
    };

    prompts.push(newPrompt);
    writeData(PROMPTS_FILE, prompts);
    return res.status(201).json(newPrompt);
  }
});

// -------------------------------------------------------------
// Test Suites Endpoints
// -------------------------------------------------------------

// Get all test suites
app.get('/api/test-suites', (req, res) => {
  const suites = readData(TEST_SUITES_FILE);
  res.json(suites);
});

// Create a new test suite
app.post('/api/test-suites', (req, res) => {
  const { name, description, promptId, variables, testCases } = req.body;
  const suites = readData(TEST_SUITES_FILE);

  const newSuite = {
    id: 'suite-' + Date.now(),
    name: name || 'New Test Suite',
    description: description || '',
    promptId,
    variables: variables || [],
    testCases: (testCases || []).map((tc, idx) => ({
      id: tc.id || `tc-${Date.now()}-${idx}`,
      variables: tc.variables || {},
      expected: tc.expected || '',
      assertions: tc.assertions || []
    }))
  };

  suites.push(newSuite);
  writeData(TEST_SUITES_FILE, suites);
  res.status(201).json(newSuite);
});

// Update a test suite
app.put('/api/test-suites/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, promptId, variables, testCases } = req.body;
  const suites = readData(TEST_SUITES_FILE);

  const idx = suites.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Test suite not found' });
  }

  suites[idx] = {
    ...suites[idx],
    name: name !== undefined ? name : suites[idx].name,
    description: description !== undefined ? description : suites[idx].description,
    promptId: promptId !== undefined ? promptId : suites[idx].promptId,
    variables: variables !== undefined ? variables : suites[idx].variables,
    testCases: testCases !== undefined ? testCases.map((tc, tcIdx) => ({
      id: tc.id || `tc-${Date.now()}-${tcIdx}`,
      variables: tc.variables || {},
      expected: tc.expected || '',
      assertions: tc.assertions || []
    })) : suites[idx].testCases
  };

  writeData(TEST_SUITES_FILE, suites);
  res.json(suites[idx]);
});

// Delete a test suite
app.delete('/api/test-suites/:id', (req, res) => {
  const { id } = req.params;
  let suites = readData(TEST_SUITES_FILE);
  const exists = suites.some(s => s.id === id);

  if (!exists) {
    return res.status(404).json({ error: 'Test suite not found' });
  }

  suites = suites.filter(s => s.id !== id);
  writeData(TEST_SUITES_FILE, suites);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Evaluations / Run Benchmarks Endpoints
// -------------------------------------------------------------

// Get all evaluation runs
app.get('/api/evaluations', (req, res) => {
  const evaluations = readData(EVALUATIONS_FILE);
  // Sort with most recent first
  evaluations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(evaluations);
});

// Get evaluation run by ID
app.get('/api/evaluations/:id', (req, res) => {
  const evaluations = readData(EVALUATIONS_FILE);
  const run = evaluations.find(r => r.id === req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'Evaluation run not found' });
  }
  res.json(run);
});

// Submit feedback for a test case inside a run
app.post('/api/evaluations/:id/feedback', (req, res) => {
  const { id } = req.params;
  const { testCaseId, modelName, rating, comment } = req.body;
  const evaluations = readData(EVALUATIONS_FILE);

  const runIdx = evaluations.findIndex(r => r.id === id);
  if (runIdx === -1) {
    return res.status(404).json({ error: 'Evaluation run not found' });
  }

  const run = evaluations[runIdx];
  const resultIdx = run.results.findIndex(res => res.testCaseId === testCaseId);
  if (resultIdx === -1) {
    return res.status(404).json({ error: 'Test case result not found in this run' });
  }

  const modelOutput = run.results[resultIdx].modelOutputs[modelName];
  if (!modelOutput) {
    return res.status(404).json({ error: 'Model output not found for this test case' });
  }

  modelOutput.feedback = {
    rating: parseInt(rating),
    comment: comment || '',
    updatedAt: new Date().toISOString()
  };

  evaluations[runIdx] = run;
  writeData(EVALUATIONS_FILE, evaluations);
  res.json({ success: true, feedback: modelOutput.feedback });
});

// Trigger Evaluation Run (Mock Engine)
app.post('/api/evaluations/run', async (req, res) => {
  const { promptId, version, testSuiteId, selectedModels } = req.body;

  const prompts = readData(PROMPTS_FILE);
  const suites = readData(TEST_SUITES_FILE);
  const evaluations = readData(EVALUATIONS_FILE);

  const prompt = prompts.find(p => p.id === promptId);
  if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

  const promptVer = prompt.versions.find(v => v.version === parseInt(version));
  if (!promptVer) return res.status(404).json({ error: 'Prompt version not found' });

  const suite = suites.find(s => s.id === testSuiteId);
  if (!suite) return res.status(404).json({ error: 'Test suite not found' });

  if (!selectedModels || selectedModels.length === 0) {
    return res.status(400).json({ error: 'Please select at least one model to run the benchmark' });
  }

  // Find previous runs of this suite and prompt to check for regressions
  const previousRuns = evaluations.filter(r => r.promptId === promptId && r.testSuiteId === testSuiteId);
  // Sort by date descending to find the latest run
  previousRuns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const latestPrevRun = previousRuns[0];

  const results = [];
  let totalLatency = 0;
  let totalCost = 0;
  let totalScoresSum = 0;
  let scoreCount = 0;

  // Process each test case
  for (const tc of suite.testCases) {
    const tcResult = {
      testCaseId: tc.id,
      variables: tc.variables,
      expected: tc.expected,
      modelOutputs: {}
    };

    // Simulate for each selected model
    for (const model of selectedModels) {
      // Compile prompt templates with variables
      let userPrompt = promptVer.userPromptTemplate;
      for (const [key, value] of Object.entries(tc.variables)) {
        userPrompt = userPrompt.replace(new RegExp(`{${key}}`, 'g'), value);
      }

      // Simulate execution time (latency)
      let baseLatency = 400;
      let latencyVar = Math.random() * 300;
      let pricing = { input: 0, output: 0 }; // pricing per token

      switch (model) {
        case 'gemini-1.5-flash':
          baseLatency = 250;
          pricing = { input: 0.000000075, output: 0.0000003 };
          break;
        case 'gemini-1.5-pro':
          baseLatency = 550;
          pricing = { input: 0.00000125, output: 0.000005 };
          break;
        case 'claude-3-5-sonnet':
          baseLatency = 600;
          pricing = { input: 0.000003, output: 0.000015 };
          break;
        case 'gpt-4o':
          baseLatency = 700;
          pricing = { input: 0.000005, output: 0.000015 };
          break;
      }

      const latency = Math.round(baseLatency + latencyVar);

      // Generate output based on prompt version and case
      let simulatedOutput = '';
      if (promptId === 'prompt-1') {
        // Customer support query classification
        const isV1 = promptVer.version === 1;
        const query = tc.variables.query || '';
        let category = 'General Inquiry';
        if (query.toLowerCase().includes('password') || query.toLowerCase().includes('locked out') || query.toLowerCase().includes('account')) {
          category = 'Account Security';
        } else if (query.toLowerCase().includes('charge') || query.toLowerCase().includes('billing') || query.toLowerCase().includes('paid') || query.toLowerCase().includes('$')) {
          category = 'Billing';
        } else if (query.toLowerCase().includes('crash') || query.toLowerCase().includes('flash') || query.toLowerCase().includes('error') || query.toLowerCase().includes('bug')) {
          category = 'Technical Support';
        }

        if (isV1) {
          // Version 1 of support classifier is wordy and not fully formatted
          if (model === 'gemini-1.5-flash') {
            simulatedOutput = `I think this falls under ${category === 'Account Security' ? 'Accounts' : category === 'Technical Support' ? 'Technical' : category}. Reason: The user is talking about system functions.`;
          } else {
            simulatedOutput = `Category: ${category === 'Account Security' ? 'Accounts' : category === 'Technical Support' ? 'Technical' : category}\n\nLet me know if you need additional help troubleshooting!`;
          }
        } else {
          // Version 2 strictly adheres to outputting category name
          simulatedOutput = category;
        }
      } else if (promptId === 'prompt-2') {
        // Summarizer prompt
        const review = tc.variables.review || '';
        const containsCamera = review.toLowerCase().includes('camera');
        if (containsCamera) {
          simulatedOutput = "The camera offers excellent battery life and crisp image quality, but is let down by an uncomfortable neck strap and its heavy weight.\n\nPros:\n- Long-lasting battery life\n- Crisp image quality\nCons:\n- Uncomfortable strap\n- Heavy and bulky";
        } else {
          simulatedOutput = "The product satisfies basic needs but has design limitations.\n\nPros:\n- Good basic functions\nCons:\n- Poor ergonomics";
        }
      } else {
        // Custom prompt: do general mock responses
        simulatedOutput = `[Simulated Response from ${model}]: Executed prompt v${version} successfully. Expected match criteria: "${tc.expected}".`;
      }

      // Calculate tokens
      const promptTokens = Math.round((promptVer.systemPrompt.length + userPrompt.length) / 4);
      const completionTokens = Math.round(simulatedOutput.length / 4);
      const cost = (promptTokens * pricing.input) + (completionTokens * pricing.output);

      // Automated metric evaluation
      let correctness = 50;
      let schemaScore = 100;
      let coherence = Math.round(80 + Math.random() * 20);

      // 1. Correctness score based on expected matches
      if (tc.expected) {
        const expectedWords = tc.expected.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
        const outputText = simulatedOutput.toLowerCase();
        let matches = 0;
        expectedWords.forEach(w => {
          if (outputText.includes(w)) matches++;
        });
        correctness = Math.round((matches / expectedWords.length) * 100);
        if (outputText.includes(tc.expected.toLowerCase())) {
          correctness = 100;
        }
      }

      // Add variation based on model capacity
      if (model === 'gemini-1.5-flash') {
        correctness = Math.max(20, correctness - 10);
      } else if (model === 'gpt-4o' || model === 'claude-3-5-sonnet') {
        correctness = Math.min(100, correctness + 10);
      }

      // 2. Assertion scoring
      let assertionsPassed = 0;
      if (tc.assertions && tc.assertions.length > 0) {
        tc.assertions.forEach(assertion => {
          if (assertion.type === 'contains') {
            if (simulatedOutput.toLowerCase().includes(assertion.value.toLowerCase())) {
              assertionsPassed++;
            }
          } else if (assertion.type === 'length_less_than') {
            if (simulatedOutput.length < parseInt(assertion.value)) {
              assertionsPassed++;
            }
          }
        });
        const assertionScore = Math.round((assertionsPassed / tc.assertions.length) * 100);
        // Correctness score is a blend of string-overlap and assertion passes
        correctness = Math.round((correctness + assertionScore) / 2);
      }

      const averageScore = Math.round((correctness + schemaScore + coherence) / 3 * 10) / 10;

      // Check regression relative to previous run
      let regression = false;
      if (latestPrevRun) {
        const prevTc = latestPrevRun.results.find(r => r.testCaseId === tc.id);
        if (prevTc && prevTc.modelOutputs[model]) {
          const prevScore = prevTc.modelOutputs[model].averageScore;
          // Regression if score decreases by more than 5 points
          if (prevScore - averageScore > 5) {
            regression = true;
          }
        }
      }

      tcResult.modelOutputs[model] = {
        output: simulatedOutput,
        latency,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens
        },
        cost: parseFloat(cost.toFixed(6)),
        scores: {
          correctness,
          schema: schemaScore,
          coherence
        },
        averageScore,
        regression,
        feedback: null
      };

      totalLatency += latency;
      totalCost += cost;
      totalScoresSum += averageScore;
      scoreCount++;
    }

    results.push(tcResult);
  }

  // Assemble the summary metadata
  const newRunId = 'run-' + Date.now();
  const evaluationRun = {
    id: newRunId,
    promptId,
    promptVersion: parseInt(version),
    testSuiteId,
    createdAt: new Date().toISOString(),
    models: selectedModels,
    summary: {
      avgScore: Math.round((totalScoresSum / scoreCount) * 10) / 10,
      avgLatency: Math.round(totalLatency / scoreCount),
      totalCost: parseFloat(totalCost.toFixed(6)),
      testCaseCount: suite.testCases.length
    },
    results
  };

  evaluations.push(evaluationRun);
  writeData(EVALUATIONS_FILE, evaluations);

  // Return with a tiny delay to simulate real network request latency
  setTimeout(() => {
    res.status(201).json(evaluationRun);
  }, 1000);
});

// -------------------------------------------------------------
// Analytics Endpoints
// -------------------------------------------------------------

app.get('/api/analytics/dashboard', (req, res) => {
  const evaluations = readData(EVALUATIONS_FILE);
  const prompts = readData(PROMPTS_FILE);

  if (evaluations.length === 0) {
    return res.json({
      avgScore: 0,
      avgLatency: 0,
      totalCost: 0,
      runCount: 0,
      modelChartData: {},
      runsTimeline: []
    });
  }

  // 1. Calculations for KPIs
  let totalScore = 0;
  let totalLatency = 0;
  let totalCost = 0;
  evaluations.forEach(e => {
    totalScore += e.summary.avgScore;
    totalLatency += e.summary.avgLatency;
    totalCost += e.summary.totalCost;
  });

  const avgScore = Math.round((totalScore / evaluations.length) * 10) / 10;
  const avgLatency = Math.round(totalLatency / evaluations.length);
  const runCount = evaluations.length;

  // 2. Timeline chart data (Runs chronologically)
  // Sort evaluations ascending to build progress timeline
  const chronologicalRuns = [...evaluations].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const runsTimeline = chronologicalRuns.map(run => {
    const prompt = prompts.find(p => p.id === run.promptId);
    return {
      id: run.id,
      promptName: prompt ? prompt.name : 'Unknown Prompt',
      version: run.promptVersion,
      createdAt: run.createdAt,
      avgScore: run.summary.avgScore,
      avgLatency: run.summary.avgLatency,
      totalCost: run.summary.totalCost
    };
  });

  // 3. Multi-model breakdown (averages per model across all runs)
  const modelStats = {};
  evaluations.forEach(run => {
    run.results.forEach(tc => {
      Object.entries(tc.modelOutputs).forEach(([modelName, out]) => {
        if (!modelStats[modelName]) {
          modelStats[modelName] = { scoreSum: 0, latencySum: 0, costSum: 0, count: 0 };
        }
        modelStats[modelName].scoreSum += out.averageScore;
        modelStats[modelName].latencySum += out.latency;
        modelStats[modelName].costSum += out.cost;
        modelStats[modelName].count++;
      });
    });
  });

  const modelChartData = {};
  Object.entries(modelStats).forEach(([model, stats]) => {
    modelChartData[model] = {
      avgScore: Math.round((stats.scoreSum / stats.count) * 10) / 10,
      avgLatency: Math.round(stats.latencySum / stats.count),
      avgCost: parseFloat((stats.costSum / stats.count).toFixed(6))
    };
  });

  res.json({
    avgScore,
    avgLatency,
    totalCost: parseFloat(totalCost.toFixed(6)),
    runCount,
    modelChartData,
    runsTimeline
  });
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
