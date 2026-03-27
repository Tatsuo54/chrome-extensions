// ============================================================
// Built-in Presets
// ============================================================
const BUILTIN_PRESETS = [
  // ---- Japanese ----
  {
    id: 'general-ja',
    name: '🔍 一般',
    locale: 'ja',
    builtin: true,
    searches: [
      { label: 'Google',    url: 'https://www.google.com/search?q={query}', warning: false },
      { label: 'マップ',    url: 'https://www.google.com/maps/search/{query}', warning: false },
      { label: 'Instagram', url: 'https://www.google.com/search?q=site:instagram.com {query}', warning: false },
      { label: 'X',         url: 'https://www.google.com/search?q=site:twitter.com {query}', warning: false },
      { label: 'TikTok',    url: 'https://www.google.com/search?q=site:tiktok.com {query}', warning: false },
      { label: 'Reddit',    url: 'https://www.google.com/search?q=site:reddit.com {query}', warning: false },
      { label: '閉業',      url: 'https://www.google.com/search?q={query} 閉業', warning: true },
      { label: '移転',      url: 'https://www.google.com/search?q={query} 移転', warning: true },
    ]
  },
  {
    id: 'cooking-ja',
    name: '🍳 料理',
    locale: 'ja',
    builtin: true,
    searches: [
      { label: 'Google',       url: 'https://www.google.com/search?q={query} レシピ', warning: false },
      { label: 'YouTube',      url: 'https://www.youtube.com/results?search_query={query} レシピ', warning: false },
      { label: 'クックパッド', url: 'https://www.google.com/search?q=site:cookpad.com {query}', warning: false },
      { label: 'クラシル',     url: 'https://www.google.com/search?q=site:kurashiru.com {query}', warning: false },
      { label: 'DELISH',       url: 'https://www.google.com/search?q=site:delishkitchen.tv {query}', warning: false },
      { label: 'Nadia',        url: 'https://www.google.com/search?q=site:oceans-nadia.com {query}', warning: false },
      { label: 'Instagram',    url: 'https://www.google.com/search?q=site:instagram.com {query} レシピ', warning: false },
      { label: 'TikTok',       url: 'https://www.google.com/search?q=site:tiktok.com {query} レシピ', warning: false },
    ]
  },
  {
    id: 'food-ja',
    name: '🍜 飲食',
    locale: 'ja',
    builtin: true,
    searches: [
      { label: 'Google',    url: 'https://www.google.com/search?q={query}', warning: false },
      { label: 'マップ',    url: 'https://www.google.com/maps/search/{query}', warning: false },
      { label: '食べログ',  url: 'https://www.google.com/search?q=site:tabelog.com {query}', warning: false },
      { label: 'Retty',     url: 'https://www.google.com/search?q=site:retty.me {query}', warning: false },
      { label: 'Instagram', url: 'https://www.google.com/search?q=site:instagram.com {query}', warning: false },
      { label: 'X',         url: 'https://www.google.com/search?q=site:twitter.com {query}', warning: false },
      { label: 'TikTok',    url: 'https://www.google.com/search?q=site:tiktok.com {query}', warning: false },
      { label: '閉業',      url: 'https://www.google.com/search?q={query} 閉業', warning: true },
      { label: '移転',      url: 'https://www.google.com/search?q={query} 移転', warning: true },
    ]
  },
  {
    id: 'electronics-ja',
    name: '🛒 買物',
    locale: 'ja',
    builtin: true,
    searches: [
      { label: 'Google',   url: 'https://www.google.com/search?q={query}', warning: false },
      { label: '価格.com', url: 'https://www.google.com/search?q=site:kakaku.com {query}', warning: false },
      { label: 'Amazon',   url: 'https://www.google.com/search?q=site:amazon.co.jp {query}', warning: false },
      { label: '楽天',     url: 'https://www.google.com/search?q=site:rakuten.co.jp {query}', warning: false },
      { label: 'X',        url: 'https://www.google.com/search?q=site:twitter.com {query}', warning: false },
      { label: 'YouTube',  url: 'https://www.youtube.com/results?search_query={query}', warning: false },
    ]
  },
  {
    id: 'travel-ja',
    name: '✈️ 旅行',
    locale: 'ja',
    builtin: true,
    searches: [
      { label: 'Google',       url: 'https://www.google.com/search?q={query}', warning: false },
      { label: 'マップ',       url: 'https://www.google.com/maps/search/{query}', warning: false },
      { label: 'じゃらん',     url: 'https://www.google.com/search?q=site:jalan.net {query}', warning: false },
      { label: '楽天トラベル', url: 'https://www.google.com/search?q=site:travel.rakuten.co.jp {query}', warning: false },
      { label: 'Booking.com', url: 'https://www.google.com/search?q=site:booking.com {query}', warning: false },
      { label: 'TripAdvisor', url: 'https://www.google.com/search?q=site:tripadvisor.jp {query}', warning: false },
      { label: 'Instagram',   url: 'https://www.google.com/search?q=site:instagram.com {query}', warning: false },
      { label: '閉業',        url: 'https://www.google.com/search?q={query} 閉業', warning: true },
      { label: '移転',        url: 'https://www.google.com/search?q={query} 移転', warning: true },
    ]
  },

  // ---- English ----
  {
    id: 'general-en',
    name: '🔍 General',
    locale: 'en',
    builtin: true,
    searches: [
      { label: 'Google',    url: 'https://www.google.com/search?q={query}', warning: false },
      { label: 'Maps',      url: 'https://www.google.com/maps/search/{query}', warning: false },
      { label: 'Instagram', url: 'https://www.google.com/search?q=site:instagram.com {query}', warning: false },
      { label: 'X',         url: 'https://www.google.com/search?q=site:twitter.com {query}', warning: false },
      { label: 'TikTok',    url: 'https://www.google.com/search?q=site:tiktok.com {query}', warning: false },
      { label: 'Reddit',    url: 'https://www.google.com/search?q=site:reddit.com {query}', warning: false },
      { label: 'Closed?',   url: 'https://www.google.com/search?q={query} permanently closed', warning: true },
      { label: 'Relocated?',url: 'https://www.google.com/search?q={query} relocated', warning: true },
    ]
  },
  {
    id: 'cooking-en',
    name: '🍳 Cooking',
    locale: 'en',
    builtin: true,
    searches: [
      { label: 'Google',       url: 'https://www.google.com/search?q={query} recipe', warning: false },
      { label: 'YouTube',      url: 'https://www.youtube.com/results?search_query={query} recipe', warning: false },
      { label: 'AllRecipes',   url: 'https://www.google.com/search?q=site:allrecipes.com {query}', warning: false },
      { label: 'Food Network', url: 'https://www.google.com/search?q=site:foodnetwork.com {query}', warning: false },
      { label: 'Epicurious',   url: 'https://www.google.com/search?q=site:epicurious.com {query}', warning: false },
      { label: 'Tasty',        url: 'https://www.google.com/search?q=site:tasty.co {query}', warning: false },
      { label: 'Instagram',    url: 'https://www.google.com/search?q=site:instagram.com {query} recipe', warning: false },
      { label: 'TikTok',       url: 'https://www.google.com/search?q=site:tiktok.com {query} recipe', warning: false },
    ]
  },
  {
    id: 'food-en',
    name: '🍜 Restaurants',
    locale: 'en',
    builtin: true,
    searches: [
      { label: 'Google',      url: 'https://www.google.com/search?q={query}', warning: false },
      { label: 'Maps',        url: 'https://www.google.com/maps/search/{query}', warning: false },
      { label: 'Yelp',        url: 'https://www.google.com/search?q=site:yelp.com {query}', warning: false },
      { label: 'TripAdvisor', url: 'https://www.google.com/search?q=site:tripadvisor.com {query}', warning: false },
      { label: 'Instagram',   url: 'https://www.google.com/search?q=site:instagram.com {query}', warning: false },
      { label: 'TikTok',      url: 'https://www.google.com/search?q=site:tiktok.com {query}', warning: false },
      { label: 'OpenTable',   url: 'https://www.google.com/search?q=site:opentable.com {query}', warning: false },
      { label: 'Closed?',     url: 'https://www.google.com/search?q={query} permanently closed', warning: true },
      { label: 'Relocated?',  url: 'https://www.google.com/search?q={query} relocated', warning: true },
    ]
  },
  {
    id: 'electronics-en',
    name: '🛒 Shopping',
    locale: 'en',
    builtin: true,
    searches: [
      { label: 'Google',   url: 'https://www.google.com/search?q={query}', warning: false },
      { label: 'Amazon',   url: 'https://www.google.com/search?q=site:amazon.com {query}', warning: false },
      { label: 'eBay',     url: 'https://www.google.com/search?q=site:ebay.com {query}', warning: false },
      { label: 'Reddit',   url: 'https://www.google.com/search?q=site:reddit.com {query}', warning: false },
      { label: 'YouTube',  url: 'https://www.youtube.com/results?search_query={query} review', warning: false },
      { label: 'Best Buy', url: 'https://www.google.com/search?q=site:bestbuy.com {query}', warning: false },
    ]
  },
  {
    id: 'travel-en',
    name: '✈️ Travel',
    locale: 'en',
    builtin: true,
    searches: [
      { label: 'Google',      url: 'https://www.google.com/search?q={query}', warning: false },
      { label: 'Maps',        url: 'https://www.google.com/maps/search/{query}', warning: false },
      { label: 'Booking.com', url: 'https://www.google.com/search?q=site:booking.com {query}', warning: false },
      { label: 'TripAdvisor', url: 'https://www.google.com/search?q=site:tripadvisor.com {query}', warning: false },
      { label: 'Airbnb',      url: 'https://www.google.com/search?q=site:airbnb.com {query}', warning: false },
      { label: 'Expedia',     url: 'https://www.google.com/search?q=site:expedia.com {query}', warning: false },
      { label: 'Instagram',   url: 'https://www.google.com/search?q=site:instagram.com {query}', warning: false },
      { label: 'Closed?',     url: 'https://www.google.com/search?q={query} permanently closed', warning: true },
      { label: 'Relocated?',  url: 'https://www.google.com/search?q={query} relocated', warning: true },
    ]
  },
];

if (typeof globalThis !== 'undefined') globalThis.BUILTIN_PRESETS = BUILTIN_PRESETS;
