// AI Chat Pin - Popup Script

// ---- i18n ----
const i18n = {
  ja: {
    clearAll:        '全削除',
    langToggle:      'EN',
    empty:           'ピンがありません<br><br>チャット画面でメッセージにホバーすると<br>📌 ボタンが表示されます',
    copy:            'コピー',
    copied:          'コピー済',
    expand:          'もっと見る',
    collapse:        '閉じる',
    memoAdd:         'メモ追加',
    memoEdit:        'メモ編集',
    memoDelete:      '削除',
    memoPlaceholder: 'このピンの背景・理由を入力...',
    memoSave:        '保存',
    memoCancel:      'キャンセル',
    handoffTitle:    '🔗 引き継ぎ',
    handoffOpen:     '▲ 開く',
    handoffClose:    '▼ 閉じる',
    generate:        '自動生成',
    handoffCopy:     'コピー',
    handoffCopied:   'コピー済！',
    handoffHint:     'エクスポート（TXT/CSV）にも引き継ぎ内容が含まれます',
    handoffPlaceholder: '「自動生成」でピン内容から引き継ぎ文を生成、または直接入力してください。',
    noPins:          '（ピンがありません）',
    confirmClear:    'すべてのピンと引き継ぎ文を削除しますか？',
    memoLabel:       '背景・理由',
    contentLabel:    '内容',
    handoffHeader:   '以下は前の会話でピンした重要な内容です。これを踏まえて、次のチャットでスムーズに会話を継続できるよう引き継ぎ文を作成してください。',
    handoffFooter:   '1. 確定した方針・制約をまとめる\n2. 現在進行中のタスクと次のアクションを整理する\n3. 次のチャット冒頭に貼り付ける引き継ぎ文を作成する',
    exportHandoff:   '========== 引き継ぎ ==========',
  },
  en: {
    clearAll:        'Clear All',
    langToggle:      'JA',
    empty:           'No pins yet<br><br>Hover over any message in chat<br>to see the 📌 button',
    copy:            'Copy',
    copied:          'Copied',
    expand:          'Show more',
    collapse:        'Collapse',
    memoAdd:         'Add note',
    memoEdit:        'Edit note',
    memoDelete:      'Delete',
    memoPlaceholder: 'Add background or reason for this pin...',
    memoSave:        'Save',
    memoCancel:      'Cancel',
    handoffTitle:    '🔗 Handoff',
    handoffOpen:     '▲ Open',
    handoffClose:    '▼ Close',
    generate:        'Auto-generate',
    handoffCopy:     'Copy',
    handoffCopied:   'Copied!',
    handoffHint:     'Handoff content is also included in TXT/CSV exports',
    handoffPlaceholder: 'Click "Auto-generate" to create a handoff from pins, or type directly.',
    noPins:          '(No pins)',
    confirmClear:    'Delete all pins and handoff text?',
    memoLabel:       'Note',
    contentLabel:    'Content',
    handoffHeader:   'The following are important points pinned from a previous conversation. Based on these, please create a handoff message for seamless continuation in the next chat.',
    handoffFooter:   '1. Summarize confirmed decisions and constraints\n2. Organize current tasks and next actions\n3. Write a handoff message to paste at the start of the next chat',
    exportHandoff:   '========== Handoff ==========',
  }
};

let currentLang = 'ja';

function t(key) {
  return i18n[currentLang][key] || i18n.ja[key] || key;
}

