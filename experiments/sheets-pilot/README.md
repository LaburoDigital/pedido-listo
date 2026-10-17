# Pedido Listo — piloto descartable Sheets / Apps Script / ImageKit

**Estado: proyecto cargado en Apps Script, autorización pendiente. NO aprobado contra los servicios reales.**
El 17/10/2026 se verificó el código cargado en «Pedido Listo — Piloto» de la cuenta nueva y se llegó a «Se requiere autorización». No se concedió OAuth, no se desplegó la aplicación, no se subieron fotografías y no se publicó ningún catálogo remoto. Proyecto: https://script.google.com/u/1/home/projects/1leU_O0OQO6eMmnOjW6EH2dhAGM4M2eQG0SpBqXyOHRNTOmckG9TqcMwb/edit

Se corrigió el nombre de la función de preparación a `setupPilot` para que aparezca en el selector del editor. Se repitieron las pruebas locales: 16/16, incluyendo rechazo de identidades ajenas y de reemplazo de una instalación existente. Estas pruebas usan dobles y no acreditan autenticación real.

## Alcance

Un dueño Google, un comercio ficticio, diez productos como máximo, grupos Color y Talle con hasta ocho opciones cada uno, una fotografía por color. JPG/PNG hasta 2 MB. Los límites son decisiones del piloto, no límites generales del motor ni de Google.

El código original de las cuatro tiendas, el motor y `admin-foundation/` se leen y reutilizan; no se modifican. No se instala ninguna dependencia. No se prueba ni modifica Airtable.

## Archivos

- `domain.js`: usa el modelo del panel anterior y su adaptador comercial. Mantiene IDs y revisiones; las fotografías se relacionan por producto y nombre de color. Bloquea cambios de colores con fotos en este piloto.
- `provider.js`: lee una instantánea JSON en una celda de CSV publicado; conserva opciones con punto y coma. Implementa el contrato del motor compartido.
- `apps-script/Server.gs`: acceso cerrado, guardado bajo ScriptLock, publicación y carga a ImageKit desde el servidor. No hay credenciales incluidas.
- `apps-script/Index.html` y `panel.js`: formulario responsive mínimo. Usa Google Auth de la instalación, no simula un inicio de sesión local.
- `apps-script/appsscript.json`: permisos y despliegue privado previstos.
- `build.cjs`: empaqueta las dependencias existentes para Apps Script y deriva una tienda aislada del constructor actual. Cambia solo la copia generada. WhatsApp deshabilitado.
- `serve.cjs`: vista previa en `127.0.0.1:4186`; `/panel` muestra la interfaz, `/` la tienda. No implementa una base local sustituta de Google.
- `tests/`: pruebas locales. Las de servidor tienen dobles explícitos de los servicios Google y NO prueban su autenticación ni sus bloqueos reales.

Los directorios generados `build/` y `evidence/`, `.env` y `*.local.json` están excluidos de Git. No guardar claves tampoco en los archivos fuente.

## Ejecución sin instalaciones

Desde la raíz de Pedido Listo:

```text
node --test experiments/sheets-pilot/tests/*.test.cjs
node experiments/sheets-pilot/build.cjs
node experiments/sheets-pilot/serve.cjs
```

Cada compilación crea una carpeta nueva e imprime su ruta. Usar el paquete más reciente; los primeros paquetes de investigación pueden contener errores ya corregidos. Nunca distribuir una carpeta generada como release comercial: el manifiesto original del constructor no describe las modificaciones del experimento.

## Accesos pendientes: revisar antes de autorizar

1. ImageKit Free: el usuario crea/inicia sesión personalmente y acepta sus condiciones. Sin tarjeta ni plan pago. Usar una cuenta de prueba vacía; no publicar fotografías personales.
2. Google: crear un proyecto Apps Script exclusivo del piloto y cargar `Code.gs`, `Index.html`, `appsscript.json` del paquete generado. No hace falta instalar CLI ni conectar Drive para este procedimiento manual.
3. Antes de ejecutar, revisar los tres permisos declarados: acceso a Sheets, conexión con servicios externos y correo de la identidad Google. **El permiso `spreadsheets` comprende las planillas de la cuenta, aunque este código únicamente usa los dos IDs del piloto.** Es preferible una cuenta Google de prueba sin documentos reales. El permiso no se puede describir como limitado por OAuth a dos archivos.
4. El usuario debe aprobar OAuth personalmente después de esa revisión. No pedir contraseñas ni códigos por chat. Los avisos de app no verificada son parte de la fricción a evaluar, no instrucciones para ignorar advertencias indiscriminadamente.
5. Ejecutar `setupPilot` desde el editor una sola vez: crea dos planillas privadas ficticias y registra su propietario e IDs. Rechaza reemplazar una instalación existente. Si hubo una creación parcial, detenerse e inspeccionar los archivos antes de tocar propiedades.
6. En las propiedades privadas del script, el usuario configura `IMAGEKIT_PRIVATE_KEY` y `IMAGEKIT_URL_ENDPOINT`. No pegar la clave en el chat, HTML, planilla ni repositorio. Los editores del script pueden acceder a esta configuración; limitar sus accesos.
7. Desplegar una aplicación web **solo para el propietario** (`MYSELF`), ejecutada como propietario. Verificar esa selección en la pantalla real. Las funciones además requieren que la identidad activa y efectiva coincidan con el propietario; una identidad vacía deniega acceso.
8. Tras aprobar la exposición de los datos ficticios, publicar exclusivamente la planilla titulada `Pedido Listo — Piloto — Catálogo público` como CSV. Nunca publicar la planilla Privado ni abrir al público el panel administrativo.
9. Guardar el enlace CSV en `PUBLIC_CSV_URL` (propiedad del script) y en `site/pilot-config.js` del paquete generado. Esta URL es pública; no contiene credenciales. La tienda puede probarse en localhost sin desplegar un sitio.

