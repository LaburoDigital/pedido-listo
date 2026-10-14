let currentCategory = "todos";
let cart = [];
let detailProduct = null;
let detailQty = 1;
let selectedOptions = {};
let activeImage = "";
let catalogProducts = [];

const IMAGE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='1100' viewBox='0 0 900 1100'%3E%3Crect width='900' height='1100' fill='%23f3f4f6'/%3E%3Ctext x='450' y='550' text-anchor='middle' dominant-baseline='middle' font-family='Arial,sans-serif' font-size='42' fill='%239ca3af'%3EImagen no disponible%3C/text%3E%3C/svg%3E";

const money = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return `${APP_CONFIG.currency || "$"}${Number(value).toLocaleString("es-UY")}`;
};

const cartKey = () => `pedido:${APP_CONFIG.slug || APP_CONFIG.businessName || "catalogo"}`;

document.addEventListener("DOMContentLoaded", async () => {
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
  const fallbackProducts = typeof PRODUCTS !== "undefined" ? PRODUCTS : [];
  catalogProducts = Array.isArray(fallbackProducts) ? fallbackProducts : [];

  const source = typeof DATA_SOURCE !== "undefined" ? DATA_SOURCE : null;
  if (!source || source.mode !== "sheet" || !source.csvUrl) return;

  try {
    const response = await fetch(source.csvUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`No se pudo cargar la planilla (${response.status})`);

    const csv = await response.text();
    const rows = csvToObjects(csv);
    const productsFromSheet = rows
      .map(rowToProduct)
      .filter(product => product && product.available !== false);

    if (productsFromSheet.length) {
      catalogProducts = productsFromSheet;
      console.info(`Productos cargados desde Google Sheets: ${productsFromSheet.length}`);
    } else {
      console.warn("La planilla no devolvió productos válidos. Se usa products.js como respaldo.");
    }
  } catch (error) {
    console.warn("No se pudo cargar Google Sheets. Se usa products.js como respaldo.", error);
  }
}

function rowToProduct(row, index) {
  const name = clean(row.nombre || row.producto || row.Producto);
  if (!name) return null;

  const active = toBool(row.activo, true);
  const available = toBool(row.disponible, true);
  if (!active || !available) return null;

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
  const oldPrice = toNumber(row.precio_anterior);
  const images = collectImagesFromRow(row);

  return {
    id: slugify(`${name}-${index + 1}`),
    name,
    category: clean(row.categoria) || "Productos",
    short: clean(row.descripcion_corta),
    description: clean(row.descripcion_larga) || clean(row.descripcion_corta),
    price,
    oldPrice,
    image: images[0] || clean(row.imagen),
    gallery: images.slice(1),
    images,
    mediaMode: normalizeImageMode(row.modo_imagenes || row.tipo_galeria || row.modo_galeria),
    imagePosition: normalizeImagePosition(row.posicion_imagen || row.imagen_posicion || row.foco_imagen),
    imageFit: normalizeImageFit(row.ajuste_imagen || row.fit_imagen || row.imagen_fit),
    imageLabels: splitValues(row.imagenes_labels || row.labels_imagenes || row.vistas_imagenes),
    featured,
    offer,
    badge: clean(row.etiqueta),
    tags: splitValues(row.nota),
    layout: "",
    order: toNumber(row.orden) || index + 1,
    available: true,
    optionGroups
  };
}

function collectImagesFromRow(row) {
  const images = [];

  for (let i = 1; i <= 12; i++) {
    images.push(clean(row[`imagen_${i}`] || row[`image_${i}`]));
  }

  // Compatibilidad con plantillas viejas que usaban una sola columna imagen.
  images.push(clean(row.imagen || row.image));

  return images
    .filter(Boolean)
    .filter((img, index, arr) => arr.indexOf(img) === index);
}

function csvToObjects(csv) {
  const rows = parseCSV(csv).filter(row => row.some(cell => String(cell).trim() !== ""));
  if (rows.length < 2) return [];

  const headers = rows[0].map(header => normalizeHeader(header));
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      if (header) obj[header] = row[index] ?? "";
    });
    return obj;
  });
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
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
  const val = clean(value);
  if (!val) return null;
  const normalized = val.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeImageMode(value) {
  const val = clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[+\s-]+/g, "_");
  if (["color_galeria", "colores_galeria", "color_vistas", "colores_vistas", "color_gallery", "variant_gallery"].includes(val)) return "color_galeria";
  if (["color", "colores", "variant", "variante"].includes(val)) return "color";
  if (["galeria", "gallery", "vista", "vistas", "imagenes", "images"].includes(val)) return "galeria";
  return "auto";
}

