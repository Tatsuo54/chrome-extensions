const msg = chrome.i18n.getMessage;

let currentMode = 'tabs';

const container = document.getElementById('treeContainer');
const searchInput = document.getElementById('searchInput');
const contextMenu = document.getElementById('context-menu');

// --- i18n: HTML内の固定テキストを設定 ---
document.getElementById('btn-tabs').textContent = msg('tabTabs');
document.getElementById('btn-bookmarks').textContent = msg('tabBookmarks');
searchInput.placeholder = msg('searchPlaceholder');
document.getElementById('undo-btn').textContent = msg('undo');

// --- ユーティリティ ---
function getFaviconUrl(u) {
    if (!u) return "";
    const url = new URL(chrome.runtime.getURL("/_favicon/"));
    url.searchParams.set("pageUrl", u);
    url.searchParams.set("size", "16");
    return url.toString();
}

let toastTimeout;
function showToast(message) {
    document.getElementById('toast-text').textContent = message || msg('toastTabClosed');
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 5000);
}

document.getElementById('undo-btn').onclick = async () => {
    await chrome.sessions.restore();
    document.getElementById('toast').classList.remove('show');
    setTimeout(updateView, 300);
};

// --- 右クリックメニューの制御 ---
document.addEventListener('click', () => contextMenu.style.display = 'none');
window.addEventListener('blur', () => contextMenu.style.display = 'none');

function showContextMenu(e, item) {
    e.preventDefault();
    contextMenu.innerHTML = '';

    const createOption = (text, onClick) => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.textContent = text;
        div.onclick = (ev) => { ev.stopPropagation(); onClick(); contextMenu.style.display = 'none'; };
        return div;
    };
    const createSeparator = () => {
        const div = document.createElement('div');
        div.className = 'menu-separator';
        return div;
    };

    // 共通メニュー
    contextMenu.appendChild(createOption('📋 ' + msg('menuCopyUrl'), () => {
        navigator.clipboard.writeText(item.url);
    }));

    if (item.type === 'tab') {
        contextMenu.appendChild(createSeparator());
        contextMenu.appendChild(createOption(
            item.pinned ? '📌 ' + msg('menuUnpinTab') : '📌 ' + msg('menuPinTab'),
            () => {
                chrome.tabs.update(item.id, { pinned: !item.pinned });
                setTimeout(updateView, 100);
            }
        ));
        contextMenu.appendChild(createOption('❌ ' + msg('menuCloseTab'), () => {
            chrome.tabs.remove(item.id).catch(() => {});
            showToast();
            updateView();
        }));
    } else {
        contextMenu.appendChild(createSeparator());
        contextMenu.appendChild(createOption('🆕 ' + msg('menuOpenNewTab'), () => {
            chrome.tabs.create({ url: item.url, active: false });
        }));
        contextMenu.appendChild(createOption('🕶️ ' + msg('menuOpenIncognito'), () => {
            chrome.windows.create({ url: item.url, incognito: true });
        }));
    }

    // 画面外にはみ出ないように位置調整
    contextMenu.style.display = 'block';
    let x = e.clientX; let y = e.clientY;
    if (x + contextMenu.offsetWidth > window.innerWidth) x = window.innerWidth - contextMenu.offsetWidth;
    if (y + contextMenu.offsetHeight > window.innerHeight) y = window.innerHeight - contextMenu.offsetHeight;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
}

// --- キーボードナビゲーション制御 ---
document.addEventListener('keydown', (e) => {
    const focusable = Array.from(document.querySelectorAll('.item-row, .folder')).filter(el => el.offsetParent !== null);
    if (focusable.length === 0) return;

    const index = focusable.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (index < focusable.length - 1) focusable[index + 1].focus();
        else focusable[0].focus();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (index > 0) focusable[index - 1].focus();
        else focusable[focusable.length - 1].focus();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (document.activeElement && document.activeElement.classList.contains('folder')) {
            e.preventDefault();
            const isCollapsed = document.activeElement.classList.contains('collapsed');
            if (e.key === 'ArrowRight' && isCollapsed) document.activeElement.click();
            if (e.key === 'ArrowLeft' && !isCollapsed) document.activeElement.click();
        }
    }
});


