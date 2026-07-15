/**
 * PromptOps Evaluation Dashboard Frontend Application Code
 */

const API_BASE = '/api';

class PromptOpsApp {
  constructor() {
    this.state = {
      activeTab: 'dashboard',
      prompts: [],
      testSuites: [],
      evaluations: [],
      selectedPromptId: null,
      selectedSuiteId: null,
      charts: {
        comparison: null,
        timeline: null
      }
    };

    // Bind methods
    this.init = this.init.bind(this);
    this.switchTab = this.switchTab.bind(this);
    this.refreshAllData = this.refreshAllData.bind(this);
    
    // API actions
    this.fetchPrompts = this.fetchPrompts.bind(this);
    this.fetchTestSuites = this.fetchTestSuites.bind(this);
    this.fetchEvaluations = this.fetchEvaluations.bind(this);
    this.fetchAnalytics = this.fetchAnalytics.bind(this);

    // Event listeners registration
    document.addEventListener('DOMContentLoaded', this.init);
  }

  async init() {
    // Initialize icons
    lucide.createIcons();

    // Setup navigation tabs listeners
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Refresh button
    document.getElementById('btn-refresh-data').addEventListener('click', () => {
      this.refreshAllData(true);
    });

    // Modal Close
    document.getElementById('btn-close-modal').addEventListener('click', () => {
      document.getElementById('run-detail-modal').style.display = 'none';
    });

    // Prompt tab actions
    document.getElementById('btn-create-prompt').addEventListener('click', () => this.showCreatePromptForm());

    // Test Suite tab actions
    document.getElementById('btn-create-suite').addEventListener('click', () => this.showCreateSuiteForm());

    // Runner Tab Form Handling
    document.getElementById('runner-form').addEventListener('submit', (e) => this.handleLaunchEvaluation(e));
    document.getElementById('runner-prompt-select').addEventListener('change', (e) => this.handleRunnerPromptChange(e));

    // Start clock widget
    this.startClock();

    // Initial Fetch
    await this.refreshAllData();
  }

