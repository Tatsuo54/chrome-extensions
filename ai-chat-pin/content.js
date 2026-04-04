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
});
function tipPinned() { return TOOLTIP[_lang]?.pinned || TOOLTIP.ja.pinned; }
function tipPin()    { return TOOLTIP[_lang]?.pin    || TOOLTIP.ja.pin;    }

const SITE_CONFIG = {
  'claude.ai': {
    messageSelector: '[data-testid="user-message"], .font-claude-response',
    getTextContent: (el) => {
      const isClaudeMsg = el.classList.contains('font-claude-response');
      return extractStructuredText(el, isClaudeMsg);
    },
    getLabelPrefix: (el) => el.dataset.testid === 'user-message' ? '[You] ' : '[Claude] '
  },
  'chatgpt.com': {
    messageSelector: '[data-message-author-role]',
    getTextContent: (el) => {
      const isAssistant = el.dataset.messageAuthorRole === 'assistant';
      return extractStructuredText(el, isAssistant);
    },
    getLabelPrefix: (el) => el.dataset.messageAuthorRole === 'user' ? '[You] ' : '[ChatGPT] '
  },
  'gemini.google.com': {
    messageSelector: 'user-query, model-response',
    getTextContent: (el) => {
      const isUser = el.tagName.toLowerCase() === 'user-query';
      const textEl = isUser
        ? el.querySelector('div.query-content')
        : el.querySelector('message-content .markdown');
      if (!textEl) return '';
      let text = extractStructuredText(textEl, true);
      if (isUser) {
        text = text.replace(/^(?:あなたのプロンプト|Your prompt)\s*/i, '');
      }
      return text;
    },
    getLabelPrefix: (el) => el.tagName.toLowerCase() === 'user-query' ? '[You] ' : '[Gemini] ',
    insertBefore: true,
  }
};

const hostname = location.hostname;
const config = Object.entries(SITE_CONFIG).find(([key]) => hostname.includes(key))?.[1];

if (!config) console.log('AI Chat Pin: unsupported site');

function extractStructuredText(el, keepBlankLines = false) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('.acp-pin-btn').forEach(b => b.remove());

  if (keepBlankLines) {
    clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(node => {
      const inList = node.closest('li');
      const nextEl = node.nextElementSibling;
      const beforeList = nextEl && (nextEl.tagName === 'UL' || nextEl.tagName === 'OL');
      const nl = inList ? '\n' : '\n\n';
      node.appendChild(document.createTextNode(nl));
    });

    clone.querySelectorAll('ul, ol').forEach(list => {
      if (!list.closest('li')) { 
        list.appendChild(document.createTextNode('\n'));
      }
    });
  }

  clone.querySelectorAll('li p').forEach(p => {
    const span = document.createElement('span');
    span.innerHTML = p.innerHTML;
    p.replaceWith(span);
  });

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
    .replace(/\*\*(.+?)\*\*/g, '$1')          
    .replace(/[ \t]+$/gm, '')                   
    .replace(/\n{2,}/g, keepBlankLines ? '\n\n' : '\n') 
    .replace(/\n\n(・|\d+\. )/g, '\n$1')       
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

  const elements = Array.from(document.querySelectorAll(config.messageSelector)).filter(el => {
    if (el.classList.contains('font-claude-response')) {
      return el.className.includes('leading-[1.65rem]');
    }
    return true;
  });

  elements.forEach(el => {
    // 【重要】ラッパーがないため dataset.acpInjected で二重処理を確実にブロック
    if (el.dataset.acpInjected || el.closest('.acp-wrapper') || el.querySelector('.acp-pin-btn')) return;
    
    if (el.dataset.testid === 'user-message') {
      const area = el.closest('.mt-6.group');
      if (area && area.querySelector('.acp-pin-btn--absolute')) return;
    }

    const text = config.getTextContent(el);
    if (!text || text.length < 1) return;

    // 初期のテキストでFingerprintを固定
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

    // 【重要】Geminiでは要素をラップ（移動）させず、直前に兄弟要素として挿入する
    if (config.insertBefore) {
      el.parentNode.insertBefore(btn, el);
      btn.classList.add('acp-pin-btn--gemini');
      el.dataset.acpInjected = 'true';
    } else if (el.dataset.testid === 'user-message') {
      const area = el.closest('.mt-6.group') || el.closest('.mb-1.mt-6.group');
      if (area) {
        btn.classList.add('acp-pin-btn--absolute');
        area.style.position = 'relative';
        btn.dataset.fingerprint = fingerprint;
        area.appendChild(btn);
        el.dataset.acpInjected = 'true';
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
    text: text, // ピンした時点の最新テキストを取得して保存
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

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  if (changes.lang) {
    _lang = changes.lang.newValue || 'ja';
    document.querySelectorAll('.acp-pin-btn').forEach(btn => {
      btn.title = btn.classList.contains('acp-pinned') ? tipPinned() : tipPin();
    });
  }

  if (changes.enabled !== undefined) {
    _enabled = changes.enabled.newValue !== false;
    if (_enabled) {
      document.body.classList.remove('acp-disabled');
      injectPinButtons();
    } else {
      document.body.classList.add('acp-disabled');
      document.querySelectorAll('.acp-pin-btn:not(.acp-pinned)').forEach(btn => btn.remove());
    }
  }

  if (changes.pins && Array.isArray(changes.pins.newValue) && changes.pins.newValue.length === 0) {
    pinnedFingerprints.clear();
    document.querySelectorAll('.acp-pin-btn.acp-pinned').forEach(btn => {
      btn.classList.remove('acp-pinned');
      btn.title = tipPin();
    });
  }
});