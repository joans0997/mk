
/* ========================================================= */
/* CONFIGURACIÓN */
/* ========================================================= */
let products = [];
let cart = [];
let catalogReady = false;
let currentCategory =
    'todos';
let searchQuery =
    '';
/*
   Cantidad seleccionada en la tarjeta.
   NO entra al carrito hasta pulsar Agregar.
*/
const selectedQuantities = {};
/* ========================================================= */
/* ELEMENTOS */
/* ========================================================= */
const productsGrid =
    document.getElementById(
        'productsGrid'
    );
const cartTrigger =
    document.getElementById(
        'cartTrigger'
    );
const desktopFloatingCart =
    document.getElementById(
        'desktopFloatingCart'
    );
const desktopFloatingCartBadge =
    document.getElementById(
        'desktopFloatingCartBadge'
    );
const cartOverlay =
    document.getElementById(
        'cartOverlay'
    );
const cartPanel =
    document.getElementById(
        'cartPanel'
    );
const closeCart =
    document.getElementById(
        'closeCart'
    );
const cartCounter =
    document.getElementById(
        'cartCounter'
    );
const mobileCartCounter =
    document.getElementById(
        'mobileCartCounter'
    );
const cartContent =
    document.getElementById(
        'cartContent'
    );
const cartTotal =
    document.getElementById(
        'cartTotal'
    );
const clearCartBtn =
    document.getElementById(
        'clearCartBtn'
    );
const searchInput =
    document.getElementById(
        'searchInput'
    );
const searchInputMobile =
    document.getElementById(
        'searchInputMobile'
    );
const mobileSearchResults =
    document.getElementById(
        'mobileSearchResults'
    );
const openCheckoutModalBtn =
    document.getElementById(
        'openCheckoutModalBtn'
    );
const continueShoppingBtn =
    document.getElementById(
        'continueShoppingBtn'
    );
const checkoutModal =
    document.getElementById(
        'checkoutModal'
    );
const closeCheckoutModal =
    document.getElementById(
        'closeCheckoutModal'
    );
const checkoutForm =
    document.getElementById(
        'checkoutForm'
    );
