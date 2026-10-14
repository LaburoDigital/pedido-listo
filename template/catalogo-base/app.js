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

const money = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return `${APP_CONFIG.currency || "$"}${Number(value).toLocaleString("es-UY")}`;
};

const cartKey = () => `pedido:${APP_CONFIG.slug || APP_CONFIG.businessName || "catalogo"}`;

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
  if (APP_CONFIG.instagram) links.push(`<a href="${APP_CONFIG.instagram}" target="_blank" rel="noreferrer">Instagram</a>`);
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
      const source = typeof DATA_SOURCE !== "undefined" ? DATA_SOURCE : { mode: "local" };
      let products;
      if (source.mode === "sheet") {
        const csv = await CatalogCore.fetchCsv(source.csvUrl, fetch);
        products = csvToObjects(csv).map((row, index) => {
          try { return rowToProduct(row, index); }
          catch (error) { throw new Error(`Fila ${index + 2}: ${error.message}`); }
        }).filter(Boolean);
      } else if (source.mode === "local") {
        products = typeof PRODUCTS !== "undefined" ? PRODUCTS : [];
      } else throw new Error("Modo de catálogo desconocido.");
      catalogProducts = CatalogCore.validateProducts(products);
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

function rowToProduct(row, index) {
  const name = clean(row.nombre || row.producto || row.Producto);
  if (!name && !Object.values(row).some(value => clean(value))) return null;

  const active = toBool(row.activo, true);
  const available = toBool(row.disponible, true);
  if (!active || !available) return null;
  if (!name) throw new Error("Falta el nombre del producto.");

  const optionGroups = [];
  const option1Name = clean(row.opciones_1_nombre);
  const option1Values = splitValues(row.opciones_1_valores);
  if (option1Name && option1Values.length) {
    optionGroups.push({ id: slugify(option1Name), label: option1Name, options: option1Values });
  }

  const option2Name = clean(row.opciones_2_nombre);
  const option2Values = splitValues(row.opciones_2_valores);
  if (option2Name && option2Values.length) {
    optionGroups.push({ id: slugify(option2Name), label: option2Name, options: option2Values });
  }

  const featured = toBool(row.destacado, false);
  const offer = toBool(row.oferta, false);
  const price = toNumber(row.precio);
  const oldPrice = clean(row.precio_anterior) ? toNumber(row.precio_anterior) : null;

  return {
    id: CatalogCore.resolveId(row, typeof DATA_SOURCE !== "undefined" ? DATA_SOURCE.legacyProducts || [] : []),
    name,
    category: clean(row.categoria) || "Productos",
    short: clean(row.descripcion_corta),
    description: clean(row.descripcion_larga) || clean(row.descripcion_corta),
    price,
    oldPrice,
    image: clean(row.imagen_1),
    gallery: [clean(row.imagen_2), clean(row.imagen_3)].filter(Boolean),
    featured,
    offer,
    badge: clean(row.etiqueta),
    tags: splitValues(row.nota),
    layout: featured ? "featured" : "",
    order: clean(row.orden) ? toNumber(row.orden) : index + 1,
    available: true,
    optionGroups
  };
}

function csvToObjects(csv) {
  return CatalogCore.csvToObjects(csv);
}

