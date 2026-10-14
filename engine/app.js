let currentCategory = "todos";
let cart = [];
let detailProduct = null;
let detailQty = 1;
let selectedOptions = {};
let activeImage = "";
let catalogProducts = [];
let catalogState = { status: "idle", error: "" };
let catalogRequest = null;
let cartNotice = "";
let cartNeedsReview = false;
let checkingOrder = false;

const { normalizeImageMode, normalizeImagePosition, normalizeImageFit, allProductImages, productImages, imageMode, isGalleryViewGroup, purchaseOptionGroups, getRawColorGroup, getColorGroup, selectedColorIndex, viewCountForProduct, visibleProductImages, productImageForOptions, thumbnailLabel, primaryImage, imagePositionFor, productImageFit, handleImageError, IMAGE_PLACEHOLDER } = CatalogMedia;

const money = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return `${APP_CONFIG.currency || "$"}${Number(value).toLocaleString("es-UY")}`;
};

const cartKey = () => APP_CONFIG.storageKey || `pedido:${APP_CONFIG.slug || APP_CONFIG.businessName || "catalogo"}`;

document.addEventListener("DOMContentLoaded", async () => {
  bindCatalogEvents();
  applyConfig();
  loadCart();
  await loadProducts();
  syncCartWithCatalog();
  renderFilters();
  renderProducts();
  renderInfo();
  renderOrderFields();
  renderCart();
});

function applyConfig() {
  document.documentElement.style.setProperty("--primary", APP_CONFIG.theme.primary);
  document.documentElement.style.setProperty("--primary-dark", APP_CONFIG.theme.dark);
  document.documentElement.style.setProperty("--primary-soft", APP_CONFIG.theme.soft);

  document.title = APP_CONFIG.seo.title;
  setMeta("pageDescription", "content", APP_CONFIG.seo.description);
  setMeta("themeColor", "content", APP_CONFIG.theme.dark);
  setMeta("ogTitle", "content", APP_CONFIG.seo.title);
  setMeta("ogDescription", "content", APP_CONFIG.seo.description);

  text("topbar", APP_CONFIG.topbar);
  text("brandMark", APP_CONFIG.initials);
  text("brandName", APP_CONFIG.businessName);
  text("brandSub", APP_CONFIG.businessSub);
  text("heroEyebrow", APP_CONFIG.hero.eyebrow);
  text("heroTitle", APP_CONFIG.hero.title);
  text("heroText", APP_CONFIG.hero.text);
  text("heroBadgeTitle", APP_CONFIG.hero.badgeTitle);
  text("heroBadgeText", APP_CONFIG.hero.badgeText);
  text("catalogKicker", APP_CONFIG.catalog.kicker);
  text("catalogTitle", APP_CONFIG.catalog.title);
  text("catalogText", APP_CONFIG.catalog.text);
  text("ctaTitle", APP_CONFIG.cta.title);
  text("ctaText", APP_CONFIG.cta.text);
  text("footerName", APP_CONFIG.businessName);
  text("footerText", APP_CONFIG.footerText);

  const heroImage = document.getElementById("heroImage");
  heroImage.src = APP_CONFIG.hero.image;
  heroImage.alt = APP_CONFIG.hero.imageAlt || APP_CONFIG.businessName;

  const trustRow = document.getElementById("trustRow");
  trustRow.innerHTML = (APP_CONFIG.trust || []).map(item => `<span>${escapeHtml(item)}</span>`).join("");

  const links = [];
  if (APP_CONFIG.instagram) links.push(`<a href="${escapeAttr(APP_CONFIG.instagram)}" target="_blank" rel="noreferrer">Instagram</a>`);
  if (APP_CONFIG.whatsapp) links.push(`<a href="${whatsAppBaseUrl()}" target="_blank" rel="noreferrer">WhatsApp</a>`);
  document.getElementById("footerLinks").innerHTML = links.join("");
}

