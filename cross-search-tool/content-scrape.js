(function() {
  'use strict';
  async function scrape() {
    await new Promise(r => setTimeout(r, 2500));
    const data = await chrome.storage.local.get('currentSearch');
    const cs = data.currentSearch;
    if (!cs) return;

    const host = window.location.hostname;
    const path = window.location.pathname;
    const curUrl = window.location.href;

    // Match this tab to one of the stored search URLs
    const match = cs.searches.find(s => {
      try {
        const su = new URL(s.url);
        const cu = new URL(curUrl);
        // Google search: compare q param
        if (cu.pathname.includes('/search') && su.pathname.includes('/search')) {
          return su.searchParams.get('q') === cu.searchParams.get('q');
        }
        // Google Maps: compare path
        if (cu.pathname.includes('/maps/search/') && su.pathname.includes('/maps/search/')) {
          return decodeURIComponent(su.pathname) === decodeURIComponent(cu.pathname);
        }
        // YouTube: compare search_query param
        if (cu.hostname.includes('youtube.com') && su.hostname.includes('youtube.com')) {
          return su.searchParams.get('search_query') === cu.searchParams.get('search_query');
        }
        return false;
      } catch (e) { return false; }
    });
    if (!match) return;

    let count = 0;
    let snippet = '';

    // --- Google Search ---
    if (host.includes('google.co') && path.includes('/search')) {
      const stats = document.getElementById('result-stats');
      if (stats) {
        const m = stats.textContent.match(/[\d,]+/);
        if (m) count = parseInt(m[0].replace(/,/g, ''), 10) || 0;
      }
      if (!stats) {
        const noRes = document.querySelector('.card-section');
        if (noRes && (noRes.textContent.includes('見つかりません') || noRes.textContent.includes('did not match'))) {
          count = 0;
        } else {
          count = document.querySelectorAll('.g, .MjjYud').length;
        }
      }
      const snipEl = document.querySelector('.VwiC3b, .IsZvec');
      if (snipEl) snippet = snipEl.textContent.trim().slice(0, 100);
    }

    // --- Google Maps ---
    if (host.includes('google.com') && path.includes('/maps')) {
      // Count result cards in the left panel
      const results = document.querySelectorAll('[data-result-index], .Nv2PK');
      count = results.length;
      if (count === 0) {
        // Single result page (direct place)
        const h1 = document.querySelector('h1');
        if (h1 && h1.textContent.trim()) count = 1;
      }
      const firstTitle = document.querySelector('.fontHeadlineSmall, .qBF1Pd');
      if (firstTitle) snippet = firstTitle.textContent.trim().slice(0, 100);
    }

    // --- YouTube ---
    if (host.includes('youtube.com')) {
      const videos = document.querySelectorAll('ytd-video-renderer, ytd-channel-renderer');
      count = videos.length;
      const firstTitle = document.querySelector('#video-title');
      if (firstTitle) snippet = firstTitle.textContent.trim().slice(0, 100);
    }

    chrome.runtime.sendMessage({ type: 'reportResult', label: match.label, count, snippet });
  }
  scrape().catch(e => console.log('[CrossCheck] scrape:', e));
})();
