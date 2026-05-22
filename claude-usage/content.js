// Claude Usage Monitor - Content Script
// Reads usage data from the DOM of claude.ai/settings/usage
// Sends parsed data via chrome.storage.local

(function () {
  function parseUsageData() {
    const data = {
      plan: null,
      session: null,
      weekly: null,
      claudeDesign: null,
      usageCredits: null
    };

    // Get progressbar values
    const bars = document.querySelectorAll('[role="progressbar"]');
    const barValues = Array.from(bars).map(bar => {
      return parseInt(bar.getAttribute('aria-valuenow'), 10) || 0;
    });

    // Get the full text of the main content area
    const main = document.querySelector('main');
    if (!main) return null;
    const text = main.innerText;

    // Plan name: look for "Plan usage limits" followed by plan name
    const planMatch = text.match(/Plan usage limits\s*\n\s*(\w+)/);
    if (planMatch) data.plan = planMatch[1];

    // Current session
    const sessionResetMatch = text.match(/Current session\s*\n\s*(Resets.+)/);
    if (sessionResetMatch && barValues.length > 0) {
      data.session = {
        utilization: barValues[0],
        resetText: sessionResetMatch[1].trim()
      };
    }

    // All models (weekly)
    const weeklyResetMatch = text.match(/All models\s*\n\s*(Resets.+)/);
    if (weeklyResetMatch && barValues.length > 1) {
      data.weekly = {
        utilization: barValues[1],
        resetText: weeklyResetMatch[1].trim()
      };
    }

    // Claude Design
    if (barValues.length > 2) {
      data.claudeDesign = {
        utilization: barValues[2]
      };
    }

    // Usage credits (formerly Extra usage)
    // Look for "$X.XX spent" pattern
    const spentMatch = text.match(/\$(\d+(?:\.\d{2})?) spent/);
    const creditResetMatch = text.match(/\$\d+(?:\.\d{2})? spent\s*\n\s*(Resets.+)/);
    const limitMatch = text.match(/\$(\d+)\s*\n\s*Monthly spend limit/);

    // Check if usage credits are enabled by looking for the spent pattern
    if (spentMatch) {
      const creditBarIndex = barValues.length > 4 ? 4 : barValues.length - 1;
      data.usageCredits = {
        enabled: true,
        spent: spentMatch[1],
        utilization: barValues[creditBarIndex] || 0,
        resetText: creditResetMatch ? creditResetMatch[1].trim() : '',
        limit: limitMatch ? limitMatch[1] : null
      };
    } else {
      // Check if the section exists but is disabled
      if (text.includes('Turn on usage credits') || text.includes('Turn on extra usage')) {
        data.usageCredits = { enabled: false };
      }
    }

    return data;
  }

  function sendData() {
    const data = parseUsageData();
    if (data) {
      chrome.runtime.sendMessage({ action: 'usage-data', data: data });
      chrome.storage.local.set({ usageData: data, lastUpdated: Date.now() });
    }
  }

  // Send data when page is ready
  sendData();

  // Watch for DOM changes (SPA re-renders) - only register once
  if (!window.__claudeUsageMonitorObserver) {
    const observer = new MutationObserver(() => {
      sendData();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.__claudeUsageMonitorObserver = true;
  }

  // Also listen for explicit requests from sidepanel
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'request-usage-data') {
      const data = parseUsageData();
      sendResponse({ data: data });
    }
  });
})();
