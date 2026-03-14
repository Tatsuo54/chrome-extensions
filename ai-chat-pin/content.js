// AI Chat Pin - Content Script
// Supports: Claude.ai, ChatGPT, Gemini

const TOOLTIP = {
  ja: { pinned: 'ピン済み（クリックで解除）', pin: 'このメッセージをピン' },
  en: { pinned: 'Pinned (click to unpin)', pin: 'Pin this message' }
};
let _lang = 'ja';
let _enabled = true;
chrome.storage.local.get(['lang', 'enabled'], (r) => {
  if (r.lang) _lang = r.lang;
  if (r.enabled === false) {
    _enabled = false;
    document.body.classList.add('acp-disabled');
  }
});;
function tipPinned() { return TOOLTIP[_lang]?.pinned || TOOLTIP.ja.pinned; }
function tipPin()    { return TOOLTIP[_lang]?.pin    || TOOLTIP.ja.pin;    }

const SITE_CONFIG = {
  'claude.ai': {
    // ユーザー発言: [data-testid="user-message"]
    // Claude発言: .font-claude-response（外側コンテナ）
    messageSelector: '[data-testid="user-message"], .font-claude-response',
    getTextContent: (el) => {
      // Claude発言は空白行を保持する
      const isClaudeMsg = el.classList.contains('font-claude-response');
      return extractStructuredText(el, isClaudeMsg);
    },
    getLabelPrefix: (el) => el.dataset.testid === 'user-message' ? '[You] ' : '[Claude] '
  },
  'chatgpt.com': {
    messageSelector: '[data-message-author-role]',
    getTextContent: (el) => {
      // ChatGPT発言は空白行を保持する（ユーザー発言は不要）
      const isAssistant = el.dataset.messageAuthorRole === 'assistant';
      return extractStructuredText(el, isAssistant);
    },
    getLabelPrefix: (el) => el.dataset.messageAuthorRole === 'user' ? '[You] ' : '[ChatGPT] '
  },
  'gemini.google.com': {
    messageSelector: 'user-query, model-response',
    getTextContent: (el) => {
      const textEl = el.tagName.toLowerCase() === 'user-query'
        ? el.querySelector('div.query-content')
        : el.querySelector('message-content .markdown');
      return textEl ? extractStructuredText(textEl, true) : '';
    },
    getLabelPrefix: (el) => el.tagName.toLowerCase() === 'user-query' ? '[You] ' : '[Gemini] ',
    insertBefore: true,
  }
};

const hostname = location.hostname;
const config = Object.entries(SITE_CONFIG).find(([key]) => hostname.includes(key))?.[1];

if (!config) console.log('AI Chat Pin: unsupported site');

