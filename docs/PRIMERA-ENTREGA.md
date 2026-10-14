# Preparación de la primera entrega comercial

Fecha: 14/10/2026. Rama: `preparacion-primera-entrega`, basada en `fbb39c0`.

## Corrección móvil

La causa era una regla general tardía que restablecía doce columnas después de
la regla móvil de dos columnas. Las tarjetas ocupaban columnas diminutas.
La misma duplicación en la grilla de información provocaba desbordamiento a 320px.
Se consolidaron ambas definiciones en sus reglas originales y se quitaron las
redefiniciones tardías. No se agregaron parches al final del CSS ni se cambió el
tema de ropa. En 375px las tarjetas normales del clásico miden 167,5px y las
destacadas 351px. Se conserva la definición efectiva de escritorio.

Cambios: `presentation/themes/clasico.css`; nueva regresión
`tests/browser-responsive.cjs`; comparación histórica actualizada en
`tests/browser-parity.cjs`; ejecución incorporada a `package.json` y
`tools/prepare-release.cjs`. La comparación histórica sigue cubriendo escritorio
clásico y ropa en móvil/escritorio; el móvil clásico se valida contra la geometría
corregida, no contra las capturas que contenían el defecto.

## IDs y respaldo

Ver [procedimiento de migración](MIGRACION-IDS.md). Nuevos archivos:
`tools/prepare-sheet-ids.cjs`, `tests/id-migration.test.cjs` y
`docs/migration/luna-urban-new-ids.json`.
Respaldados los valores publicados de seis productos y verificadas las cinco
equivalencias existentes; se propone `ropa-006` para el producto oculto.
El respaldo completo permanece pendiente: el original requiere autenticación
(HTTP 401). No se modificó Google Sheets ni se reconstruyeron fórmulas.

## Diagnóstico de administración

Esta es una evaluación del código, del CSV y de la documentación de las
herramientas; todavía no es una prueba con un comerciante. No fue posible
inspeccionar las validaciones, fórmulas o protecciones de la planilla original.

| Tarea del dueño | Lo que funciona | Lo que falta para una entrega autónoma |
|---|---|---|
| Agregar productos | El motor lee nuevas filas válidas | IDs únicos sin intervención técnica y filas borrador seguras |
| Precios y descripciones | Se leen desde Sheets; precios inválidos se rechazan | Validación en la planilla y ejemplos claros antes de activar |
| Fotografías | Galería y URLs de imagen; comportamiento avanzado por color | Un flujo de subida y copia de URL probado con el dueño |
| Talles y colores | Dos grupos de opciones, separados por punto y coma o coma | Instrucciones y ejemplos; todas las combinaciones se consideran válidas |
| Activar/desactivar | `activo=SI/NO`; también existe `disponible` | Exponer un único control habitual, dejar disponible preconfigurado |
| Ver cambios publicados | Consulta al abrir, reintentar y antes de WhatsApp | Explicar el retraso y verificar la web: no hay confirmación de publicación ni actualización automática de páginas abiertas |

Hoy una fila activa mal cargada puede bloquear el catálogo completo con un error
claro. Esto protege precios, pero hace imprescindible prevenir errores en la
administración. Los campos activo/disponible vacíos se interpretan como verdaderos:
el dueño debe empezar una alta con `activo=NO`, completar y recién después activar.
No hay stock, precio por combinación ni control de disponibilidad por variante.

## Propuesta concreta, sin panel propio

Sheets es razonable para un catálogo pequeño con una plantilla guiada, pero la
planilla actual de 29 columnas todavía no resuelve cómodamente las seis tareas.

1. Preparar primero una copia de administración: mostrar nombre, categoría,
   precio, descripciones, foto principal, opciones y activo. Agrupar columnas
   avanzadas; conservar encabezados técnicos y documentarlos con notas. Congelar
   encabezados, validar SI/NO y precios no negativos, avisar de IDs duplicados y
   proteger IDs/encabezados contra cambios accidentales. No confundir ocultar
   columnas con privacidad: todo dato publicado debe ser apto para ser público.
2. Completar la migración y luego evaluar una ayuda mínima vinculada a Sheets
   para asignar IDs una sola vez. Debe manejar pegados múltiples y duplicaciones
   sin cambiar IDs existentes. Es trabajo futuro, no implementado. Las filas con
   IDs previamente asignados sirven para un piloto finito, no para autonomía
   ilimitada del dueño. No usar fórmulas de fila ni IDs que cambian con el nombre.
