/* Adaptadores: solo aquí se conoce el formato CSV de Sheets. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'),require('./media.js'));else root.CatalogSources=factory(root.CatalogCore,root.CatalogMedia);})(globalThis,function(CatalogCore,CatalogMedia){
const {normalizeImageMode,normalizeImagePosition,normalizeImageFit}=CatalogMedia;
function rowToProduct(row, index, legacyProducts = []) {
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
  const images = collectImagesFromRow(row);

  return {
    id: CatalogCore.resolveId(row, legacyProducts),
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
    order: clean(row.orden) ? toNumber(row.orden) : index + 1,
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



function create(source, localProducts, fetcher=(...args)=>fetch(...args)) {
  return {async load(){
    if(source.mode==='local')return localProducts();
    if(source.mode!=='sheet')throw new Error('Modo de catálogo desconocido.');
    const csv=await CatalogCore.fetchCsv(source.csvUrl,fetcher);
    return CatalogCore.csvToObjects(csv).map((row,index)=>{
      try{return rowToProduct(row,index,source.legacyProducts||[]);}
      catch(error){throw new Error(`Fila ${index+2}: ${error.message}`);}
    }).filter(Boolean);
  }};
}
return {create,rowToProduct};
});
