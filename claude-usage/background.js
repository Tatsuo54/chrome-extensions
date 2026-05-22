// Claude Usage Monitor - Background Service Worker

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Right-click on icon → popup window
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'open-usage-window',
    title: chrome.i18n.getMessage('contextMenuOpenWindow'),
    contexts: ['action']
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'open-usage-window') {
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 420,
      height: 700
    });
  }
});

// Relay usage data from content script to sidepanel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'usage-data') {
    // Store data and broadcast to any open sidepanel
    chrome.storage.local.set({ usageData: msg.data, lastUpdated: Date.now() });
  }

  if (msg.action === 'fetch-usage') {
    // Sidepanel is requesting fresh data
    // First, try to find an existing claude.ai/settings/usage tab
    chrome.tabs.query({ url: 'https://claude.ai/settings/usage*' }, (tabs) => {
      if (tabs.length > 0) {
        // Tab exists, inject content script to re-read DOM
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }).then(() => {
          sendResponse({ status: 'reading-existing-tab' });
        }).catch((err) => {
          sendResponse({ status: 'error', error: err.message });
        });
      } else {
        // No tab open, create a temporary one
        openTempTab().then(() => {
          sendResponse({ status: 'reading-temp-tab' });
        }).catch((err) => {
          sendResponse({ status: 'error', error: err.message });
        });
      }
    });
    return true; // keep sendResponse channel open for async
  }
});

async function openTempTab() {
  return new Promise((resolve, reject) => {
    // Create tab in background (active: false)
    chrome.tabs.create({
      url: 'https://claude.ai/settings/usage',
      active: false
    }, (tab) => {
      const tabId = tab.id;

      // Wait for the page to load, then inject content script
      function onUpdated(updatedTabId, changeInfo) {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onUpdated);

          // Give the SPA a moment to render
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            }).then(() => {
              // Wait for data to be saved, then close the tab
              setTimeout(() => {
                chrome.tabs.remove(tabId).catch(() => {});
                resolve();
              }, 2000);
            }).catch((err) => {
              chrome.tabs.remove(tabId).catch(() => {});
              reject(err);
            });
          }, 2000);
        }
      }

      chrome.tabs.onUpdated.addListener(onUpdated);

      // Timeout safety: close tab after 15 seconds regardless
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        chrome.tabs.remove(tabId).catch(() => {});
      }, 15000);
    });
  });
}
