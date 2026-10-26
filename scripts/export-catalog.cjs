const catalog = require('../assets/js/catalog.js');
(async () => {
 const response = await fetch('https://sheetdb.io/api/v1/15hpacliqdaw2', {signal:AbortSignal.timeout(15000)});
 if (!response.ok) throw new Error(`HTTP ${response.status}`);
 const rows = await response.json(); const seen = new Set();
 const exported = rows.map(row => {
  const product = catalog.normalize(row);
  if (!product || seen.has(product.id)) throw new Error(`Invalid or duplicate product ID: ${row.id}. Fix source before migrating.`);
  seen.add(product.id);
  return {id:product.id,name:product.name,category:product.category,price:product.price,is_offer:product.isOffer,is_best_seller:product.isBestSeller,image_url:product.image.startsWith('https://')?product.image:null,active:true};
 });
 console.log(JSON.stringify(exported,null,2));
})().catch(error=>{console.error(error.message);process.exit(1);});
