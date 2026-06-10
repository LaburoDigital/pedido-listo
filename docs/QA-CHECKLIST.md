# QA Checklist

## v0.8.1 — Imágenes por color
- [ ] Producto con Color: Negro, Blanco, Gris.
- [ ] Negro muestra imagen_1.
- [ ] Blanco muestra imagen_2.
- [ ] Gris muestra imagen_3.
- [ ] Tocar miniatura 2 selecciona Blanco.
- [ ] Tocar miniatura 3 selecciona Gris.
- [ ] Agregar al pedido guarda el color elegido.
- [ ] Carrito muestra la imagen de la variante elegida.
- [ ] WhatsApp incluye el color elegido.
- [ ] Producto sin Color sigue funcionando como galería normal.
- [ ] Sin errores rojos en consola.


## Funcional

- [ ] Carga productos desde Google Sheets.
- [ ] No hay errores rojos en consola.
- [ ] No aparece `Oferta Oferta`.
- [ ] Oferta solo aparece si `precio_anterior > precio`.
- [ ] Producto con `activo = NO` no aparece.
- [ ] Abrir detalle funciona.
- [ ] Talle/color se pueden seleccionar.
- [ ] Botón **Agregar al pedido** siempre visible y clickeable.
- [ ] Agregar producto no abre automáticamente el carrito.
- [ ] Botón `Pedido` abre el drawer.
- [ ] WhatsApp arma mensaje correctamente.
- [ ] Carrito no conserva productos eliminados/desactivados.

## Visual / Responsive

- [ ] Desktop 100%.
- [ ] Desktop 90%.
- [ ] Desktop 80%.
- [ ] DevTools abierto.
- [ ] Responsive 400 × 464.
- [ ] Mobile 375px.
- [ ] Modal no tapa el botón de agregar.
- [ ] Drawer no queda gigante ni como tirita.
- [ ] Grilla sin huecos raros.
- [ ] Hero no domina toda la pantalla.

## Accesibilidad básica

- [ ] Cerrar modal no deja foco atrapado.
- [ ] Cerrar carrito no deja foco dentro de elemento oculto.