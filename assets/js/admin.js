'use strict';
const config = window.MERKOMAX_CONFIG;
const $ = id => document.getElementById(id);
let token = null, rows = [], current = null, previewUrl = null;
const categories = {despensa:'Despensa',frescos:'Frescos',lacteos:'Lácteos',aseo:'Aseo',combos:'Combos'};
for (const [value,label] of Object.entries(categories)) $('category').add(new Option(label,value));
const message = text => { $('status').textContent = text; };
function clearSession() {
  token = null; rows = []; current = null; $('workspace').hidden = true; $('login').hidden = false; $('logout').hidden = true; $('list').replaceChildren();
}
async function request(path, options = {}) {
  const response = await fetch(config.supabaseUrl + path, {...options, headers: {apikey:config.supabasePublishableKey, ...(token ? {Authorization:`Bearer ${token}`} : {}), ...options.headers}, signal:AbortSignal.timeout(20000)});
  if (!response.ok) {
    if (response.status === 401) { clearSession(); throw new Error('Tu sesión venció. Vuelve a entrar para continuar.'); }
    throw new Error(response.status === 403 ? 'Tu cuenta no tiene permiso para esta operación.' : `No se pudo completar la operación (${response.status}). Inténtalo de nuevo.`);
  }
  return response.status === 204 ? null : response.text().then(text => text ? JSON.parse(text) : null);
}
async function refresh() {
  rows = await request('/rest/v1/products?select=*&order=name.asc&limit=1000');
  $('total').textContent = `${rows.length} productos`; render();
}
function render() {
  const query = $('adminSearch').value.toLocaleLowerCase('es');
  $('list').replaceChildren();
  for (const row of rows.filter(row => `${row.name} ${row.category}`.toLocaleLowerCase('es').includes(query))) {
    const article = document.createElement('article'); article.className = 'product-row';
    const img = document.createElement('img'); img.src = Catalog.imageUrl(row.image_url); img.alt = ''; img.loading = 'lazy'; img.onerror = () => {img.onerror = null; img.src = 'assets/placeholder.svg';};
    const info = document.createElement('div'); const name = document.createElement('strong'); name.textContent = row.name;
    const detail = document.createElement('small'); detail.textContent = `$${Number(row.price).toLocaleString('es-CO')} · ${row.active ? 'Visible' : 'Oculto'}`;
    info.append(name,detail); const edit = document.createElement('button'); edit.textContent = 'Editar'; edit.onclick = () => select(row);
    article.append(img,info,edit); $('list').append(article);
  }
  if (!$('list').children.length) $('list').textContent = 'No hay productos para mostrar.';
}
function select(row = null) {
  current = row; $('productForm').reset(); $('productId').value = row?.id || '';
  $('formTitle').textContent = row ? 'Editar producto' : 'Nuevo producto';
  $('name').value = row?.name || ''; $('price').value = row?.price || '';
  if (row && ![...$('category').options].some(option => option.value === row.category)) $('category').add(new Option(row.category,row.category));
  $('category').value = row?.category || 'despensa'; $('active').checked = row?.active ?? true;
  $('offer').checked = row?.is_offer ?? false; $('bestseller').checked = row?.is_best_seller ?? false;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  $('preview').src = Catalog.imageUrl(row?.image_url); $('name').focus();
}
$('login').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true; message('Comprobando acceso…');
  try {
    const session = await request('/auth/v1/token?grant_type=password', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('email').value.trim(),password:$('password').value})});
    if (session.user?.app_metadata?.role !== 'catalog_admin') throw new Error('Esta cuenta no está autorizada para administrar el catálogo.');
    token = session.access_token; $('password').value = ''; await refresh();
    $('login').hidden = true; $('workspace').hidden = false; $('logout').hidden = false; message('');
  } catch (error) { token = null; message(error.message); } finally { button.disabled = false; }
});
$('logout').onclick = async () => { try { await request('/auth/v1/logout',{method:'POST'}); } catch {} clearSession(); message('Sesión cerrada.'); };
$('newProduct').onclick = () => select(); $('adminSearch').oninput = render;
$('photo').onchange = () => {
  const file = $('photo').files[0]; if (!file) return;
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) { message('Elige una foto JPG, PNG o WebP de hasta 5 MB.'); $('photo').value = ''; return; }
  if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(file); $('preview').src = previewUrl;
};
$('productForm').addEventListener('submit', async event => {
  event.preventDefault(); $('saveProduct').disabled = true; message('Guardando producto…');
  let uploaded = null, saved = false;
  try {
    const item = {name:$('name').value.trim(),category:$('category').value,price:Number($('price').value),active:$('active').checked,is_offer:$('offer').checked,is_best_seller:$('bestseller').checked};
    if (!item.name || !Number.isFinite(item.price) || item.price <= 0) throw new Error('Revisa el nombre y el precio.');
    const file = $('photo').files[0];
    if (file) {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) throw new Error('La foto debe ser JPG, PNG o WebP y pesar hasta 5 MB.');
      uploaded = `${crypto.randomUUID()}.${{ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]}`;
      await request(`/storage/v1/object/${config.imageBucket}/${uploaded}`, {method:'POST',headers:{'Content-Type':file.type},body:file});
      item.image_path = uploaded; item.image_url = `${config.supabaseUrl}/storage/v1/object/public/${config.imageBucket}/${uploaded}`;
    }
    await request(`/rest/v1/products${current ? `?id=eq.${current.id}` : ''}`, {method:current?'PATCH':'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(item)});
    saved = true;
    // Keep prior objects until an owner-reviewed cleanup: they may be shared by imported products.
    select(); await refresh(); message('Producto guardado.');
  } catch (error) {
    if (uploaded && !saved) { try { await request(`/storage/v1/object/${config.imageBucket}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[uploaded]})}); } catch {} }
    message(saved ? 'El producto se guardó, pero no pudimos actualizar la lista. Recarga la página.' : error.message);
  } finally { $('saveProduct').disabled = false; }
});
if (!config.supabaseUrl || !config.supabasePublishableKey) { $('login').hidden = true; message('Panel preparado. Falta conectar y configurar la base de datos para empezar a cargar productos.'); }
