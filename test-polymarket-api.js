#!/usr/bin/env node
/**
 * Test Polymarket APIs to understand response structure
 */

const endpoints = [
  // Data API - Leaderboard
  'https://data-api.polymarket.com/leaderboard?limit=5',
  // Data API - Top holders
  'https://data-api.polymarket.com/top-holders?limit=5',
  // Gamma API - Events
  'https://gamma-api.polymarket.com/events?limit=3&active=true',
  // Gamma API - Markets
  'https://gamma-api.polymarket.com/markets?limit=3&active=true',
  // Data API - Positions
  'https://data-api.polymarket.com/positions?limit=3',
];

async function test() {
  for (const url of endpoints) {
    console.log('\n' + '='.repeat(80));
    console.log('TESTING:', url);
    console.log('='.repeat(80));
    
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        }
      });
      
      if (!res.ok) {
        console.log('Status:', res.status, res.statusText);
        const text = await res.text();
        console.log('Response:', text.slice(0, 500));
        continue;
      }
      
      const data = await res.json();
      console.log('Status: OK');
      console.log('Response (truncated):');
      console.log(JSON.stringify(data, null, 2).slice(0, 2000));
    } catch (err) {
      console.log('Error:', err.message);
    }
  }
}

test();
