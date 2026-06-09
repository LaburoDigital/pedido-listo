# CHANGELOG — Pedido Listo

## v0.4 — Editable por Google Sheets
- Agregado `data-source.js` para elegir entre productos locales o Google Sheets.
- `app.js` ahora puede cargar productos desde una hoja publicada como CSV.
- Se mantiene `products.js` como respaldo si la planilla falla.
- Demo de ropa conectada a la planilla publicada por el usuario.
- Se agregan funciones para parsear CSV, normalizar columnas y transformar filas en productos.

## v0.3 — Base estable
- Base separada en archivos.
- Configuración del negocio en `config.js`.
- Productos en `products.js`.
- Flujo card → detalle → agregar al pedido → WhatsApp.
- Grilla mobile para productos.
- Documentación inicial.

## v0.4.2
- Corrige error crítico: `uniqueLabels is not defined`.
- Mantiene deduplicación real de etiquetas Oferta/Destacado sin duplicados visuales.
- Confirma que el catálogo no debe fallar aunque los productos vengan desde Google Sheets.
- Mantiene `main` estable y esta versión debe probarse en `dev` antes de merge.