// ==========================================
// 共通ロジック
// ==========================================
function buildTreeData(items) {
    const root = { _children: {}, _items: [], url: "" };
    items.forEach(item => {
        try {
            const urlObj = new URL(item.url);
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            const parts = [urlObj.hostname, ...pathParts];
            let current = root;
            parts.forEach(part => {
                if (!current._children[part]) current._children[part] = { _children: {}, _items: [], url: urlObj.origin };
                current = current._children[part];
            });
            current._items.push(item);
        } catch(e) {}
    });
    return root;
}

function compressTree(node) {
    for (let key in node._children) {
        let child = node._children[key];
        compressTree(child);
        let subKeys = Object.keys(child._children);
        while (child._items.length === 0 && subKeys.length === 1) {
            let subKey = subKeys[0];
            let subChild = child._children[subKey];
            let newKey = key + "/" + subKey;
            delete node._children[key];
            node._children[newKey] = subChild;
            key = newKey; child = subChild; subKeys = Object.keys(child._children);
        }
    }
}

function getSingleItem(node) {
    let itemsCount = node._items.length;
    let childKeys = Object.keys(node._children);
    if (itemsCount === 1 && childKeys.length === 0) return node._items[0];
    if (itemsCount === 0 && childKeys.length === 1) return getSingleItem(node._children[childKeys[0]]);
    return null;
}

function getRepresentativeUrl(node) {
    if (node._items && node._items.length > 0) return node._items[0].url;
    for (const key in node._children) {
        const url = getRepresentativeUrl(node._children[key]);
        if (url) return url;
    }
    return null;
}

function getAllTabIdsFromNode(node) {
    let ids = [];
    node._items.forEach(item => { if(item.type === 'tab') ids.push(item.id); });
    for (let key in node._children) {
        ids = ids.concat(getAllTabIdsFromNode(node._children[key]));
    }
    return ids;
}

function createItemElement(item) {
    const div = document.createElement('div');
    div.className = 'item-row';
    div.tabIndex = 0;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';

    const img = document.createElement('img');
    img.className = 'favicon';
    img.src = getFaviconUrl(item.url);

    const span = document.createElement('span');
    span.className = 'item-text';

    let statusHTML = '';
    if (item.pinned) statusHTML += '<span class="status-icon">📌</span>';
    if (item.audible) statusHTML += '<span class="status-icon">🔊</span>';
    span.innerHTML = statusHTML + (item.title || msg('untitledPage'));
    span.title = item.url;

    contentDiv.appendChild(img);
    contentDiv.appendChild(span);

    const actionClick = () => {
        if (item.type === 'tab') {
            chrome.tabs.update(item.id, { active: true });
            chrome.tabs.get(item.id, (t) => { if(t && t.windowId) chrome.windows.update(t.windowId, { focused: true }); });
        } else {
            chrome.tabs.create({ url: item.url });
        }
    };
    contentDiv.onclick = actionClick;

    div.oncontextmenu = (e) => showContextMenu(e, item);

    div.appendChild(contentDiv);

    if (item.type === 'tab') {
        const closeBtn = document.createElement('div');
        closeBtn.className = 'close-btn';
        closeBtn.textContent = '×';
        closeBtn.title = msg('tooltipCloseTab');
        const actionClose = async (e) => {
            if(e) e.stopPropagation();
            try {
                await chrome.tabs.remove(item.id);
                showToast();
            } catch(err) {}
            updateView();
        };
        closeBtn.onclick = actionClose;
        div.appendChild(closeBtn);

        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); actionClick(); }
            if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); actionClose(); }
        });
    } else {
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); actionClick(); }
        });
    }

    const li = document.createElement('li');
    li.appendChild(div);
    return li;
}

