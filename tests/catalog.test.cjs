const {test} = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../assets/js/catalog.js');
test('reject invalid IDs, names and prices', () => {
  for (const row of [{id:'x',name:'Rice',price:10},{id:1,name:'',price:10},{id:1,name:'Rice',price:0},{id:1,name:'Rice',price:-1}]) assert.equal(catalog.normalize(row,'supabase'),null);
});
test('preserve SQL decimals; parse legacy Colombian prices', () => {
  assert.equal(catalog.normalize({id:1,name:'Arroz',price:2500.50},'supabase').price,2500.50);
  assert.equal(catalog.normalize({id:1,name:'Arroz',price:'$ 2.500'}).price,2500);
});
test('escape HTML and reject unsafe image schemes', () => {
  assert.equal(catalog.escape('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
  assert.equal(catalog.imageUrl('javascript:alert(1)'), 'assets/placeholder.svg');
  assert.equal(catalog.imageUrl('https://example.com/a.jpg'), 'https://example.com/a.jpg');
});
test('catalog drops duplicates and invalid rows', async () => {
  global.MERKOMAX_CONFIG = {provider:'sheetdb',sheetdbUrl:'https://example.com'};
  global.fetch = async () => ({ok:true,json:async()=>[{id:1,name:'Milk',price:3000},{id:1,name:'Duplicate',price:2000},{id:'bad',name:'Invalid',price:100}]});
  assert.equal((await catalog.load()).length,1);
});
