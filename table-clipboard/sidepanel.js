// Backgroundと接続し、サイドパネルが開いていることを伝える
// ★変数に保持することで、意図しない自動切断（ガベージコレクション）を防ぎます
const sidepanelPort = chrome.runtime.connect({ name: 'sidepanel-connection' });

// ★サイドパネルが閉じられる時（unload）に、開いている全タブへ確実に終了命令を送る
window.addEventListener('unload', () => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: "cleanup" }).catch(() => {});
    });
  });
});

// UIのテキストを多言語対応（HTML読み込み時に実行）
function updateUILanguage() {
  document.getElementById('start-btn').innerText = chrome.i18n.getMessage("startBtn");
  document.getElementById('all-actions-title').innerText = chrome.i18n.getMessage("allTitle");
  document.getElementById('btn-delete-all').innerText = chrome.i18n.getMessage("deleteAll");
}

updateUILanguage();

document.getElementById('start-btn').addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { 
      tabId: tab.id,
      allFrames: true // iframe内にもスクリプトを適用
    },
    files: ['content.js']
  });
});

const listDiv = document.getElementById('stock-list');

function renderList(savedTables) {
  listDiv.innerHTML = '';

  if (savedTables.length === 0) {
    listDiv.innerHTML = `<div style="text-align:center; font-size:12px; color:#888; margin-top: 20px;">${chrome.i18n.getMessage("emptyList")}</div>`;
    return;
  }

  savedTables.forEach((tableObj) => {
    const fullPreviewText = tableObj.data.map(row => row.join(' | ')).join('\n');
    const item = document.createElement('div');
    item.className = 'table-item';
    item.innerHTML = `
      <div class="table-title" title="${tableObj.title}">${tableObj.title}</div>
      <div class="table-meta">${tableObj.timestamp} (${tableObj.data.length} rows)</div>
      <div class="table-preview" id="preview-${tableObj.id}">${fullPreviewText}</div>
      <div class="toggle-preview" data-target="preview-${tableObj.id}">${chrome.i18n.getMessage("more")}</div>
      <div class="btn-group">
        <button class="btn-dl" data-id="${tableObj.id}" data-type="csv">CSV</button>
        <button class="btn-dl" data-id="${tableObj.id}" data-type="txt">TXT</button>
        <button class="btn-dl" data-id="${tableObj.id}" data-type="md">MD</button>
      </div>
      <button class="btn-delete" data-id="${tableObj.id}">${chrome.i18n.getMessage("deleteItem")}</button>
    `;
    listDiv.appendChild(item);
  });
}

chrome.storage.local.get({ savedTables: [] }, (res) => renderList(res.savedTables));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.savedTables) {
    renderList(changes.savedTables.newValue || []);
  }
});

listDiv.addEventListener('click', (e) => {
  const target = e.target;
  const id = target.getAttribute('data-id');
  
  if (target.classList.contains('toggle-preview')) {
    const targetId = target.getAttribute('data-target');
    const previewEl = document.getElementById(targetId);
    if (previewEl.classList.contains('expanded')) {
      previewEl.classList.remove('expanded');
      target.innerText = chrome.i18n.getMessage("more");
    } else {
      previewEl.classList.add('expanded');
      target.innerText = chrome.i18n.getMessage("close");
    }
    return;
  }

  if (!id) return;

  if (target.classList.contains('btn-dl')) {
    const type = target.getAttribute('data-type');
    chrome.storage.local.get({ savedTables: [] }, (res) => {
      const tableObj = res.savedTables.find(tb => String(tb.id) === String(id));
      if (tableObj) {
        const content = generateContent(tableObj, type);
        downloadFile(content, type, `table_${tableObj.id}.${type}`);
      }
    });
  } 
  else if (target.classList.contains('btn-delete')) {
    chrome.storage.local.get({ savedTables: [] }, (res) => {
      const updated = res.savedTables.filter(tb => String(tb.id) !== String(id));
      chrome.storage.local.set({ savedTables: updated });
    });
  }
});

document.getElementById('btn-dl-all-csv').addEventListener('click', () => downloadZipAll('csv'));
document.getElementById('btn-dl-all-txt').addEventListener('click', () => downloadZipAll('txt'));
document.getElementById('btn-dl-all-md').addEventListener('click', () => downloadZipAll('md'));

document.getElementById('btn-delete-all').addEventListener('click', () => {
  if (confirm(chrome.i18n.getMessage("confirmDelete"))) {
    chrome.storage.local.set({ savedTables: [] });
  }
});

function generateContent(tableObj, type) {
  if (type === 'csv') {
    return "\uFEFF" + tableObj.data.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  } else if (type === 'txt') {
    return tableObj.data.map(row => row.join('\t')).join('\n');
  } else if (type === 'md') {
    if(tableObj.data.length === 0) return "";
    const header = `| ${tableObj.data[0].join(' | ')} |`;
    const separator = `|${tableObj.data[0].map(() => '---').join('|')}|`;
    const rows = tableObj.data.slice(1).map(row => `| ${row.join(' | ')} |`);
    return [header, separator, ...rows].join('\n');
  }
  return "";
}

function downloadFile(content, type, filename) {
  const mimeType = type === 'csv' ? 'text/csv' : 'text/plain';
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

function downloadZipAll(type) {
  chrome.storage.local.get({ savedTables: [] }, (res) => {
    if (res.savedTables.length === 0) {
      alert(chrome.i18n.getMessage("noData"));
      return;
    }
    const zip = new JSZip();
    res.savedTables.forEach((tableObj, index) => {
      const content = generateContent(tableObj, type);
      const safeTitle = tableObj.title.replace(/[\\/:*?"<>|]/g, '').substring(0, 30);
      const filename = `${safeTitle}_${index + 1}.${type}`;
      zip.file(filename, content);
    });
    zip.generateAsync({ type: "blob" }).then(function(blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `table_export_${new Date().getTime()}.zip`;
      link.click();
    });
  });
}