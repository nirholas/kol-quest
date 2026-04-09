/**
 * GMGN X Tracker Browser Console Scraper (v4 - Paginated + Crash-Safe)
 * 
 * INSTRUCTIONS:
 * 1. Go to https://gmgn.ai/follow?chain=sol in your browser (must be logged in)
 * 2. Open DevTools (F12) → Console tab
 * 3. Paste this entire script and press Enter
 * 4. Run fetchAll() to paginate through the API directly — no scrolling needed!
 *    OR scroll manually to capture data as the page loads.
 * 5. Run downloadData() when done.
 * 
 * Data is saved to localStorage automatically — safe across page crashes.
 * 
 * Commands:
 *   fetchAll()      - Fetch all pages via API directly (recommended).
 *   downloadData()  - Download captured accounts as JSON.
 *   getStats()      - Show current capture stats.
 *   clearData()     - Clears all captured data (including localStorage).
 *   pauseScraper()  - Pause data capture.
 *   resumeScraper() - Resume data capture.
 */

(function() {
  const STORAGE_KEY = '__xTrackerData';

  // Load persisted accounts from localStorage (survives page refreshes/crashes)
  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const arr = JSON.parse(saved);
        return new Map(arr.map(a => [a.handle.toLowerCase(), a]));
      }
    } catch(e) {}
    return new Map();
  }

  function saveToStorage(accounts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(accounts.values())));
    } catch(e) {
      console.warn('localStorage save failed (quota?):', e.message);
    }
  }

  // Initialize global state
  window.__xTrackerScraper = window.__xTrackerScraper || {
    accounts: loadFromStorage(),
    isPaused: false,
  };

  const loaded = window.__xTrackerScraper.accounts.size;
  if (loaded > 0) {
    console.log(`📂 Restored ${loaded} accounts from localStorage.`);
  }
  
  const TAG_MAP = {
    kol: "KOL",
    trader: "Trader",
    master: "Master",
    politics: "Politics",
    media: "Media",
    companies: "Companies",
    founder: "Founders",
    exchange: "Exchanges",
    celebrity: "Celebrity",
    binance_square: "Binance Square",
    other: "Other",
  };

  function parseUser(user) {
    if (!user || typeof user !== 'object') return null;
    
    const handle = user.handle || user.twitter_username || user.screen_name || user.username;
    if (!handle) return null;
    
    let tag = null;
    if (user.user_tag) {
      tag = TAG_MAP[user.user_tag] || user.user_tag;
    } else if (Array.isArray(user.tags) && user.tags.length > 0) {
      tag = TAG_MAP[user.tags[0]] || user.tags[0];
    } else if (user.kol_tag) {
      tag = user.kol_tag;
    }
    
    return {
      handle: handle.replace(/^@/, ''),
      name: user.name || user.display_name || null,
      avatar: user.avatar || user.profile_image_url || null,
      subscribers: user.subscribers || user.subscriber_count || user.follow_count || 0,
      followers: user.followers || user.followers_count || 0,
      tag,
      verified: user.verified ?? user.is_verified ?? false,
      bio: user.bio || user.description || null,
    };
  }

  function mergeUser(parsed) {
    const key = parsed.handle.toLowerCase();
    const existing = window.__xTrackerScraper.accounts.get(key) || {};
    window.__xTrackerScraper.accounts.set(key, {
      ...existing,
      ...parsed,
      subscribers: Math.max(existing.subscribers || 0, parsed.subscribers || 0),
      followers: Math.max(existing.followers || 0, parsed.followers || 0),
    });
    return !existing.handle; // true if new
  }

  function extractFromResponse(data) {
    if (!data || typeof data !== 'object') return 0;
    const users = data?.data?.users || data?.data?.list || data?.data?.kols || data?.data || [];
    if (!Array.isArray(users)) return 0;
    let newCount = 0;
    for (const user of users) {
      const parsed = parseUser(user);
      if (parsed?.handle && mergeUser(parsed)) newCount++;
    }
    if (newCount > 0) {
      saveToStorage(window.__xTrackerScraper.accounts);
      console.log(`✅ Captured ${newCount} new accounts (total: ${window.__xTrackerScraper.accounts.size})`);
    }
    return newCount;
  }

  // --- API Interception (passive capture while scrolling) ---
  function processResponse(response) {
    requestIdleCallback(async () => {
      try { extractFromResponse(await response.json()); } catch(e) {}
    }, { timeout: 2000 });
  }

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0]?.toString?.() || '';
    if (!window.__xTrackerScraper.isPaused && (url.includes('twitter/user/search') || url.includes('/follow') || url.includes('/kol'))) {
      processResponse(response.clone());
    }
    return response;
  };

  const _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, url, ...r) { this._url = url; return _xhrOpen.apply(this, [m, url, ...r]); };
  const _xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(...a) {
    this.addEventListener('load', function() {
      if (!window.__xTrackerScraper.isPaused && this._url && (this._url.includes('twitter/user/search') || this._url.includes('/follow') || this._url.includes('/kol'))) {
        requestIdleCallback(() => { try { extractFromResponse(JSON.parse(this.responseText)); } catch(e) {} });
      }
    });
    return _xhrSend.apply(this, a);
  };

  // --- Direct API Pagination ---
  const USER_TAGS = ['kol','trader','master','politics','media','companies','founder','exchange','celebrity','binance_square','other'];
  const TAG_PARAMS = USER_TAGS.map(t => `user_tags=${t}`).join('&');

  window.fetchAll = async function({ delay = 800 } = {}) {
    if (window.__xTrackerScraper._fetching) { console.log('Already running. Run pauseScraper() to stop.'); return; }
    window.__xTrackerScraper._fetching = true;
    window.__xTrackerScraper.isPaused = false;

    // Grab current page URL params to reuse auth tokens
    const currentParams = new URLSearchParams(location.search);
    const baseAuthParams = new URLSearchParams({
      device_id: currentParams.get('device_id') || crypto.randomUUID(),
      fp_did: currentParams.get('fp_did') || [...Array(32)].map(()=>Math.floor(Math.random()*16).toString(16)).join(''),
      client_id: `gmgn_web_${new Date().toISOString().slice(0,10).replace(/-/g,'')}`,
      from_app: 'gmgn', app_ver: `${new Date().toISOString().slice(0,10).replace(/-/g,'')}`, 
      tz_name: 'America/Los_Angeles', tz_offset: '-25200', app_lang: 'en-US', os: 'web', worker: '0',
    }).toString();

    let pageToken = '';
    let page = 0;
    let stale = 0;

    console.log('🚀 Starting paginated API fetch... Run pauseScraper() to stop.');

    while (!window.__xTrackerScraper.isPaused && stale < 3) {
      page++;
      const url = `https://gmgn.ai/vas/api/v1/twitter/user/search?${baseAuthParams}&limit=50&handle=&${TAG_PARAMS}${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ''}`;
      try {
        const res = await originalFetch(url, {
          headers: { 'Accept': 'application/json', 'Referer': 'https://gmgn.ai/follow?chain=sol' },
          credentials: 'include',
        });
        if (!res.ok) { console.log(`Page ${page}: HTTP ${res.status} — stopping.`); break; }
        const data = await res.json();
        const newCount = extractFromResponse(data);
        const nextToken = data?.data?.next_page_token || data?.data?.page_token || '';
        if (newCount === 0) stale++; else stale = 0;
        console.log(`Page ${page}: +${newCount} new | total: ${window.__xTrackerScraper.accounts.size} | next: ${nextToken ? '✓' : '✗'}`);
        if (!nextToken || nextToken === pageToken) { console.log('No more pages.'); break; }
        pageToken = nextToken;
        await new Promise(r => setTimeout(r, delay));
      } catch(err) {
        console.log(`Page ${page}: Error - ${err.message}`);
        stale++;
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    window.__xTrackerScraper._fetching = false;
    console.log(`\n✅ Done! Total: ${window.__xTrackerScraper.accounts.size} accounts.`);
    console.log('Run downloadData() to save.');
  };

  // --- Control Functions ---
  window.pauseScraper = function() {
    window.__xTrackerScraper.isPaused = true;
    window.__xTrackerScraper._fetching = false;
    console.log('⏸️ Paused. Run resumeScraper() or fetchAll() to continue.');
  };
  window.resumeScraper = function() {
    window.__xTrackerScraper.isPaused = false;
    console.log('▶️ Resumed (passive capture active). Run fetchAll() to paginate again.');
  };
  window.clearData = function() {
    const n = window.__xTrackerScraper.accounts.size;
    window.__xTrackerScraper.accounts.clear();
    localStorage.removeItem(STORAGE_KEY);
    console.log(`🗑️ Cleared ${n} accounts.`);
  };

  window.getStats = function() {
    const accounts = Array.from(window.__xTrackerScraper.accounts.values());
    const tags = {};
    for (const a of accounts) { const t = a.tag || 'Unknown'; tags[t] = (tags[t]||0)+1; }
    console.log(`\n📊 Total: ${accounts.length} accounts\nBy tag:`, JSON.parse(JSON.stringify(tags)));
    return { total: accounts.length, byTag: tags };
  };

  window.getData = function() {
    return Array.from(window.__xTrackerScraper.accounts.values())
      .sort((a, b) => (b.followers||0) - (a.followers||0));
  };

  window.downloadData = function() {
    const accounts = window.getData();
    const blob = new Blob([JSON.stringify({
      meta: { scrapedAt: new Date().toISOString(), source: 'gmgn.ai/follow (browser)', totalAccounts: accounts.length },
      accounts,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: 'gmgn-x-tracker.json' }).click();
    URL.revokeObjectURL(url);
    console.log(`✅ Downloaded ${accounts.length} accounts → move to site/data/gmgn-x-tracker.json`);
  };

  console.log(`
╔════════════════════════════════════════════════════════════╗
║   GMGN X Tracker Scraper (v4 - Paginated + Crash-Safe)     ║
╠════════════════════════════════════════════════════════════╣
║  fetchAll()      - Fetch ALL pages via API (recommended)   ║
║  downloadData()  - Download accounts as JSON               ║
║  getStats()      - Show capture statistics                 ║
║  clearData()     - Clear all data (incl. localStorage)     ║
║  pauseScraper()  - Pause                                   ║
║  resumeScraper() - Resume passive capture                  ║
╠════════════════════════════════════════════════════════════╣
║  Accounts in memory: ${String(window.__xTrackerScraper.accounts.size).padEnd(35)}║
╚════════════════════════════════════════════════════════════╝
Data auto-saves to localStorage on every capture.
Run fetchAll() to start.
  `);
})();
