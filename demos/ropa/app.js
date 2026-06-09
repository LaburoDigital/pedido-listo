let currentCategory = "todos";
let cart = [];
let detailProduct = null;
let detailQty = 1;
let selectedOptions = {};
let activeImage = "";

const money = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return `${APP_CONFIG.currency || "$"}${Number(value).toLocaleString("es-UY")}`;
};

const cartKey = () => `pedido:${APP_CONFIG.slug || APP_CONFIG.businessName || "catalogo"}`;

document.addEventListener("DOMContentLoaded", () => {
  applyConfig();
  loadCart();
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

function renderFilters() {
  const categories = ["todos", ...new Set(PRODUCTS.filter(p => p.available !== false).map(p => p.category))];
  document.getElementById("filters").innerHTML = categories.map(cat => `
    <button class="filter-btn ${cat === currentCategory ? "active" : ""}" type="button" onclick="setCategory('${escapeAttr(cat)}')">
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
  const products = PRODUCTS
    .filter(p => p.available !== false)
    .filter(p => currentCategory === "todos" || p.category === currentCategory)
    .sort((a, b) => (a.order || 99) - (b.order || 99));

  const grid = document.getElementById("productGrid");
  if (!products.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1;">No hay productos disponibles en esta categoría.</div>`;
    return;
  }

  grid.innerHTML = products.map((p) => {
    const layout = p.layout || (p.featured ? "featured" : "");
    const image = primaryImage(p);
    const badges = [
      p.offer ? "Oferta" : "",
      p.featured ? "Destacado" : "",
      p.badge || ""
    ].filter(Boolean);

    return `
      <article class="product-card ${layout}" onclick="openProductDetail('${escapeAttr(p.id)}')">
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
            <button class="detail-link" type="button" onclick="event.stopPropagation(); openProductDetail('${escapeAttr(p.id)}')">
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
  const product = PRODUCTS.find(p => p.id === productId);
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

  const tags = [
    p.offer ? "Oferta" : "",
    p.featured ? "Destacado" : "",
    ...(p.tags || [])
  ].filter(Boolean);

  document.getElementById("detailTags").innerHTML = tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("");

  const images = [primaryImage(p), ...(p.gallery || [])].filter(Boolean);
  document.getElementById("detailThumbs").innerHTML = images.map(img => `
    <button class="${img === activeImage ? "active-thumb" : ""}" type="button" onclick="setDetailImage('${escapeAttr(img)}')" aria-label="Cambiar imagen">
      <img src="${escapeAttr(img)}" alt="" />
    </button>
  `).join("");

  document.getElementById("detailOptions").innerHTML = (p.optionGroups || []).map(group => `
    <div class="option-group">
      <strong>${escapeHtml(group.label)}</strong>
      <div class="option-buttons">
        ${(group.options || []).map(opt => `
          <button type="button" class="${selectedOptions[group.id] === opt ? "active" : ""}" onclick="selectOption('${escapeAttr(group.id)}', '${escapeAttr(opt)}')">
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
  selectedOptions[groupId] = value;
  updateDetailModal();
}

function changeDetailQty(delta) {
  detailQty = Math.max(1, detailQty + delta);
  text("detailQty", String(detailQty));
}

function addCurrentProductToCart() {
  if (!detailProduct) return;

  const optionText = optionSummary(selectedOptions);
  const key = `${detailProduct.id}|${optionText}`;
  const existing = cart.find(item => item.key === key);

  if (existing) {
    existing.qty += detailQty;
  } else {
    cart.push({
      key,
      id: detailProduct.id,
      name: detailProduct.name,
      price: detailProduct.price,
      image: primaryImage(detailProduct),
      qty: detailQty,
      options: { ...selectedOptions }
    });
  }

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
        <p><strong>${money(item.price)}</strong> ${item.price ? "c/u" : ""}</p>
        <div>
          <span class="qty-control">
            <button type="button" onclick="changeCartQty(${index}, -1)">−</button>
            <strong>${item.qty}</strong>
            <button type="button" onclick="changeCartQty(${index}, 1)">+</button>
          </span>
          <button class="remove-btn" type="button" onclick="removeCartItem(${index})">Quitar</button>
        </div>
      </div>
    </div>
  `).join("");
}

function changeCartQty(index, delta) {
  if (!cart[index]) return;
  cart[index].qty += delta;
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

function sendWhatsApp() {
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

  const lines = [];
  lines.push(APP_CONFIG.whatsappMessage.title);
  lines.push("");

  cart.forEach(item => {
    const options = optionSummary(item.options, item.id);
    lines.push(`- ${item.name}${options ? ` (${options})` : ""} x${item.qty}${item.price ? ` — ${money(item.price)} c/u` : ""}`);
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
}

function whatsAppBaseUrl() {
  return `https://wa.me/${String(APP_CONFIG.whatsapp || "").replace(/\D/g, "")}`;
}

function optionSummary(options, productId = null) {
  if (!options) return "";
  const product = productId
    ? PRODUCTS.find(p => p.id === productId)
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
  if (product.pricePrefix) return `${product.pricePrefix} ${money(product.price)}`;
  return money(product.price);
}

function primaryImage(product) {
  return product.image || product.images?.[0] || "";
}

function loadCart() {
  try {
    cart = JSON.parse(localStorage.getItem(cartKey())) || [];
  } catch {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem(cartKey(), JSON.stringify(cart));
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
