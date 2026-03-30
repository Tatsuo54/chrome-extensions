// アイコンをクリックした時にサイドパネルを開く設定
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// サイドパネルの開閉状態を監視
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel-connection') {
    port.onDisconnect.addListener(() => {
      // サイドパネルが閉じられたら、すべてのタブにクリーンアップ命令を送信
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: "cleanup" }).catch(() => {});
        });
      });
    });
  }
});

// フレーム間通信の仲介（iframeでのホバーイベントをトップフレームに伝える）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!sender.tab) return; // タブ以外からのメッセージは無視

  const tabId = sender.tab.id;

  if (request.action === "iframeHoverIn") {
    // iframeでホバー開始 -> 同じタブのトップフレーム（frameId: 0）へバナー強調命令を送る
    chrome.tabs.sendMessage(tabId, { action: "updateBanner", state: "hover" }, { frameId: 0 }).catch(() => {});
  } 
  else if (request.action === "iframeHoverOut") {
    // iframeでホバー終了 -> 同じタブのトップフレーム（frameId: 0）へバナー復元命令を送る
    chrome.tabs.sendMessage(tabId, { action: "updateBanner", state: "normal" }, { frameId: 0 }).catch(() => {});
  }
});