function appendTreeNodes(node, parentUl, query = "") {
    let totalHits = 0;

    node._items.forEach(item => {
        if (query === "" || item.title.toLowerCase().includes(query) || item.url.toLowerCase().includes(query)) {
            parentUl.appendChild(createItemElement(item));
            totalHits++;
        }
    });

    for (const key in node._children) {
        const childNode = node._children[key];
        const singleItem = getSingleItem(childNode);

        if (singleItem) {
            if (query === "" || singleItem.title.toLowerCase().includes(query) || singleItem.url.toLowerCase().includes(query)) {
                parentUl.appendChild(createItemElement(singleItem));
                totalHits++;
            }
            continue;
        }

        const li = document.createElement('li');
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder';
        folderDiv.tabIndex = 0;
        folderDiv.setAttribute('data-folder-key', 'tree:' + key);

        const img = document.createElement('img');
        img.className = 'favicon';
        const repUrl = getRepresentativeUrl(childNode) || childNode.url;
        img.src = getFaviconUrl(repUrl);

        const span = document.createElement('span');
        span.textContent = key;

        folderDiv.appendChild(img);
        folderDiv.appendChild(span);

        folderDiv.onclick = () => folderDiv.classList.toggle('collapsed');

        if (currentMode === 'tabs') {
            const folderCloseBtn = document.createElement('div');
            folderCloseBtn.className = 'folder-close-btn';
            folderCloseBtn.textContent = '×';
            folderCloseBtn.title = msg('tooltipCloseGroup');
            const closeAllTabs = async (e) => {
                if(e) e.stopPropagation();
                const idsToClose = getAllTabIdsFromNode(childNode);
                if(idsToClose.length > 0) {
                    try {
                        await chrome.tabs.remove(idsToClose);
                        showToast(msg('toastTabsClosed', [idsToClose.length.toString()]));
                    } catch(err) {}
                    updateView();
                }
            };
            folderCloseBtn.onclick = closeAllTabs;
            folderDiv.appendChild(folderCloseBtn);

            folderDiv.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); folderDiv.click(); }
                if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); closeAllTabs(); }
            });
        } else {
            folderDiv.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); folderDiv.click(); }
            });
        }

        const childrenUl = document.createElement('ul');
        const childHits = appendTreeNodes(childNode, childrenUl, query);

        if (query !== "" && childHits > 0) {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = childHits;
            folderDiv.appendChild(badge);
            folderDiv.classList.remove('collapsed');
        } else if (query === "") {
            folderDiv.classList.add('collapsed');
        }

        if (query !== "" && childHits === 0) li.classList.add('hidden');

        li.appendChild(folderDiv);
        if (childrenUl.childNodes.length > 0) li.appendChild(childrenUl);
        parentUl.appendChild(li);

        totalHits += childHits;
    }
    return totalHits;
}

// ==========================================
// データ取得系
// ==========================================
async function fetchTabs() {
    const tabs = await chrome.tabs.query({});
    return tabs.map(tab => ({ title: tab.title, url: tab.url, id: tab.id, type: 'tab', pinned: tab.pinned, audible: tab.audible }));
}

async function fetchBookmarks() {
    const tree = await chrome.bookmarks.getTree();
    return tree[0].children;
}

function renderBookmarkFolders(nodes, parentUl, query = "") {
    let totalHits = 0;
    const bookmarksInThisFolder = [];

    nodes.forEach(node => {
        if (node.url) {
            if (node.url.startsWith('http')) {
                bookmarksInThisFolder.push({ title: node.title, url: node.url, id: node.id, type: 'bookmark' });
            }
        } else if (node.children) {
            const li = document.createElement('li');
            const folderDiv = document.createElement('div');
            folderDiv.className = 'folder';
            folderDiv.tabIndex = 0;
            folderDiv.setAttribute('data-folder-key', 'bm:' + node.id);

            const iconSpan = document.createElement('span');
            iconSpan.style.width = '16px';
            iconSpan.style.marginRight = '8px';
            iconSpan.style.fontSize = '14px';
            iconSpan.style.textAlign = 'center';
            iconSpan.style.display = 'inline-block';
            iconSpan.style.flexShrink = '0';
            iconSpan.textContent = '📁';

            const textSpan = document.createElement('span');
            textSpan.textContent = node.title || msg('folder');

            folderDiv.appendChild(iconSpan);
            folderDiv.appendChild(textSpan);

            folderDiv.onclick = () => folderDiv.classList.toggle('collapsed');
            folderDiv.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); folderDiv.click(); }
            });

            const childrenUl = document.createElement('ul');
            const folderHits = renderBookmarkFolders(node.children, childrenUl, query);

            if (query !== "" && folderHits > 0) {
                const badge = document.createElement('span');
                badge.className = 'badge';
                badge.textContent = folderHits;
                folderDiv.appendChild(badge);
                folderDiv.classList.remove('collapsed');
            } else if (query === "") {
                folderDiv.classList.add('collapsed');
            }

            if (query !== "" && folderHits === 0) li.classList.add('hidden');

            li.appendChild(folderDiv);
            if (childrenUl.childNodes.length > 0) li.appendChild(childrenUl);
            parentUl.appendChild(li);

            totalHits += folderHits;
        }
    });

    if (bookmarksInThisFolder.length > 0) {
        const domainTree = buildTreeData(bookmarksInThisFolder);
        compressTree(domainTree);
        const bookmarkHits = appendTreeNodes(domainTree, parentUl, query);
        totalHits += bookmarkHits;
    }

    return totalHits;
}