function applyLang() {
  // 言語ボタンのアクティブ表示
  document.getElementById('lang-ja').className = currentLang === 'ja' ? 'lang-active' : 'lang-inactive';
  document.getElementById('lang-en').className = currentLang === 'en' ? 'lang-active' : 'lang-inactive';
  // ヘッダーボタン
  document.getElementById('clear-all').textContent = t('clearAll');
  // 引き継ぎフッター
  document.getElementById('btn-generate').textContent = t('generate');
  document.getElementById('btn-copy-handoff').textContent = t('handoffCopy');
  document.getElementById('handoff-text').placeholder = t('handoffPlaceholder');
  document.querySelector('.handoff-hint').textContent = t('handoffHint');
  document.querySelector('.handoff-title').textContent = t('handoffTitle');
  // 引き継ぎ矢印（開閉状態に応じて）
  const arrow = document.getElementById('handoff-arrow');
  if (arrow) arrow.textContent = handoffOpen ? t('handoffClose') : t('handoffOpen');
  // ピン一覧を再描画（テキスト反映）
  chrome.storage.local.get(['pins'], (result) => renderPins(result.pins || []));
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function getSiteName(hostname) {
  if (hostname.includes('claude')) return 'Claude';
  if (hostname.includes('chatgpt')) return 'ChatGPT';
  if (hostname.includes('gemini')) return 'Gemini';
  return hostname;
}

function getSiteClass(hostname) {
  if (hostname.includes('claude')) return 'site-claude';
  if (hostname.includes('chatgpt')) return 'site-chatgpt';
  if (hostname.includes('gemini')) return 'site-gemini';
  return 'site-unknown';
}

function cleanText(text) {
  return (text || '').replace(/📌/g, '').replace(/\s+$/, '').trim();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- ピン一覧 ----

function renderPins(pins) {
  const list = document.getElementById('pin-list');

  if (!pins || pins.length === 0) {
    list.innerHTML = `<div class="empty">${t('empty')}</div>`;
    return;
  }

  list.innerHTML = pins.map((pin) => `
    <div class="pin-item" data-id="${pin.id}">
      <div class="pin-meta">
        <span class="pin-label">${pin.label || ''}</span>
        <span class="pin-site ${getSiteClass(pin.site)}">${getSiteName(pin.site)}</span>
        <span class="pin-time">${formatDate(pin.timestamp)}</span>
      </div>
      <div class="pin-text" id="text-${pin.id}">${escapeHtml(cleanText(pin.text))}</div>
      ${pin.memo ? `<div class="pin-memo">📝 ${escapeHtml(pin.memo)}</div>` : ''}
      <div class="pin-actions">
        <button class="copy-btn" data-id="${pin.id}">${t('copy')}</button>
        <button class="expand-btn" data-id="${pin.id}" ${cleanText(pin.text).length <= 100 ? 'style="display:none"' : ''}>${t('expand')}</button>
        <button class="memo-btn" data-id="${pin.id}">${pin.memo ? t('memoEdit') : t('memoAdd')}</button>
        <button class="del-btn" data-id="${pin.id}">${t('memoDelete')}</button>
      </div>
      <div class="memo-editor" id="memo-editor-${pin.id}" style="display:none;">
        <textarea class="memo-input" id="memo-input-${pin.id}" placeholder="${t('memoPlaceholder')}">${escapeHtml(pin.memo || '')}</textarea>
        <div class="memo-editor-actions">
          <button class="memo-save-btn" data-id="${pin.id}">${t('memoSave')}</button>
          <button class="memo-cancel-btn" data-id="${pin.id}">${t('memoCancel')}</button>
        </div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pin = pins.find(p => p.id == btn.dataset.id);
      if (!pin) return;
      const memoLine = pin.memo ? `[${t('memoLabel')}] ${pin.memo}\n` : '';
      navigator.clipboard.writeText(pin.label + memoLine + cleanText(pin.text)).then(() => {
        btn.textContent = t('copied');
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = t('copy'); btn.classList.remove('copied'); }, 1500);
      });
    });
  });

  list.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const textEl = document.getElementById('text-' + btn.dataset.id);
      const expanded = textEl.classList.toggle('expanded');
      btn.textContent = expanded ? t('collapse') : t('expand');
    });
  });

  list.querySelectorAll('.memo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const editor = document.getElementById('memo-editor-' + btn.dataset.id);
      editor.style.display = editor.style.display === 'none' ? 'block' : 'none';
    });
  });

  list.querySelectorAll('.memo-save-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const memo = document.getElementById('memo-input-' + btn.dataset.id).value.trim();
      chrome.storage.local.get(['pins'], (result) => {
        const updated = (result.pins || []).map(p =>
          p.id == btn.dataset.id ? { ...p, memo } : p
        );
        chrome.storage.local.set({ pins: updated }, () => renderPins(updated));
      });
    });
  });

  list.querySelectorAll('.memo-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('memo-editor-' + btn.dataset.id).style.display = 'none';
    });
  });

  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.storage.local.get(['pins'], (result) => {
        const updated = (result.pins || []).filter(p => p.id != btn.dataset.id);
        chrome.storage.local.set({ pins: updated }, () => renderPins(updated));
      });
    });
  });
}

// ---- 引き継ぎフッター ----

// 開閉
const handoffToggle = document.getElementById('handoff-toggle');
const handoffBody = document.getElementById('handoff-body');
const handoffArrow = document.getElementById('handoff-arrow');
let handoffOpen = false;

handoffToggle.addEventListener('click', () => {
  handoffOpen = !handoffOpen;
  handoffBody.classList.toggle('open', handoffOpen);
  handoffArrow.textContent = handoffOpen ? t('handoffClose') : t('handoffOpen');
  // 保存済みの引き継ぎ文を復元
  if (handoffOpen) {
    chrome.storage.local.get(['handoff'], (result) => {
      if (result.handoff) {
        document.getElementById('handoff-text').value = result.handoff;
      }
    });
  }
});

// 引き継ぎ文の編集を自動保存
document.getElementById('handoff-text').addEventListener('input', (e) => {
  chrome.storage.local.set({ handoff: e.target.value });
});

// 自動生成
document.getElementById('btn-generate').addEventListener('click', () => {
  chrome.storage.local.get(['pins'], (result) => {
    const pins = result.pins || [];
    if (!pins.length) {
      document.getElementById('handoff-text').value = t('noPins');
      return;
    }
    const prompt = buildHandoffPrompt(pins);
    document.getElementById('handoff-text').value = prompt;
    chrome.storage.local.set({ handoff: prompt });
  });
});

// コピー
document.getElementById('btn-copy-handoff').addEventListener('click', () => {
  const text = document.getElementById('handoff-text').value;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-copy-handoff');
    btn.textContent = t('handoffCopied');
    setTimeout(() => { btn.textContent = t('handoffCopy'); }, 1800);
  });
});

function buildHandoffPrompt(pins) {
  const items = pins.map((p, i) => {
    const label = p.label || '';
    const site = getSiteName(p.site);
    const memo = p.memo ? `\n  ${t('memoLabel')}: ${p.memo}` : '';
    const text = cleanText(p.text);
    return `【${i+1}】${site} ${label}${memo}\n  ${t('contentLabel')}: ${text}`;
  }).join('\n\n');

  return `${t('handoffHeader')}\n\n${items}\n\n---\n${t('handoffFooter')}`;
}

// ---- エクスポート ----

function getHandoffText() {
  return document.getElementById('handoff-text').value.trim();
}

document.getElementById('export-txt').addEventListener('click', () => {
  chrome.storage.local.get(['pins', 'handoff'], (result) => {
    const pins = result.pins || [];
    if (!pins.length) return;
    const pinSection = pins.map(p => {
      const memo = p.memo ? `[${t('memoLabel')}] ${p.memo}\n` : '';
      return `[${formatDate(p.timestamp)}] ${getSiteName(p.site)} ${p.label}\n${memo}${cleanText(p.text)}\n`;
    }).join('\n---\n\n');
    const handoff = result.handoff ? `\n\n${t('exportHandoff')}\n${result.handoff}` : '';
    downloadFile('ai-chat-pins.txt', pinSection + handoff, 'text/plain');
  });
});

document.getElementById('export-csv').addEventListener('click', () => {
  chrome.storage.local.get(['pins', 'handoff'], (result) => {
    const pins = result.pins || [];
    if (!pins.length) return;
    const header = 'timestamp,site,label,memo,text,url\n';
    const rows = pins.map(p =>
      [p.timestamp, getSiteName(p.site), p.label, p.memo || '', cleanText(p.text), p.url]
        .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');
    const handoff = result.handoff
      ? `\n"handoff","","","","${String(result.handoff).replace(/"/g, '""')}",""`
      : '';
    const bom = '\uFEFF';
    downloadFile('ai-chat-pins.csv', bom + header + rows + handoff, 'text/csv;charset=utf-8');
  });
});

document.getElementById('clear-all').addEventListener('click', () => {
  if (!confirm(t('confirmClear'))) return;
  chrome.storage.local.set({ pins: [], handoff: '' }, () => {
    renderPins([]);
    document.getElementById('handoff-text').value = '';
  });
});

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- 言語切り替え ----
document.getElementById('lang-toggle').addEventListener('click', () => {
  currentLang = currentLang === 'ja' ? 'en' : 'ja';
  chrome.storage.local.set({ lang: currentLang }, () => {
    applyLang();
    // content.jsにも言語変更を通知（アクティブタブ）
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'LANG_CHANGED', lang: currentLang });
    });
  });
});

// ---- 初期化 ----
chrome.storage.local.get(['pins', 'lang'], (result) => {
  currentLang = result.lang || 'ja';
  document.getElementById('clear-all').textContent = t('clearAll');
  document.getElementById('btn-generate').textContent = t('generate');
  document.getElementById('btn-copy-handoff').textContent = t('handoffCopy');
  document.getElementById('handoff-text').placeholder = t('handoffPlaceholder');
  document.querySelector('.handoff-hint').textContent = t('handoffHint');
  document.querySelector('.handoff-title').textContent = t('handoffTitle');
  renderPins(result.pins || []);
});
