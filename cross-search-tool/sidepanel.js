// ============================================================
// Side Panel Script v6 - Full i18n, history with preset
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const M = chrome.i18n.getMessage;
  const isJa = chrome.i18n.getUILanguage().startsWith('ja');

  // ===========================
  // i18n: populate all static text
  // ===========================
  const i18nMap = {
    'i18n-presetLabel': 'presetLabel',
    'i18n-searchLabel': 'searchLabel',
    'i18n-searchLinksHeader': 'searchLinksHeader',
    'i18n-popupNote': 'popupNote',
    'i18n-resultSummaryHeader': 'resultSummaryHeader',
    'i18n-historyHeader': 'historyHeader',
    'i18n-settingsBack': 'settingsBack',
    'i18n-settingsTitle': 'settingsTitle',
    'i18n-builtinPresetsTitle': 'builtinPresetsTitle',
    'i18n-builtinPresetsDesc': 'builtinPresetsDesc',
    'i18n-customPresetsTitle': 'customPresetsTitle',
    'i18n-customPresetsDesc': 'customPresetsDesc',
    'i18n-presetNameLabel': 'presetNameLabel',
    'i18n-localeLabel': 'localeLabel',
    'i18n-localeJa': 'localeJa',
    'i18n-localeEn': 'localeEn',
    'i18n-footerLink': 'footerLink',
  };
  for (const [id, key] of Object.entries(i18nMap)) {
    const el = document.getElementById(id);
    if (el) el.textContent = M(key);
  }

  document.getElementById('openSettings').textContent = M('presetSettings');
  document.getElementById('searchBtn').textContent = M('searchBtn');
  document.getElementById('clearInputBtn').textContent = M('clearInputBtn');
  document.getElementById('openAllBtn').textContent = M('openAllBtn');
  document.getElementById('clearBtn').textContent = M('clearHistoryBtn');
  document.getElementById('addCustomBtn').textContent = M('addCustomBtn');
  document.getElementById('addSearchEntry').textContent = M('addSearchEntry');
  document.getElementById('editCancel').textContent = M('cancelBtn');
  document.getElementById('editSave').textContent = M('saveBtn');
  document.getElementById('jsonToggle').textContent = M('jsonToggle');

  document.getElementById('searchInput').placeholder = M('searchPlaceholder');
  document.getElementById('editName').placeholder = M('presetNamePlaceholder');

  // ===========================
  // ELEMENT REFS
  // ===========================
  const pageMain     = document.getElementById('pageMain');
  const pageSettings = document.getElementById('pageSettings');
  const searchInput  = document.getElementById('searchInput');
  const searchBtn    = document.getElementById('searchBtn');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const openAllBtn   = document.getElementById('openAllBtn');
  const clearBtn     = document.getElementById('clearBtn');
  const resultsDiv   = document.getElementById('results');
  const linkGrid     = document.getElementById('linkGrid');
  const queryBadge   = document.getElementById('queryBadge');
  const summarySection = document.getElementById('summarySection');
  const summaryList  = document.getElementById('summaryList');
  const presetSelect = document.getElementById('presetSelect');

  // ===========================
  // PAGE NAVIGATION
  // ===========================
  document.getElementById('openSettings').addEventListener('click', () => {
    pageMain.classList.remove('active');
    pageSettings.classList.add('active');
    renderSettings();
  });
  document.getElementById('backToMain').addEventListener('click', () => {
    pageSettings.classList.remove('active');
    pageMain.classList.add('active');
    loadPresetSelect();
  });

  // ===========================
  // PRESET SELECTOR
  // ===========================
  async function loadPresetSelect() {
    const [allPresets, active] = await Promise.all([
      sendMsg({ type: 'getAllPresets' }),
      sendMsg({ type: 'getActivePreset' })
    ]);
    presetSelect.innerHTML = '';
    const jaGroup = document.createElement('optgroup'); jaGroup.label = M('optgroupJa');
    const enGroup = document.createElement('optgroup'); enGroup.label = M('optgroupEn');
    const customGroup = document.createElement('optgroup'); customGroup.label = M('optgroupCustom');

    allPresets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === active.id) opt.selected = true;
      if (!p.builtin) customGroup.appendChild(opt);
      else if (p.locale === 'ja') jaGroup.appendChild(opt);
      else enGroup.appendChild(opt);
    });

    if (isJa) {
      if (jaGroup.children.length) presetSelect.appendChild(jaGroup);
      if (enGroup.children.length) presetSelect.appendChild(enGroup);
    } else {
      if (enGroup.children.length) presetSelect.appendChild(enGroup);
      if (jaGroup.children.length) presetSelect.appendChild(jaGroup);
    }
    if (customGroup.children.length) presetSelect.appendChild(customGroup);
  }
  presetSelect.addEventListener('change', () => {
    sendMsg({ type: 'setActivePreset', presetId: presetSelect.value });
  });
  loadPresetSelect();

  // ===========================
  // SEARCH
  // ===========================
  function doSearch() {
    const query = searchInput.value.trim();
    if (!query) { searchInput.classList.add('error'); searchInput.focus(); return; }
    doSearchQuery(query);
  }
  function doSearchQuery(query, presetId) {
    const msg = { type: 'startSearch', query };
    if (presetId) msg.presetId = presetId;
    sendMsg(msg).then(() => {
      sendMsg({ type: 'getSearches' }).then(data => { if (data) displaySearches(data); });
      loadHistory();
    });
  }
  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });
  searchInput.addEventListener('input', () => searchInput.classList.remove('error'));

  clearInputBtn.addEventListener('click', () => {
    searchInput.value = '';
    resultsDiv.classList.remove('show');
    summarySection.classList.remove('show');
    summaryList.innerHTML = '';
    linkGrid.innerHTML = '';
    queryBadge.textContent = '';
    searchInput.focus();
  });

  openAllBtn.addEventListener('click', () => {
    sendMsg({ type: 'openAllLinks' });
    linkGrid.querySelectorAll('.link-btn').forEach(btn => {
      if (!btn.querySelector('.result-badge')) {
        const b = document.createElement('span'); b.className = 'result-badge loading'; b.textContent = '…'; btn.appendChild(b);
      }
    });
  });

  // ===========================
  // DISPLAY RESULTS
  // ===========================
  function displaySearches(data) {
    queryBadge.textContent = data.query;
    linkGrid.innerHTML = '';
    data.searches.forEach(s => {
      const a = document.createElement('a');
      a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.className = `link-btn ${s.warning ? 'warning' : ''}`;
      a.textContent = s.label; a.dataset.label = s.label;
      linkGrid.appendChild(a);
    });
    resultsDiv.classList.add('show');
    summarySection.classList.remove('show'); summaryList.innerHTML = '';
    searchInput.value = data.query;
    // Sync preset selector with the preset used
    if (data.presetId) {
      const opt = presetSelect.querySelector(`option[value="${data.presetId}"]`);
      if (opt) opt.selected = true;
    }
    if (data.results && Object.keys(data.results).length > 0) updateSummary(data);
  }

  function updateSummary(data) {
    const results = data.results;
    if (!results || !Object.keys(results).length) return;
    summarySection.classList.add('show'); summaryList.innerHTML = '';
    const warningLabels = new Set(data.searches.filter(s => s.warning).map(s => s.label));
    for (const [label, r] of Object.entries(results)) {
      const item = document.createElement('div'); item.className = 'summary-item';
      const isW = warningLabels.has(label);
      let sc, st;
      if (r.count > 0) {
        const countStr = fmtN(r.count);
        sc = isW ? 'warn' : 'ok';
        st = isW ? `⚠ ${M('resultCount', [countStr])}` : `✓ ${M('resultCount', [countStr])}`;
      } else {
        sc = 'ok'; st = M('resultNone');
      }
      item.innerHTML = `<div><div>${esc(label)}</div>${r.snippet ? `<div class="summary-snippet">${esc(r.snippet)}</div>` : ''}</div><span class="status ${sc}">${st}</span>`;
      summaryList.appendChild(item);
    }
    linkGrid.querySelectorAll('.link-btn').forEach(btn => {
      const label = btn.dataset.label; const r = results[label]; if (!r) return;
      const old = btn.querySelector('.result-badge'); if (old) old.remove();
      const b = document.createElement('span');
      const isW = warningLabels.has(label);
      if (r.count > 0) { b.className = `result-badge ${isW ? 'alert' : 'found'}`; b.textContent = fmtN(r.count); }
      else { b.className = 'result-badge none'; b.textContent = '0'; }
      btn.appendChild(b);
    });
  }

  sendMsg({ type: 'getSearches' }).then(data => { if (data && data.searches) displaySearches(data); });

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'searchUpdated') { sendMsg({ type: 'getSearches' }).then(data => { if (data) displaySearches(data); }); loadHistory(); }
    if (msg.type === 'resultsUpdated') { sendMsg({ type: 'getSearches' }).then(data => { if (data) updateSummary(data); }); }
  });

  // ===========================
  // HISTORY
  // ===========================
  function loadHistory() {
    sendMsg({ type: 'getHistory' }).then(history => {
      const list = document.getElementById('historyList');
      if (!history || !history.length) { list.innerHTML = `<li class="no-history">${M('noHistory')}</li>`; return; }
      list.innerHTML = history.slice(0, 20).map(e => {
        const d = new Date(e.date);
        const ds = `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        const presetLabel = e.presetName ? ` <span class="history-preset">${esc(e.presetName)}</span>` : '';
        return `<li class="history-item" data-query="${escA(e.query)}" data-preset="${escA(e.presetId || '')}"><span>${esc(e.query)}${presetLabel}</span><span class="history-date">${ds}</span></li>`;
      }).join('');
      list.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
          const presetId = item.dataset.preset || '';
          doSearchQuery(item.dataset.query, presetId || undefined);
        });
      });
    });
  }
  clearBtn.addEventListener('click', () => sendMsg({ type: 'clearHistory' }).then(loadHistory));
  loadHistory();

  // ===========================
  // SETTINGS PAGE
  // ===========================
  async function renderSettings() {
    const allPresets = await sendMsg({ type: 'getAllPresets' });
    const builtins = allPresets.filter(p => p.builtin);
    const customs = allPresets.filter(p => !p.builtin);

    document.getElementById('builtinList').innerHTML = builtins.map(p => `
      <div class="preset-card">
        <div class="preset-card-header">
          <span class="preset-card-name">${esc(p.name)}</span>
          <span class="preset-card-locale">${p.locale.toUpperCase()}</span>
        </div>
        <div class="preset-card-searches">${p.searches.map(s => s.label).join(', ')}</div>
      </div>
    `).join('');

    const customList = document.getElementById('customList');
    if (!customs.length) {
      customList.innerHTML = `<div style="color:#ccc;font-size:12px;padding:8px 0;">${M('noCustomPresets')}</div>`;
    } else {
      customList.innerHTML = customs.map((p, i) => `
        <div class="preset-card custom">
          <div class="preset-card-header">
            <span class="preset-card-name">${esc(p.name)}</span>
            <span class="preset-card-locale">${p.locale.toUpperCase()}</span>
          </div>
          <div class="preset-card-searches">${p.searches.map(s => s.label).join(', ')}</div>
          <div class="preset-actions">
            <button onclick="editCustomPreset(${i})">${M('editBtn')}</button>
            <button class="delete" onclick="deleteCustomPreset(${i})">${M('deleteBtn')}</button>
          </div>
        </div>
      `).join('');
    }
  }

  // ===========================
  // EDIT MODAL
  // ===========================
  const editModal     = document.getElementById('editModal');
  const editName      = document.getElementById('editName');
  const editLocale    = document.getElementById('editLocale');
  const searchEntries = document.getElementById('searchEntries');
  const jsonEditor    = document.getElementById('jsonEditor');
  const jsonError     = document.getElementById('jsonError');
  const searchCount   = document.getElementById('searchCount');
  let editingIndex = -1;
  let jsonMode = false;

  const SEARCH_ENGINES = [
    { value: 'google',  label: M('engineGoogle'),  base: 'https://www.google.com/search?q=' },
    { value: 'maps',    label: M('engineMaps'),    base: 'https://www.google.com/maps/search/' },
    { value: 'youtube', label: M('engineYoutube'),  base: 'https://www.youtube.com/results?search_query=' },
    { value: 'custom',  label: M('engineCustom'),   base: '' },
  ];

  document.getElementById('addCustomBtn').addEventListener('click', () => openEditor(-1));
  document.getElementById('editCancel').addEventListener('click', closeEditor);
  document.getElementById('editSave').addEventListener('click', savePreset);
  document.getElementById('addSearchEntry').addEventListener('click', () => {
    if (searchEntries.children.length >= 10) { alert(M('alertMaxSearchTargets')); return; }
    addSearchEntry({ label: '', engine: 'google', queryTemplate: '{query}', url: '', warning: false });
  });

  document.getElementById('jsonToggle').addEventListener('click', () => {
    jsonMode = !jsonMode;
    document.getElementById('jsonToggle').textContent = jsonMode ? M('jsonToggleBack') : M('jsonToggle');
    if (jsonMode) {
      jsonEditor.classList.add('show');
      searchEntries.style.display = 'none';
      document.getElementById('addSearchEntry').style.display = 'none';
      jsonEditor.value = JSON.stringify(readFormEntries(), null, 2);
    } else {
      jsonEditor.classList.remove('show');
      searchEntries.style.display = '';
      document.getElementById('addSearchEntry').style.display = '';
      try { renderSearchEntries(JSON.parse(jsonEditor.value)); jsonError.style.display = 'none'; }
      catch (e) { jsonError.textContent = M('jsonErrorPrefix') + e.message; jsonError.style.display = 'block'; }
    }
  });

  function openEditor(index) {
    editingIndex = index;
    jsonMode = false;
    jsonEditor.classList.remove('show');
    searchEntries.style.display = '';
    document.getElementById('addSearchEntry').style.display = '';
    document.getElementById('jsonToggle').textContent = M('jsonToggle');
    jsonError.style.display = 'none';

    if (index >= 0) {
      sendMsg({ type: 'getCustomPresets' }).then(customs => {
        const p = customs[index];
        editName.value = p.name;
        editLocale.value = p.locale;
        renderSearchEntries(p.searches);
        document.getElementById('modalTitle').textContent = M('modalTitleEdit');
        editModal.classList.add('show');
      });
    } else {
      editName.value = '';
      editLocale.value = 'ja';
      renderSearchEntries([
        { label: 'Google', url: 'https://www.google.com/search?q={query}', warning: false },
      ]);
      document.getElementById('modalTitle').textContent = M('modalTitleNew');
      editModal.classList.add('show');
    }
  }

  function closeEditor() { editModal.classList.remove('show'); }

  function renderSearchEntries(searches) {
    searchEntries.innerHTML = '';
    searches.forEach(s => {
      let engine = 'custom';
      let queryTemplate = '';
      for (const eng of SEARCH_ENGINES) {
        if (eng.value === 'custom') continue;
        if (s.url.startsWith(eng.base)) {
          engine = eng.value;
          queryTemplate = decodeURIComponent(s.url.slice(eng.base.length));
          break;
        }
      }
      if (engine === 'custom') queryTemplate = '';
      addSearchEntry({ label: s.label, engine, queryTemplate, url: s.url, warning: s.warning });
    });
    updateSearchCount();
  }

  function addSearchEntry({ label, engine, queryTemplate, url, warning }) {
    const div = document.createElement('div');
    div.className = 'search-entry';
    const engineOptions = SEARCH_ENGINES.map(e =>
      `<option value="${e.value}" ${e.value === engine ? 'selected' : ''}>${e.label}</option>`
    ).join('');

    div.innerHTML = `
      <button class="remove-entry" title="${M('removeEntryTitle')}">×</button>
      <div class="entry-row">
        <div class="entry-field">
          <label>${M('serviceNameLabel')}</label>
          <input type="text" class="entry-label" value="${escA(label)}" placeholder="${M('serviceNamePlaceholder')}">
        </div>
        <div class="entry-field">
          <label>${M('searchEngineLabel')}</label>
          <select class="entry-engine">${engineOptions}</select>
        </div>
      </div>
      <div class="entry-query-row" ${engine === 'custom' ? 'style="display:none"' : ''}>
        <label>${M('queryLabel')}</label>
        <input type="text" class="entry-query" value="${escA(queryTemplate)}" placeholder="${M('queryPlaceholder')}">
      </div>
      <div class="entry-url-preview" title="${M('urlEditTitle')}">${esc(url || buildUrlFromEntry(engine, queryTemplate))}</div>
      <div class="entry-url-edit">
        <input type="text" class="entry-url-direct" value="${escA(url)}" placeholder="https://...">
      </div>
      <div class="entry-validation"></div>
      <div class="entry-options">
        <label><input type="checkbox" class="entry-warning" ${warning ? 'checked' : ''}> ${M('warningFlag')}</label>
      </div>
    `;

    const engineSelect = div.querySelector('.entry-engine');
    const queryInput = div.querySelector('.entry-query');
    const queryRow = div.querySelector('.entry-query-row');
    const preview = div.querySelector('.entry-url-preview');
    const urlEditWrap = div.querySelector('.entry-url-edit');
    const urlDirect = div.querySelector('.entry-url-direct');
    const validation = div.querySelector('.entry-validation');

    function updatePreview() {
      const eng = engineSelect.value;
      const q = queryInput.value || '{query}';
      if (eng !== 'custom') {
        const url = buildUrlFromEntry(eng, q);
        preview.textContent = url;
        urlDirect.value = url;
        validation.style.display = 'none';
      }
      const finalUrl = urlDirect.value;
      if (finalUrl && !finalUrl.includes('{query}') && !finalUrl.includes(encodeURIComponent('{query}'))) {
        validation.textContent = M('urlValidationWarning');
        validation.style.display = 'block';
      } else {
        validation.style.display = 'none';
      }
    }

    engineSelect.addEventListener('change', () => {
      if (engineSelect.value === 'custom') {
        queryRow.style.display = 'none'; urlEditWrap.classList.add('show'); preview.style.display = 'none';
      } else {
        queryRow.style.display = ''; urlEditWrap.classList.remove('show'); preview.style.display = ''; updatePreview();
      }
    });
    queryInput.addEventListener('input', updatePreview);
    preview.addEventListener('click', () => {
      urlEditWrap.classList.toggle('show'); preview.classList.toggle('editing');
      if (urlEditWrap.classList.contains('show')) urlDirect.focus();
    });
    urlDirect.addEventListener('input', () => { preview.textContent = urlDirect.value; updatePreview(); });
    div.querySelector('.remove-entry').addEventListener('click', () => { div.remove(); updateSearchCount(); });

    searchEntries.appendChild(div);
    updateSearchCount();
  }

  function buildUrlFromEntry(engine, queryTemplate) {
    const eng = SEARCH_ENGINES.find(e => e.value === engine);
    if (!eng || !eng.base) return '';
    return eng.base + encodeURIComponent(queryTemplate).replace(/%7Bquery%7D/gi, '{query}');
  }

  function readFormEntries() {
    return Array.from(searchEntries.querySelectorAll('.search-entry')).map(div => {
      const engine = div.querySelector('.entry-engine').value;
      const query = div.querySelector('.entry-query').value.trim();
      let url;
      if (engine === 'custom' || div.querySelector('.entry-url-edit').classList.contains('show')) {
        url = div.querySelector('.entry-url-direct').value.trim();
      } else {
        url = buildUrlFromEntry(engine, query || '{query}');
      }
      return { label: div.querySelector('.entry-label').value.trim(), url, warning: div.querySelector('.entry-warning').checked };
    }).filter(e => e.label && e.url);
  }

  function updateSearchCount() {
    searchCount.textContent = M('searchCount', [String(searchEntries.children.length)]);
  }

  async function savePreset() {
    const name = editName.value.trim();
    if (!name) { editName.style.borderColor = '#dc3545'; return; }
    let searches;
    if (jsonMode) {
      try {
        searches = JSON.parse(jsonEditor.value);
        if (!Array.isArray(searches)) throw new Error(M('jsonErrorArray'));
        searches.forEach(s => { if (!s.label || !s.url) throw new Error(M('jsonErrorFields')); });
      } catch (e) { jsonError.textContent = M('jsonErrorPrefix') + e.message; jsonError.style.display = 'block'; return; }
    } else {
      searches = readFormEntries();
    }
    if (!searches.length) { alert(M('alertAddOneSearch')); return; }
    if (searches.length > 10) { alert(M('alertMaxSearchTargets')); return; }
    const customs = await sendMsg({ type: 'getCustomPresets' });
    if (customs.length >= 10 && editingIndex < 0) { alert(M('alertMaxCustomPresets')); return; }
    const preset = {
      id: editingIndex >= 0 ? customs[editingIndex].id : 'custom-' + Date.now(),
      name, locale: editLocale.value, builtin: false, searches
    };
    if (editingIndex >= 0) customs[editingIndex] = preset; else customs.push(preset);
    await sendMsg({ type: 'saveCustomPresets', presets: customs });
    closeEditor();
    renderSettings();
  }

  window.editCustomPreset = (i) => openEditor(i);
  window.deleteCustomPreset = async (i) => {
    if (!confirm(M('confirmDeletePreset'))) return;
    const customs = await sendMsg({ type: 'getCustomPresets' });
    customs.splice(i, 1);
    await sendMsg({ type: 'saveCustomPresets', presets: customs });
    renderSettings();
  };

  // ===========================
  // HELPERS
  // ===========================
  function sendMsg(msg) { return new Promise(r => chrome.runtime.sendMessage(msg, res => r(res))); }
  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escA(s) { return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function pad(n) { return String(n).padStart(2,'0'); }
  function fmtN(n) { if(n>=1e6) return Math.floor(n/1e6)+'M'; if(n>=1e3) return Math.floor(n/1e3)+'K'; return String(n); }
});