  startClock() {
    const clockEl = document.getElementById('current-time');
    const updateClock = () => {
      const now = new Date();
      clockEl.innerText = now.toLocaleTimeString();
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  async refreshAllData(showNotification = false) {
    try {
      await Promise.all([
        this.fetchPrompts(),
        this.fetchTestSuites(),
        this.fetchEvaluations(),
        this.fetchAnalytics()
      ]);

      this.populateRunnerSelectors();

      if (showNotification) {
        this.showToast('Data refreshed successfully');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      this.showToast('Failed to connect to backend server. Make sure node server.js is running.', 'error');
    }
  }

  showToast(message, type = 'success') {
    // Simple console logger or alert for now
    console.log(`[Toast ${type.toUpperCase()}]: ${message}`);
  }

  switchTab(tabId) {
    this.state.activeTab = tabId;

    // Toggle nav items active
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle tab content active
    document.querySelectorAll('.tab-pane').forEach(pane => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Update Header titles
    const headerTitle = document.getElementById('page-title');
    const headerSubtitle = document.getElementById('page-subtitle');

    switch (tabId) {
      case 'dashboard':
        headerTitle.innerText = 'Dashboard';
        headerSubtitle.innerText = 'Overview of prompt optimization and benchmarks';
        this.fetchAnalytics(); // reload chart data
        break;
      case 'prompts':
        headerTitle.innerText = 'Prompt Library';
        headerSubtitle.innerText = 'Manage prompt templates, versions, and diff histories';
        this.renderPromptsList();
        break;
      case 'suites':
        headerTitle.innerText = 'Test Suites';
        headerSubtitle.innerText = 'Define test cases and validation assertions';
        this.renderSuitesList();
        break;
      case 'runner':
        headerTitle.innerText = 'Run Evaluations';
        headerSubtitle.innerText = 'Launch benchmark evaluations across models';
        this.populateRunnerSelectors();
        break;
      case 'history':
        headerTitle.innerText = 'History & Reports';
        headerSubtitle.innerText = 'Trace prompt versions over time and analyze regressions';
        this.renderHistoryTable();
        break;
    }

    lucide.createIcons();
  }

  // -------------------------------------------------------------
  // Data Fetching API wrappers
  // -------------------------------------------------------------

  async fetchPrompts() {
    const res = await fetch(`${API_BASE}/prompts`);
    this.state.prompts = await res.json();
  }

  async fetchTestSuites() {
    const res = await fetch(`${API_BASE}/test-suites`);
    this.state.testSuites = await res.json();
  }

  async fetchEvaluations() {
    const res = await fetch(`${API_BASE}/evaluations`);
    this.state.evaluations = await res.json();
  }

  async fetchAnalytics() {
    const res = await fetch(`${API_BASE}/analytics/dashboard`);
    const data = await res.json();

    // Set KPI Values
    document.getElementById('kpi-avg-score').innerText = data.avgScore > 0 ? `${data.avgScore}%` : 'N/A';
    document.getElementById('kpi-avg-latency').innerText = data.avgLatency > 0 ? `${data.avgLatency}ms` : 'N/A';
    document.getElementById('kpi-total-cost').innerText = `$${parseFloat(data.totalCost || 0).toFixed(4)}`;
    document.getElementById('kpi-run-count').innerText = data.runCount || 0;

    // Render Recent Runs on Dashboard
    this.renderRecentRuns(data.runsTimeline.slice(-5).reverse());

    // Render Charts
    this.renderCharts(data);
  }

  // -------------------------------------------------------------
  // Rendering - Dashboard Tab & Charts
  // -------------------------------------------------------------

  renderRecentRuns(runs) {
    const tbody = document.getElementById('recent-runs-list');
    if (!runs || runs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No runs found. Go to "Run Evaluations" to start.</td></tr>`;
      return;
    }

    tbody.innerHTML = runs.map(run => {
      const date = new Date(run.createdAt).toLocaleString();
      return `
        <tr>
          <td><strong>${run.promptName}</strong></td>
          <td><span class="badge badge-info">v${run.version}</span></td>
          <td>${run.promptName.split(' ')[0]} Benchmark</td>
          <td><span class="badge ${run.avgScore >= 85 ? 'badge-success' : 'badge-warning'}">${run.avgScore}%</span></td>
          <td>${run.avgLatency}ms</td>
          <td>$${parseFloat(run.totalCost).toFixed(4)}</td>
          <td>${date}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="app.openRunDetailsModal('${run.id}')">
              View Matrix
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderCharts(data) {
    const themeColorText = '#94a3b8';
    const gridColor = 'rgba(255, 255, 255, 0.05)';

    // Chart 1: Model Quality, Latency, Cost Bar Chart
    const models = Object.keys(data.modelChartData || {});
    const modelScores = models.map(m => data.modelChartData[m].avgScore);
    const modelLatencies = models.map(m => data.modelChartData[m].avgLatency / 10); // scale down to look good together
    
    const ctxCompare = document.getElementById('chart-models-comparison').getContext('2d');
    
    if (this.state.charts.comparison) {
      this.state.charts.comparison.destroy();
    }

    if (models.length > 0) {
      this.state.charts.comparison = new Chart(ctxCompare, {
        type: 'bar',
        data: {
          labels: models.map(m => m.replace(/-/g, ' ').toUpperCase()),
          datasets: [
            {
              label: 'Average Score (%)',
              data: modelScores,
              backgroundColor: 'rgba(139, 92, 246, 0.75)',
              borderColor: '#8b5cf6',
              borderWidth: 1,
              borderRadius: 6
            },
            {
              label: 'Avg Latency (ms x0.1)',
              data: modelLatencies,
              backgroundColor: 'rgba(6, 182, 212, 0.75)',
              borderColor: '#06b6d4',
              borderWidth: 1,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: themeColorText, font: { family: 'Inter' } } }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: themeColorText } },
            y: { grid: { color: gridColor }, ticks: { color: themeColorText }, min: 0, max: 100 }
          }
        }
      });
    }

    // Chart 2: Scores progress timeline
    const timelineRuns = data.runsTimeline || [];
    const timelineLabels = timelineRuns.map((r, i) => `Run #${i + 1} (${r.promptName.split(' ')[0]} v${r.version})`);
    const timelineScores = timelineRuns.map(r => r.avgScore);
    const timelineCosts = timelineRuns.map(r => r.totalCost * 10000); // scaled up for visualization

    const ctxTimeline = document.getElementById('chart-runs-timeline').getContext('2d');

    if (this.state.charts.timeline) {
      this.state.charts.timeline.destroy();
    }

    if (timelineRuns.length > 0) {
      this.state.charts.timeline = new Chart(ctxTimeline, {
        type: 'line',
        data: {
          labels: timelineLabels,
          datasets: [
            {
              label: 'Quality Score (%)',
              data: timelineScores,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              borderWidth: 3,
              fill: true,
              tension: 0.3,
              pointBackgroundColor: '#8b5cf6'
            },
            {
              label: 'Cost Index ($ x10k)',
              data: timelineCosts,
              borderColor: '#10b981',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.3,
              pointBackgroundColor: '#10b981'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: themeColorText } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: themeColorText } },
            y: { grid: { color: gridColor }, ticks: { color: themeColorText }, min: 0, max: 100 }
          }
        }
      });
    }
  }

  // -------------------------------------------------------------
  // Rendering - Prompt Library Tab
  // -------------------------------------------------------------

  renderPromptsList() {
    const listEl = document.getElementById('prompts-list');
    if (this.state.prompts.length === 0) {
      listEl.innerHTML = `<div class="text-center text-muted p-20">No prompts stored yet.</div>`;
      return;
    }

    listEl.innerHTML = this.state.prompts.map(p => `
      <div class="list-item ${this.state.selectedPromptId === p.id ? 'active' : ''}" onclick="app.selectPrompt('${p.id}')">
        <h4>${p.name}</h4>
        <p>${p.description || 'No description'}</p>
        <span class="badge badge-info" style="align-self: flex-start;">${p.versions.length} versions</span>
      </div>
    `).join('');
  }

  selectPrompt(id) {
    this.state.selectedPromptId = id;
    this.renderPromptsList();
    this.renderPromptDetails();
  }

  renderPromptDetails() {
    const prompt = this.state.prompts.find(p => p.id === this.state.selectedPromptId);
    const detailEl = document.getElementById('prompt-detail-panel');

    if (!prompt) {
      detailEl.innerHTML = `
        <div class="empty-state">
          <i data-lucide="terminal" class="giant-icon"></i>
          <h3>No Prompt Selected</h3>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    // Default to the latest version
    const latestVersion = prompt.versions[prompt.versions.length - 1];

    detailEl.innerHTML = `
      <div class="detail-header">
        <div>
          <h2>${prompt.name}</h2>
          <p class="subtitle text-muted">${prompt.description || 'No description provided.'}</p>
        </div>
        <div class="detail-actions">
          <div class="diff-toggle-container">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="diff-mode-chk" ${prompt.versions.length < 2 ? 'disabled' : ''}>
              <span>Diff Mode</span>
            </label>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="app.showCreateVersionForm()"><i data-lucide="plus"></i> New Version</button>
        </div>
      </div>

      <div class="form-group">
        <label for="prompt-version-select">Select Active Version</label>
        <select id="prompt-version-select" class="form-control" style="width: 200px;" onchange="app.handlePromptVersionChange(this.value)">
          ${prompt.versions.map(v => `<option value="${v.version}" ${v.version === latestVersion.version ? 'selected' : ''}>Version ${v.version} (${new Date(v.createdAt).toLocaleDateString()})</option>`).join('')}
        </select>
      </div>

      <div id="prompt-fields-view">
        <div class="form-group">
          <label>System Instructions</label>
          <textarea class="form-control" readonly style="font-family: monospace; background-color: rgba(0,0,0,0.2);">${latestVersion.systemPrompt}</textarea>
        </div>

        <div class="form-group">
          <label>User Template (Variables enclosed in {curly_braces})</label>
          <textarea class="form-control" readonly style="font-family: monospace; background-color: rgba(0,0,0,0.2);">${latestVersion.userPromptTemplate}</textarea>
        </div>
      </div>
    `;

    lucide.createIcons();

    // Diff mode listener
    const diffChk = document.getElementById('diff-mode-chk');
    if (diffChk) {
      diffChk.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.renderPromptDiffView();
        } else {
          this.handlePromptVersionChange(document.getElementById('prompt-version-select').value);
        }
      });
    }
  }

  handlePromptVersionChange(versionNum) {
    const prompt = this.state.prompts.find(p => p.id === this.state.selectedPromptId);
    const ver = prompt.versions.find(v => v.version === parseInt(versionNum));
    const fieldsEl = document.getElementById('prompt-fields-view');

    fieldsEl.innerHTML = `
      <div class="form-group">
        <label>System Instructions</label>
        <textarea class="form-control" readonly style="font-family: monospace; background-color: rgba(0,0,0,0.2);">${ver.systemPrompt}</textarea>
      </div>

      <div class="form-group">
        <label>User Template</label>
        <textarea class="form-control" readonly style="font-family: monospace; background-color: rgba(0,0,0,0.2);">${ver.userPromptTemplate}</textarea>
      </div>
    `;
  }

  renderPromptDiffView() {
    const prompt = this.state.prompts.find(p => p.id === this.state.selectedPromptId);
    const curVerNum = parseInt(document.getElementById('prompt-version-select').value);
    
    // Compare with the version immediately before it
    const prevVerNum = curVerNum > 1 ? curVerNum - 1 : curVerNum;
    const currentVer = prompt.versions.find(v => v.version === curVerNum);
    const previousVer = prompt.versions.find(v => v.version === prevVerNum);

    const fieldsEl = document.getElementById('prompt-fields-view');

    const generateDiffHtml = (oldText, newText) => {
      if (oldText === newText) {
        return `<div class="diff-box">${oldText}</div>`;
      }

      // Simple word diff
      const oldLines = oldText.split('\n');
      const newLines = newText.split('\n');

      let oldHtml = '';
      let newHtml = '';

      // Renders colored line difference comparison
      const maxLen = Math.max(oldLines.length, newLines.length);
      for (let i = 0; i < maxLen; i++) {
        const oLine = oldLines[i];
        const nLine = newLines[i];

        if (oLine !== undefined && nLine !== undefined) {
          if (oLine === nLine) {
            oldHtml += `<div>  ${oLine}</div>`;
            newHtml += `<div>  ${nLine}</div>`;
          } else {
            oldHtml += `<div class="diff-line-del">- ${oLine}</div>`;
            newHtml += `<div class="diff-line-add">+ ${nLine}</div>`;
          }
        } else if (oLine !== undefined) {
          oldHtml += `<div class="diff-line-del">- ${oLine}</div>`;
        } else if (nLine !== undefined) {
          newHtml += `<div class="diff-line-add">+ ${nLine}</div>`;
        }
      }

      return `
        <div class="diff-container">
          <div>
            <label class="text-muted" style="font-size: 11px; text-transform: uppercase;">Version ${prevVerNum} (Old)</label>
            <div class="diff-box old-ver">${oldHtml}</div>
          </div>
          <div>
            <label class="text-muted" style="font-size: 11px; text-transform: uppercase;">Version ${curVerNum} (New)</label>
            <div class="diff-box new-ver">${newHtml}</div>
          </div>
        </div>
      `;
    };

    fieldsEl.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h4 style="margin-bottom: 8px;">System Instructions Diff</h4>
        ${generateDiffHtml(previousVer.systemPrompt, currentVer.systemPrompt)}
      </div>

      <div>
        <h4 style="margin-bottom: 8px;">User Prompt Template Diff</h4>
        ${generateDiffHtml(previousVer.userPromptTemplate, currentVer.userPromptTemplate)}
      </div>
    `;
  }

  showCreatePromptForm() {
    const detailEl = document.getElementById('prompt-detail-panel');
    detailEl.innerHTML = `
      <div class="detail-header">
        <div>
          <h2>Create New Prompt</h2>
          <p class="subtitle text-muted">Register a new LLM task to benchmark</p>
        </div>
      </div>
      <form id="new-prompt-form" onsubmit="app.handleCreatePrompt(event)">
        <div class="form-group">
          <label for="new-prompt-name">Name</label>
          <input type="text" id="new-prompt-name" class="form-control" placeholder="e.g. Code Reviewer Assistant" required>
        </div>
        <div class="form-group">
          <label for="new-prompt-desc">Description</label>
          <input type="text" id="new-prompt-desc" class="form-control" placeholder="e.g. Audits python functions for memory leaks.">
        </div>
        <div class="form-group">
          <label for="new-prompt-system">System Instructions (Context, Tone, Constraints)</label>
          <textarea id="new-prompt-system" class="form-control" placeholder="You are an expert developer... Only output JSON." required></textarea>
        </div>
        <div class="form-group">
          <label for="new-prompt-user">User Template (Write placeholders like {code_block} inside curly braces)</label>
          <textarea id="new-prompt-user" class="form-control" placeholder="Analyze this script:\n{code_block}" required></textarea>
        </div>
        <div class="text-right">
          <button type="button" class="btn btn-secondary" onclick="app.renderPromptDetails()" style="margin-right: 12px;">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Prompt</button>
        </div>
      </form>
    `;
  }

  async handleCreatePrompt(e) {
    e.preventDefault();
    const name = document.getElementById('new-prompt-name').value;
    const description = document.getElementById('new-prompt-desc').value;
    const systemPrompt = document.getElementById('new-prompt-system').value;
    const userPromptTemplate = document.getElementById('new-prompt-user').value;

    const res = await fetch(`${API_BASE}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, systemPrompt, userPromptTemplate })
    });

    const newPrompt = await res.json();
    this.showToast('Prompt created successfully');
    await this.fetchPrompts();
    this.selectPrompt(newPrompt.id);
  }

  showCreateVersionForm() {
    const prompt = this.state.prompts.find(p => p.id === this.state.selectedPromptId);
    const latestVersion = prompt.versions[prompt.versions.length - 1];
    
    const detailEl = document.getElementById('prompt-detail-panel');
    detailEl.innerHTML = `
      <div class="detail-header">
        <div>
          <h2>Create Version ${prompt.latestVersion + 1}</h2>
          <p class="subtitle text-muted">Iterate prompt template design for <strong>${prompt.name}</strong></p>
        </div>
      </div>
      <form id="new-version-form" onsubmit="app.handleCreateVersion(event)">
        <div class="form-group">
          <label>Current System Instructions</label>
          <textarea id="new-ver-system" class="form-control" required>${latestVersion.systemPrompt}</textarea>
        </div>
        <div class="form-group">
          <label>Current User Template</label>
          <textarea id="new-ver-user" class="form-control" required>${latestVersion.userPromptTemplate}</textarea>
        </div>
        <div class="text-right">
          <button type="button" class="btn btn-secondary" onclick="app.renderPromptDetails()" style="margin-right: 12px;">Cancel</button>
          <button type="submit" class="btn btn-primary">Commit v${prompt.latestVersion + 1}</button>
        </div>
      </form>
    `;
  }

  async handleCreateVersion(e) {
    e.preventDefault();
    const systemPrompt = document.getElementById('new-ver-system').value;
    const userPromptTemplate = document.getElementById('new-ver-user').value;

    const res = await fetch(`${API_BASE}/prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: this.state.selectedPromptId,
        systemPrompt,
        userPromptTemplate
      })
    });

