// ============================================================
// Background Service Worker
// ============================================================
importScripts('presets.js');

// --- Init ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'crossCheck',
    title: chrome.i18n.getMessage('contextMenuSelection', ['%s']) || 'Cross Search: "%s"',
    contexts: ['selection']
  });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(e => console.log('setPanelBehavior:', e));

// --- Preset helpers ---
async function getAllPresets() {
  const data = await chrome.storage.sync.get('customPresets');
  const custom = data.customPresets || [];
  return [...BUILTIN_PRESETS, ...custom];
}

async function getActivePreset() {
  const data = await chrome.storage.sync.get('activePresetId');
  const allPresets = await getAllPresets();
  if (data.activePresetId) {
    const found = allPresets.find(p => p.id === data.activePresetId);
    if (found) return found;
  }
  const lang = chrome.i18n.getUILanguage();
  const isJa = lang.startsWith('ja');
  const defaultId = isJa ? 'general-ja' : 'general-en';
  return allPresets.find(p => p.id === defaultId) || allPresets[0];
}

function buildUrls(preset, query) {
  return preset.searches.map(s => ({
    label: s.label,
    url: s.url.replace(/\{query\}/g, encodeURIComponent(query)),
    warning: s.warning
  }));
}

// --- Context Menu ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'crossCheck' && info.selectionText) {
    await storeSearch(info.selectionText.trim());
    openSidePanel(tab);
  }
});

async function openSidePanel(tab) {
  try { await chrome.sidePanel.open({ tabId: tab.id }); }
  catch (e) { console.log('sidePanel.open:', e); }
}

// --- Store search ---
async function storeSearch(query, presetIdOverride) {
  if (!query) return;
  let preset;
  if (presetIdOverride) {
    const allPresets = await getAllPresets();
    preset = allPresets.find(p => p.id === presetIdOverride);
  }
  if (!preset) preset = await getActivePreset();
  const searches = buildUrls(preset, query);
  await chrome.storage.local.set({
    currentSearch: {
      query, searches, presetId: preset.id, presetName: preset.name,
      timestamp: Date.now(), results: {}
    }
  });
  await saveToHistory(query, preset.id, preset.name);
  broadcast({ type: 'searchUpdated' });
}

// --- History ---
async function saveToHistory(query, presetId, presetName) {
  const data = await chrome.storage.sync.get('searchHistory');
  let history = data.searchHistory || [];
  const entry = {
    query,
    presetId: presetId || '',
    presetName: presetName || '',
    date: new Date().toISOString()
  };
  history = history.filter(h => !(h.query === query && h.presetId === presetId));
  history.unshift(entry);
  history = history.slice(0, 30);
  await chrome.storage.sync.set({ searchHistory: history });
}

// --- Open all links ---
async function openAllLinks() {
  const data = await chrome.storage.local.get('currentSearch');
  const searches = data.currentSearch?.searches;
  if (!searches) return;
  for (let i = 0; i < searches.length; i++) {
    await chrome.tabs.create({ url: searches[i].url, active: i === 0 });
  }
}

// --- Result aggregation ---
async function handleResultReport(label, count, snippet) {
  const data = await chrome.storage.local.get('currentSearch');
  if (!data.currentSearch) return;
  data.currentSearch.results = data.currentSearch.results || {};
  data.currentSearch.results[label] = { count, snippet };
  await chrome.storage.local.set({ currentSearch: data.currentSearch });
  broadcast({ type: 'resultsUpdated' });
}

// --- Messaging ---
function broadcast(msg) {
  try { chrome.runtime.sendMessage(msg); } catch (e) {}
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'startSearch':
      storeSearch(msg.query, msg.presetId).then(() => sendResponse({ ok: true }));
      return true;
    case 'getSearches':
      chrome.storage.local.get('currentSearch', d => sendResponse(d.currentSearch || null));
      return true;
    case 'getHistory':
      chrome.storage.sync.get('searchHistory', d => sendResponse(d.searchHistory || []));
      return true;
    case 'clearHistory':
      chrome.storage.sync.remove('searchHistory', () => sendResponse({ ok: true }));
      return true;
    case 'openAllLinks':
      openAllLinks().then(() => sendResponse({ ok: true }));
      return true;
    case 'reportResult':
      handleResultReport(msg.label, msg.count, msg.snippet || '');
      sendResponse({ ok: true });
      break;
    case 'getAllPresets':
      getAllPresets().then(p => sendResponse(p));
      return true;
    case 'getActivePreset':
      getActivePreset().then(p => sendResponse(p));
      return true;
    case 'setActivePreset':
      chrome.storage.sync.set({ activePresetId: msg.presetId }, () => sendResponse({ ok: true }));
      return true;
    case 'saveCustomPresets':
      chrome.storage.sync.set({ customPresets: msg.presets }, () => sendResponse({ ok: true }));
      return true;
    case 'getCustomPresets':
      chrome.storage.sync.get('customPresets', d => sendResponse(d.customPresets || []));
      return true;
  }
});
