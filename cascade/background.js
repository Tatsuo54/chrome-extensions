// アイコンクリックでサイドパネルを開く設定
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

// アイコン右クリック → 別ウィンドウ（ポップアップ）で開く
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'open-in-window',
    title: chrome.i18n.getMessage('contextMenuOpenWindow'),
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
