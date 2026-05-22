// Claude Usage Monitor - Sidepanel UI

const m = chrome.i18n.getMessage;

// Set loading text on init
document.querySelector('.loading').textContent = m('loading');

function renderCard(label, utilization, resetText, fillClass) {
  const pct = utilization ?? 0;
  return `
    <div class="usage-card">
      <div class="usage-row">
        <span class="usage-label">${label}</span>
        <span class="usage-value">${pct}%</span>
      </div>
      ${resetText ? `<div class="usage-meta">${resetText}</div>` : ''}
      <div class="progress-bar">
        <div class="progress-fill ${fillClass}" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

function renderUsageCredits(credits) {
  if (!credits || !credits.enabled) {
    return `
      <div class="section">
        <div class="section-title">${m('sectionUsageCredits')}</div>
        <div class="usage-card">
          <div class="not-enabled">${m('notEnabled')}</div>
        </div>
      </div>
    `;
  }
  const pct = credits.utilization ?? 0;
  const spent = credits.spent ? `$${credits.spent}` : '$0.00';
  const limit = credits.limit ? `$${credits.limit}` : '—';
  return `
    <div class="section">
      <div class="section-title">${m('sectionUsageCredits')}</div>
      <div class="usage-card">
        <div class="usage-row">
          <span class="extra-amount">${spent}</span>
          <span class="usage-value">${pct}%</span>
        </div>
        <div class="usage-meta">${m('labelLimit')}: ${limit}${credits.resetText ? ' · ' + credits.resetText : ''}</div>
        <div class="progress-bar">
          <div class="progress-fill fill-extra" style="width:${pct}%"></div>
        </div>
      </div>
    </div>
  `;
}

function render(data) {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const plan = data.plan || 'Free';

  document.getElementById('app').innerHTML = `
    <div class="header">
      <h1>Usage <span class="plan-badge">${plan}</span></h1>
      <button class="refresh-btn" id="refresh-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
      </button>
    </div>

    <div class="section">
      <div class="section-title">${m('sectionCurrentSession')}</div>
      ${renderCard(m('labelSession'), data.session?.utilization, data.session?.resetText, 'fill-session')}
    </div>

    <div class="section">
      <div class="section-title">${m('sectionWeeklyLimits')}</div>
      ${renderCard(m('labelAllModels'), data.weekly?.utilization, data.weekly?.resetText, 'fill-weekly')}
      ${renderCard(m('labelClaudeDesign'), data.claudeDesign?.utilization, null, 'fill-design')}
    </div>

    ${renderUsageCredits(data.usageCredits)}

    <div class="updated">${m('updatedAt', [now])}</div>
  `;

  document.getElementById('refresh-btn').addEventListener('click', () => requestFreshData());
}

function renderError() {
  document.getElementById('app').innerHTML = `
    <div class="error-box">
      <strong>${m('errorTitle')}</strong><br><br>
      ${m('errorLoginPrompt')}<br><br>
      <a href="#" id="login-link">${m('errorLoginLink')}</a><br><br>
      ${m('errorRetryPrompt')}<br><br>
      <button class="refresh-btn" id="retry-btn">${m('retry')}</button>
    </div>
  `;
  document.getElementById('retry-btn').addEventListener('click', () => requestFreshData());
  document.getElementById('login-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://claude.ai/login' });
  });
}

function requestFreshData() {
  const btn = document.getElementById('refresh-btn');
  if (btn) {
    btn.classList.add('spinning');
    btn.disabled = true;
  }

  const requestTime = Date.now();

  chrome.runtime.sendMessage({ action: 'fetch-usage' }, (response) => {
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      chrome.storage.local.get(['usageData', 'lastUpdated'], (result) => {
        if (result.usageData && result.lastUpdated && result.lastUpdated > requestTime) {
          clearInterval(poll);
          render(result.usageData);
        } else if (attempts > 10) {
          clearInterval(poll);
          renderError();
        }
      });
    }, 1000);
  });
}

// On load: check storage first, then request fresh data
chrome.storage.local.get(['usageData', 'lastUpdated'], (result) => {
  if (result.usageData && result.lastUpdated && (Date.now() - result.lastUpdated < 120000)) {
    render(result.usageData);
  } else {
    requestFreshData();
  }
});

// Listen for updates from content script via storage
chrome.storage.onChanged.addListener((changes) => {
  if (changes.usageData) {
    render(changes.usageData.newValue);
  }
});

// Auto-refresh every 60 seconds
setInterval(() => requestFreshData(), 60000);
