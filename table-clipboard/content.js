(function() {
  if (window.tableToCsvModeActive) return;
  window.tableToCsvModeActive = true;
  const MAX_STOCKS = 30;

  // 自分がトップフレーム（親ウィンドウ）かどうかを判定
  const isTopFrame = window === window.top;
  
  const tables = document.querySelectorAll('table');

  // このフレーム内に表がない場合
  if (tables.length === 0) {
    // アラートはトップフレームでのみ出す（iframeごとにアラートが出ないようにする）
    if (isTopFrame) {
      alert(chrome.i18n.getMessage("noTable"));
    }
    window.tableToCsvModeActive = false;
    return;
  }

  // --- トップフレーム用のバナー操作変数 ---
  let bannerElement = null; // バナー要素を保持

  // バナーはトップフレームにのみ表示する
  if (isTopFrame) {
    bannerElement = document.createElement('div');
    bannerElement.id = 'table-exporter-banner';
    bannerElement.innerText = chrome.i18n.getMessage("banner");
    Object.assign(bannerElement.style, {
      position: 'fixed', top: '0', left: '0', width: '100%', backgroundColor: '#007aff', color: 'white',
      textAlign: 'center', padding: '10px', fontSize: '14px', fontWeight: 'bold', zIndex: '999999',
      boxShadow: '0 2px 5px rgba(0,0,0,0.3)', pointerEvents: 'none', transition: 'background-color 0.2s'
    });
    document.body.appendChild(bannerElement);
  }

  let hoveredTable = null;
  let originalOutline = '';
  let originalCursor = '';
  let originalBg = '';

  const mouseOverHandler = (e) => {
    const table = e.target.closest('table');
    if (table && table !== hoveredTable) {
      if (hoveredTable) {
        hoveredTable.style.outline = originalOutline;
        hoveredTable.style.cursor = originalCursor;
        hoveredTable.style.backgroundColor = originalBg;
      }
      hoveredTable = table;
      originalOutline = table.style.outline;
      originalCursor = table.style.cursor;
      originalBg = table.style.backgroundColor;
      
      table.style.outline = '3px solid #007aff'; 
      table.style.cursor = 'pointer';

      // ★iframe内の表をホバーした場合、Backgroundへ通知
      if (!isTopFrame) {
        chrome.runtime.sendMessage({ action: "iframeHoverIn" }).catch(() => {});
      }
    }
  };

  const mouseOutHandler = (e) => {
    if (hoveredTable && !hoveredTable.contains(e.relatedTarget)) {
      hoveredTable.style.outline = originalOutline;
      hoveredTable.style.cursor = originalCursor;
      hoveredTable.style.backgroundColor = originalBg;
      hoveredTable = null;

      // ★iframe内の表からホバーアウトした場合、Backgroundへ通知
      if (!isTopFrame) {
        chrome.runtime.sendMessage({ action: "iframeHoverOut" }).catch(() => {});
      }
    }
  };

  const clickHandler = (e) => {
    const table = e.target.closest('table');
    if (!table) return;

    e.preventDefault();
    e.stopPropagation();
    
    saveTableData(table);
  };

  const keyDownHandler = (e) => {
    if (e.key === 'Escape') {
      cleanup();
    }
  };

  // 終了処理
  const cleanup = () => {
    window.tableToCsvModeActive = false;
    if (hoveredTable) {
      hoveredTable.style.outline = originalOutline;
      hoveredTable.style.cursor = originalCursor;
      hoveredTable.style.backgroundColor = originalBg;
    }
    const b = document.getElementById('table-exporter-banner');
    if (b) b.remove();

    // iframeの場合、クリーンアップ時にホバーアウトメッセージを送って親バナーを元に戻す
    if (!isTopFrame && hoveredTable) {
      chrome.runtime.sendMessage({ action: "iframeHoverOut" }).catch(() => {});
    }

    document.removeEventListener('mouseover', mouseOverHandler, true);
    document.removeEventListener('mouseout', mouseOutHandler, true);
    document.removeEventListener('click', clickHandler, true);
    document.removeEventListener('keydown', keyDownHandler, true);
    
    // リスナーも解除する
    chrome.runtime.onMessage.removeListener(commonMessageListener);
    if (isTopFrame) {
      chrome.runtime.onMessage.removeListener(topFrameMessageListener);
    }
  };

  // --- メッセージリスナー ---

  // 全フレーム共通のリスナー（クリーンアップ命令など）
  const commonMessageListener = (request, sender, sendResponse) => {
    if (request.action === "cleanup") {
      cleanup();
    }
  };

  // トップフレーム専用のリスナー（iframeからのホバー通知によるバナー操作）
  const topFrameMessageListener = (request, sender, sendResponse) => {
    if (!isTopFrame || !bannerElement) return;

    if (request.action === "updateBanner") {
      if (request.state === "hover") {
        // iframeホバー中：バナーを強調（色を濃く、テキスト変更）
        bannerElement.style.backgroundColor = '#005bb5'; // 濃い青
        bannerElement.innerText = chrome.i18n.getMessage("bannerHover");
      } else {
        // 通常時：バナーを元に戻す
        bannerElement.style.backgroundColor = '#007aff'; // 元の青
        bannerElement.innerText = chrome.i18n.getMessage("banner");
      }
    }
  };

  // イベントの登録
  document.addEventListener('mouseover', mouseOverHandler, true);
  document.addEventListener('mouseout', mouseOutHandler, true);
  document.addEventListener('click', clickHandler, true);
  document.addEventListener('keydown', keyDownHandler, true);
  
  chrome.runtime.onMessage.addListener(commonMessageListener);
  
  // トップフレームの場合のみ、バナー操作用のリスナーを追加
  if (isTopFrame) {
    chrome.runtime.onMessage.addListener(topFrameMessageListener);
  }

  function saveTableData(table) {
    chrome.storage.local.get({ savedTables: [] }, (res) => {
      if (res.savedTables.length >= MAX_STOCKS) {
        // 上限アラートはどのフレームからでも出す
        alert(chrome.i18n.getMessage("limit"));
        cleanup();
        return;
      }

      let data2D = [];
      const rows = table.querySelectorAll('tr');
      
      for (let i = 0; i < rows.length; i++) {
        let rowData = [];
        const cols = rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length; j++) {
          rowData.push(cols[j].innerText.replace(/(\r\n|\n|\r)/gm, ' ').trim());
        }
        if(rowData.length > 0) data2D.push(rowData);
      }

      // iframe内の場合は親のタイトルが取れない場合があるため、自身のドキュメントタイトルを使用
      const tableRecord = {
        id: Date.now().toString() + '-' + Math.floor(Math.random() * 10000),
        title: document.title || 'Untitled Page',
        url: window.location.href,
        data: data2D,
        timestamp: new Date().toLocaleString()
      };

      const updated = [...res.savedTables, tableRecord];
      chrome.storage.local.set({ savedTables: updated }, () => {
        table.style.outline = '4px solid #10b981';
        table.style.backgroundColor = '#dcfce7';
        setTimeout(() => {
          if (hoveredTable === table) {
            table.style.outline = '3px solid #007aff';
            table.style.backgroundColor = originalBg;
          }
        }, 300);
      });
    });
  }
})();