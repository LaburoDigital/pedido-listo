# Pedido Listo v0.9.1 — Color + vistas separadas

## Objetivo

Separar correctamente dos conceptos:

- **Color / Talle / Sabor / Tamaño** = opciones reales de compra. Van en la zona de precio/opciones y sí se envían por WhatsApp.
- **Frente / Atrás / Detalle / Modelo** = vistas de imagen. Van como miniaturas debajo de la foto y no se envían por WhatsApp.

## Modos soportados

### `modo_imagenes = color`

Una imagen por color.

Ejemplo:

- `opciones_2_nombre`: Color
- `opciones_2_valores`: Negro, Blanco, Gris
- `imagen_1`: foto Negro
- `imagen_2`: foto Blanco
- `imagen_3`: foto Gris
- `modo_imagenes`: color

Al tocar Blanco, cambia a la foto blanca.

### `modo_imagenes = galeria`

Las imágenes son vistas normales.

Ejemplo:

- `imagen_1`: Frente
- `imagen_2`: Atrás
- `imagen_3`: Detalle
- `imagenes_labels`: Frente, Atrás, Detalle
- `modo_imagenes`: galeria

Frente/Atrás/Detalle no aparece como opción de compra.

### `modo_imagenes = color_galeria`

Color como opción de compra + miniaturas como vistas del color seleccionado.

Ejemplo con 2 colores y 3 vistas:

- `opciones_2_nombre`: Color
- `opciones_2_valores`: Negro, Blanco
- `imagenes_labels`: Frente, Atrás, Detalle
- `modo_imagenes`: color_galeria

Orden obligatorio:

- `imagen_1`: Negro Frente
- `imagen_2`: Negro Atrás
- `imagen_3`: Negro Detalle
- `imagen_4`: Blanco Frente
- `imagen_5`: Blanco Atrás
- `imagen_6`: Blanco Detalle

Al tocar Negro, las miniaturas muestran Frente/Atrás/Detalle de Negro.
Al tocar Blanco, las miniaturas cambian a Frente/Atrás/Detalle de Blanco.
En WhatsApp se manda Color, pero no se manda Vista.

## Columnas nuevas recomendadas

- `imagen_4`
- `imagen_5`
- `imagen_6`
- `imagen_7`
- `imagen_8`
- `imagen_9`
- `modo_imagenes`
- `posicion_imagen`
- `ajuste_imagen`
- `imagenes_labels`

## Encuadre

- `posicion_imagen`: center, center top, top, 50% 30%, etc.
- `ajuste_imagen`: cover o contain.

Uso recomendado:

- Cards: normalmente cover.
- Detalle: contain cuando hay que ver la prenda completa; cover cuando las fotos ya están bien encuadradas.

## Regla comercial

No prometer que el sistema arregla fotos malas. El estándar sigue siendo:

- fotos claras;
- producto centrado;
- fondo limpio;
- sin capturas de Instagram;
- sin collages;
- mínimo 1000 px de ancho cuando sea posible.
