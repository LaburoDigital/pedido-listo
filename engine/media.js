/* Funciones de imágenes extraídas de ropa, sin estado de tienda. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CatalogMedia=api;})(globalThis,function(){
const clean=value=>String(value??'').trim();
const IMAGE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='1100' viewBox='0 0 900 1100'%3E%3Crect width='900' height='1100' fill='%23f3f4f6'/%3E%3Ctext x='450' y='550' text-anchor='middle' dominant-baseline='middle' font-family='Arial,sans-serif' font-size='42' fill='%239ca3af'%3EImagen no disponible%3C/text%3E%3C/svg%3E";
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

function handleImageError(img) {
  if (!img) return;
  img.onerror = null;
  img.src = IMAGE_PLACEHOLDER;
  img.style.objectFit = "contain";
  img.style.objectPosition = "center";
}


return {normalizeImageMode,normalizeImagePosition,normalizeImageFit,allProductImages,productImages,imageMode,isGalleryViewGroup,purchaseOptionGroups,getRawColorGroup,getColorGroup,selectedColorIndex,viewCountForProduct,visibleProductImages,productImageForOptions,thumbnailLabel,primaryImage,imagePositionFor,productImageFit,handleImageError,IMAGE_PLACEHOLDER};
});