    await this.fetchPrompts();
    this.showToast('New version registered');
    this.renderPromptDetails();
  }

  // -------------------------------------------------------------
  // Rendering - Test Suites Tab
  // -------------------------------------------------------------

  renderSuitesList() {
    const listEl = document.getElementById('suites-list');
    if (this.state.testSuites.length === 0) {
      listEl.innerHTML = `<div class="text-center text-muted p-20">No test suites created yet.</div>`;
      return;
    }

    listEl.innerHTML = this.state.testSuites.map(s => {
      const prompt = this.state.prompts.find(p => p.id === s.promptId);
      return `
        <div class="list-item ${this.state.selectedSuiteId === s.id ? 'active' : ''}" onclick="app.selectSuite('${s.id}')">
          <h4>${s.name}</h4>
          <p>${s.description || 'No description'}</p>
          <span class="badge badge-success" style="align-self: flex-start;">Target: ${prompt ? prompt.name.split(' ')[0] : 'Generic'}</span>
        </div>
      `;
    }).join('');
  }

  selectSuite(id) {
    this.state.selectedSuiteId = id;
    this.renderSuitesList();
    this.renderSuiteDetails();
  }

  renderSuiteDetails() {
    const suite = this.state.testSuites.find(s => s.id === this.state.selectedSuiteId);
    const detailEl = document.getElementById('suite-detail-panel');

    if (!suite) {
      detailEl.innerHTML = `
        <div class="empty-state">
          <i data-lucide="test-tube" class="giant-icon"></i>
          <h3>No Test Suite Selected</h3>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    const prompt = this.state.prompts.find(p => p.id === suite.promptId);

    detailEl.innerHTML = `
      <div class="detail-header">
        <div>
          <h2>${suite.name}</h2>
          <p class="subtitle text-muted">${suite.description || 'No description.'}</p>
          <span style="font-size: 12px; color: var(--secondary); margin-top: 6px; display: inline-block;">Target Prompt task: ${prompt ? prompt.name : 'Not associated'}</span>
        </div>
        <button class="btn btn-danger btn-sm" onclick="app.handleDeleteSuite('${suite.id}')">
          <i data-lucide="trash"></i> Delete Suite
        </button>
      </div>

      <div class="test-cases-section">
        <div class="test-cases-header">
          <h3>Test Cases (${suite.testCases.length})</h3>
          <button class="btn btn-secondary btn-sm" onclick="app.showAddTestCaseForm()">
            <i data-lucide="plus"></i> Add Test Case
          </button>
        </div>

        <div class="tc-accordion" id="tc-accordion-container">
          ${suite.testCases.map((tc, idx) => `
            <div class="tc-item">
              <div class="tc-item-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'flex' : 'none'">
                <h5>Test Case #${idx + 1}</h5>
                <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
              </div>
              <div class="tc-item-body" style="display: none;">
                <div>
                  <label class="text-muted" style="font-size: 11px; text-transform: uppercase;">Variables Input Parameters</label>
                  <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; font-size: 12px; margin-top: 4px;">${JSON.stringify(tc.variables, null, 2)}</pre>
                </div>
                <div>
                  <label class="text-muted" style="font-size: 11px; text-transform: uppercase;">Expected Target Matching Output</label>
                  <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; font-size: 12px; margin-top: 4px; color: #86efac;">${tc.expected || 'N/A'}</div>
                </div>
                <div>
                  <label class="text-muted" style="font-size: 11px; text-transform: uppercase; margin-bottom: 6px; display: block;">Validation Assertions</label>
                  <div class="assertions-list">
                    ${tc.assertions.map(a => `
                      <span class="assertion-tag">
                        <span><strong>${a.type}</strong>: "${a.value}"</span>
                      </span>
                    `).join('')}
                    ${tc.assertions.length === 0 ? '<span class="text-muted" style="font-size: 12px;">No automated assertion checks defined</span>' : ''}
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
          ${suite.testCases.length === 0 ? '<div class="text-center text-muted p-20">No test cases in this suite. Add one above!</div>' : ''}
        </div>
      </div>
    `;

    lucide.createIcons();
  }

  showCreateSuiteForm() {
    const detailEl = document.getElementById('suite-detail-panel');
    detailEl.innerHTML = `
      <div class="detail-header">
        <div>
          <h2>Create New Test Suite</h2>
          <p class="subtitle text-muted">A collection of test payload cases to evaluate prompt drift and accuracy</p>
        </div>
      </div>
      <form id="new-suite-form" onsubmit="app.handleCreateSuite(event)">
        <div class="form-group">
          <label for="new-suite-name">Suite Name</label>
          <input type="text" id="new-suite-name" class="form-control" placeholder="e.g. Classifier Golden Set" required>
        </div>
        <div class="form-group">
          <label for="new-suite-desc">Description</label>
          <input type="text" id="new-suite-desc" class="form-control" placeholder="e.g. Edge case test queries.">
        </div>
        <div class="form-group">
          <label for="new-suite-prompt">Target Associated Prompt</label>
          <select id="new-suite-prompt" class="form-control" required onchange="app.handleSuitePromptChange(this.value)">
            <option value="">Select prompt...</option>
            ${this.state.prompts.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="suite-variables-group" style="display: none;">
          <label>Identified Prompt Template Variables</label>
          <div id="suite-vars-detected" style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; font-family: monospace; font-size: 13px;"></div>
        </div>
        <div class="text-right">
          <button type="button" class="btn btn-secondary" onclick="app.renderSuiteDetails()" style="margin-right: 12px;">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Suite</button>
        </div>
      </form>
    `;
  }

  handleSuitePromptChange(promptId) {
    const prompt = this.state.prompts.find(p => p.id === promptId);
    const varEl = document.getElementById('suite-vars-detected');
    const groupEl = document.getElementById('suite-variables-group');

    if (!prompt) {
      groupEl.style.display = 'none';
      return;
    }

    const template = prompt.versions[prompt.versions.length - 1].userPromptTemplate;
    const regex = /{([^}]+)}/g;
    const vars = [];
    let match;
    while ((match = regex.exec(template)) !== null) {
      if (!vars.includes(match[1])) vars.push(match[1]);
    }

    if (vars.length > 0) {
      varEl.innerText = vars.join(', ');
      groupEl.style.display = 'flex';
      groupEl.dataset.vars = JSON.stringify(vars);
    } else {
      varEl.innerText = 'No variables detected in prompt (static prompt)';
      groupEl.style.display = 'flex';
      groupEl.dataset.vars = JSON.stringify([]);
    }
  }

  async handleCreateSuite(e) {
    e.preventDefault();
    const name = document.getElementById('new-suite-name').value;
    const description = document.getElementById('new-suite-desc').value;
    const promptId = document.getElementById('new-suite-prompt').value;
    
    const varsJson = document.getElementById('suite-variables-group').dataset.vars || '[]';
    const variables = JSON.parse(varsJson);

    const res = await fetch(`${API_BASE}/test-suites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, promptId, variables, testCases: [] })
    });

    const newSuite = await res.json();
    this.showToast('Test Suite created successfully');
    await this.fetchTestSuites();
    this.selectSuite(newSuite.id);
  }

  async handleDeleteSuite(id) {
    if (!confirm('Are you sure you want to delete this test suite?')) return;

    await fetch(`${API_BASE}/test-suites/${id}`, { method: 'DELETE' });
    this.showToast('Test suite deleted', 'warning');
    this.state.selectedSuiteId = null;
    await this.fetchTestSuites();
    this.renderSuitesList();
    this.renderSuiteDetails();
  }

  showAddTestCaseForm() {
    const suite = this.state.testSuites.find(s => s.id === this.state.selectedSuiteId);
    const detailEl = document.getElementById('suite-detail-panel');

    // Create variables inputs
    const inputsHtml = suite.variables.map(v => `
      <div class="form-group">
        <label for="tc-input-${v}">Input variable: ${v}</label>
        <textarea id="tc-input-${v}" class="form-control" placeholder="Value for variable..." required></textarea>
      </div>
    `).join('');

    detailEl.innerHTML = `
      <div class="detail-header">
        <div>
          <h2>Add New Test Case</h2>
          <p class="subtitle text-muted">Define testing variables and assertions for <strong>${suite.name}</strong></p>
        </div>
      </div>
      <form id="add-tc-form" onsubmit="app.handleAddTestCase(event)">
        ${inputsHtml}
        ${suite.variables.length === 0 ? '<p class="text-muted" style="margin-bottom: 20px;">This prompt doesn\'t use dynamic variables. Running static prompt test case.</p>' : ''}
        
        <div class="form-group">
          <label for="tc-expected">Expected Response Text / String Match</label>
          <input type="text" id="tc-expected" class="form-control" placeholder="e.g. Account Security" required>
        </div>

        <div class="form-group">
          <label>Assertions</label>
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <select id="assertion-type" class="form-control" style="width: 200px;">
              <option value="contains">Contains substring</option>
              <option value="length_less_than">Length is less than</option>
            </select>
            <input type="text" id="assertion-val" class="form-control" style="flex-grow: 1;" placeholder="Assertion parameter...">
            <button type="button" class="btn btn-secondary" onclick="app.addAssertionToPending()">Add Assertion</button>
          </div>
          <div class="assertions-list" id="pending-assertions-list">
            <!-- Renders added assertions -->
          </div>
        </div>

        <div class="text-right">
          <button type="button" class="btn btn-secondary" onclick="app.renderSuiteDetails()" style="margin-right: 12px;">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Test Case</button>
        </div>
      </form>
    `;
  }

  addAssertionToPending() {
    const type = document.getElementById('assertion-type').value;
    const value = document.getElementById('assertion-val').value;
    
    if (!value) return;

    const list = document.getElementById('pending-assertions-list');
    const tag = document.createElement('span');
    tag.className = 'assertion-tag';
    tag.dataset.type = type;
    tag.dataset.value = value;
    tag.innerHTML = `
      <span><strong>${type}</strong>: "${value}"</span>
      <button type="button" onclick="this.parentElement.remove()"><i data-lucide="x"></i></button>
    `;
    list.appendChild(tag);
    document.getElementById('assertion-val').value = '';
    
    lucide.createIcons();
  }

  async handleAddTestCase(e) {
    e.preventDefault();
    const suite = this.state.testSuites.find(s => s.id === this.state.selectedSuiteId);
    
    // Collect variables
    const variables = {};
    suite.variables.forEach(v => {
      variables[v] = document.getElementById(`tc-input-${v}`).value;
    });

    const expected = document.getElementById('tc-expected').value;

    // Collect assertions
    const assertions = [];
    document.querySelectorAll('#pending-assertions-list .assertion-tag').forEach(tag => {
      assertions.push({
        type: tag.dataset.type,
        value: tag.dataset.value
      });
    });

    const updatedTestCases = [...suite.testCases, {
      variables,
      expected,
      assertions
    }];

    const res = await fetch(`${API_BASE}/test-suites/${suite.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testCases: updatedTestCases })
    });

    await this.fetchTestSuites();
    this.showToast('Test Case saved successfully');
    this.renderSuiteDetails();
  }

  // -------------------------------------------------------------
  // Rendering - Runner Tab
  // -------------------------------------------------------------

  populateRunnerSelectors() {
    const promptSelect = document.getElementById('runner-prompt-select');
    const suiteSelect = document.getElementById('runner-suite-select');

    if (!promptSelect || !suiteSelect) return;

    // Reset option lists but keep first option
    promptSelect.innerHTML = '<option value="">Select prompt...</option>';
    suiteSelect.innerHTML = '<option value="">Select test suite...</option>';

    this.state.prompts.forEach(p => {
      promptSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });

    this.state.testSuites.forEach(s => {
      suiteSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
  }

  handleRunnerPromptChange(e) {
    const promptId = e.target.value;
    const versionSelect = document.getElementById('runner-version-select');
    const prompt = this.state.prompts.find(p => p.id === promptId);

    if (!prompt) {
      versionSelect.innerHTML = '<option value="">Select version...</option>';
      versionSelect.disabled = true;
      return;
    }

    versionSelect.disabled = false;
    versionSelect.innerHTML = prompt.versions.map(v => `<option value="${v.version}">Version ${v.version}</option>`).join('');
  }

  async handleLaunchEvaluation(e) {
    e.preventDefault();
    
    const promptId = document.getElementById('runner-prompt-select').value;
    const version = document.getElementById('runner-version-select').value;
    const testSuiteId = document.getElementById('runner-suite-select').value;
    
    const selectedModels = [];
    document.querySelectorAll('input[name="models"]:checked').forEach(chk => {
      selectedModels.push(chk.value);
    });

    if (selectedModels.length === 0) {
      alert('Please check at least one LLM model to run the benchmarks.');
      return;
    }

    const consoleCard = document.getElementById('runner-console');
    const consoleLogs = document.getElementById('console-logs');
    const consoleStatus = document.getElementById('console-status');
    const progressBar = document.getElementById('runner-progress');
    const submitBtn = document.getElementById('btn-run-evaluation');

    consoleCard.style.display = 'block';
    consoleLogs.innerHTML = '';
    consoleStatus.innerText = 'Initializing...';
    progressBar.style.width = '5%';
    submitBtn.disabled = true;

    const log = (msg, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      const div = document.createElement('div');
      div.className = `console-line console-${type}`;
      div.innerText = `[${timestamp}] ${msg}`;
      consoleLogs.appendChild(div);
      consoleLogs.scrollTop = consoleLogs.scrollHeight;
    };

    log(`Initializing evaluation pipeline for Prompt ID "${promptId}" version ${version}...`);
    log(`Selected models: ${selectedModels.join(', ')}`);

    try {
      // Simulate real-time progress logging
      setTimeout(() => {
        log(`Retrieving test cases for suite: ${testSuiteId}...`);
        progressBar.style.width = '15%';
      }, 300);

      setTimeout(() => {
        log(`Compiling templates with user variables...`);
        progressBar.style.width = '30%';
      }, 700);

      // Trigger the real backend API evaluation
      const fetchPromise = fetch(`${API_BASE}/evaluations/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId, version, testSuiteId, selectedModels })
      });

      // Show ongoing mock console statements while waiting for server response
      let step = 0;
      const interval = setInterval(() => {
        if (step >= selectedModels.length) {
          clearInterval(interval);
          return;
        }
        const model = selectedModels[step];
        log(`Submitting prompt inputs to API endpoint: ${model}...`, 'info');
        log(`Calculating automated metrics (correctness, coherence, validation) for ${model}...`, 'success');
        step++;
        progressBar.style.width = `${30 + (step * (60 / selectedModels.length))}%`;
      }, 1000);

      const res = await fetchPromise;
      clearInterval(interval);

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const runResults = await res.json();

      progressBar.style.width = '100%';
      log(`Evaluation Completed! Created Evaluation run ID: ${runResults.id}`, 'success');
      consoleStatus.innerText = 'Completed';
      
      this.showToast('Evaluation run completed successfully');
      
      // Update state data
      await this.refreshAllData();

      // Open results matrix directly!
      setTimeout(() => {
        submitBtn.disabled = false;
        consoleCard.style.display = 'none';
        this.openRunDetailsModal(runResults.id);
      }, 1200);

    } catch (err) {
      consoleStatus.innerText = 'Failed';
      log(`Evaluation runner failed: ${err.message}`, 'error');
      submitBtn.disabled = false;
      this.showToast('Evaluation runner encountered an error', 'error');
    }
  }

  // -------------------------------------------------------------
  // Rendering - History Tab & Runs Details Matrix Modal
  // -------------------------------------------------------------

  renderHistoryTable() {
    const tbody = document.getElementById('full-history-list');
    if (this.state.evaluations.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No runs found. Use the runner to execute benchmarks.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.evaluations.map(run => {
      const prompt = this.state.prompts.find(p => p.id === run.promptId);
      const suite = this.state.testSuites.find(s => s.id === run.testSuiteId);
      const date = new Date(run.createdAt).toLocaleString();
      return `
        <tr>
          <td><code style="font-size: 12px;">${run.id}</code></td>
          <td><strong>${prompt ? prompt.name : 'Unknown Prompt'}</strong></td>
          <td><span class="badge badge-info">v${run.promptVersion}</span></td>
          <td>${suite ? suite.name : 'Unknown Suite'}</td>
          <td><span class="badge ${run.summary.avgScore >= 85 ? 'badge-success' : 'badge-warning'}">${run.summary.avgScore}%</span></td>
          <td>${run.summary.avgLatency}ms</td>
          <td>$${parseFloat(run.summary.totalCost).toFixed(4)}</td>
          <td>${date}</td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="app.openRunDetailsModal('${run.id}')">
              View Matrix Comparison
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  openRunDetailsModal(runId) {
    const run = this.state.evaluations.find(r => r.id === runId);
    if (!run) return;

    const prompt = this.state.prompts.find(p => p.id === run.promptId);
    const suite = this.state.testSuites.find(s => s.id === run.testSuiteId);

    // Modal Header text
    document.getElementById('modal-run-title').innerText = `Evaluation Run Summary`;
    document.getElementById('modal-run-subtitle').innerHTML = `
      Benchmark matrix for prompt task <strong>${prompt ? prompt.name : 'Unknown'}</strong> 
      (v${run.promptVersion}) against test suite <strong>${suite ? suite.name : 'Unknown'}</strong>
    `;

    // KPI Summary
    document.getElementById('modal-meta-cases').innerText = run.summary.testCaseCount;
    document.getElementById('modal-meta-score').innerText = `${run.summary.avgScore}%`;
    document.getElementById('modal-meta-cost').innerText = `$${parseFloat(run.summary.totalCost).toFixed(5)}`;
    document.getElementById('modal-meta-latency').innerText = `${run.summary.avgLatency}ms`;

    // Renders the main results matrix (cases rows, models columns)
    const matrixContent = document.getElementById('modal-matrix-content');
    matrixContent.innerHTML = run.results.map((result, idx) => {
      const varsHtml = Object.entries(result.variables).map(([k, v]) => `<strong>${k}</strong>: "${v}"`).join(', ');

      const colsHtml = Object.entries(result.modelOutputs).map(([modelName, modelOut]) => {
        const score = modelOut.averageScore;
        const latency = modelOut.latency;
        const feedback = modelOut.feedback;

        let ratingHtml = '';
        if (feedback) {
          ratingHtml = `
            <div class="feedback-view">
              <span>Feedback: ${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}</span>
              ${feedback.comment ? `<p style="font-style: italic; margin-top:4px;">"${feedback.comment}"</p>` : ''}
            </div>
          `;
        } else {
          ratingHtml = `
            <div class="feedback-form">
              <div class="rating-stars" data-model="${modelName}" data-case="${result.testCaseId}">
                ${[1,2,3,4,5].map(star => `
                  <button class="star-btn" onclick="app.rateResponse('${run.id}', '${result.testCaseId}', '${modelName}', ${star}, this)">
                    ★
                  </button>
                `).join('')}
              </div>
              <div class="comment-input-row">
                <input type="text" placeholder="Add commentary..." id="cmt-${result.testCaseId}-${modelName}">
                <button class="btn btn-sm btn-secondary" onclick="app.submitComment('${run.id}', '${result.testCaseId}', '${modelName}')">Save</button>
              </div>
            </div>
          `;
        }

        return `
          <div class="matrix-model-col">
            <div class="matrix-col-header">
              <span class="model-badge ${modelName.includes('pro') ? 'model-pro' : modelName.includes('claude') ? 'model-claude' : modelName.includes('gpt') ? 'model-gpt' : 'model-flash'}">${modelName}</span>
              <span class="badge ${score >= 90 ? 'badge-success' : score >= 75 ? 'badge-info' : 'badge-warning'}">${score}%</span>
            </div>

            <div class="matrix-stats-row">
              <span>Latency: <strong>${latency}ms</strong></span>
              <span>Cost: <strong>$${parseFloat(modelOut.cost).toFixed(5)}</strong></span>
            </div>

            <div class="matrix-metrics-badges">
              <span class="matrix-metric-badge">Acc: ${modelOut.scores.correctness}%</span>
              <span class="matrix-metric-badge">Coh: ${modelOut.scores.coherence}%</span>
              ${modelOut.regression ? '<span class="badge badge-danger">Regression</span>' : ''}
            </div>

            <div class="matrix-output-box">${modelOut.output}</div>

            <div class="feedback-box" id="fb-${result.testCaseId}-${modelName}">
              ${ratingHtml}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="matrix-row-tc">
          <div class="matrix-tc-header">
            <h4>Test Case #${idx + 1}</h4>
            <p class="subtitle text-muted" style="margin-top: 4px;">Inputs: ${varsHtml || 'Static test (no variables)'}</p>
            <p class="subtitle text-muted" style="margin-top: 2px;">Expected: <span style="color: #34d399; font-weight: 500;">${result.expected}</span></p>
          </div>
          <div class="matrix-columns-grid">
            ${colsHtml}
          </div>
        </div>
      `;
    }).join('');

    // Open modal
    document.getElementById('run-detail-modal').style.display = 'flex';
  }

  // Submit Feedback handlers
  async rateResponse(runId, testCaseId, modelName, rating, btn) {
    // Visual select stars
    const container = btn.parentElement;
    const buttons = container.querySelectorAll('.star-btn');
    buttons.forEach((b, idx) => {
      if (idx < rating) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    container.dataset.rating = rating;
  }

  async submitComment(runId, testCaseId, modelName) {
    const starContainer = document.querySelector(`.rating-stars[data-model="${modelName}"][data-case="${testCaseId}"]`);
    const rating = starContainer ? parseInt(starContainer.dataset.rating || 0) : 0;
    const comment = document.getElementById(`cmt-${testCaseId}-${modelName}`).value;

    if (rating === 0) {
      alert('Please click on stars rating first!');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/evaluations/${runId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCaseId, modelName, rating, comment })
      });

      if (res.ok) {
        this.showToast('Human feedback saved successfully');
        
        // Re-fetch calculations to update evaluation values
        await this.fetchEvaluations();
        
        // Render feedback completion visually
        const feedbackBox = document.getElementById(`fb-${testCaseId}-${modelName}`);
        feedbackBox.innerHTML = `
          <div class="feedback-view">
            <span>Feedback: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>
            ${comment ? `<p style="font-style: italic; margin-top:4px;">"${comment}"</p>` : ''}
          </div>
        `;
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  }
}

// Instantiate App
const app = new PromptOpsApp();
window.app = app;
