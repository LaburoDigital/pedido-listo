> Documento histórico de fase 1: las rutas de ejecución/exportación corresponden a esa versión. Ver [operación actual](FASE-2-ARQUITECTURA.md).

# Fase 1 — estabilización del catálogo existente

## Alcance

La presentación, los CSS, las configuraciones comerciales y las galerías existentes se conservan. Ropa, pastelería y la plantilla comparten reglas de validación en `shared/catalog-core.js`. No se agregan stock, pagos ni un panel de administración.

El trabajo previo v0.9.1 está separado en el commit `51cf70e` de la rama `fase-1-estabilizacion`. El respaldo anterior con Git se conserva en `../work/respaldo-pedido-listo-20261014-100701` respecto de la raíz de `pedido-listo` (la carpeta `work` es hermana del proyecto).

## Carga y errores

- Modo `sheet`: solo se muestran datos de la planilla validada; nunca `products.js` como respaldo.
- Modo `local`: `products.js` sigue siendo la fuente explícita y también se valida.
- Cero productos activos es un catálogo vacío válido, incluso con solo encabezados.
- CSV sin encabezados obligatorios, columnas duplicadas, filas mal formadas, IDs ambiguos o precios inválidos bloquea la carga completa con un error visible. No se ocultan silenciosamente filas activas inválidas.
- Las consultas tienen un límite de 12 segundos y un botón para reintentar.
- Un fallo de carga conserva el carrito guardado, pero bloquea la preparación de WhatsApp.

## Precios

`precio` es obligatorio. Se aceptan cero y números positivos con hasta dos decimales. Los formatos documentados son `890`, `890.50`, `890,50`, `1.890` y `1.890,50`. En el formato con agrupación, el punto separa miles y la coma decimales. `1,890` se rechaza: no se intenta adivinar otra convención. No se quitan símbolos de moneda ni signos para transformar errores en números.

`precio_anterior` puede estar vacío; si se completa, debe ser válido. El precio local numérico también se comprueba.

## Identidad y migración

Cada producto nuevo necesita un ID explícito (`id`; se admiten también `producto_id` o `sku` como nombre alternativo de columna). Debe ser único, de hasta 80 caracteres, comenzar con letra o número y usar letras ASCII, números, guion, guion bajo, punto o dos puntos. No se genera desde nombres ni filas.

La planilla real actual de ropa no fue editada. Para mantenerla funcionando, `data-source.js` resuelve únicamente sus cinco nombres conocidos a IDs preasignados:

| Producto actual | ID permanente | ID antiguo reconocido en el carrito |
| --- | --- | --- |
| Remera oversize | `ropa-001` | `remera-oversize-1` |
| Jean recto azul | `ropa-002` | `jean-recto-azul-2` |
| Campera urbana beige | `ropa-003` | `campera-urbana-beige-3` |
| Gorra clásica | `ropa-004` | `gorra-clasica-4` |
| Pack básico urbano | `ropa-005` | `pack-basico-urbano-5` |

Esta equivalencia permite reordenar filas sin perder identidad. Es un puente de migración, no un mecanismo de identidad para productos nuevos: antes de renombrar o agregar productos, el dueño debe añadir la columna `id` con los valores correspondientes. **Esa operación queda pendiente y no se ejecutó sobre la planilla real.** Un nombre desconocido sin ID produce un error claro en lugar de crear otro producto silenciosamente.

Los IDs antiguos listados se migran cuando se valida el carrito contra el catálogo. No se usan coincidencias aproximadas ni sufijos variables: un artículo que no se reconoce se elimina con aviso. Los IDs de los productos locales siguen siendo sus valores explícitos existentes. Cambiar la URL/origen/dominio de una tienda no traslada automáticamente el `localStorage` de los visitantes.

## Carrito y WhatsApp

- Se valida que el almacenamiento sea una lista de artículos con identidad, cantidad entera positiva, precio numérico no negativo y opciones con estructura correcta.
- Se recuperan los artículos válidos y se informa si hubo datos descartados; el nombre, precio e imagen se reconstruyen desde el catálogo vigente.
- Se quitan productos inexistentes y combinaciones que ya no están disponibles; las vistas de galería no se incluyen como opciones de compra en ropa.
- Las combinaciones iguales se agrupan con una clave canónica basada en ID y opciones, no en etiquetas visuales.
- Antes de preparar WhatsApp se vuelve a consultar y validar la fuente. Si se actualizaron precios/datos o se quitaron artículos, se detiene la apertura y se pide revisar el pedido. Reintentar al mismo tiempo no consume ese aviso.
- Si el navegador bloquea la ventana tras la consulta, aparece un enlace para abrir el mensaje preparado. Se limita al mismo mensaje comprobado.

La comprobación usa lo que devuelve la fuente disponible en ese momento. No es una reserva de stock ni una confirmación de venta. La publicación CSV puede demorar en reflejar cambios de Sheets; no se promete sincronización instantánea. El comercio sigue confirmando disponibilidad y precio final por WhatsApp.

## Eventos seguros

Los botones usan atributos de datos escapados y un único listener delegado. Categorías, variantes e imágenes no se interpolan dentro de instrucciones JavaScript. También se retiraron los manejadores inline estáticos; se mantiene su comportamiento.

## Ejecución y exportación

Durante desarrollo, servir la raíz de `pedido-listo` y abrir `/demos/ropa/` o la demo correspondiente, para incluir `shared/`.

Para obtener una carpeta independiente con todas las dependencias:

```bash
node tools/export-catalog.cjs demos/ropa ../outputs/ropa-fase-1
```

No se debe copiar solamente la demo. La herramienta incluye `shared/catalog-core.js`, ajusta la ruta en el HTML exportado y rechaza destinos existentes. No hace despliegues. Las copias generadas del motor son artefactos de exportación; el código fuente de validación tiene una sola ubicación.

## Verificación

```bash
node --test tests/*.test.cjs
node tests/browser-smoke.cjs
```

Las pruebas de Node reproducen datos inválidos, errores de conexión, migración y el solapamiento entre reintento y pedido. Las pruebas de navegador usan datos simulados, verifican las tres páginas y la exportación independiente, interceptan WhatsApp y no usan perfiles personales. La opción `--live` añade únicamente una lectura del catálogo real.

Resultado comprobado el 14/10/2026: 46 pruebas Node aprobadas; tres demos y exportación independiente aprobadas en Chromium; lectura real de Sheets con cinco productos y los IDs `ropa-001` a `ropa-005`. Sin errores de sintaxis ni de formato de diff. Una revisión independiente confirmó las correcciones de entrega del motor compartido y concurrencia. Los CSS y las fotos/productos de ejemplo no se modificaron.

Los estilos acumulados, diferencias de funcionalidades entre las demos y administración de fotos quedan fuera de esta fase. No se reemplazó el motor visual ni se editó la planilla real.
