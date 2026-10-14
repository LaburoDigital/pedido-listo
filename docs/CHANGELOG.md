# Changelog

## Fase 1 — Estabilización

- Catálogo vacío válido y error con reintento; se elimina el respaldo de ejemplos en modo Sheets.
- Validación compartida de CSV, precios, IDs, opciones y carritos.
- IDs explícitos y puente de migración para los cinco productos actuales de ropa.
- Eventos seguros con atributos de datos, sin manejadores inline.
- Comprobación fresca del catálogo antes de preparar WhatsApp, con revisión obligatoria ante cambios y protección frente a reintentos simultáneos.
- Exportación independiente que incluye el motor común, sin publicar ni sobrescribir destinos.
- Pruebas automatizadas y documentación de contratos y migración.

## v0.9.1 — Color + vistas separadas

- Agrega soporte para `modo_imagenes = color_galeria`.
- Color queda como variante real de compra, en la zona de precio/opciones.
- Las miniaturas quedan como vistas de imagen: Frente / Atrás / Detalle.
- Al cambiar de color, cambia el grupo de miniaturas del color seleccionado.
- Las vistas no se envían por WhatsApp ni aparecen como opción de compra.
- Mantiene compatibilidad con `color` y `galeria` de v0.9.0.


## v0.9.0 — Sistema profesional de imágenes
- Agrega `modo_imagenes`: `color`, `galeria` o vacío/auto.
- Agrega `posicion_imagen`: `center`, `top`, `center top`, `center 35%`, etc.
- Agrega `ajuste_imagen`: `cover`, `contain` o vacío/auto.
- Agrega `imagenes_labels` para nombrar miniaturas como Frente, Atrás, Detalle.
- En `modo_imagenes=color`, las imágenes siguen el orden de los colores y cambian al seleccionar color.
- En `modo_imagenes=galeria`, las imágenes son vistas visuales y no se envían como opción de compra.
- Si alguien carga una opción llamada Vista/Vistas/Foto/Imagen en modo galería, se oculta como opción de compra y no va al WhatsApp.
- Agrega placeholder si una imagen falla o está vacía.
- Mantiene intacto Google Sheets, carrito, WhatsApp y la regla de no abrir carrito al agregar.

## v0.8.4 — Reset de scroll en detalle
- Corrige el bug donde Ver detalle abría a mitad de la ficha del producto.
- Cada producto nuevo empieza arriba: foto, nombre y descripción visibles.
- Evita que el scroll previo del detalle se conserve entre productos.
- No toca CSS, Google Sheets, carrito ni WhatsApp.


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

## Fase 2 — arquitectura compartida

Motor único; adaptadores de catálogo; cuatro configuraciones independientes; temas conservados; retiro de duplicados tras comparación visual; publicaciones fijadas a commits verificados por tienda. Sin cambios en Sheets ni despliegues.