/* ========================================================= */
/* DOM READY */
/* ========================================================= */
document.addEventListener(
    'DOMContentLoaded',
    () => {
        loadCartFromLocalStorage();
        fetchProductsFromSheet();
        setupEventListeners();
        checkStoreStatus();
        updateDesktopFloatingCart();
        if (window.lucide) {
            lucide.createIcons();
        }
    }
);
/* ========================================================= */
/* NORMALIZAR TEXTO */
/* ========================================================= */
function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}
/* ========================================================= */
/* CANTIDAD SELECCIONADA */
/* ========================================================= */
function getSelectedQuantity(productId) {
    const id =
        Number(productId);
    if (
        !selectedQuantities[id] ||
        selectedQuantities[id] < 1
    ) {
        selectedQuantities[id] =
            1;
    }
    return selectedQuantities[id];
}
function changeSelectedQuantity(
    productId,
    delta
) {
    const id =
        Number(productId);
    const current =
        getSelectedQuantity(id);
    const newQuantity =
        Math.max(
            1,
            current + Number(delta)
        );
    selectedQuantities[id] =
        newQuantity;
    const quantityElement =
        document.getElementById(
            `selectedQty-${id}`
        );
    if (quantityElement) {
        quantityElement.textContent =
            newQuantity;
    }
}
/* ========================================================= */
/* AGREGAR CANTIDAD SELECCIONADA */
/* ========================================================= */
function addSelectedQuantityToCart(
    productId
) {
    const product =
        products.find(
            p =>
                Number(p.id) ===
                Number(productId)
        );
    if (!product) {
        return;
    }
    const quantity =
        getSelectedQuantity(
            productId
        );
    const existing =
        cart.find(
            item =>
                Number(item.id) ===
                Number(productId)
        );
    if (existing) {
        existing.quantity =
            Number(existing.quantity || 0) +
            quantity;
    }
    else {
        cart.push({
            ...product,
            quantity:
                quantity
        });
    }
    saveCartToLocalStorage();
    updateCartUI();
    selectedQuantities[
        Number(productId)
    ] = 1;
    renderProducts();
    showToast(
        `${quantity} ${
            quantity === 1
                ? 'unidad agregada'
                : 'unidades agregadas'
        }: ${product.name}`
    );
}
/* ========================================================= */
/* GUARDAR CARRITO */
/* ========================================================= */
function saveCartToLocalStorage() {
    try { localStorage.setItem('merkomax_cart', JSON.stringify(cart.map(({id, quantity}) => ({id, quantity})))); }
    catch { /* Shopping still works when storage is unavailable. */ }
}
function loadCartFromLocalStorage() {
    try {
        const saved = JSON.parse(localStorage.getItem('merkomax_cart') || '[]');
        cart = Array.isArray(saved) ? saved.filter(item => Number.isSafeInteger(item.id) && item.id > 0 && Number.isInteger(item.quantity) && item.quantity > 0).map(item => ({id: item.id, quantity: Math.min(99, item.quantity), price: 0, name: 'Actualizando producto', image: 'assets/placeholder.svg'})) : [];
    } catch { cart = []; }
    updateCartUI();
}
async function fetchProductsFromSheet() {
    catalogReady = false;
    productsGrid.setAttribute('aria-busy', 'true');
    try {
        products = await Catalog.load();
        // Refresh saved prices and remove products no longer available.
        cart = cart.flatMap(item => {
            const current = products.find(product => product.id === item.id);
            return current ? [{...current, quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1))}] : [];
        });
        catalogReady = true;
        saveCartToLocalStorage();
        updateCartUI();
        renderProducts();
    } catch (error) {
        console.error('Catalog load failed', error);
        document.getElementById('sectionSubtitle').textContent = 'El catálogo no está disponible por el momento.';
        productsGrid.innerHTML = '<div class="catalog-empty"><h3>No pudimos cargar el catálogo</h3><p>Comprueba tu conexión e inténtalo de nuevo.</p><button type="button" onclick="fetchProductsFromSheet()">Volver a intentar</button></div>';
    } finally { productsGrid.setAttribute('aria-busy', 'false'); }
}
function checkStoreStatus() {
    const badge =
        document.getElementById(
            'storeStatusBadge'
        );
    if (!badge) {
        return;
    }
    const hour =
        Number(new Intl.DateTimeFormat('es-CO', {timeZone: 'America/Bogota', hour: 'numeric', hourCycle: 'h23'}).format(new Date()));
    if (
        hour >= 7 &&
        hour < 20
    ) {
        badge.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span class="text-emerald-300 font-bold">
                🟢 Abierto
            </span>
        `;
    }
    else {
        badge.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-red-400"></span>
            <span class="text-red-300 font-bold">
                🔴 Cerrado
            </span>
        `;
    }
}
/* ========================================================= */
/* RENDER PRODUCTOS */
/* ========================================================= */
function renderProducts() {
    const normalizedSearch =
        normalizeText(
            searchQuery
        );
    const filtered =
        products.filter(
            product => {
                let matchesCategory;
                if (
                    currentCategory ===
                    'todos'
                ) {
                    matchesCategory =
                        true;
                }
                else if (
                    currentCategory ===
                    'mas-vendidos'
                ) {
                    matchesCategory =
                        product.isBestSeller;
                }
                else {
                    matchesCategory =
                        product.category ===
                        currentCategory;
                }
                const productName =
                    normalizeText(
                        product.name
                    );
                const matchesSearch =
                    !normalizedSearch ||
                    (productName + " " + normalizeText(product.category)).includes(normalizedSearch);
                return (
                    matchesCategory &&
                    matchesSearch
                );
            }
        );
    const sort = document.getElementById('catalogSort').value;
    if (sort === 'price-asc') filtered.sort((a,b) => a.price-b.price);
    if (sort === 'price-desc') filtered.sort((a,b) => b.price-a.price);
    if (sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name, 'es'));
    document.getElementById('catalogCount').textContent = `${filtered.length} productos`;
    document.getElementById('sectionSubtitle').textContent = searchQuery ? `Resultados para “${searchQuery}”` : 'Elige tus productos y agrégalos al carrito.';
    document.querySelectorAll('.category-btn').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === currentCategory)));
    if (
        filtered.length === 0
    ) {
        productsGrid.innerHTML = `
            <div class="col-span-full py-16 text-center px-4">
                <div class="bg-slate-100 text-slate-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="search-x"
                       class="w-8 h-8">
                    </i>
                </div>
                <h3 class="text-lg font-bold text-slate-800">
                    No se encontraron productos
                </h3>
                <p class="text-sm text-slate-500 mt-1">
                    Prueba otra palabra o categoría. <button type="button" onclick="resetCatalog()">Ver todos los productos</button>
                </p>
            </div>
        `;
        if (window.lucide) {
            lucide.createIcons();
        }
        return;
    }
    productsGrid.innerHTML =
        filtered.map(
            product => {
                const selectedQuantity =
                    getSelectedQuantity(
                        product.id
                    );
                return `
                    <div class="product-card-mobile bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative group min-w-0">
                        ${
                            product.category === 'combos'
                            ? `
                                <span class="absolute top-3 left-3 z-10 bg-wine-700 text-white font-black text-[8px] sm:text-[10px] px-2 py-1 rounded-full uppercase tracking-wider shadow-md">
                                    COMBO
                                </span>
                            `
                            : product.isBestSeller
                            ? `
                                <span class="absolute top-3 left-3 z-10 bg-amber-500 text-white font-black text-[8px] sm:text-[10px] px-2 py-1 rounded-full uppercase tracking-wider shadow-md">
                                    TOP
                                </span>
                            `
                            : ''
                        }
                        <div class="product-image-mobile h-36 min-[400px]:h-32 sm:h-44 w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center mb-3 sm:mb-4 relative">
                            <img
                                src="${Catalog.escape(Catalog.imageUrl(product.image))}"
                                alt="${Catalog.escape(product.name)}"
                                loading="lazy"
                                class="object-contain h-full w-full"
                                onerror="this.onerror=null;this.src='assets/placeholder.svg'"
                            >
                        </div>
                        <div class="min-w-0">
                            <span class="product-category-mobile text-[8px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                ${Catalog.escape(product.category)}
                            </span>
                            <h3 class="product-card-title font-bold text-slate-900 text-[11px] min-[400px]:text-xs sm:text-base leading-snug line-clamp-2 break-anywhere">
                                ${Catalog.escape(product.name)}
                            </h3>
                        </div>
                        <div class="product-bottom pt-3 sm:pt-4 border-t border-slate-100 mt-3 sm:mt-4">
                            <div class="product-price-row">
                                <span class="product-price text-xs min-[400px]:text-sm sm:text-lg font-extrabold text-slate-900">
                                    $${product.price.toLocaleString('es-CO')}
                                </span>
                                <div class="product-quantity-control">
                                    <button
                                        type="button"
                                        onclick="changeSelectedQuantity(${product.id}, -1)"
                                        aria-label="Disminuir cantidad">
                                        −
                                    </button>
                                    <span id="selectedQty-${product.id}">
                                        ${selectedQuantity}
                                    </span>
                                    <button
                                        type="button"
                                        onclick="changeSelectedQuantity(${product.id}, 1)"
                                        aria-label="Aumentar cantidad">
                                        +
                                    </button>
                                </div>
                            </div>
                            <button
                                type="button"
                                onclick="addSelectedQuantityToCart(${product.id})"
                                class="add-product-btn w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-1.5 text-[10px] sm:text-sm shadow-sm">
                                <i data-lucide="plus"
                                   class="w-3.5 h-3.5 sm:w-4 sm:h-4">
                                </i>
                                <span>
                                    Agregar
                                </span>
                            </button>
                        </div>
                    </div>
                `;
            }
        ).join('');
    if (window.lucide) {
        lucide.createIcons();
    }
}
/* ========================================================= */
/* BÚSQUEDA MOBILE */
/* ========================================================= */
function renderMobileSearchResults(query) {
    if (!mobileSearchResults) {
        return;
    }
    const q =
        normalizeText(
            query
        );
    if (!q) {
        mobileSearchResults.classList.remove(
            'active'
        );
        mobileSearchResults.innerHTML =
            '';
        return;
    }
    const results =
        products.filter(
            product => {
                const name =
                    normalizeText(
                        product.name
                    );
                const category =
                    normalizeText(
                        product.category
                    );
                return (
                    name.includes(q) ||
                    category.includes(q)
                );
            }
        );
    if (
        results.length === 0
    ) {
        mobileSearchResults.innerHTML = `
            <div class="p-5 text-center">
                <i data-lucide="search-x"
                   class="w-6 h-6 text-slate-300 mx-auto mb-2">
                </i>
                <p class="text-xs font-semibold text-slate-500">
                    No encontramos productos para "${query}"
                </p>
            </div>
        `;
    }
    else {
        mobileSearchResults.innerHTML = `
            <div class="px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 border-b border-blue-100">
                ${results.length}
                producto${results.length === 1 ? '' : 's'}
                encontrado${results.length === 1 ? '' : 's'}
            </div>
            ${
                results.map(
                    product => `
                        <div
                            class="mobile-search-item"
                            onclick="selectSearchProduct(${product.id})">
                            <img
                                src="${Catalog.escape(Catalog.imageUrl(product.image))}"
                                alt="${Catalog.escape(product.name)}"
                                onerror="this.onerror=null;this.src='assets/placeholder.svg'"
                            >
                            <div class="mobile-search-item-info">
                                <div class="mobile-search-item-name">
                                    ${Catalog.escape(product.name)}
                                </div>
                                <div class="mobile-search-item-price">
                                    $${product.price.toLocaleString('es-CO')}
                                </div>
                            </div>
                            <i data-lucide="chevron-right"
                               class="w-4 h-4 text-slate-300 shrink-0">
                            </i>
                        </div>
                    `
                ).join('')
            }
        `;
    }
    mobileSearchResults.classList.add(
        'active'
    );
    if (window.lucide) {
        lucide.createIcons();
    }
}
function selectSearchProduct(
    productId
) {
    const product =
        products.find(
            p =>
                p.id ===
                productId
        );
    if (!product) {
        return;
    }
    searchQuery =
        product.name;
    if (searchInputMobile) {
        searchInputMobile.value =
            product.name;
    }
    if (searchInput) {
        searchInput.value =
            product.name;
    }
    mobileSearchResults.classList.remove(
        'active'
    );
    renderProducts();
    setMobileNavActive(
        'mobileSearchButton'
    );
    document
        .getElementById(
            'productos'
        )
        .scrollIntoView({
            behavior:
                'smooth',
            block:
                'start'
        });
}
/* ========================================================= */
/* CATEGORÍAS */
/* ========================================================= */
function filterCategory(
    category
) {
    currentCategory =
        category;
    document
        .querySelectorAll(
            '.category-btn'
        )
        .forEach(
            btn => {
                btn.classList.remove(
                    'category-selected'
                );
            }
        );
    const selectedButton =
        document.querySelector(
            `.category-btn[data-category="${category}"]`
        );
    if (selectedButton) {
        selectedButton.classList.add(
            'category-selected'
        );
    }
    const title =
        document.getElementById(
            'sectionTitle'
        );
    const subtitle =
        document.getElementById(
            'sectionSubtitle'
        );
    if (
        category ===
        'todos'
    ) {
        title.textContent =
            'Nuestros Productos';
        subtitle.textContent =
            'Explora todo nuestro catálogo disponible';
    }
    else if (
        category ===
        'mas-vendidos'
    ) {
        title.textContent =
            'Lo más vendido';
        subtitle.textContent =
            'Los favoritos de nuestros clientes';
    }
    else if (
        category ===
        'combos'
    ) {
        title.textContent =
            'Combos Ahorro';
        subtitle.textContent =
            'Lleva más pagando menos';
    }
    else {
        title.textContent =
            category.charAt(0).toUpperCase() +
            category.slice(1);
        subtitle.textContent =
            `Productos en la categoría ${category}`;
    }
    renderProducts();
    document
        .getElementById(
            'productos'
        )
        .scrollIntoView({
            behavior:
                'smooth',
            block:
                'start'
        });
}
/* ========================================================= */
/* ABRIR CARRITO */
/* ========================================================= */
function openCartDrawer() {
    if (
        !cartPanel ||
        !cartOverlay
    ) {
        return;
    }
    updateCartUI();
    if (
        window.innerWidth <= 639
    ) {
        cartPanel.classList.add(
            'cart-open'
        );
        cartPanel.style.transform =
            'translateX(0)';
    }
    else {
        cartPanel.classList.remove(
            'translate-x-full'
        );
        cartPanel.style.transform =
            'translateX(0)';
    }
    cartOverlay.classList.remove(
        'hidden'
    );
    document.body.classList.add(
        'overflow-hidden'
    );
}
/* ========================================================= */
/* CERRAR CARRITO */
/* ========================================================= */
function closeCartDrawer() {
    if (
        !cartPanel ||
        !cartOverlay
    ) {
        return;
    }
    if (
        window.innerWidth <= 639
    ) {
        cartPanel.classList.remove(
            'cart-open'
        );
        cartPanel.style.transform =
            'translateX(100%)';
    }
    else {
        cartPanel.classList.add(
            'translate-x-full'
        );
        cartPanel.style.transform =
            'translateX(100%)';
    }
    cartOverlay.classList.add(
        'hidden'
    );
    document.body.classList.remove(
        'overflow-hidden'
    );
}
/* ========================================================= */
/* CARRITO MOBILE */
/* ========================================================= */
function openMobileCart() {
    setMobileNavActive(
        'mobileCartButton'
    );
    openCartDrawer();
}
/* ========================================================= */
/* ACTUALIZAR CANTIDAD DEL CARRITO */
/* ========================================================= */
function updateQuantity(
    productId,
    delta
) {
    const item =
        cart.find(
            item =>
                Number(item.id) ===
                Number(productId)
        );
    if (!item) {
        return;
    }
    item.quantity =
        Number(item.quantity || 0) +
        Number(delta);
    if (
        item.quantity <= 0
    ) {
        cart =
            cart.filter(
                cartItem =>
                    Number(cartItem.id) !==
                    Number(productId)
            );
    }
    saveCartToLocalStorage();
    updateCartUI();
    renderProducts();
    /*
       Si el checkout ya estaba abierto,
       actualizamos también la devuelta.
    */
    if (
        checkoutModal &&
        !checkoutModal.classList.contains(
            'hidden'
        )
    ) {
        updateCashChange();
    }
}
/* ========================================================= */
/* ELIMINAR */
/* ========================================================= */
function removeFromCart(
    productId
) {
    cart =
        cart.filter(
            item =>
                Number(item.id) !==
                Number(productId)
        );
    saveCartToLocalStorage();
    updateCartUI();
    renderProducts();
    if (
        checkoutModal &&
        !checkoutModal.classList.contains(
            'hidden'
        )
    ) {
        updateCashChange();
    }
}
/* ========================================================= */
/* VACIAR */
/* ========================================================= */
function clearCart() {
    if (
        cart.length === 0
    ) {
        return;
    }
    if (
        confirm(
            '¿Estás seguro de vaciar todo el carrito?'
        )
    ) {
        cart = [];
        saveCartToLocalStorage();
        updateCartUI();
        renderProducts();
    }
}
/* ========================================================= */
/* ACTUALIZAR INTERFAZ CARRITO */
/* ========================================================= */
function updateCartUI() {
    const totalCount =
        cart.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(item.quantity || 0),
            0
        );
    if (cartCounter) {
        cartCounter.textContent =
            totalCount;
    }
    if (mobileCartCounter) {
        mobileCartCounter.textContent =
            totalCount;
    }
    if (desktopFloatingCartBadge) {
        desktopFloatingCartBadge.textContent =
            totalCount > 99
                ? '99+'
                : totalCount;
    }
    if (
        cart.length > 0
    ) {
        clearCartBtn.classList.remove(
            'hidden'
        );
        clearCartBtn.classList.add(
            'flex'
        );
    }
    else {
        clearCartBtn.classList.add(
            'hidden'
        );
        clearCartBtn.classList.remove(
            'flex'
        );
    }
    if (
        cart.length === 0
    ) {
        cartContent.innerHTML = `
            <div class="text-center py-16 space-y-3">
                <div class="bg-blue-50 text-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <i data-lucide="shopping-cart"
                       class="w-8 h-8">
                    </i>
                </div>
                <h4 class="font-bold text-slate-800">
                    Tu carrito está vacío
                </h4>
                <p class="text-xs text-slate-500 max-w-xs mx-auto">
                    Explora nuestro catálogo y agrega productos.
                </p>
            </div>
        `;
        cartTotal.textContent =
            '$0';
        if (window.lucide) {
            lucide.createIcons();
        }
        return;
    }
    cartContent.innerHTML =
        cart.map(
            item => `
                <div class="mobile-cart-item">
                    <img
                        src="${Catalog.escape(Catalog.imageUrl(item.image))}"
                        alt="${Catalog.escape(item.name)}"
                        onerror="this.onerror=null;this.src='assets/placeholder.svg'"
                    >
                    <div class="flex-1 min-w-0 pr-7">
                        <h5 class="font-bold text-slate-900 text-xs leading-snug break-anywhere">
                            ${Catalog.escape(item.name)}
                        </h5>
                        <p class="text-blue-600 font-extrabold text-xs mt-1">
                            $${(
                                item.price *
                                item.quantity
                            ).toLocaleString('es-CO')}
                        </p>
                        <div class="cart-quantity-control">
                            <button
                                type="button"
                                onclick="updateQuantity(${item.id}, -1)"
                                aria-label="Disminuir">
                                −
                            </button>
                            <span>
                                ${item.quantity}
                            </span>
                            <button
                                type="button"
                                onclick="updateQuantity(${item.id}, 1)"
                                aria-label="Aumentar">
                                +
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        onclick="removeFromCart(${item.id})"
                        title="Eliminar producto"
                        class="remove-cart-item">
                        <i data-lucide="trash-2"
                           class="w-4 h-4">
                        </i>
                    </button>
                </div>
            `
        ).join('');
    const total =
        calculateCartTotal();
    cartTotal.textContent =
        `$${total.toLocaleString('es-CO')}`;
    if (window.lucide) {
        lucide.createIcons();
    }
}
/* ========================================================= */
/* TOTAL CARRITO */
/* ========================================================= */
function calculateCartTotal() {
    return cart.reduce(
        (
            sum,
            item
        ) =>
            sum +
            (
                Number(item.price) *
                Number(item.quantity)
            ),
        0
    );
}
/* ========================================================= */
/* EFECTIVO */
/* ========================================================= */
function parseCashAmount(value) {
    return Number(
        String(value || '')
            .replace(/\./g, '')
            .replace(/,/g, '')
            .replace(/[^0-9]/g, '')
    ) || 0;
}
function updateCashChange() {
    const payment =
        document.getElementById(
            'custPayment'
        )?.value;
    const cashInput =
        document.getElementById(
            'custCashAmount'
        );
    const changeBox =
        document.getElementById(
            'cashChangeBox'
        );
    const changeAmount =
        document.getElementById(
            'cashChangeAmount'
        );
    const changeMessage =
        document.getElementById(
            'cashChangeMessage'
        );
    if (
        !cashInput ||
        !changeBox ||
        !changeAmount ||
        !changeMessage
    ) {
        return;
    }
    if (
        payment !==
        'Efectivo'
    ) {
        changeBox.classList.add(
            'hidden'
        );
        return;
    }
    const cashGiven =
        parseCashAmount(
            cashInput.value
        );
    const total =
        calculateCartTotal();
    if (
        cashGiven <= 0
    ) {
        changeBox.classList.add(
            'hidden'
        );
        return;
    }
    /*
       Dinero insuficiente.
    */
    if (
        cashGiven < total
    ) {
        const missing =
            total -
            cashGiven;
        changeBox.classList.remove(
            'hidden'
        );
        changeAmount.textContent =
            '$0';
        changeAmount.classList.remove(
            'text-blue-700'
        );
        changeAmount.classList.add(
            'text-red-600'
        );
        changeMessage.textContent =
            `Te faltan $${missing.toLocaleString('es-CO')} para completar el pago.`;
        return;
    }
    /*
       Pago exacto o con devuelta.
    */
    const change =
        cashGiven -
        total;
    changeBox.classList.remove(
        'hidden'
    );
    changeAmount.textContent =
        `$${change.toLocaleString('es-CO')}`;
    changeAmount.classList.remove(
        'text-red-600'
    );
    changeAmount.classList.add(
        'text-blue-700'
    );
    if (
        change === 0
    ) {
        changeMessage.textContent =
            'Pago exacto. No debes recibir devuelta.';
    }
    else {
        changeMessage.textContent =
            `El cliente recibirá $${change.toLocaleString('es-CO')} de devuelta.`;
    }
}
/* ========================================================= */
/* MOSTRAR / OCULTAR EFECTIVO */
/* ========================================================= */
function toggleCashDetail() {
    const payment =
        document.getElementById(
            'custPayment'
        )?.value;
    const box =
        document.getElementById(
            'cashDetailBox'
        );
    if (!box) {
        return;
    }
    if (
        payment ===
        'Efectivo'
    ) {
        box.style.display =
            'block';
        updateCashChange();
    }
    else {
        box.style.display =
            'none';
    }
}
/* ========================================================= */
/* BOTÓN CARRITO FLOTANTE PC */
/* ========================================================= */
function updateDesktopFloatingCart() {
    if (
        !desktopFloatingCart ||
        window.innerWidth < 1024
    ) {
        return;
    }
    const scrollPosition =
        window.scrollY;
    if (
        scrollPosition > 450
    ) {
        desktopFloatingCart.classList.add(
            'visible'
        );
    }
    else {
        desktopFloatingCart.classList.remove(
            'visible'
        );
    }
}
/* ========================================================= */
/* INICIO MOBILE */
/* ========================================================= */
function mobileGoHome() {
    setMobileNavActive(
        'mobileHomeButton'
    );
    currentCategory =
        'todos';
    searchQuery =
        '';
    if (searchInputMobile) {
        searchInputMobile.value =
            '';
    }
    if (searchInput) {
        searchInput.value =
            '';
    }
    if (mobileSearchResults) {
        mobileSearchResults.classList.remove(
            'active'
        );
        mobileSearchResults.innerHTML =
            '';
    }
    renderProducts();
    window.scrollTo({
        top:
            0,
        behavior:
            'smooth'
    });
}
/* ========================================================= */
/* BUSCAR MOBILE */
/* ========================================================= */
function mobileGoSearch() {
    setMobileNavActive(
        'mobileSearchButton'
    );
    if (!searchInputMobile) {
        return;
    }
    searchInputMobile.scrollIntoView({
        behavior:
            'smooth',
        block:
            'center'
    });
    setTimeout(
        () => {
            searchInputMobile.focus({
                preventScroll:
                    true
            });
            if (
                searchInputMobile.value.trim()
            ) {
                renderMobileSearchResults(
                    searchInputMobile.value
                );
            }
        },
        350
    );
}
/* ========================================================= */
/* MENÚ ACTIVO */
/* ========================================================= */
function setMobileNavActive(
    id
) {
    document
        .querySelectorAll(
            '.mobile-nav-button'
        )
        .forEach(
            button =>
                button.classList.remove(
                    'active'
                )
        );
    const active =
        document.getElementById(
            id
        );
    if (active) {
        active.classList.add(
            'active'
        );
    }
}
/* ========================================================= */
/* LOGO */
/* ========================================================= */
function resetToHomeWithAnimation() {
    mobileGoHome();
}
/* ========================================================= */
/* TOAST */
/* ========================================================= */
function showToast(
    message
) {
    const container =
        document.getElementById(
            'toastContainer'
        );
    const toast =
        document.createElement(
            'div'
        );
    toast.className =
        "bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2";
    toast.innerHTML = `
        <i data-lucide="check-circle"
           class="w-4 h-4 text-emerald-400">
        </i>
        <span>
            ${Catalog.escape(message)}
        </span>
    `;
    container.appendChild(
        toast
    );
    if (window.lucide) {
        lucide.createIcons();
    }
    setTimeout(
        () => {
            toast.remove();
        },
        2800
    );
}
/* ========================================================= */
/* EVENTOS */
/* ========================================================= */
function setupEventListeners() {
    /* ----------------------------------------------------- */
    /* BUSCADOR PC */
    /* ----------------------------------------------------- */
    if (searchInput) {
        searchInput.addEventListener(
            'input',
            function () {
                const value =
                    this.value.trim();
                searchQuery =
                    value;
                renderProducts();
                const subtitle =
                    document.getElementById(
                        'sectionSubtitle'
                    );
                if (
                    value.length > 0
                ) {
                    const normalizedValue =
                        normalizeText(
                            value
                        );
                    const totalMatches =
                        products.filter(
                            product =>
                                normalizeText(
                                    product.name
                                ).includes(
                                    normalizedValue
                                )
                        ).length;
                    if (subtitle) {
                        subtitle.textContent =
                            totalMatches > 0
                                ? `${totalMatches} producto${totalMatches === 1 ? '' : 's'} encontrado${totalMatches === 1 ? '' : 's'} para "${value}"`
                                : `No encontramos productos para "${value}"`;
                    }
                    const productsSection =
                        document.getElementById(
                            'productos'
                        );
                    if (productsSection) {
                        setTimeout(
                            () => {
                                const rect =
                                    productsSection.getBoundingClientRect();
                                const targetPosition =
                                    window.scrollY +
                                    rect.top -
                                    35;
                                window.scrollTo({
                                    top:
                                        Math.max(
                                            0,
                                            targetPosition
                                        ),
                                    behavior:
                                        'smooth'
                                });
                            },
                            90
                        );
                    }
                }
                else {
                    if (subtitle) {
                        subtitle.textContent =
                            'Explora todo nuestro catálogo disponible';
                    }
                }
            }
        );
    }
    /* ----------------------------------------------------- */
    /* BUSCADOR MOBILE */
    /* ----------------------------------------------------- */
    if (searchInputMobile) {
        searchInputMobile.addEventListener(
            'input',
            function () {
                const value =
                    this.value;
                searchQuery =
                    value;
                renderProducts();
                renderMobileSearchResults(
                    value
                );
                setMobileNavActive(
                    'mobileSearchButton'
                );
            }
        );
        searchInputMobile.addEventListener(
            'focus',
            function () {
                if (
                    this.value.trim()
                ) {
                    renderMobileSearchResults(
                        this.value
                    );
                }
            }
        );
    }
    /* ----------------------------------------------------- */
    /* CARRITO PC */
    /* ----------------------------------------------------- */
    if (cartTrigger) {
        cartTrigger.addEventListener(
            'click',
            function (event) {
                event.preventDefault();
                openCartDrawer();
            }
        );
    }
    /* ----------------------------------------------------- */
    /* CARRITO FLOTANTE PC */
    /* ----------------------------------------------------- */
    if (desktopFloatingCart) {
        desktopFloatingCart.addEventListener(
            'click',
            function () {
                openCartDrawer();
            }
        );
    }
    /* ----------------------------------------------------- */
    /* SCROLL */
    /* ----------------------------------------------------- */
    window.addEventListener(
        'scroll',
        updateDesktopFloatingCart,
        {
            passive: true
        }
    );
    /* ----------------------------------------------------- */
    /* CERRAR CARRITO */
    /* ----------------------------------------------------- */
    if (closeCart) {
        closeCart.addEventListener(
            'click',
            closeCartDrawer
        );
    }
    if (cartOverlay) {
        cartOverlay.addEventListener(
            'click',
            closeCartDrawer
        );
    }
    /* ----------------------------------------------------- */
    /* SEGUIR COMPRANDO */
    /* ----------------------------------------------------- */
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener(
            'click',
            function () {
                closeCartDrawer();
            }
        );
    }
    /* ----------------------------------------------------- */
    /* CHECKOUT */
    /* ----------------------------------------------------- */
    if (openCheckoutModalBtn) {
        openCheckoutModalBtn.addEventListener(
            'click',
            () => {
                if (
                    !catalogReady || cart.length === 0
                ) {
                    showToast(
                        catalogReady ? 'Tu carrito está vacío' : 'Espera a que termine de cargar el catálogo'
                    );
                    return;
                }
                closeCartDrawer();
                checkoutModal.classList.remove(
                    'hidden'
                );
                checkoutModal.classList.add(
                    'flex'
                );
                document.body.classList.add(
                    'overflow-hidden'
                );
                toggleCashDetail();
            }
        );
    }
    /* ----------------------------------------------------- */
    /* EFECTIVO EN TIEMPO REAL */
    /* ----------------------------------------------------- */
    const custCashAmount =
        document.getElementById(
            'custCashAmount'
        );
    if (custCashAmount) {
        custCashAmount.addEventListener(
            'input',
            updateCashChange
        );
    }
    /* ----------------------------------------------------- */
    /* CAMBIO DE MÉTODO DE PAGO */
    /* ----------------------------------------------------- */
    const custPayment =
        document.getElementById(
            'custPayment'
        );
    if (custPayment) {
        custPayment.addEventListener(
            'change',
            () => {
                toggleCashDetail();
            }
        );
    }
    /* ----------------------------------------------------- */
    /* CERRAR CHECKOUT */
    /* ----------------------------------------------------- */
    if (closeCheckoutModal) {
        closeCheckoutModal.addEventListener(
            'click',
            () => {
                checkoutModal.classList.add(
                    'hidden'
                );
                checkoutModal.classList.remove(
                    'flex'
                );
                document.body.classList.remove(
                    'overflow-hidden'
                );
            }
        );
    }
    if (checkoutModal) {
        checkoutModal.addEventListener(
            'click',
            event => {
                if (
                    event.target ===
                    checkoutModal
                ) {
                    checkoutModal.classList.add(
                        'hidden'
                    );
                    checkoutModal.classList.remove(
                        'flex'
                    );
                    document.body.classList.remove(
                        'overflow-hidden'
                    );
                }
            }
        );
    }
    /* ----------------------------------------------------- */
    /* CLICK FUERA BUSCADOR */
    /* ----------------------------------------------------- */
    document.addEventListener(
        'click',
        event => {
            if (
                mobileSearchResults &&
                searchInputMobile
            ) {
                const insideResults =
                    mobileSearchResults.contains(
                        event.target
                    );
                const isInput =
                    event.target ===
                    searchInputMobile;
                if (
                    !insideResults &&
                    !isInput
                ) {
                    mobileSearchResults.classList.remove(
                        'active'
                    );
                }
            }
        }
    );
    /* ----------------------------------------------------- */
    /* ESC */
    /* ----------------------------------------------------- */
    document.addEventListener(
        'keydown',
        event => {
            if (
                event.key ===
                'Escape'
            ) {
                closeCartDrawer();
                checkoutModal.classList.add(
                    'hidden'
                );
                checkoutModal.classList.remove(
                    'flex'
                );
                document.body.classList.remove(
                    'overflow-hidden'
                );
                if (mobileSearchResults) {
                    mobileSearchResults.classList.remove(
                        'active'
                    );
                }
            }
        }
    );
    /* ----------------------------------------------------- */
    /* WHATSAPP */
    /* ----------------------------------------------------- */
    if (checkoutForm) {
        checkoutForm.addEventListener(
            'submit',
            event => {
                event.preventDefault();
                if (!catalogReady || cart.length === 0) { showToast('Espera a que cargue el catálogo y agrega productos al carrito'); return; }
                const name =
                    document
                        .getElementById(
                            'custName'
                        )
                        .value
                        .trim();
                const neighborhood =
                    document
                        .getElementById(
                            'custNeighborhood'
                        )
                        .value
                        .trim();
                const address =
                    document
                        .getElementById(
                            'custAddress'
                        )
                        .value
                        .trim();
                const payment =
                    document
                        .getElementById(
                            'custPayment'
                        )
                        .value;
                const cashAmountInput =
                    document
                        .getElementById(
                            'custCashAmount'
                        );
                const cashAmount =
                    cashAmountInput
                        ? cashAmountInput.value.trim()
                        : '';
                const notes =
                    document
                        .getElementById(
                            'custNotes'
                        )
                        .value
                        .trim();
                /*
                   TOTAL DEL PEDIDO
                */
                const total =
                    calculateCartTotal();
                /*
                   VALIDACIÓN EFECTIVO
                */
                let cashGiven =
                    0;
                let change =
                    0;
                if (
                    payment ===
                    'Efectivo'
                ) {
                    cashGiven =
                        parseCashAmount(
                            cashAmount
                        );
                    if (
                        cashGiven <= 0
                    ) {
                        showToast(
                            'Indica con cuánto dinero vas a pagar'
                        );
                        if (cashAmountInput) {
                            cashAmountInput.focus();
                        }
                        return;
                    }
                    if (
                        cashGiven <
                        total
                    ) {
                        const missing =
                            total -
                            cashGiven;
                        showToast(
                            `Faltan $${missing.toLocaleString('es-CO')} para completar el pago`
                        );
                        updateCashChange();
                        return;
                    }
                    change =
                        cashGiven -
                        total;
                }
                /* ================================================= */
                /* MENSAJE WHATSAPP */
                /* ================================================= */
                let message =
                    `🛒 *NUEVO PEDIDO - MERKOMAX NIMAR*\n\n`;
                message +=
                    `👤 *Cliente:* ${name}\n`;
                message +=
                    `📍 *Barrio:* ${neighborhood}\n`;
                message +=
                    `🏠 *Dirección:* ${address}\n`;
                message +=
                    `💳 *Método de Pago:* ${payment}\n`;
                if (
                    payment ===
                    'Efectivo'
                ) {
                    message +=
                        `💵 *Paga con:* $${cashGiven.toLocaleString('es-CO')}\n`;
                    message +=
                        `💰 *Devuelta:* $${change.toLocaleString('es-CO')}\n`;
                }
                if (
                    notes
                ) {
                    message +=
                        `📝 *Notas:* ${notes}\n`;
                }
                message +=
                    `\n📦 *DETALLE DEL PEDIDO:*\n`;
                cart.forEach(
                    (item, index) => {
                        const subtotal =
                            Number(item.price) *
                            Number(item.quantity);
                        message +=
                            `${index + 1}. ${item.name} x${item.quantity} - $${subtotal.toLocaleString('es-CO')}\n`;
                    }
                );
                message +=
                    `\n💰 *TOTAL A PAGAR: $${total.toLocaleString('es-CO')}*`;
                /*
                   NUEVO WHATSAPP:
                   +57 315 766 6771
                */
                const url =
                    `https://wa.me/573157666771?text=${encodeURIComponent(message)}`;
                /*
                   Vaciar carrito después
                   de generar correctamente
                   el pedido.
                */
                cart = [];
                saveCartToLocalStorage();
                updateCartUI();
                renderProducts();
                checkoutModal.classList.add(
                    'hidden'
                );
                checkoutModal.classList.remove(
                    'flex'
                );
                document.body.classList.remove(
                    'overflow-hidden'
                );
                window.open(
                    url,
                    '_blank'
                );
            }
        );
    }
}
function resetCatalog() {
    searchQuery = ''; searchInput.value = ''; searchInputMobile.value = '';
    filterCategory('todos');
}
document.getElementById('catalogSort').addEventListener('change', renderProducts);
