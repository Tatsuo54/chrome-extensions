// Icon click → side panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Right-click on icon → popup window
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'open-usage-window',
    title: 'Open Usage in Window',
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
