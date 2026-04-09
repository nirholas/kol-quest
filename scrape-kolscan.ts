/**
 * Scraper for kolscan.io leaderboard
 * Fetches all wallet data with full schema
 */

const BASE_URL = "https://kolscan.io";

interface KolWallet {
  [key: string]: any;
}

async function fetchLeaderboardPage(page: number = 1): Promise<any> {
  // Try the API endpoint that the frontend likely calls
  const urls = [
    `${BASE_URL}/api/leaderboard?page=${page}`,
    `${BASE_URL}/api/v1/leaderboard?page=${page}`,
    `${BASE_URL}/api/kols?page=${page}`,
    `${BASE_URL}/api/v1/kols?page=${page}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": `${BASE_URL}/leaderboard`,
          "Origin": BASE_URL,
        },
      });
      if (res.ok) {
        const data = await res.json();
        console.error(`[OK] ${url} -> status ${res.status}`);
        return { url, data };
      } else {
        console.error(`[SKIP] ${url} -> status ${res.status}`);
      }
    } catch (e: any) {
      console.error(`[FAIL] ${url} -> ${e.message}`);
    }
  }
  return null;
}

async function discoverApiFromHtml(): Promise<string | null> {
  // Fetch the HTML page to discover API endpoints from JS bundles
  const res = await fetch(`${BASE_URL}/leaderboard`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();

  // Look for script tags
  const scriptMatches = html.match(/src="([^"]*\.(js|mjs)(\?[^"]*)?)"/g) || [];
  console.error(`Found ${scriptMatches.length} script tags`);

  // Look for API URLs in the HTML
  const apiMatches = html.match(/["'](\/api[^"']*|https?:\/\/[^"']*api[^"']*)["']/g) || [];
  console.error(`Found API URLs in HTML: ${apiMatches.join(", ")}`);

  // Look for Next.js data or similar
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (nextDataMatch) {
    console.error("Found __NEXT_DATA__");
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      console.error("Next.js data keys:", Object.keys(nextData));
      if (nextData.props?.pageProps) {
        return JSON.stringify(nextData.props.pageProps);
      }
    } catch {}
  }

  // Look for inline data
  const dataMatches = html.match(/window\.__[A-Z_]+__\s*=\s*(\{[\s\S]*?\});/g) || [];
  for (const m of dataMatches) {
    console.error("Found inline data:", m.substring(0, 100));
  }

  // Check for Next.js _next/data routes
  const buildIdMatch = html.match(/"buildId":"([^"]+)"/);
  if (buildIdMatch) {
    const buildId = buildIdMatch[1];
    console.error(`Found Next.js buildId: ${buildId}`);
    try {
      const dataUrl = `${BASE_URL}/_next/data/${buildId}/leaderboard.json`;
      const dataRes = await fetch(dataUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (dataRes.ok) {
        const data = await dataRes.json();
        console.error(`Got Next.js data route data`);
        return JSON.stringify(data);
      }
    } catch {}
  }

  // Try fetching a JS bundle to find API endpoints
  for (const scriptTag of scriptMatches.slice(0, 5)) {
    const srcMatch = scriptTag.match(/src="([^"]*)"/);
    if (!srcMatch) continue;
    let src = srcMatch[1];
    if (src.startsWith("/")) src = BASE_URL + src;
    try {
      const jsRes = await fetch(src, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const js = await jsRes.text();
      // Look for API patterns
      const apiPatterns = js.match(/["'`](\/api\/[^"'`\s]{3,60})["'`]/g) || [];
      if (apiPatterns.length > 0) {
        console.error(`Found API patterns in ${src}: ${apiPatterns.slice(0, 10).join(", ")}`);
      }
      // Look for fetch calls
      const fetchPatterns = js.match(/fetch\(["'`]([^"'`]+)["'`]/g) || [];
      if (fetchPatterns.length > 0) {
        console.error(`Found fetch calls in ${src}: ${fetchPatterns.slice(0, 10).join(", ")}`);
      }
    } catch {}
  }

  return html;
}

async function tryCommonApiEndpoints(): Promise<any> {
  const endpoints = [
    "/api/leaderboard",
    "/api/v1/leaderboard",
    "/api/kols",
    "/api/v1/kols",
    "/api/wallets",
    "/api/v1/wallets",
    "/api/traders",
    "/api/v1/traders",
    "/api/top-traders",
    "/api/ranking",
    "/api/v1/ranking",
    "/api/kol/leaderboard",
    "/api/kol/list",
    "/api/data/leaderboard",
    "/api/leaderboard/all",
    "/api/kols/all",
    "/api/kols/leaderboard",
    "/api/graphql",
  ];

  for (const ep of endpoints) {
    try {
      const url = `${BASE_URL}${ep}`;
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": `${BASE_URL}/leaderboard`,
        },
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("json")) {
        const data = await res.json();
        console.error(`[HIT] ${url} -> ${res.status} (${contentType})`);
        return { endpoint: ep, data };
      } else {
        console.error(`[${res.status}] ${url} (${contentType})`);
      }
    } catch (e: any) {
      console.error(`[ERR] ${BASE_URL}${ep} -> ${e.message}`);
    }
  }
  return null;
}

async function fetchAllPages(baseEndpoint: string): Promise<any[]> {
  const allData: any[] = [];
  let page = 1;
  const maxPages = 100;

  while (page <= maxPages) {
    const separator = baseEndpoint.includes("?") ? "&" : "?";
    const url = `${BASE_URL}${baseEndpoint}${separator}page=${page}&limit=100&size=100&per_page=100`;
    try {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": `${BASE_URL}/leaderboard`,
        },
      });
      if (!res.ok) break;
      const data = await res.json();
      
      // Handle different response shapes
      let items: any[] = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data.results && Array.isArray(data.results)) {
        items = data.results;
      } else if (data.items && Array.isArray(data.items)) {
        items = data.items;
      } else if (data.kols && Array.isArray(data.kols)) {
        items = data.kols;
      } else if (data.wallets && Array.isArray(data.wallets)) {
        items = data.wallets;
      } else {
        // Single page response with unknown structure
        if (page === 1) allData.push(data);
        break;
      }

      if (items.length === 0) break;
      allData.push(...items);
      console.error(`Page ${page}: got ${items.length} items (total: ${allData.length})`);

      // Check for pagination info
      if (data.hasMore === false || data.has_more === false || data.last_page === page) break;
      if (items.length < 10 && page > 1) break; // likely last page

      page++;
    } catch (e: any) {
      console.error(`Error on page ${page}: ${e.message}`);
      break;
    }
  }

  return allData;
}

async function main() {
  console.error("=== Kolscan.io Leaderboard Scraper ===\n");

  // Step 1: Discover API via HTML inspection
  console.error("--- Step 1: Inspecting HTML for API discovery ---");
  const htmlData = await discoverApiFromHtml();

  // Step 2: Try common API endpoints
  console.error("\n--- Step 2: Trying common API endpoints ---");
  const apiResult = await tryCommonApiEndpoints();

  if (apiResult) {
    console.error(`\nFound working endpoint: ${apiResult.endpoint}`);
    console.error("Sample data structure:", JSON.stringify(apiResult.data, null, 2).substring(0, 500));

    // Step 3: Fetch all pages
    console.error("\n--- Step 3: Fetching all pages ---");
    const allData = await fetchAllPages(apiResult.endpoint);
    
    if (allData.length > 0) {
      console.error(`\nTotal records fetched: ${allData.length}`);
      console.error(`Schema keys: ${Object.keys(allData[0]).join(", ")}`);
      // Output the full data to stdout
      console.log(JSON.stringify(allData, null, 2));
    } else {
      // Output whatever we got
      console.log(JSON.stringify(apiResult.data, null, 2));
    }
  } else {
    console.error("\nNo API endpoint found. Outputting raw HTML data...");
    // If we got Next.js data, it might already be JSON
    if (htmlData && htmlData.startsWith("{")) {
      console.log(htmlData);
    } else if (htmlData) {
      // Parse the HTML table if present
      const tableRows = htmlData.match(/<tr[\s\S]*?<\/tr>/g) || [];
      console.error(`Found ${tableRows.length} table rows in HTML`);
      
      // Look for wallet addresses in the HTML
      const walletPattern = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
      const wallets = [...new Set(htmlData.match(walletPattern) || [])];
      console.error(`Found ${wallets.length} potential wallet addresses`);
      
      console.log(JSON.stringify({ 
        wallets,
        tableRowCount: tableRows.length,
        note: "API endpoint not discovered. Raw wallet addresses extracted from HTML." 
      }, null, 2));
    }
  }
}

main().catch(console.error);