function setMeta(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

function text(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}


async function loadProducts() {
  if (catalogRequest) return catalogRequest;
  catalogRequest = (async () => {
    catalogState = { status: "loading", error: "" };
    catalogProducts = [];
    renderFilters();
    renderProducts();
    try {
      catalogProducts = await CATALOG.load();
      catalogState = { status: "ready", error: "" };
      return true;
    } catch (error) {
      catalogState = { status: "error", error: error.message || "No se pudo cargar el catálogo." };
      catalogProducts = [];
      return false;
    }
  })();
  try { return await catalogRequest; }
  finally { catalogRequest = null; }
}

async function retryCatalog() {
  if (await loadProducts()) syncCartWithCatalog();
  currentCategory = "todos";
  renderFilters(); renderProducts(); renderCart();
}

function uniqueLabels(labels) {
  const seen = new Set();
  return (labels || [])
    .map(label => String(label || "").trim())
    .filter(label => {
      if (!label) return false;
      const key = label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}


function isValidOffer(product) {
  return Boolean(product && product.offer && Number(product.oldPrice) > Number(product.price || 0));
}

function syncCartWithCatalog() {
  if (catalogState.status !== "ready") return { removed: false, updated: false };
  const result = CatalogCore.reconcileCart(cart, catalogProducts, {
    groupsFor: product => typeof purchaseOptionGroups === "function" ? purchaseOptionGroups(product) : product.optionGroups || [],
    imageFor: (product, options) => typeof productImageForOptions === "function" ? productImageForOptions(product, options) : primaryImage(product),
    legacyProducts: CART_ALIASES
  });
  cart = result.items;
  if (result.removed || result.updated) cartNeedsReview = true;
  if (result.removed) cartNotice = "Se quitaron productos, cantidades u opciones que ya no son válidos. Revisá tu pedido.";
  else if (result.updated) cartNotice = "Actualizamos los datos y precios de tu pedido. Revisalos antes de enviarlo.";
  saveCart();
  return result;
}

function renderFilters() {
  const categories = ["todos", ...new Set(catalogProducts.filter(p => p.available !== false).map(p => p.category))];
  document.getElementById("filters").innerHTML = categories.map(cat => `
    <button class="filter-btn ${cat === currentCategory ? "active" : ""}" type="button" data-action="category" data-category="${escapeAttr(cat)}">
      ${cat === "todos" ? "Todo" : escapeHtml(cat)}
    </button>
  `).join("");
}

function setCategory(category) {
  currentCategory = category;
  renderFilters();
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (catalogState.status === "loading") {
    grid.innerHTML = `<div class="empty" role="status" style="grid-column:1/-1;">Cargando catálogo…</div>`;
    return;
  }
  if (catalogState.status === "error") {
    grid.innerHTML = `<div class="empty" role="alert" style="grid-column:1/-1;"><p>No pudimos cargar el catálogo. No se pueden enviar pedidos hasta recuperarlo.</p><p>${escapeHtml(catalogState.error)}</p><button class="btn primary" type="button" data-action="retry-catalog">Reintentar</button></div>`;
    return;
  }
  const products = catalogProducts
    .filter(p => p.available !== false)
    .filter(p => currentCategory === "todos" || p.category === currentCategory)
    .sort((a, b) => (a.order || 99) - (b.order || 99));

  if (!products.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1;">No hay productos disponibles en esta categoría.</div>`;
    return;
  }

  grid.innerHTML = products.map((p) => {
    const layout = APP_CONFIG.presentation.cardLayout === "mixed" ? (["featured","compact"].includes(p.layout) ? p.layout : (p.featured ? "featured" : "")) : "";
    const image = primaryImage(p);
    const badges = uniqueLabels([
      isValidOffer(p) ? "Oferta" : "",
      p.featured ? "Destacado" : "",
      p.badge || ""
    ]);

    return `
      <article class="product-card ${layout}" data-action="product" data-product-id="${escapeAttr(p.id)}">
        <div class="product-image">
          <img src="${escapeAttr(image)}" alt="${escapeAttr(p.name)}" loading="lazy" ${imageStyleAttr(p, "card")} data-image-fallback />
          <div class="badges">${badges.map(b => `<span class="badge">${escapeHtml(b)}</span>`).join("")}</div>
        </div>
        <div class="product-body">
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.short || p.description || "")}</p>
          <div class="card-meta">
            <div>
              ${isValidOffer(p) ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}
              <span class="price">${priceLabel(p)}</span>
            </div>
            <button class="detail-link" type="button" data-action="product" data-product-id="${escapeAttr(p.id)}">
              Ver detalle
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderInfo() {
  const info = document.getElementById("informacion");
  info.innerHTML = (APP_CONFIG.infoCards || []).map(card => `
    <article class="info-card">
      <span class="section-kicker">${escapeHtml(card.kicker || "")}</span>
      <h2>${escapeHtml(card.title)}</h2>
      <p>${escapeHtml(card.text || "")}</p>
      ${card.items ? `<ul>${card.items.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>` : ""}
    </article>
  `).join("");
}

function renderOrderFields() {
  const box = document.getElementById("orderFields");
  box.innerHTML = APP_CONFIG.orderFields.map(field => {
    const common = `id="field-${escapeAttr(field.id)}" name="${escapeAttr(field.id)}" ${field.required ? "required" : ""} placeholder="${escapeAttr(field.placeholder || "")}"`;
    if (field.type === "textarea") {
      return `<div class="field"><label for="field-${escapeAttr(field.id)}">${escapeHtml(field.label)}</label><textarea ${common}></textarea></div>`;
    }
    if (field.type === "select") {
      return `<div class="field"><label for="field-${escapeAttr(field.id)}">${escapeHtml(field.label)}</label><select id="field-${escapeAttr(field.id)}" name="${escapeAttr(field.id)}">${field.options.map(o => `<option value="${escapeAttr(o)}">${escapeHtml(o)}</option>`).join("")}</select></div>`;
    }
    return `<div class="field"><label for="field-${escapeAttr(field.id)}">${escapeHtml(field.label)}</label><input type="${escapeAttr(field.type || "text")}" ${common} /></div>`;
  }).join("");
  document.getElementById("cartNote").textContent = APP_CONFIG.cartNote || "";
}

function openProductDetail(productId) {
  if (catalogState.status !== "ready") return;
  const product = catalogProducts.find(p => p.id === productId);
  if (!product) return;

  detailProduct = product;
  detailQty = 1;
  selectedOptions = {};
  purchaseOptionGroups(product).forEach(group => {
    selectedOptions[group.id] = group.options?.[0] || "";
  });
  activeImage = productImageForOptions(product, selectedOptions);

  updateDetailModal();

  document.body.classList.add("modal-open");
  document.getElementById("productBackdrop").classList.add("open");
  document.getElementById("productModal").classList.add("open");
  document.getElementById("productModal").setAttribute("aria-hidden", "false");

  resetProductDetailScroll();
}

function closeProductDetail() {
  const modal = document.getElementById("productModal");
  if (modal.contains(document.activeElement)) document.activeElement.blur();
  document.body.classList.remove("modal-open");
  document.getElementById("productBackdrop").classList.remove("open");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function resetProductDetailScroll() {
  const modal = document.getElementById("productModal");
  const info = modal?.querySelector(".detail-info");
  const media = modal?.querySelector(".detail-media");

  // El navegador conserva el scroll anterior del detalle.
  // Al abrir otro producto hay que volver explícitamente arriba.
  requestAnimationFrame(() => {
    modal?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    if (info) info.scrollTop = 0;
    if (media) media.scrollTop = 0;
  });
}

function updateDetailModal() {
  const p = detailProduct;
  if (!p) return;

  const images = visibleProductImages(p, selectedOptions);
  if (!images.includes(activeImage)) activeImage = images[0] || primaryImage(p);

  const image = document.getElementById("detailImage");
  image.src = activeImage || primaryImage(p);
  image.alt = p.name;
  if (APP_CONFIG.presentation.mediaStyles) {
    image.style.objectPosition = imagePositionFor(p);
    image.style.objectFit = productImageFit(p, "detail");
  }
  image.onerror = () => handleImageError(image);

  text("detailCategory", p.category);
  text("detailName", p.name);
  text("detailDescription", p.description || p.short || "");
  text("detailQty", String(detailQty));

  document.getElementById("detailPrice").innerHTML = `
    ${isValidOffer(p) ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}
    <span>${priceLabel(p)}</span>
  `;

  const tags = uniqueLabels([
    isValidOffer(p) ? "Oferta" : "",
    p.featured ? "Destacado" : "",
    ...(p.tags || [])
  ]);

  document.getElementById("detailTags").innerHTML = tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("");

  document.getElementById("detailThumbs").innerHTML = images.map((img, index) => `
    <button class="${img === activeImage ? "active-thumb" : ""}" type="button" data-action="image-index" data-index="${index}" aria-label="${escapeAttr(thumbnailLabel(p, index))}" title="${escapeAttr(thumbnailLabel(p, index))}">
      <img src="${escapeAttr(img)}" alt="" ${imageStyleAttr(p, "thumb")} data-image-fallback />
    </button>
  `).join("");

  document.getElementById("detailOptions").innerHTML = purchaseOptionGroups(p).map(group => `
    <div class="option-group">
      <strong>${escapeHtml(group.label)}</strong>
      <div class="option-buttons">
        ${(group.options || []).map(opt => `
          <button type="button" class="${selectedOptions[group.id] === opt ? "active" : ""}" data-action="option" data-group-id="${escapeAttr(group.id)}" data-option="${escapeAttr(opt)}">
            ${escapeHtml(opt)}
          </button>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function setDetailImageByIndex(index) {
  if (!detailProduct) return;

  const images = visibleProductImages(detailProduct, selectedOptions);
  activeImage = images[index] || productImageForOptions(detailProduct, selectedOptions);

  const colorGroup = getColorGroup(detailProduct);
  if (imageMode(detailProduct) === "color" && colorGroup && colorGroup.options[index]) {
    selectedOptions[colorGroup.id] = colorGroup.options[index];
  }

  updateDetailModal();
}

function setDetailImage(url) {
  // Compatibilidad con versiones anteriores.
  activeImage = url;
  updateDetailModal();
}

function selectOption(groupId, value) {
  const groups = typeof purchaseOptionGroups === "function" ? purchaseOptionGroups(detailProduct) : detailProduct?.optionGroups || [];
  if (!groups.some(group => group.id === groupId && group.options.includes(value))) return;
  selectedOptions[groupId] = value;

  const colorGroup = getColorGroup(detailProduct);
  const mode = imageMode(detailProduct);
  if ((mode === "color" || mode === "color_galeria") && colorGroup && colorGroup.id === groupId) {
    activeImage = productImageForOptions(detailProduct, selectedOptions);
  }

  updateDetailModal();
}

function changeDetailQty(delta) {
  detailQty = Math.max(1, detailQty + delta);
  text("detailQty", String(detailQty));
}

function addCurrentProductToCart() {
  if (!detailProduct) return;

  if (catalogState.status !== "ready") return;
  const candidate = { id: detailProduct.id, name: detailProduct.name, price: detailProduct.price,
    qty: detailQty, options: { ...selectedOptions } };
  const result = CatalogCore.reconcileCart([...cart, candidate], catalogProducts, {
    groupsFor: product => typeof purchaseOptionGroups === "function" ? purchaseOptionGroups(product) : product.optionGroups || [],
    imageFor: (product, options) => typeof productImageForOptions === "function" ? productImageForOptions(product, options) : primaryImage(product)
  });
  if (result.removed) { alert("El producto o sus opciones cambiaron. Revisá el pedido."); return; }
  cart = result.items;

  saveCart();
  renderCart();
  closeProductDetail();
  if (APP_CONFIG.behavior.openCartAfterAdd) window.setTimeout(openCart, 80);
}

function openCart() {
  document.body.classList.add("drawer-open");
  document.getElementById("drawerBackdrop").classList.add("open");
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "false");
}

function closeCart() {
  const drawer = document.getElementById("cartDrawer");
  if (drawer.contains(document.activeElement)) document.activeElement.blur();
  document.body.classList.remove("drawer-open");
  document.getElementById("drawerBackdrop").classList.remove("open");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

function renderCart() {
  const status = document.getElementById("cartStatus");
  if (status) { status.textContent = cartNotice; status.hidden = !cartNotice; }
  const count = cart.reduce((acc, item) => acc + item.qty, 0);
  text("cartCount", String(count));

  const box = document.getElementById("cartItems");
  if (!cart.length) {
    box.innerHTML = `<div class="empty">Todavía no agregaste productos al pedido.</div>`;
    return;
  }

  box.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" style="object-fit:cover;object-position:center;" data-image-fallback />
      <div>
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(optionSummary(item.options, item.id)) || "Sin opciones adicionales"}</p>
        <p><strong>${money(item.price)}</strong> ${item.price !== null ? "c/u" : ""}</p>
        <div>
          <span class="qty-control">
            <button type="button" data-action="cart-qty" data-index="${index}" data-delta="-1">−</button>
            <strong>${item.qty}</strong>
            <button type="button" data-action="cart-qty" data-index="${index}" data-delta="1">+</button>
          </span>
          <button class="remove-btn" type="button" data-action="cart-remove" data-index="${index}">Quitar</button>
        </div>
      </div>
    </div>
  `).join("");
}

function changeCartQty(index, delta) {
  if (!cart[index]) return;
  if (!Number.isSafeInteger(delta)) return;
  const next = cart[index].qty + delta;
  if (!Number.isSafeInteger(next)) return;
  cart[index].qty = next;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  saveCart();
  renderCart();
}

function removeCartItem(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function clearCart() {
  if (!cart.length) return;
  cart = [];
  saveCart();
  renderCart();
}

async function sendWhatsApp() {
  if (checkingOrder) return;
  if (!cart.length) {
    alert("Primero agregá algún producto al pedido.");
    return;
  }

  const fields = {};
  APP_CONFIG.orderFields.forEach(field => {
    const el = document.getElementById(`field-${field.id}`);
    fields[field.label] = el ? el.value.trim() : "";
  });

  const missing = APP_CONFIG.orderFields
    .filter(field => field.required)
    .filter(field => !fields[field.label]);

  if (missing.length) {
    alert(`Falta completar: ${missing.map(f => f.label).join(", ")}`);
    return;
  }

  checkingOrder = true;
  let ready;
  try { ready = await loadProducts(); }
  finally { checkingOrder = false; }
  if (!ready) {
    renderFilters(); renderProducts(); renderCart();
    alert("No pudimos comprobar el catálogo. Reintentá antes de enviar el pedido.");
    return;
  }
  const validation = syncCartWithCatalog();
  renderFilters(); renderProducts(); renderCart();
  if (cartNeedsReview) {
    cartNeedsReview = false;
    alert("El catálogo cambió o el pedido tenía datos inválidos. Revisá los artículos y precios antes de enviarlo nuevamente.");
    return;
  }
  if (!cart.length) { alert("El pedido ya no contiene productos disponibles."); return; }
  const phone = String(APP_CONFIG.whatsapp || "").replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(phone)) { alert("El WhatsApp del comercio no está configurado correctamente."); return; }

  const lines = [];
  lines.push(APP_CONFIG.whatsappMessage.title);
  lines.push("");

  cart.forEach(item => {
    const options = optionSummary(item.options, item.id);
    lines.push(`- ${item.name}${options ? ` (${options})` : ""} x${item.qty}${item.price !== null ? ` — ${money(item.price)} c/u` : ""}`);
  });

  lines.push("");
  lines.push(APP_CONFIG.whatsappMessage.dataTitle);

  Object.entries(fields).forEach(([label, value]) => {
    if (value) lines.push(`- ${label}: ${value}`);
  });

  lines.push("");
  lines.push(APP_CONFIG.whatsappMessage.close);

  const url = `${whatsAppBaseUrl()}?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank", "noopener,noreferrer");
  // El enlace también permite continuar si el navegador bloquea la ventana después de la comprobación.
  const status = document.getElementById("cartStatus");
  if (status) {
    status.hidden = false;
    status.textContent = "Pedido comprobado. Si WhatsApp no se abrió, ";
    const link = document.createElement("a");
    link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
    link.textContent = "abrilo aquí"; status.append(link);
  }
}

function whatsAppBaseUrl() {
  return `https://wa.me/${String(APP_CONFIG.whatsapp || "").replace(/\D/g, "")}`;
}

function optionSummary(options, productId = null) {
  if (!options) return "";
  const product = productId
    ? catalogProducts.find(p => p.id === productId)
    : detailProduct;

  const validGroups = purchaseOptionGroups(product);
  const validGroupIds = new Set(validGroups.map(group => group.id));

  return Object.entries(options)
    .filter(([key, value]) => value && validGroupIds.has(key))
    .map(([key, value]) => {
      const label = validGroups.find(g => g.id === key)?.label || key;
      return `${label}: ${value}`;
    })
    .join(" · ");
}

function priceLabel(product) {
  if (product.pricePrefix) return `${escapeHtml(product.pricePrefix)} ${money(product.price)}`;
  return money(product.price);
}

function imageStyleAttr(product, context = "detail") {
  if (!APP_CONFIG.presentation.mediaStyles) return "";
  return `style="object-position:${escapeAttr(imagePositionFor(product))};object-fit:${escapeAttr(productImageFit(product, context))};"`;
}

function loadCart() {
  try {
    const saved = localStorage.getItem(cartKey());
    const result = CatalogCore.validateStoredCart(saved === null ? [] : JSON.parse(saved));
    cart = result.items;
    if (result.rejected) cartNotice = "El pedido guardado contenía datos inválidos. Se recuperaron solo los artículos válidos.";
  } catch {
    cart = [];
    cartNotice = "No se pudo recuperar el pedido guardado. Podés armar uno nuevo.";
  }
}

function saveCart() {
  try { localStorage.setItem(cartKey(), JSON.stringify(cart)); }
  catch { cartNotice = "Tu navegador no permite guardar el pedido. Se conservará mientras esta página siga abierta."; }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function bindCatalogEvents() {
  CatalogCore.bindActions(document, {
    category: data => setCategory(data.category),
    product: data => openProductDetail(data.productId),
    option: data => selectOption(data.groupId, data.option),
    image: data => setDetailImage(data.image),
    "image-index": data => setDetailImageByIndex(Number(data.index)),
    "cart-qty": data => changeCartQty(Number(data.index), Number(data.delta)),
    "cart-remove": data => removeCartItem(Number(data.index)),
    "detail-qty": data => changeDetailQty(Number(data.delta)),
    "cart-open": () => openCart(), "cart-close": () => closeCart(),
    "detail-close": () => closeProductDetail(), "cart-add": () => addCurrentProductToCart(),
    "cart-clear": () => clearCart(), "send-order": () => sendWhatsApp(),
    "retry-catalog": () => retryCatalog()
  }, typeof handleImageError === "function" ? handleImageError : null);
}
