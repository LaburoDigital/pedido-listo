# PROJECT_STATUS — Pedido Listo

Última actualización: 21/11/2026 (Claude). Documento vivo y fuente única de estado: reemplaza al documento del Proyecto de claude.ai, que ya no se usa. Cada dato indica si fue **medido** en servicios reales, **local** (pruebas automatizadas) o **pendiente**.

## Objetivo y roles
- Tiendas web independientes para comercios chicos: catálogo + pedidos por WhatsApp, pago único (US$100–200, hipótesis sin aprobar), administradas por el dueño desde el celular, costos recurrentes mínimos y cuentas a nombre del cliente.
- Claude programa, prueba e implementa. ChatGPT revisa y decide producto, arquitectura, seguridad y costos. Juan aprueba.
- Prioridad acordada (10/11): 1) acceso habitual en el celular con la cuenta personal también iniciada; 2) segunda instalación independiente + aislamiento real; 3) selector de fotos, Android, HEIC. Sin ampliar funciones mientras tanto.

## Restricciones vigentes
- Sin merge sin revisión. No desplegar ni modificar las cuatro tiendas existentes. Sin servicios pagos. Sin publicar tiendas reales.
- No abrir el panel a ANYONE ni implementar autenticación propia sin decisión explícita.
- Conservar Supabase (`admin-foundation/`), respaldos e imágenes de ImageKit (no borrar huérfanas).
- Prohibido: `git reset --hard`, `git clean`, force push, rebase destructivo, `git add .` indiscriminado, subir secretos.
- Autorización permanente de Juan (09/11): commit/push de correcciones revisadas, actualización de PRs y despliegue del piloto aislado.

## Repositorio (GitHub LaburoDigital/pedido-listo, público)
- **PR #1** `piloto/fotos-celular` → `respaldo/2026-10-17-trabajo-local`: abierto, sin merge. Commits: a4cda99 (fotos del celular procesadas en el navegador), 2c0b863 (canvas liberado ante errores; tope 60 MP por cabecera), 9144205 (INSTALACION.md), 1b49e68 (mensajes de publicación sin garantizar plazo), 961ca80 (evidencias), y este documento.
- **PR #2** `fix/enter-pedido` → `respaldo/2026-10-17-trabajo-local`: abierto, sin merge, sin despliegue en tiendas. Enter en un input de una línea usa el mismo camino que el botón de WhatsApp; `submit` de respaldo sin navegar; textarea conserva el salto de línea. Comportamiento aceptado por ChatGPT; falta revisar el diff. Local: motor 73/73, navegador 4/4 + 4 raíces, paridad 12/12, responsive 32/32.
- Otras ramas sin cambios desde octubre: main, dev, fase-1-estabilizacion, fase-2-arquitectura, fase-3-administracion, fase-3-supabase-datos-auth, preparacion-primera-entrega, respaldo/2026-10-17-trabajo-local.
- GitHub Pages activo desde `main` (demo de pastelería). No cambiar la visibilidad del repo sin decidir antes dónde vive la demo.

## Carpetas (verificado 21/11)
- Copia de trabajo oficial: `C:\Users\JJ\dev\pedido-listo`. **Atrasada respecto de GitHub**: en la rama fase-3-supabase-datos-auth; `piloto/fotos-celular` local = a4cda99; no tiene `fix/enter-pedido`. Nada perdido: falta traer los cambios (sin borrar nada).
- Original en OneDrive intacta. Respaldo: `C:\Users\JJ\Documents\pedido-listo-respaldos\2026-10-17`.

## Piloto Google Apps Script + Sheets + ImageKit (datos ficticios)
- Despliegue: versión 3 (10/11, commit 1b49e68), Ejecutar como dueño, Acceso "Solo yo". Versiones 1 y 2 disponibles para revertir. Hashes verificados en el editor.
- Credenciales: `IMAGEKIT_PRIVATE_KEY` e `IMAGEKIT_URL_ENDPOINT` en propiedades del script (no en el código). `PUBLIC_CSV_URL` es pública.
- Estado de datos: producto "Remera piloto", precio 892, catalog-9 publicado. 2 imágenes huérfanas en ImageKit.

## Resultados medidos (servicios reales)
- 09/11 iPhone (pestaña privada, solo la cuenta del piloto): foto vertical 1200×1600 JPEG 166 KB y horizontal 1600×1200 204 KB, sin rotación, asociadas al color; subida 2,9 s y 3,2 s. Concurrencia: CONFLICT correcto.
- 10/11 tienda (CSV e ImageKit reales, WhatsApp interceptado): foto por color, variantes, carrito persistente, reconciliación de precio con bloqueo del primer envío, enlace wa.me correcto.
- 10/11 propagación del CSV (una medición): primera lectura nueva a 3,7 s; versiones alternadas hasta 287 s (21/78 viejas); 0/53 viejas entre 291 y 483 s; `Cache-Control: private, max-age=300`. Detalle: `experiments/sheets-pilot/evidencias/`.
- Varias cuentas Google: el panel falla si la cuenta del piloto no es la única/predeterminada (escritorio e iPhone). El atajo `/a/~/macros/s/…/exec` también falla.

## Pendiente
1. Acceso habitual en el celular — **pendiente (Juan)**: iPhone con ícono "Agregar a inicio" y solo la cuenta del piloto; Android con navegador aparte. Registrar si abre, si pide sesión al reabrir, convivencia con la cuenta personal y si al día siguiente sigue entrando. La sesión separada del ícono es una hipótesis.
2. Segunda instalación independiente — **pendiente (Juan crea cuenta Google + ImageKit Free)**. Procedimiento: `experiments/sheets-pilot/INSTALACION.md`. Ningún tiempo de instalación medido. Aislamiento NO probado.
3. Selector de fotos (paso 4, sin reproducir; falta captura), HEIC directo, Android. Zoom no reproducido: no marcado como corregido.
4. Poner al día la copia local `C:\Users\JJ\dev\pedido-listo` con GitHub.

## Historial breve
- 17/10: respaldo de todo el trabajo local en GitHub (8 ramas + admin-foundation + piloto); auditoría de solo lectura (motor 73/73, admin 42/42).
- 09/11: fotos desde el celular (PR #1), piloto v2 y pruebas reales.
- 10/11: recorrido de tienda, defecto de Enter (PR #2), medición de propagación, piloto v3.
- 21/11: el estado pasa del Proyecto de claude.ai a este archivo.
