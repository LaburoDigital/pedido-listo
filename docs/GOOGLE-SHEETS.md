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
- Usar `SI` o `NO` en activo, destacado, oferta y disponible.
- Poner imágenes como links públicos.
- Separar talles/colores con coma: `S,M,L,XL`.
- No poner datos privados en la planilla porque se publica para lectura.

## Riesgo técnico

Google Sheets publicado como CSV sirve para MVP editable, pero no es una base de datos profesional. Si el cliente rompe columnas o pone mal enlaces de imagen, la web puede fallar visualmente. Para esta etapa, es aceptable porque el objetivo es validar el producto editable sin construir panel admin.
