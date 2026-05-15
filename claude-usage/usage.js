const BASE = 'https://claude.ai/api';
let cachedOrg = null;

async function getOrg() {
  if (cachedOrg) return cachedOrg;
  const res = await fetch(`${BASE}/organizations`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch organization info. Are you logged in to claude.ai?');
  const orgs = await res.json();
  if (!orgs.length) throw new Error('No organization found.');
  cachedOrg = orgs[0];
  return cachedOrg;
}

function getPlanName(org) {
  const caps = org.capabilities || [];
  if (caps.includes('claude_enterprise')) return 'Enterprise';
  if (caps.includes('claude_team')) return 'Team';
  if (caps.includes('claude_pro')) return 'Pro';
  return 'Free';
}

async function fetchUsage() {
  const org = await getOrg();
  const res = await fetch(`${BASE}/organizations/${org.uuid}/usage`, {
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

function formatTimeRemaining(resetAt) {
  if (!resetAt) return '';
  const diff = new Date(resetAt) - new Date();
  if (diff <= 0) return 'Resetting…';
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `Resets in ${hrs} hr ${mins} min`;
  return `Resets in ${mins} min`;
}

function renderCard(label, utilization, resetAt, fillClass) {
  const pct = utilization ?? 0;
  const meta = formatTimeRemaining(resetAt);
  return `
    <div class="usage-card">
      <div class="usage-row">
        <span class="usage-label">${label}</span>
        <span class="usage-value">${pct}%</span>
      </div>
      ${meta ? `<div class="usage-meta">${meta}</div>` : ''}
      <div class="progress-bar">
        <div class="progress-fill ${fillClass}" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

function renderExtraUsage(extra) {
  if (!extra || !extra.is_enabled) {
    return `
      <div class="section">
        <div class="section-title">Extra Usage</div>
        <div class="usage-card">
          <div class="not-enabled">Not enabled</div>
        </div>
      </div>
    `;
  }
  const pct = extra.utilization ?? 0;
  const spent = extra.used_credits != null
    ? `$${(extra.used_credits / 100).toFixed(2)}`
    : '$0.00';
  const limit = extra.monthly_limit != null
    ? `$${(extra.monthly_limit / 100).toFixed(0)}`
    : '—';
  return `
    <div class="section">
      <div class="section-title">Extra Usage</div>
      <div class="usage-card">
        <div class="usage-row">
          <span class="extra-amount">${spent}</span>
          <span class="usage-value">${pct}%</span>
        </div>
        <div class="usage-meta">Limit: ${limit}</div>
        <div class="progress-bar">
          <div class="progress-fill fill-extra" style="width:${pct}%"></div>
        </div>
      </div>
    </div>
  `;
}

async function render(data) {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const org = await getOrg();
  const plan = getPlanName(org);

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
      <div class="section-title">Current Session</div>
      ${renderCard('Session', data.five_hour?.utilization, data.five_hour?.resets_at, 'fill-session')}
    </div>

    <div class="section">
      <div class="section-title">Weekly Limits</div>
      ${renderCard('All Models', data.seven_day?.utilization, data.seven_day?.resets_at, 'fill-weekly')}
      ${renderCard('Claude Design', data.seven_day_omelette?.utilization, data.seven_day_omelette?.resets_at, 'fill-design')}
    </div>

    ${renderExtraUsage(data.extra_usage)}

    <div class="updated">Updated at ${now}</div>
  `;

  document.getElementById('refresh-btn').addEventListener('click', () => refresh());
}

function renderError(err) {
  document.getElementById('app').innerHTML = `
    <div class="error-box">
      <strong>Failed to load usage data</strong><br>
      ${err.message}<br><br>
      Make sure you're logged in to <a href="https://claude.ai" target="_blank">claude.ai</a>, then try again.
      <br><br>
      <button class="refresh-btn" id="retry-btn">Retry</button>
    </div>
  `;
  document.getElementById('retry-btn').addEventListener('click', () => refresh());
}

async function refresh() {
  const btn = document.getElementById('refresh-btn');
  if (btn) {
    btn.classList.add('spinning');
    btn.disabled = true;
  }
  try {
    const data = await fetchUsage();
    await render(data);
  } catch (err) {
    renderError(err);
  }
}

refresh();
setInterval(() => refresh(), 60000);
