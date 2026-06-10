# Changelog

## v0.8.1 — Imágenes por color
- Si el producto tiene opción Color, las imágenes se interpretan en el mismo orden que los colores.
- Ejemplo: Color = Negro, Blanco, Gris → imagen_1 = Negro, imagen_2 = Blanco, imagen_3 = Gris.
- Al tocar un color, cambia la imagen principal.
- Al tocar una miniatura, también se actualiza el color correspondiente.
- El carrito guarda la imagen de la variante elegida.
- Productos sin Color siguen funcionando como galería normal.
- No toca Google Sheets, data-source.js, config.js ni WhatsApp.


## v0.5.2 — Modal y compra accesible

- Corrige el modal de producto para que el botón **Agregar al pedido** quede visible y usable en pantallas bajas, móviles y DevTools.
- Reduce la escala visual general: hero, modal, drawer del pedido y títulos.
- Ajusta el modal mobile a estructura fullscreen con imagen controlada y botón fijo inferior.
- Ajusta el modal desktop a ancho máximo más razonable.
- Reduce el ancho del drawer del pedido en desktop.
- Mantiene intacta la carga desde Google Sheets y el modelo de productos.
- Corrige advertencias de foco al cerrar modal/drawer para evitar foco dentro de elementos con `aria-hidden`.
- Mantiene la regla: agregar producto no abre automáticamente el carrito.

## v0.5.1 — Compact commerce layout

- Escala compacta inicial para catálogo de ropa.
- Grilla uniforme y secciones inferiores ocultas.
- Limpieza de carrito contra productos desactivados.