La cuenta Google ajena debe pertenecer al usuario o a un participante que consienta la prueba. No compartir la cuenta dueña como mecanismo para probar aislamiento. No crear cuentas automáticamente ni invitar personas sin autorización.

## Matriz de aceptación REAL, todavía pendiente

| Criterio | Procedimiento | Evidencia requerida | Estado |
|---|---|---|---|
| Dueño | Abrir URL `/exec` con cuenta propietaria; listar y crear | Captura, identidad esperada sin tokens, lectura persistida en Sheets | Pendiente |
| Otra cuenta | Abrir misma URL con segunda cuenta y sin sesión | Acceso denegado por Google; ningún cambio en planilla | Pendiente |
| Foto | Crear producto; subir dos JPG ficticios diferentes para Rojo; vino y Azul | Respuesta real ImageKit, asociación persistida, imágenes que cargan | Pendiente |
| Edición | Cambiar nombre/precio sin cambiar ID ni enlaces de colores | ID estable y nuevo precio en lectura posterior | Pendiente |
| Concurrencia | Dos pestañas leen revisión N; A guarda; B intenta guardar su versión anterior | B recibe CONFLICT, mantiene formulario, Sheets contiene A | Pendiente |
| Publicación | Publicar producto con colores y talles; comprobar CSV y abrir tienda | Misma versión, precio, ID y opciones; selección de color muestra foto correcta | Pendiente |
| Fallo | Interrumpir carga o publicación y reabrir | No anunciar éxito, conservar datos confirmados, revisar archivos huérfanos | Pendiente |
| Teléfonos físicos | Android e iPhone con archivo/cámara y red móvil | Acceso, subida y guardado reales, tiempos registrados | Pendiente |

No usar la vista previa sin Google como evidencia de estas filas. La revisión de dos pestañas con servicios sustitutos es una prueba unitaria, no concurrencia real de Google.

## Resultados locales de esta preparación

- 15/15 pruebas propias: IDs, precios, revisiones, asociaciones por color, variantes con `;`, catálogo vacío, errores, límites y ejecución del paquete generado.
- 73/73 pruebas generales de la raíz y 42/42 pruebas locales de `admin-foundation` aprobadas. Inicialmente dos pruebas se bloquearon por permisos del entorno (repositorio temporal y localhost); al repetirlas con esos permisos, ambas suites pasaron. No se ejecutó Auth/RLS/SQL contra Supabase porque no se modificó esa instalación.
- Navegador real, datos sin guardar: formulario a 390 y 1440 px sin desbordamiento horizontal; precio negativo rechazado y formulario conservado.
- Tienda generada usa el motor existente y muestra error al faltar CSV, sin productos de ejemplo.
- No son pruebas en teléfonos físicos ni pruebas de autenticación Google.

## Riesgos y límites antes de una entrega comercial

- Auth real, latencia, CORS del CSV publicado, permisos y caducidad de autorizaciones siguen pendientes.
- No hay conversión HEIC ni reducción de imágenes grandes. Es una limitación importante para uso desde cámara móvil.
- No hay galería de varias vistas por color en esta interfaz mínima; el motor y el adaptador original mantienen esa capacidad. No se ha eliminado de las tiendas.
- No hay limpieza automática de imágenes reemplazadas/huérfanas. Una carga exitosa seguida de un conflicto deja un archivo sin asociar; se informa al usuario y no se borra nada automáticamente.
- Una respuesta perdida al crear un producto exige comprobar el listado antes de repetir. No hay todavía idempotencia durable para repetir altas a ciegas.
- El bloqueo solo coordina escritores de este proyecto Apps Script. Editar las planillas a mano u operar desde otro script lo salta.
- Una celda contiene el estado privado y otra la publicación, con máximo preventivo de 45.000 caracteres. Es una simplificación para responder la pregunta del piloto, no diseño final para catálogos grandes.
- Los datos publicados son públicos. Solo se exportan productos comerciales, sin email del dueño, claves, revisiones privadas ni IDs de archivos del proveedor.
- Cada instalación necesita autorización y configuración propias. No hay actualizador multi-cliente ni mantenimiento automático.
- Free no garantiza disponibilidad permanente; las cuotas y condiciones deben explicarse al cliente.

**Recomendación provisional:** continuar únicamente con las pruebas reales después de preparar los accesos. No aprobar esta arquitectura comercialmente ni ampliar el panel basándose solo en estos tests locales.
