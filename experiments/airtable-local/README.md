# Integración local con formato Airtable — experimento descartable

Esta carpeta no forma parte de ninguna publicación. No necesita cuenta ni red externa.
No modifica engine/, stores/, presentation/ ni releases/. No es un administrador ni
un conector productivo de Airtable. Los respaldos anteriores se conservan.

## Ejecutar

Con Node 22+:

```powershell
node --test experiments/airtable-local/adapter.test.cjs
node experiments/airtable-local/browser.cjs
```

La segunda prueba requiere Playwright disponible mediante NODE_PATH y Chrome
instalado (o PLAYWRIGHT_CHROMIUM_EXECUTABLE). Crea una tienda en una carpeta temporal,
arranca un servidor exclusivamente en 127.0.0.1, prueba escritorio y teléfono emulado
y cierra servidor/navegador. Intercepta WhatsApp y bloquea solicitudes externas.
El número de prueba solo existe en esa copia y no se envían mensajes.

## Qué hace

- sync.cjs recibe funciones de lectura inyectadas, con respuestas records/fields,
  arrays de selección múltiple, casillas y adjuntos id/url como los de Airtable.
- Reutiliza validateProducts del motor. Convierte nombre, descripción, categoría,
  precio, talles, colores y fotos. Activo omitido significa borrador, como una
  casilla sin marcar. No reutiliza IDs basados en nombres o filas.
- La identidad es comercio:registro. Esto es solo para productos ficticios nuevos;
  una futura migración de productos existentes requiere preservar sus IDs mediante
  equivalencias, como se documentó en las fases anteriores.
- Lee páginas completas antes de reemplazar catalog.json. Si hay un error conserva
  el archivo anterior y responde con error a la tienda: bloquea pedidos hasta que
  una nueva sincronización termine bien. Una lista vacía válida sí vacía el catálogo.
- Copia fotos a photos/ con nombre derivado de su contenido y comercio. Reutiliza
  adjuntos conocidos sin volver al enlace temporal; un ID de adjunto nuevo genera
  una versión nueva. La copia anterior no se borra.
- La copia generada conecta un proveedor JSON al contrato Catalog.createCatalog,
  reemplazando solo su configuración generada. Los archivos originales del motor
  se usan sin modificaciones.

## Resultado del 14/10/2026

80 pruebas aprobadas: 73 existentes y 7 nuevas. Las nuevas cubren validación,
identidad al renombrar, URL temporal vencida simulada, cambios de precio/opciones,
disponibilidad, catálogo vacío, fallo de sincronización, paginación, duplicados,
datos inválidos, archivos que no son imágenes y versiones de fotos.

Dos recorridos de navegador aprobados a 1366px y 375px: foto local cargada,
revisión del precio cambiado antes de WhatsApp, mensaje interceptado, bloqueo con
error, recuperación, variante eliminada retirada del carrito, descripción/nombre
actualizados, desactivación, reactivación y catálogo vacío.

Las huellas de las cuatro publicaciones dist coinciden con sus manifiestos previos.
No se hicieron despliegues ni cambios de datos externos.

## Qué sigue siendo simulación

Las respuestas y fotos son ficticias; no se usó la API ni autenticación de Airtable.
El vencimiento se simula haciendo fallar el transporte de origen; no se esperó una
caducidad real. Las fotografías son PNG mínimos: se comprueba firma/tamaño y carga
en navegador, no una validación exhaustiva de archivos ni formatos de teléfonos.
La prueba de reemplazo usa bytes distintos controlados; no representa una carga
desde la cámara. El navegador de 375px no prueba la aplicación móvil de Airtable.

El almacenamiento es disco local, no un servicio disponible en Internet. La caché
de IDs de adjuntos vive en memoria; tras reiniciar se requiere resincronizar desde
el origen, aunque los archivos anteriores quedan en disco. No hay limpieza de fotos
viejas, cuotas de disco ni sincronización programada. No se midieron costos reales.

Cada consulta local provoca sincronización para que la prueba de pedidos vea los
cambios de inmediato. NO trasladar esa estrategia a producción: consumiría llamadas
por comprador. Tampoco se ha implementado transporte HTTP real, control de destinos
y redirecciones de adjuntos, timeouts, reintentos o tratamiento de errores 429.
El diseño definitivo de actualización, antigüedad máxima y bloqueo debe elegirse
después de medir frecuencia de cambios y límites reales del servicio.

## Al conectar la cuenta real

1. Comprobar lectura y permisos limitados a la base ficticia, sin tocar otras bases.
2. Configurar campos y cargar fotos desde computadora, Android e iPhone. Medir si
   un comerciante logra las tareas sin manejar IDs, URLs ni código.
3. Contrastar tipos, paginación y omisión de casillas con respuestas reales, incluidos
   cambios o eliminación de campos y restricciones del plan Free.
4. Probar fotos reales, rotación, formatos/tamaños, reemplazos, expiración de origen
   y recuperación después de reiniciar el sincronizador.
5. Elegir alojamiento gratuito para la prueba conectada, con cuenta autorizada,
   comprobar aislamiento de comercios y evitar claves privadas en la tienda pública.
6. Medir retrasos, cuota API, pérdida de conexión, revocación y errores 429. Definir
   cómo ve el dueño los errores y la última actualización efectiva de la tienda.

Conclusión: el formato puede integrarse al motor sin reescribirlo. El experimento
no demuestra todavía que Airtable sea cómodo para el comerciante ni económico y
mantenible para muchas tiendas. La comparación preliminar está en docs/POC-AIRTABLE.md.
