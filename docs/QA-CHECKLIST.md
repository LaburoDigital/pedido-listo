# QA Checklist — Pedido Listo v0.9.1

## Carga general

- [ ] La web carga sin errores rojos en consola.
- [ ] Los productos cargan desde Google Sheets.
- [ ] Si Google Sheets falla, usa el respaldo local.
- [ ] Las categorías filtran correctamente.

## Producto con `modo_imagenes = color`

- [ ] Las opciones de Color aparecen en la zona de compra.
- [ ] Al tocar un color, cambia la foto principal.
- [ ] Al tocar una miniatura de color, también cambia el color seleccionado.
- [ ] El carrito guarda el color elegido.
- [ ] WhatsApp manda Color, no manda Vista.

## Producto con `modo_imagenes = galeria`

- [ ] Las miniaturas cambian la foto principal.
- [ ] Frente/Atrás/Detalle no aparecen como opción de compra.
- [ ] WhatsApp no manda Vista.

## Producto con `modo_imagenes = color_galeria`

- [ ] Color aparece en la zona de compra, cerca de precio/talle/cantidad.
- [ ] Frente/Atrás/Detalle aparecen como miniaturas debajo/junto a la foto.
- [ ] Al tocar Negro, la galería muestra solo imágenes de Negro.
- [ ] Al tocar Blanco, la galería muestra solo imágenes de Blanco.
- [ ] Al tocar una miniatura, no cambia el color elegido.
- [ ] Al agregar al carrito, se guarda Color y Talle.
- [ ] WhatsApp manda Color/Talle/Cantidad, pero no manda Frente/Atrás/Detalle.

## Carrito

- [ ] Agregar al pedido funciona.
- [ ] El carrito no se abre automáticamente al agregar.
- [ ] Cantidades suman bien.
- [ ] Quitar productos funciona.
- [ ] El mensaje de WhatsApp se arma completo.

## Responsive

- [ ] Mobile 375 px funciona sin cortes graves.
- [ ] Desktop fullscreen no queda roto.
- [ ] No hay doble scroll molesto en el detalle.
- [ ] Al abrir un producto, el detalle arranca arriba.
