# Fase 2: motor compartido y publicaciones independientes

## Organización

- `engine/core.js`: validación de precios, IDs, carritos y utilidades de fase 1.
- `engine/catalog.js`: contrato independiente de la fuente.
- `engine/sources.js`: adaptadores de datos locales y CSV de Google Sheets.
- `engine/media.js`: galerías, colores, vistas, posiciones e imágenes de ropa.
- `engine/app.js`: controlador y presentación existentes, ahora únicos.
- `presentation/index.template.html`: un HTML compartido.
- `presentation/themes/{ropa,clasico}.css`: CSS original, sin refactorizar reglas.
- `stores/<id>/`: configuración, productos, compatibilidad, recursos y Netlify.
- `tools/`: generar, verificar y reconstruir una publicación de una tienda.
- `releases/<id>.json`: commit probado y huella de la publicación autorizada localmente.
- `dist/`: resultados generados, ignorados por Git.

Se conservaron scripts clásicos con APIs explícitas en los módulos puros. No hace
falta un empaquetador, framework, registro npm ni dependencia de producción.
La interfaz y el controlador siguen juntos para no reescribir funciones que
comparten estado. La validación, las imágenes y el acceso a datos están separados.

## Contrato de catálogo

Un proveedor implementa `load(): Promise<Product[]>`.
`Catalog.createCatalog(provider)` devuelve un catálogo con `load()` que valida
los datos antes de entregarlos al controlador. Un array vacío es un catálogo
válido. Un fallo de transporte o contenido lanza un error; no activa ejemplos.

Producto: `id` permanente, `name`, `price`, `optionGroups` (grupos con `id`,
`label`, `options`). Campos opcionales conservados: `category`, `description`,
`short`, `oldPrice`, `pricePrefix`, `image`, `gallery`, `images`, `mediaMode`,
`imageLabels`, `imagePosition`, `imageFit`, `featured`, `offer`, `badge`, `tags`,
`layout`, `order`, `available`. El motor comercial solo llama `CATALOG.load()`.
Los nombres de columnas CSV y la URL de Sheets pertenecen al adaptador.
Para una fuente futura se agrega un adaptador y su selección en el arranque;
no se cambia el carrito ni el flujo de WhatsApp.

## Configuración y nueva tienda

Copiar solo una carpeta de `stores/`, asignar otro `id`, `config.slug` y
`config.storageKey` (ejemplo `pedido:mi-comercio`). Editar marca, textos, colores,
contacto, campos de pedido y fuente. `presentation` selecciona tema, distribución
de tarjetas y estilos de imágenes. `behavior.openCartAfterAdd` conserva la
diferencia entre ropa y pastelería.

`products.json` se utiliza y publica únicamente en modo local. En modo sheet,
se publica la URL CSV, sin ejemplos de respaldo. `legacy-ids.json` conserva la
compatibilidad de productos y carritos anteriores. `assets/` admite imágenes y
fuentes; no se copian otros archivos, documentación ni tiendas a la publicación.
Todos los datos publicados son públicos; no guardar credenciales aquí.

Casa Verde es la cuarta tienda ficticia: usa el mismo motor y tema clásico,
datos locales y una ilustración propia. WhatsApp está deshabilitado en su
configuración para evitar pedidos accidentales. No contiene lógica específica.

## Carritos e IDs

Las tres tiendas originales conservan su `storageKey` anterior y el formato del
carrito. La identidad del comercio queda separada del texto de su nombre.
Pastelería y la antigua plantilla ya compartían clave: conservarla permite
migrar los carritos existentes. Publicarlas en dominios distintos las aísla;
una nueva tienda debe recibir una clave propia.

Los IDs locales se conservaron. Los cinco IDs `ropa-001` a `ropa-005` y sus alias
anteriores siguen en `stores/luna-urban/legacy-ids.json`. No se modificó Sheets.
La incorporación de la columna `id` en la planilla sigue pendiente de una tarea
autorizada; hasta entonces, no renombrar esos cinco productos. No derivar IDs del
nombre o de la posición. Al incorporar IDs explícitos, conservar los alias de
carritos antiguos durante la transición.

## Generar y probar localmente

Node 22 o superior y Git. Desde la raíz:

```powershell
node tools/build-store.cjs luna-urban
node tools/build-store.cjs pasteleria-demo
node tools/build-store.cjs catalogo-base
node tools/build-store.cjs casa-verde
```

Se crean `dist/<id>/`. Los destinos deben ser nuevos: no se sobrescriben carpetas.
Para iterar, indicar otro destino, por ejemplo `dist/prueba-2/luna-urban`.
Servir la carpeta generada con un servidor HTTP estático local. Nunca editar el
resultado generado: editar `stores/`, `engine/` o `presentation/` y regenerar.