// HTMLを解析して構造化テキストを取得
function extractStructuredText(el, keepBlankLines = false) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('.acp-pin-btn').forEach(b => b.remove());

  // cloneNodeはCSSを失うためブロック要素の改行が消える
  // keepBlankLines時（Gemini）はp/h*/liの末尾に明示的に改行を追加
  if (keepBlankLines) {
    clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(node => {
      const inList = node.closest('li');
      const nextEl = node.nextElementSibling;
      const beforeList = nextEl && (nextEl.tagName === 'UL' || nextEl.tagName === 'OL');
      const nl = inList ? '\n' : '\n\n';
      node.appendChild(document.createTextNode(nl));
    });

    // ul/olの末尾にも改行を追加（直後のp/h*との間に空白行を確保）
    clone.querySelectorAll('ul, ol').forEach(list => {
      if (!list.closest('li')) { // ネストリストは除外
        list.appendChild(document.createTextNode('\n'));
      }
    });
  }

  // li内のpタグをspanに変換（ChatGPT対策：li>pで余分な改行が生じるため）
  clone.querySelectorAll('li p').forEach(p => {
    const span = document.createElement('span');
    span.innerHTML = p.innerHTML;
    p.replaceWith(span);
  });

  // ul > li に中黒を付与（直接の子liのみ、ネストul配下は除外）
  clone.querySelectorAll('ul > li').forEach(li => {
    const directText = Array.from(li.childNodes)
      .filter(n => !(n.nodeType === 1 && n.tagName === 'UL'))
      .map(n => n.textContent)
      .join('').trim();
    if (!directText) return;

    const firstEl = Array.from(li.childNodes).find(n => n.nodeType === 1 && n.tagName !== 'UL');
    if (firstEl) {
      firstEl.insertAdjacentText('afterbegin', '・');
    } else {
      const firstText = Array.from(li.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
      if (firstText) firstText.textContent = '・' + firstText.textContent.trimStart();
    }
  });

  // ol > li に番号を付与（olごとに1からリセット）
  clone.querySelectorAll('ol').forEach(ol => {
    ol.querySelectorAll(':scope > li').forEach((li, i) => {
      const firstEl = Array.from(li.childNodes).find(n => n.nodeType === 1);
      if (firstEl) {
        firstEl.insertAdjacentText('afterbegin', `${i + 1}. `);
      } else {
        const firstText = Array.from(li.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
        if (firstText) firstText.textContent = `${i + 1}. ` + firstText.textContent.trimStart();
      }
    });
  });

  return clone.innerText
    .replace(/\*\*(.+?)\*\*/g, '$1')          // Geminiの未レンダリングMarkdown太字を除去
    .replace(/[ \t]+$/gm, '')                   // 行末空白除去
    .replace(/\n{2,}/g, keepBlankLines ? '\n\n' : '\n') // 空行を1行残す
    .replace(/\n\n(・|\d+\. )/g, '\n$1')       // リスト項目前の余分な空白行を除去
    .trim();
}

function getFingerprint(text) {
  return text.slice(0, 80).replace(/\s+/g, ' ').trim();
}

let pinnedFingerprints = new Set();

function loadPinnedFingerprints(callback) {
  chrome.storage.local.get(['pins'], (result) => {
    const pins = result.pins || [];
    pinnedFingerprints = new Set(pins.map(p => p.fingerprint).filter(Boolean));
    if (callback) callback();
  });
}

function injectPinButtons() {
  if (!config) return;

  // claude.aiの場合、font-claude-responseはleading-[1.65rem]クラスを持つものだけが本文
  const elements = Array.from(document.querySelectorAll(config.messageSelector)).filter(el => {
    if (el.classList.contains('font-claude-response')) {
      return el.className.includes('leading-[1.65rem]');
    }
    return true;
  });

  elements.forEach(el => {
    if (el.closest('.acp-wrapper') || el.querySelector('.acp-pin-btn')) return;
    // ユーザーバブルの場合は親エリアのボタン重複もチェック
    if (el.dataset.testid === 'user-message') {
      const area = el.closest('.mt-6.group');
      if (area && area.querySelector('.acp-pin-btn--absolute')) return;
    }

    const text = config.getTextContent(el);
    if (!text || text.length < 1) return;

    const fingerprint = getFingerprint(text);
    const isPinned = pinnedFingerprints.has(fingerprint);

    const btn = document.createElement('button');
    btn.className = 'acp-pin-btn' + (isPinned ? ' acp-pinned' : '');
    btn.title = isPinned ? tipPinned() : tipPin();
    btn.innerHTML = '📌';
    btn.dataset.fingerprint = fingerprint;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.classList.contains('acp-pinned')) {
        unpinMessage(fingerprint, btn);
      } else {
        pinMessage(el, btn, fingerprint);
      }
    });

    // insertBefore:trueの場合はラッパーdivでくるんでその中に挿入
    if (config.insertBefore) {
      const wrapper = document.createElement('div');
      wrapper.className = 'acp-wrapper';
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(btn);
      wrapper.appendChild(el);
    } else if (el.dataset.testid === 'user-message') {
      // ユーザーバブルはoverflow:hiddenのため、親エリア(.mt-6.group)にabsolute配置
      const area = el.closest('.mt-6.group') || el.closest('.mb-1.mt-6.group');
      if (area) {
        btn.classList.add('acp-pin-btn--absolute');
        area.style.position = 'relative';
        // テキスト抽出はelから、ボタンはareaに追加
        btn.dataset.fingerprint = fingerprint;
        area.appendChild(btn);
      } else {
        el.insertBefore(btn, el.firstChild);
      }
    } else {
      el.insertBefore(btn, el.firstChild);
    }
  });
}

function pinMessage(el, btn, fingerprint) {
  const text = config.getTextContent(el);
  const label = config.getLabelPrefix(el);
  if (!text) return;

  const pin = {
    id: Date.now(),
    fingerprint,
    site: hostname,
    label,
    text: text,
    url: location.href,
    timestamp: new Date().toISOString()
  };

  chrome.storage.local.get(['pins'], (result) => {
    const pins = result.pins || [];
    pins.unshift(pin);
    chrome.storage.local.set({ pins }, () => {
      pinnedFingerprints.add(fingerprint);
      btn.classList.add('acp-pinned');
      btn.title = tipPinned();
    });
  });
}

function unpinMessage(fingerprint, btn) {
  chrome.storage.local.get(['pins'], (result) => {
    const pins = (result.pins || []).filter(p => p.fingerprint !== fingerprint);
    chrome.storage.local.set({ pins }, () => {
      pinnedFingerprints.delete(fingerprint);
      btn.classList.remove('acp-pinned');
      btn.title = tipPin();
    });
  });
}

const observer = new MutationObserver(() => { if (_enabled) injectPinButtons(); });
observer.observe(document.body, { childList: true, subtree: true });

loadPinnedFingerprints(() => { if (_enabled) injectPinButtons(); });

// 言語変更・ON/OFF切り替えメッセージ受信
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'LANG_CHANGED') {
    _lang = msg.lang;
    document.querySelectorAll('.acp-pin-btn').forEach(btn => {
      btn.title = btn.classList.contains('acp-pinned') ? tipPinned() : tipPin();
    });
  }
  if (msg.type === 'ENABLED_CHANGED') {
    _enabled = msg.enabled;
    if (_enabled) {
      document.body.classList.remove('acp-disabled');
      injectPinButtons();
    } else {
      document.body.classList.add('acp-disabled');
      // ピン済み以外のボタンを非表示
      document.querySelectorAll('.acp-pin-btn:not(.acp-pinned)').forEach(btn => btn.remove());
    }
  }
});
