(function (root) {
  'use strict';
  const placeholder = 'assets/placeholder.svg';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function imageUrl(value) {
    if (value === placeholder) return placeholder;
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : placeholder; }
    catch { return placeholder; }
  }
  function normalize(item, source = 'sheetdb') {
    const id = Number(item.id);
    const price = source === 'sheetdb' && typeof item.price === 'string'
      ? Number(item.price.replace(/\./g, '').replace(/[^0-9]/g, '')) : Number(item.price);
    if (!Number.isSafeInteger(id) || id < 1 || !String(item.name ?? '').trim() || !Number.isFinite(price) || price <= 0 || price > 1e9) return null;
    return {id, name: String(item.name).trim(), category: String(item.category || 'despensa').trim().toLowerCase(), price,
      isOffer: String(item.isOffer ?? item.is_offer).toLowerCase() === 'true',
      isBestSeller: String(item.isBestSeller ?? item.is_best_seller).toLowerCase() === 'true',
      image: imageUrl(item.image_url ?? item.image)};
  }
  async function load() {
    const config = root.MERKOMAX_CONFIG;
    const isDatabase = config.provider === 'supabase';
    if (isDatabase && (!config.supabaseUrl || !config.supabasePublishableKey)) throw new Error('Missing database configuration');
    const url = isDatabase ? `${config.supabaseUrl}/rest/v1/products?select=id,name,category,price,is_offer,is_best_seller,image_url&active=eq.true&order=id.asc&limit=1000` : config.sheetdbUrl;
    const response = await fetch(url, {headers: isDatabase ? {apikey: config.supabasePublishableKey} : {}, signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Invalid catalog response');
    const seen = new Set();
    return data.map(item => normalize(item, config.provider)).filter(item => item && !seen.has(item.id) && seen.add(item.id));
  }
  root.Catalog = {escape, imageUrl, normalize, load};
  if (typeof module !== 'undefined') module.exports = root.Catalog;
})(typeof window === 'undefined' ? globalThis : window);