La orden anterior `export-catalog.cjs demos/ropa DESTINO` sigue funcionando como
alias del generador. Las carpetas antiguas contienen solo una nota de migración.
El commit `4e1786d` y el respaldo externo conservan la fase 1 completa.

## Pruebas

```powershell
node --test tests/*.test.cjs
node tests/browser-shared.cjs
node tests/browser-parity.cjs
```

Las pruebas de navegador requieren Playwright disponible para Node y Chromium.
Si se usa una instalación externa, definir `NODE_PATH` para sus módulos y
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` para el ejecutable. No son dependencias de las
tiendas publicadas. Las pruebas interceptan Sheets e imágenes externas y los
pedidos: no consultan la planilla real ni envían mensajes.

`browser-parity` recupera `4e1786d` desde Git y compara las tres tiendas originales
en 1366×768 y 375×667, en catálogo, detalle y carrito. Espera las imágenes y
sincroniza el desplazamiento. Tolera como máximo 4/255 por canal de color para
composición de transparencias de Chromium. Capturas: `work/phase2-visual/`.
Es emulación de pantalla móvil en Chrome, no prueba de un teléfono físico/Safari.

## Actualizaciones controladas por comercio

1. Modificar y registrar el código en Git. La preparación exige un árbol limpio.
2. Ejecutar `node tools/prepare-release.cjs luna-urban` (o una lista explícita
   de tiendas). Ejecuta TODAS las pruebas unitarias y de navegador.
3. Solo si todo pasa y el código no cambió durante la verificación, escribe los
   manifiestos de las tiendas indicadas: commit completo, huella SHA-256 y pruebas.
4. Revisar y registrar esos manifiestos en Git. Preparar/verificar no publica.
5. `node tools/build-release.cjs luna-urban DESTINO_NUEVO` reconstruye desde el
   commit fijado y compara la huella. Un cambio pendiente o posterior del motor
   no se incorpora. Si falta la revisión o no coincide la huella, falla sin
   crear el destino final. No cambia otros manifiestos.

Los manifiestos son un control de operación en un repositorio de confianza, no
una firma criptográfica contra un administrador malicioso. No editarlos a mano.
El código del generador y sus archivos forman parte de la revisión fijada.
Conservar el historial Git: una clonación superficial que no contenga la revisión
requerida debe recuperar esa revisión; el comando falla cerrado si no existe.

Para volver a una versión anterior, restaurar el manifiesto previamente probado
de esa tienda y reconstruir. Esto no revierte el contenido externo de Sheets.

## Netlify (preparado, no conectado ni publicado)

Un sitio por tienda, todos pueden leer el mismo repositorio. Base: raíz;
Package directory: `stores/<id>`; configuración: su `netlify.toml`.
Build: `node tools/build-release.cjs <id>`; Publish: `dist/<id>`.
`ignore-build` omite cambios que no modifiquen `releases/<id>.json`. En una primera
construcción o ante duda, el generador sigue exigiendo un manifiesto válido.

No conectar una rama de trabajo a producción ni activar publicación automática
sin aprobación. El manifiesto de otra tienda no se cambia al actualizar una.
Una reconstrucción manual de otra tienda sigue usando su revisión fijada.
Solo se publica la carpeta generada, con motor, tema, configuración pública y
recursos de ese cliente; no necesita archivos externos del repositorio.

Los encabezados generados fuerzan revalidación de caché. Sin `siteUrl` no se genera
un sitemap con un dominio inventado y robots indica no indexar la demo. El dominio
real se configura al preparar la tienda para su publicación autorizada.

## Límites que permanecen

- No se incorporaron stock, pagos ni panel propio.
- Sheets es una fuente pública y puede demorar en reflejar cambios.
- Las fotos originales externas siguen dependiendo de sus proveedores.
- El diseño clásico conserva sus reglas responsive existentes; esta fase no
  rediseña sus tarjetas ni realiza una limpieza general de CSS. En particular,
  su grilla móvil conserva 12 columnas mientras las tarjetas usan `auto` o
  `span 2`, comprimiendo las tarjetas a 375px. Aparece también en la referencia
  de fase 1. Debe corregirse en una tarea visual acotada antes de vender ese tema.
- Ninguna tienda de demostración debe publicarse como comercio real sin revisar
  datos, teléfono, dominio, contenido y titularidad del alojamiento.
- No se verificó una publicación real de Netlify, por instrucción del usuario.
