// Claude Usage Monitor - DOM cleanup
// Only runs inside iframe (side panel / popup window)
(function () {
  if (window === window.top) return;

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    /* Hide sidebar and settings nav */
    nav[aria-label="Sidebar"] { display: none !important; }
    header:has(h1) { display: none !important; }
    main > h1, main > h2 { display: none !important; }
    nav[aria-label="Settings"] { display: none !important; }

    /* Full width layout */
    main { margin-left: 0 !important; padding: 16px !important; max-width: 100% !important; }
    body > div { padding-left: 0 !important; }
  `;
  document.documentElement.appendChild(style);

  function cleanup() {
    // 1. Hide "Learn more about usage limits" link
    const links = document.querySelectorAll('a');
    for (const a of links) {
      if (a.textContent.trim() === 'Learn more about usage limits') {
        a.closest('p, div')?.style.setProperty('display', 'none', 'important');
        break;
      }
    }

    // 2. Extra usage: hide toggle row and spending details, keep heading + spent/bar
    const headings = document.querySelectorAll('h2, h3');
    for (const h of headings) {
      if (h.textContent.trim() === 'Extra usage') {
        const section = h.parentElement;
        const children = Array.from(section.children);
        // [0]=heading, [1]=toggle row, [2]=spent+bar, [3]=spend limit, [4]=balance+buy
        if (children[1]) children[1].style.setProperty('display', 'none', 'important');
        for (let i = 3; i < children.length; i++) {
          children[i].style.setProperty('display', 'none', 'important');
        }
        break;
      }
    }
  }

  cleanup();
  const observer = new MutationObserver(cleanup);
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
})();