// ==========================================
// 画面更新とイベント設定
// ==========================================
// --- Folder state persistence ---
function saveExpandedFolders() {
    const expanded = new Set();
    document.querySelectorAll('.folder:not(.collapsed)').forEach(f => {
        const key = f.getAttribute('data-folder-key');
        if (key) expanded.add(key);
    });
    return expanded;
}

function restoreExpandedFolders(expanded) {
    if (expanded.size === 0) return;
    document.querySelectorAll('.folder').forEach(f => {
        const key = f.getAttribute('data-folder-key');
        if (key && expanded.has(key)) {
            f.classList.remove('collapsed');
        }
    });
}

async function _updateViewCore() {
    const expanded = saveExpandedFolders();
    const query = searchInput.value.toLowerCase().trim();

    container.innerHTML = "";
    const rootUl = document.createElement('ul');
    rootUl.className = 'root-ul';

    if (currentMode === 'tabs') {
        const tabsData = await fetchTabs();
        const treeData = buildTreeData(tabsData);
        compressTree(treeData);
        appendTreeNodes(treeData, rootUl, query);
    } else {
        const bookmarkNodes = await fetchBookmarks();
        renderBookmarkFolders(bookmarkNodes, rootUl, query);
    }

    container.appendChild(rootUl);
    restoreExpandedFolders(expanded);
}

let _updateTimer = null;
let _updateRunning = false;
let _updateQueued = false;

function updateView() {
    clearTimeout(_updateTimer);
    _updateTimer = setTimeout(async () => {
        if (_updateRunning) {
            _updateQueued = true;
            return;
        }
        _updateRunning = true;
        try {
            await _updateViewCore();
        } finally {
            _updateRunning = false;
            if (_updateQueued) {
                _updateQueued = false;
                updateView();
            }
        }
    }, 100);
}

document.getElementById('btn-tabs').onclick = () => {
    currentMode = 'tabs';
    document.getElementById('btn-tabs').classList.add('active');
    document.getElementById('btn-bookmarks').classList.remove('active');
    updateView();
};

document.getElementById('btn-bookmarks').onclick = () => {
    currentMode = 'bookmarks';
    document.getElementById('btn-bookmarks').classList.add('active');
    document.getElementById('btn-tabs').classList.remove('active');
    updateView();
};

searchInput.addEventListener('input', updateView);
updateView();

chrome.tabs.onCreated.addListener(() => { if (currentMode === 'tabs') updateView(); });
chrome.tabs.onRemoved.addListener(() => { if (currentMode === 'tabs') updateView(); });
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (currentMode !== 'tabs') return;
    if (changeInfo.url || changeInfo.title || changeInfo.pinned !== undefined || changeInfo.audible !== undefined) {
        updateView();
    }
});

// --- Sticky header shadow on scroll ---
const stickyHeader = document.getElementById('sticky-header');
window.addEventListener('scroll', () => {
    stickyHeader.classList.toggle('scrolled', window.scrollY > 0);
}, { passive: true });
