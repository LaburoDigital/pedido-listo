# Google Sheets como fuente editable

## Objetivo

Permitir que el dueño del negocio edite productos, precios, ofertas, disponibilidad y opciones desde una planilla simple.

## Link CSV actual de prueba

```text
https://docs.google.com/spreadsheets/d/e/2PACX-1vQbtRRB5LfcmEI1_xvVF7hnzmHVgi1MF0bsnYAn-qjLUjvEX1rhjd6maAJdjZA9Ew/pub?gid=792993831&single=true&output=csv
```

## Archivo que controla la fuente

Cada catálogo tiene un archivo:

```text
data-source.js
```

Modo local:

```js
const DATA_SOURCE = {
  mode: "local",
  csvUrl: ""
};
```

Modo Google Sheets:

```js
const DATA_SOURCE = {
  mode: "sheet",
  csvUrl: "PEGAR_LINK_CSV"
};
```

## Columnas esperadas

```text
id
activo
destacado
oferta
categoria
nombre
descripcion_corta
descripcion_larga
precio
precio_anterior
imagen_1
imagen_2
imagen_3
opciones_1_nombre
opciones_1_valores
opciones_2_nombre
opciones_2_valores
disponible
orden
nota
```

## Reglas para el cliente

- No cambiar nombres de columnas.
- Cada producto debe tener un `id` único y permanente. No cambia al renombrar el producto o mover filas; no se reutiliza para otro producto.
- Precios obligatorios y no negativos, sin símbolos de moneda. Se aceptan `890`, `890.50`, `890,50`, `1.890` y `1.890,50`. Una coma seguida de tres decimales (`1,890`) se rechaza por ambigua. `precio_anterior` es opcional; si se completa, usa las mismas reglas.
- Usar `SI` o `NO` en activo, destacado, oferta y disponible.
- Poner imágenes como links públicos.
- Separar talles/colores con coma: `S,M,L,XL`.
- No poner datos privados en la planilla porque se publica para lectura.

## Compatibilidad y fallos

La planilla de ropa actual tiene una tabla temporal de equivalencias en `demos/ropa/data-source.js`; no fue modificada durante la fase 1. Ver la tabla de IDs y el procedimiento en [FASE-1-ESTABILIZACION.md](FASE-1-ESTABILIZACION.md). Agregar IDs antes de crear o renombrar productos; el sistema no inventa identidades desde el nombre ni la posición.

Una planilla válida sin productos activos muestra el catálogo vacío. Si la conexión falla o un dato activo es inválido, aparece un error con reintento: **no se usan productos ni precios de ejemplo como respaldo**. El pedido guardado se conserva mientras no se pueda comprobar la fuente.

## Riesgo técnico

Google Sheets publicado como CSV sirve para MVP editable, pero no es una base de datos profesional. Si el cliente rompe columnas o pone mal enlaces de imagen, la web puede fallar visualmente. Para esta etapa, es aceptable porque el objetivo es validar el producto editable sin construir panel admin.