3. Para fotos, proponer una biblioteca propiedad del comercio: subir archivo,
   copiar URL HTTPS de entrega y pegarla en `imagen_1`. Cloudinary Image and Video
   APIs ofrece un plan gratuito sujeto a límites; probar su biblioteca con el
   dueño antes de adoptarlo y mantener la cuenta a su nombre. No se creó cuenta,
   integración ni dependencia. Usar una URL nueva o versionada al sustituir fotos.
4. Entregar una guía corta con ejemplos: precio numérico sin símbolo de moneda;
   Talle con `S;M;L`, Color con `Negro;Blanco`; borrador NO y publicación SI.
   Empezar con galería simple; configurar asociación de imágenes por color solo
   cuando el comercio la necesite. No requiere tocar el motor para editar productos.
5. Explicar el flujo: guardar en Sheets, esperar propagación y recargar la tienda
   para comprobar nombre/precio/foto. Google advierte que puede tardar unos minutos;
   no prometer publicación instantánea. Una pestaña ya abierta no recibe cambios
   en vivo. La validación previa a WhatsApp usa los últimos datos públicos
   disponibles, que pueden ir detrás de la edición original.

Insertar una imagen dentro de una celda no equivale a proporcionar su URL al
motor. Tampoco cualquier enlace compartido de Drive sirve como imagen directa.
Este paso es la principal fricción junto con los IDs y la ausencia de confirmación
de publicación. Si el dueño no puede completar el flujo de fotos, no venderlo
todavía como administración completamente autónoma.

Referencias consultadas: [publicación de Google Sheets](https://support.google.com/docs/answer/183965?hl=es),
[imágenes en celdas](https://support.google.com/docs/answer/9224754?co=GENIE.Platform%3DDesktop&hl=en),
[validación con desplegables](https://support.google.com/docs/answer/186103?hl=es),
[protección de rangos](https://support.google.com/docs/answer/1218656?co=GENIE.Platform%3DDesktop&hl=es_us),
[plan gratuito de Cloudinary](https://cloudinary.com/pricing) y
[biblioteca y URLs](https://cloudinary.com/documentation/media_library_for_developers).

## Prioridades antes de entregar

1. Conseguir respaldo completo y autorizar por separado la migración de IDs.
2. Preparar y probar la copia guiada con validaciones y un flujo seguro de altas.
3. Probar la carga de fotos con una cuenta del dueño y documentar límites/costos.
4. Realizar una prueba de las seis tareas con un comerciante sin asistencia,
   incluyendo el teléfono que utilizará. Registrar errores y tiempo; aún no realizada.
5. Solo tras esa validación, preparar una nueva publicación de cada tienda
   seleccionada y solicitar autorización para desplegar. No actualizar las demás.

Conservar el motor, los temas, los adaptadores de catálogo, la conciliación de
carritos y WhatsApp. No se justifica reconstruirlos ni crear un panel todavía.
Quedan fuera stock, pagos y pedidos persistentes.

## Verificación final

- 73/73 pruebas unitarias aprobadas, incluidas 7 de migración.
- Navegador: cuatro tiendas y cuatro publicaciones en raíces independientes,
  en escritorio y celular emulado, con Sheets e imágenes controlados y WhatsApp
  interceptado. No se enviaron pedidos reales.
- 12 comparaciones de capturas contra fase 1 aprobadas (tolerancia 4/255).
- 32 escenarios adaptables aprobados: cuatro tiendas en 320, 375, 390, 640,
  641, 768, 1366 y 1500px; sin desbordamiento, detalle y agregado al carrito.
- Inspección de captura de pastelería a 375px. Imágenes sustituidas en las pruebas:
  estas verificaciones no certifican disponibilidad de las fotografías externas.
- Huellas de las cuatro carpetas `dist/<tienda>` coinciden con sus manifiestos
  anteriores. No se regeneraron publicaciones ni se cambiaron `releases/`.
- Revisión independiente: corregidos con pruebas que primero fallaron tres
  casos del migrador (reutilización de IDs históricos, columnas sin nombre y
  filas vacías que desplazaban las referencias). Para los dos últimos casos se
  detiene el procedimiento y exige inspección; no se normalizan ni borran datos.

Las pruebas usan Chromium y tamaños de pantalla emulados; no equivalen a una
prueba en un teléfono físico ni a una validación de la planilla privada. Logs y
capturas permanecen en `work/first-delivery-*`. El respaldo previo del proyecto
se conserva. No hubo despliegues, cambios de permisos ni ediciones de Sheets.
