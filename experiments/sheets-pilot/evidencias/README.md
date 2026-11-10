# Evidencias del piloto (datos ficticios)

Cada línea indica si es **medido** (observado en servicios reales) o **local** (pruebas automatizadas sin servicios reales). Nada de esto contiene claves ni datos personales.

## 09/11/2026 — v2 en servicios reales (medido)
- Fotos desde iPhone (pestaña privada, solo la cuenta del piloto): vertical de cámara 1200×1600 JPEG 166 KB; horizontal de galería 1600×1200 JPEG 204 KB; sin rotación. uploadPhotoData: 2,9 s y 3,2 s.
- Concurrencia: pestaña con revisión vieja → CONFLICT; precio 891 y revisión 8 conservados.
- Varias cuentas: el panel falla en iPhone y escritorio cuando la cuenta del piloto no es la única/predeterminada.

## 10/11/2026 — recorrido de tienda (medido)
Código de 2c0b863, CSV publicado real, fotos de ImageKit reales, Chromium del panel de Claude. window.open interceptado: no se envió ningún pedido.
- Foto cambia por color; variantes Color/Talle; carrito persiste tras recargar.
- Carrito con $890 guardado → al enviar se actualizó a $891 y se bloqueó el primer envío; el segundo generó wa.me con producto, opciones, cantidad, precio y nombre.
- Defecto: con un solo campo de texto, Enter enviaba el formulario por GET (recarga y `?nombre=` en la URL). Corrección en PR #2.

## 10/11/2026 — propagación del CSV publicado (medido, una sola medición)
Archivo: `propagacion-2026-11-10.csv`. Publicación ficticia catalog-8 → catalog-9 (precio 891 → 892) a las 11:46:11 UTC. Lecturas cada ~3,7 s, alternando URL normal y URL con parámetro anti-caché.
- Primera lectura nueva: 3,7 s.
- Hasta 287,2 s: 21 de 78 lecturas devolvieron la versión anterior (con y sin parámetro anti-caché).
- 290,9 s a 483,3 s: 0 de 53 lecturas viejas.
- Cabecera observada: `Cache-Control: private, max-age=300`.
- Interpretación: hasta ~5 minutos de inconsistencia en esta medición. Una lectura correcta no prueba que todos los visitantes reciban la versión nueva. Una sola medición, sin otras redes ni regiones.

## 10/11/2026 — v3 del piloto (medido)
- Apps Script "Versión 3 del 10 nov 2026" (commit 1b49e68), misma URL, Ejecutar como: propietario, Acceso: solo yo. Versiones 1 y 2 disponibles para revertir.
- SHA-256 en el editor después de guardar: Code.gs `e8736828…` (igual que v2), Index.html `ec9eceab…` (= build de 1b49e68).
- "Comprobar publicación" en el panel real mostró: «Esta consulta ya recibió catalog-9. Otros visitantes pueden seguir viendo la versión anterior durante varios minutos.» El mensaje de "Publicar" no se ejecutó en v3 (sería una publicación más); es el mismo bloque de código, verificado por hash.

## Pruebas locales (no son servicios reales)
- Piloto 31/31, fotos en navegador real (Playwright) 7 archivos + flujo + fallo + HEIC + móvil.
- PR #2: motor 73/73, navegador 4/4 + 4 raíces, paridad 12/12, responsive 32/32.
