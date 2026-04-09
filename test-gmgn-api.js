#!/usr/bin/env node
/**
 * Quick test to see GMGN X Tracker API response
 */

const url = 'https://gmgn.ai/vas/api/v1/twitter/user/search?limit=5&user_tags=kol&user_tags=trader';

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log('Response:', JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
