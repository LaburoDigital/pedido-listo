/* Validación compartida. No depende del DOM ni de un comercio concreto. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CatalogCore = api;
})(globalThis, function () {
  "use strict";
  const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const validId = value => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$/.test(value);
  const validQuantity = value => Number.isSafeInteger(value) && value > 0;

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", inQuotes = false, closedQuote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') { cell += '"'; i++; }
        else if (inQuotes) { inQuotes = false; closedQuote = true; }
        else if (!cell && !closedQuote) inQuotes = true;
        else throw new Error("CSV inválido: comillas fuera de lugar.");
      } else if (!inQuotes && char === ",") {
        row.push(cell); cell = ""; closedQuote = false;
      } else if (!inQuotes && (char === "\n" || char === "\r")) {
        if (char === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = ""; closedQuote = false;
      } else if (closedQuote && !inQuotes) {
        if (!/\s/.test(char)) throw new Error("CSV inválido: texto después de las comillas.");
      } else cell += char;
    }
    if (inQuotes) throw new Error("CSV inválido: faltan cerrar comillas.");
    row.push(cell); rows.push(row);
    return rows;
  }

  function csvToObjects(csv) {
    const rows = parseCSV(String(csv).replace(/^\uFEFF/, ""))
      .filter(row => row.some(cell => cell.trim() !== ""));
    if (!rows.length) throw new Error("La planilla no tiene encabezados.");
    const headers = rows[0].map(value => value.trim().toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
    const names = headers.filter(Boolean);
    if (new Set(names).size !== names.length || !headers.includes("precio") ||
        !headers.some(header => ["nombre", "producto"].includes(header))) {
      throw new Error("Encabezados inválidos: se requieren nombre y precio, sin columnas duplicadas.");
    }
    return rows.slice(1).map((row, index) => {
      if (row.length !== headers.length) throw new Error(`Fila ${index + 2}: cantidad de columnas incorrecta.`);
      const object = Object.create(null);
      headers.forEach((header, col) => { if (header) object[header] = row[col]; });
      return object;
    });
  }

  function parsePrice(value) {
    let amount;
    if (typeof value === "number") amount = value;
    else if (typeof value === "string") {
      const text = value.trim();
      if (/^\d+(?:[.,]\d{1,2})?$/.test(text)) amount = Number(text.replace(",", "."));
      else if (/^[1-9]\d{0,2}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text)) {
        amount = Number(text.replaceAll(".", "").replace(",", "."));
      } else throw new Error("Precio inválido: usá un número sin símbolo de moneda, con hasta dos decimales.");
    } else throw new Error("Precio obligatorio.");
    const cents = amount * 100;
    if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(cents)) ||
        Math.abs(cents - Math.round(cents)) > 0.000001) {
      throw new Error("Precio inválido: debe ser no negativo y tener hasta dos decimales.");
    }
    return amount;
  }

  function resolveId(row, legacyProducts = []) {
    const explicit = String(row.id ?? row.producto_id ?? row.sku ?? "").trim();
    if (explicit) {
      if (!validId(explicit)) throw new Error("ID inválido. Usá letras, números, guion, punto, dos puntos o guion bajo.");
      return explicit;
    }
    const name = String(row.nombre || row.producto || "").trim();
    const matches = legacyProducts.filter(entry => entry.names.includes(name));
    if (matches.length === 1 && validId(matches[0].id)) return matches[0].id;
    throw new Error(`Falta el ID estable del producto: ${name || "sin nombre"}.`);
  }

  function validateProducts(products) {
    if (!Array.isArray(products)) throw new Error("El catálogo debe ser una lista de productos.");
    const ids = new Set();
    return products.filter(p => p && p.available !== false).map(p => {
      if (!validId(p.id) || ids.has(p.id)) throw new Error(`ID de producto inválido o duplicado: ${p.id || "vacío"}.`);
      ids.add(p.id);
      if (typeof p.name !== "string" || !p.name.trim()) throw new Error(`Falta el nombre de ${p.id}.`);
      const groups = p.optionGroups ?? [];
      if (!Array.isArray(groups)) throw new Error(`Opciones inválidas de ${p.name}.`);
      const groupIds = new Set();
      for (const group of groups) {
        if (!record(group) || !validId(group.id) || groupIds.has(group.id) ||
            !Array.isArray(group.options) || !group.options.length ||
            group.options.some(o => typeof o !== "string" || !o.trim()) ||
            new Set(group.options).size !== group.options.length) {
          throw new Error(`Opciones inválidas o duplicadas de ${p.name}.`);
        }
        groupIds.add(group.id);
      }
      return { ...p, price: parsePrice(p.price),
        oldPrice: p.oldPrice === null || p.oldPrice === undefined || p.oldPrice === "" ? null : parsePrice(p.oldPrice) };
    });
  }

  function validateStoredCart(value) {
    if (!Array.isArray(value)) return { items: [], rejected: true };
    let rejected = false;
    const items = value.filter(item => {
      const valid = record(item) && validId(item.id) && validQuantity(item.qty) && record(item.options) &&
        Object.entries(item.options).every(([key, val]) => validId(key) && typeof val === "string") &&
        typeof item.name === "string" && typeof item.price === "number" &&
        Number.isFinite(item.price) && item.price >= 0;
      if (!valid) rejected = true;
      return valid;
    }).map(item => ({ id: item.id, name: item.name, price: item.price,
      image: typeof item.image === "string" ? item.image : "", qty: item.qty,
      options: { ...item.options }, key: cartItemKey(item.id, item.options) }));
    return { items, rejected };
  }

  function cartItemKey(id, options) {
    return JSON.stringify([id, Object.entries(options).sort(([a], [b]) => a.localeCompare(b))]);
  }

  function reconcileCart(value, products, { groupsFor = p => p.optionGroups || [], imageFor = p => p.image || "", legacyProducts = [] } = {}) {
    const stored = validateStoredCart(value);
    const byId = new Map(products.map(p => [p.id, p]));
    const aliases = new Map();
    for (const entry of legacyProducts) for (const oldId of entry.cartIds || []) aliases.set(oldId, entry.id);
    const merged = new Map();
    let removed = stored.rejected, updated = false;
    for (const item of stored.items) {
      // Exact IDs take precedence. Legacy aliases are only the explicitly known old IDs.
      const product = byId.get(item.id) || byId.get(aliases.get(item.id));
      if (!product || product.available === false) { removed = true; continue; }
      try { parsePrice(product.price); } catch { removed = true; continue; }
      const groups = groupsFor(product), options = {};
      if (groups.some(group => !group.options.includes(item.options[group.id]))) { removed = true; continue; }
      const ids = new Set(groups.map(g => g.id));
      const visualIds = new Set((product.optionGroups || []).filter(g => !ids.has(g.id)).map(g => g.id));
      if (Object.keys(item.options).some(id => !ids.has(id) && !visualIds.has(id))) { removed = true; continue; }
      for (const group of groups) options[group.id] = item.options[group.id];
      if (product.price !== item.price || product.name !== item.name || item.id !== product.id ||
          JSON.stringify(options) !== JSON.stringify(item.options)) updated = true;
      const key = cartItemKey(product.id, options), previous = merged.get(key);
      if (previous) {
        if (!validQuantity(previous.qty + item.qty)) { removed = true; continue; }
        previous.qty += item.qty;
      } else merged.set(key, { key, id: product.id, name: product.name, price: product.price,
        image: imageFor(product, options), qty: item.qty, options });
    }
    return { items: [...merged.values()], removed, updated };
  }

  async function fetchCsv(url, fetcher, timeoutMs = 12000) {
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) throw new Error("Falta configurar una URL CSV válida.");
    const controller = new AbortController();
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const response = await fetcher(url, { cache: "no-store", signal: controller.signal });
          if (!response.ok) throw new Error(`La planilla respondió con error ${response.status}.`);
          return await response.text();
        })(),
        new Promise((_, reject) => { timer = setTimeout(() => {
          controller.abort(); reject(new Error("La planilla tardó demasiado. Podés reintentar."));
        }, timeoutMs); })
      ]);
    } finally { clearTimeout(timer); }
  }

  function bindActions(document, actions, imageError) {
    document.addEventListener("click", event => {
      const target = event.target.closest?.("[data-action]");
      if (!target || target.disabled) return;
      const handler = actions[target.dataset.action];
      if (typeof handler === "function") handler(target.dataset, event);
    });
    if (imageError) document.addEventListener("error", event => {
      if (event.target.tagName === "IMG" && event.target.hasAttribute("data-image-fallback")) imageError(event.target);
    }, true);
  }

  return { parseCSV, csvToObjects, parsePrice, resolveId, validateProducts, validateStoredCart, cartItemKey,
    reconcileCart, fetchCsv, bindActions, validQuantity };
});
