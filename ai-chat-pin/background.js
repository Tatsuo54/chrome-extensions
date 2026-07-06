// AI Chat Pin - Background Service Worker
// ツールバーアイコンクリックでサイドパネルを開く
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// アイコン右クリック → 別ウィンドウ（ポップアップ）で開く
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'open-in-window',
    title: chrome.i18n.getUILanguage().startsWith('ja') ? '別ウィンドウで開く' : 'Open in Window',
    contexts: ['action']
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'open-in-window') {
    chrome.windows.create({
      url: 'sidepanel.html',
      type: 'popup',
      width: 420,
      height: 700
    });
  }
});
