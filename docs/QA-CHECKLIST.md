# QA Checklist

Usar antes de mostrar una demo a un posible cliente.

## Mobile

- [ ] Probar en 375px de ancho.
- [ ] Probar en 400px de ancho.
- [ ] Los productos no quedan eternos en una sola columna si el rubro permite grilla.
- [ ] Los botones son tocables.
- [ ] Nada tapa campos del pedido.
- [ ] El detalle del producto no tiene una imagen excesivamente alta.
- [ ] El botón principal aparece cuando corresponde.

## Producto

- [ ] La card abre el detalle.
- [ ] La card no tiene acciones redundantes.
- [ ] El detalle muestra nombre, precio, descripción y opciones.
- [ ] Talles/colores/opciones se pueden seleccionar.
- [ ] La cantidad se puede modificar.
- [ ] El botón “Agregar al pedido” funciona.

## Pedido

- [ ] El producto agregado aparece en “Tu pedido”.
- [ ] Las opciones elegidas aparecen correctamente.
- [ ] Se puede sumar/restar cantidad.
- [ ] Se puede eliminar producto.
- [ ] El pedido vacío se muestra bien.
- [ ] El mensaje de WhatsApp no dice “consulta” si es un pedido.
- [ ] El mensaje incluye productos, cantidades y datos del cliente.

## Contenido

- [ ] No hay textos del rubro anterior.
- [ ] No hay textos internos tipo “demo” o “producto de prueba” visibles al cliente final.
- [ ] Los textos suenan al rubro correcto.
- [ ] Las imágenes no se ven repetitivas o infantiles.
- [ ] Las ofertas no parecen falsas.

## SEO/publicación

- [ ] `title` correcto.
- [ ] `meta description` correcta.
- [ ] `robots.txt` existe.
- [ ] `sitemap.xml` existe.
- [ ] Nombre de marca, rubro y ciudad aparecen en texto real cuando corresponde.

## Técnica

- [ ] No hay errores graves en consola.
- [ ] Funciona con servidor local.
- [ ] `config.js` y `products.js` están separados del HTML.
- [ ] No se tocó `app.js` sin necesidad.