function parseCSV(csv) {
  return CatalogCore.parseCSV(csv);
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function clean(value) {
  return String(value ?? "").trim();
}

function splitValues(value) {
  return clean(value)
    .split(/[;,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function toBool(value, defaultValue = false) {
  const val = clean(value).toLowerCase();
  if (!val) return defaultValue;
  return ["si", "sí", "yes", "true", "1", "activo", "disponible"].includes(val);
}

function toNumber(value) {
  return CatalogCore.parsePrice(value);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "producto";
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

function syncCartWithCatalog() {
  if (catalogState.status !== "ready") return { removed: false, updated: false };
  const result = CatalogCore.reconcileCart(cart, catalogProducts, {
    groupsFor: product => typeof purchaseOptionGroups === "function" ? purchaseOptionGroups(product) : product.optionGroups || [],
    imageFor: (product, options) => typeof productImageForOptions === "function" ? productImageForOptions(product, options) : primaryImage(product),
    legacyProducts: typeof DATA_SOURCE !== "undefined" ? DATA_SOURCE.legacyProducts || [] : []
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
    const layout = p.layout || (p.featured ? "featured" : "");
    const image = primaryImage(p);
    const badges = uniqueLabels([
      p.offer ? "Oferta" : "",
      p.featured ? "Destacado" : "",
      p.badge || ""
    ]);

    return `
      <article class="product-card ${layout}" data-action="product" data-product-id="${escapeAttr(p.id)}">
        <div class="product-image">
          <img src="${escapeAttr(image)}" alt="${escapeAttr(p.name)}" loading="lazy" />
          <div class="badges">${badges.map(b => `<span class="badge">${escapeHtml(b)}</span>`).join("")}</div>
        </div>
        <div class="product-body">
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.short || p.description || "")}</p>
          <div class="card-meta">
            <div>
              ${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}
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
  (product.optionGroups || []).forEach(group => {
    selectedOptions[group.id] = group.options?.[0] || "";
  });
  activeImage = primaryImage(product);

  updateDetailModal();

  document.body.classList.add("modal-open");
  document.getElementById("productBackdrop").classList.add("open");
  document.getElementById("productModal").classList.add("open");
  document.getElementById("productModal").setAttribute("aria-hidden", "false");
}

function closeProductDetail() {
  document.body.classList.remove("modal-open");
  document.getElementById("productBackdrop").classList.remove("open");
  document.getElementById("productModal").classList.remove("open");
  document.getElementById("productModal").setAttribute("aria-hidden", "true");
}

function updateDetailModal() {
  const p = detailProduct;
  if (!p) return;

  const image = document.getElementById("detailImage");
  image.src = activeImage;
  image.alt = p.name;

  text("detailCategory", p.category);
  text("detailName", p.name);
  text("detailDescription", p.description || p.short || "");
  text("detailQty", String(detailQty));

  document.getElementById("detailPrice").innerHTML = `
    ${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}
    <span>${priceLabel(p)}</span>
  `;

  const tags = uniqueLabels([
    p.offer ? "Oferta" : "",
    p.featured ? "Destacado" : "",
    ...(p.tags || [])
  ]);

  document.getElementById("detailTags").innerHTML = tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("");

  const images = [primaryImage(p), ...(p.gallery || [])].filter(Boolean);
  document.getElementById("detailThumbs").innerHTML = images.map(img => `
    <button class="${img === activeImage ? "active-thumb" : ""}" type="button" data-action="image" data-image="${escapeAttr(img)}" aria-label="Cambiar imagen">
      <img src="${escapeAttr(img)}" alt="" />
    </button>
  `).join("");

  document.getElementById("detailOptions").innerHTML = (p.optionGroups || []).map(group => `
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

function setDetailImage(url) {
  activeImage = url;
  updateDetailModal();
}

function selectOption(groupId, value) {
  const groups = typeof purchaseOptionGroups === "function" ? purchaseOptionGroups(detailProduct) : detailProduct?.optionGroups || [];
  if (!groups.some(group => group.id === groupId && group.options.includes(value))) return;
  selectedOptions[groupId] = value;
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
  window.setTimeout(openCart, 80);
}

function openCart() {
  document.body.classList.add("drawer-open");
  document.getElementById("drawerBackdrop").classList.add("open");
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "false");
}

function closeCart() {
  document.body.classList.remove("drawer-open");
  document.getElementById("drawerBackdrop").classList.remove("open");
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartDrawer").setAttribute("aria-hidden", "true");
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
      <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" />
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

  return Object.entries(options)
    .filter(([, value]) => value)
    .map(([key, value]) => {
      const label = product?.optionGroups?.find(g => g.id === key)?.label || key;
      return `${label}: ${value}`;
    })
    .join(" · ");
}

function priceLabel(product) {
  if (product.pricePrefix) return `${escapeHtml(product.pricePrefix)} ${money(product.price)}`;
  return money(product.price);
}

function primaryImage(product) {
  return product.image || product.images?.[0] || "";
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