function normalizeImagePosition(value) {
  const val = clean(value).toLowerCase();
  if (!val) return "center";

  // Evita inyección en atributo style. Acepta valores CSS simples como:
  // center, top, center top, center 35%, 50% 30%.
  if (/^[a-z0-9% .-]+$/.test(val)) return val;
  return "center";
}

function normalizeImageFit(value) {
  const val = clean(value).toLowerCase();
  if (["cover", "contain"].includes(val)) return val;
  return "auto";
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


function isValidOffer(product) {
  return Boolean(product && product.offer && Number(product.oldPrice) > Number(product.price || 0));
}

function syncCartWithCatalog() {
  const before = JSON.stringify(cart);
  cart = cart
    .map(item => {
      const product = catalogProducts.find(p => p.id === item.id && p.available !== false);
      if (!product) return null;
      return {
        ...item,
        name: product.name,
        price: product.price,
        image: productImageForOptions(product, item.options)
      };
    })
    .filter(Boolean);

  if (JSON.stringify(cart) !== before) saveCart();
}

function renderFilters() {
  const categories = ["todos", ...new Set(catalogProducts.filter(p => p.available !== false).map(p => p.category))];
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
  const products = catalogProducts
    .filter(p => p.available !== false)
    .filter(p => currentCategory === "todos" || p.category === currentCategory)
    .sort((a, b) => (a.order || 99) - (b.order || 99));

  const grid = document.getElementById("productGrid");
  if (!products.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1;">No hay productos disponibles en esta categoría.</div>`;
    return;
  }

  grid.innerHTML = products.map((p) => {
    const layout = "";
    const image = primaryImage(p);
    const badges = uniqueLabels([
      isValidOffer(p) ? "Oferta" : "",
      p.featured ? "Destacado" : "",
      p.badge || ""
    ]);

    return `
      <article class="product-card ${layout}" onclick="openProductDetail('${escapeAttr(p.id)}')">
        <div class="product-image">
          <img src="${escapeAttr(image)}" alt="${escapeAttr(p.name)}" loading="lazy" ${imageStyleAttr(p, "card")} onerror="handleImageError(this)" />
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
  image.style.objectPosition = imagePositionFor(p);
  image.style.objectFit = productImageFit(p, "detail");
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
    <button class="${img === activeImage ? "active-thumb" : ""}" type="button" onclick="setDetailImageByIndex(${index})" aria-label="${escapeAttr(thumbnailLabel(p, index))}" title="${escapeAttr(thumbnailLabel(p, index))}">
      <img src="${escapeAttr(img)}" alt="" ${imageStyleAttr(p, "thumb")} onerror="handleImageError(this)" />
    </button>
  `).join("");

  document.getElementById("detailOptions").innerHTML = purchaseOptionGroups(p).map(group => `
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
      image: productImageForOptions(detailProduct, selectedOptions),
      qty: detailQty,
      options: { ...selectedOptions }
    });
  }

  saveCart();
  renderCart();
  closeProductDetail();
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
  const count = cart.reduce((acc, item) => acc + item.qty, 0);
  text("cartCount", String(count));

  const box = document.getElementById("cartItems");
  if (!cart.length) {
    box.innerHTML = `<div class="empty">Todavía no agregaste productos al pedido.</div>`;
    return;
  }

  box.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" style="object-fit:cover;object-position:center;" onerror="handleImageError(this)" />
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
  if (product.pricePrefix) return `${product.pricePrefix} ${money(product.price)}`;
  return money(product.price);
}

function allProductImages(product) {
  return [
    product?.image,
    ...(product?.gallery || []),
    ...(product?.images || [])
  ]
    .map(img => String(img || "").trim())
    .filter(Boolean)
    .filter((img, index, arr) => arr.indexOf(img) === index);
}

function productImages(product) {
  // Compatibilidad con llamadas anteriores: devuelve todas las imágenes crudas.
  return allProductImages(product);
}

function imageMode(product) {
  const configured = normalizeImageMode(product?.mediaMode);
  if (["color", "galeria", "color_galeria"].includes(configured)) return configured;

  const images = allProductImages(product);
  const colorGroup = getRawColorGroup(product);
  const colorCount = colorGroup?.options?.length || 0;
  const labels = product?.imageLabels || [];

  // Auto: si hay colores + labels de vistas + suficientes imágenes, se interpreta como color + galería.
  if (colorGroup && colorCount > 1 && labels.length > 1 && images.length >= colorCount * labels.length) return "color_galeria";

  // Si hay suficientes imágenes para los colores, se interpreta como una imagen por color.
  if (colorGroup && colorCount > 1 && images.length >= colorCount) return "color";
  return "galeria";
}

function isGalleryViewGroup(group) {
  const id = String(group?.id || "").toLowerCase();
  const label = String(group?.label || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return ["vista", "vistas", "view", "views", "imagen", "imagenes", "image", "images", "foto", "fotos"].includes(id)
    || ["vista", "vistas", "view", "views", "imagen", "imagenes", "image", "images", "foto", "fotos"].includes(label);
}

function purchaseOptionGroups(product) {
  const groups = product?.optionGroups || [];
  const mode = imageMode(product);
  if (mode !== "galeria" && mode !== "color_galeria") return groups;

  // Frente/Atrás/Detalle son navegación visual, no opciones de compra.
  return groups.filter(group => !isGalleryViewGroup(group));
}

function getRawColorGroup(product) {
  return (product?.optionGroups || []).find(group => {
    const id = String(group.id || "").toLowerCase();
    const label = String(group.label || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return id === "color" || label === "color" || label === "colores";
  }) || null;
}

function getColorGroup(product) {
  return purchaseOptionGroups(product).find(group => {
    const id = String(group.id || "").toLowerCase();
    const label = String(group.label || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return id === "color" || label === "color" || label === "colores";
  }) || null;
}

function selectedColorIndex(product, options = {}) {
  const colorGroup = getColorGroup(product);
  if (!colorGroup) return 0;

  const selectedColor = options?.[colorGroup.id] || colorGroup.options?.[0];
  const colorIndex = (colorGroup.options || []).findIndex(option =>
    String(option).trim().toLowerCase() === String(selectedColor || "").trim().toLowerCase()
  );

  return colorIndex >= 0 ? colorIndex : 0;
}

function viewCountForProduct(product) {
  const labels = product?.imageLabels || [];
  if (labels.length) return labels.length;

  const images = allProductImages(product);
  const colorGroup = getColorGroup(product);
  const colorCount = colorGroup?.options?.length || 0;

  if (colorCount > 0 && images.length >= colorCount && images.length % colorCount === 0) {
    return Math.max(1, images.length / colorCount);
  }

  return 1;
}

function visibleProductImages(product, options = {}) {
  const images = allProductImages(product);
  if (!images.length) return [IMAGE_PLACEHOLDER];

  if (imageMode(product) !== "color_galeria") return images;

  const viewCount = viewCountForProduct(product);
  const colorIndex = selectedColorIndex(product, options);
  const start = colorIndex * viewCount;
  const groupImages = images.slice(start, start + viewCount).filter(Boolean);

  return groupImages.length ? groupImages : images.slice(0, viewCount);
}

function productImageForOptions(product, options = {}) {
  const images = allProductImages(product);
  if (!images.length) return IMAGE_PLACEHOLDER;

  const mode = imageMode(product);
  const colorGroup = getColorGroup(product);

  if (mode === "color_galeria") {
    return visibleProductImages(product, options)[0] || images[0];
  }

  if (mode !== "color" || !colorGroup) return images[0];

  return images[selectedColorIndex(product, options)] || images[0];
}

function thumbnailLabel(product, index) {
  const mode = imageMode(product);
  const colorGroup = getColorGroup(product);
  const labels = product?.imageLabels || [];

  if (mode === "color") {
    const color = colorGroup?.options?.[index];
    if (color) return `Ver color ${color}`;
  }

  if ((mode === "galeria" || mode === "color_galeria") && labels[index]) return `Ver ${labels[index]}`;
  return `Ver imagen ${index + 1}`;
}

function primaryImage(product) {
  return allProductImages(product)[0] || IMAGE_PLACEHOLDER;
}

function imagePositionFor(product) {
  return normalizeImagePosition(product?.imagePosition);
}

function productImageFit(product, context = "detail") {
  const fit = normalizeImageFit(product?.imageFit);
  if (fit !== "auto") return fit;

  if (context === "card" || context === "thumb" || context === "cart") return "cover";
  return "contain";
}

function imageStyleAttr(product, context = "detail") {
  return `style="object-position:${escapeAttr(imagePositionFor(product))};object-fit:${escapeAttr(productImageFit(product, context))};"`;
}

function handleImageError(img) {
  if (!img) return;
  img.onerror = null;
  img.src = IMAGE_PLACEHOLDER;
  img.style.objectFit = "contain";
  img.style.objectPosition = "center";
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
