# Migración de IDs — preparación del 14/10/2026

Estado: preparada y ensayada localmente; NO aplicada a Google Sheets.

## Respaldo disponible y límite

`work/first-delivery-sheet-backup/` conserva la respuesta CSV publicada original,
los alias anteriores, sus huellas, el plan y la verificación del ensayo.
Captura: 2026-10-14T18:12:36.561Z. CSV SHA-256:
`93c6c2e42a8a65a92be9cac5ecf0d26ec167719a5a5e984af8f52614a87d5178`.

Contiene 29 columnas, 6 productos, 5 activos. Es respaldo de valores de UNA
pestaña publicada: no incluye fórmulas, formato, otras hojas, permisos ni historial.
El enlace del documento original respondió HTTP 401. No se cambiaron permisos,
publicación ni contenido, ni se reconstruyeron fórmulas desde el CSV. Antes de
migrar falta obtener una copia completa desde una sesión autorizada o un archivo
Excel descargado por el dueño. Mantener además la copia nativa de Google para
preservar características que una exportación Excel pudiera no conservar.

## Equivalencias verificadas

| Producto en la captura | ID permanente | Compatibilidad de carrito |
|---|---|---|
| Remera oversize | ropa-001 | remera-oversize-1 |
| Jean recto azul | ropa-002 | jean-recto-azul-2 |
| Campera urbana beige | ropa-003 | campera-urbana-beige-3 |
| Gorra clásica | ropa-004 | gorra-clasica-4 |
| Pack básico urbano | ropa-005 | pack-basico-urbano-5 |
| Producto oculto ejemplo | ropa-006 (propuesto) | No tenía alias |

Los primeros cinco ya son las identidades utilizadas por el motor. El sexto
se asignó explícitamente en `docs/migration/luna-urban-new-ids.json`, incluyendo
el producto inactivo para que una futura activación no dependa de su posición.
Los nombres sirven solo para revisar esta transición; el ID nunca se recalcula
al renombrar o mover una fila. No reutilizar IDs de productos eliminados.

El ensayo en memoria agregó únicamente IDs a los valores publicados: verificó
6 equivalencias, catálogo activo idéntico y los 5 carritos antiguos conservados.
No produjo una planilla reconstruida ni escribió datos remotos.

## Procedimiento antes de aplicar (requiere autorización)

1. Obtener respaldo completo y comprobar que abre con todas las hojas, fórmulas
   y formatos. Registrar fecha y guardar la copia fuera del documento original.
2. Acordar una ventana breve sin edición del catálogo. Descargar un CSV nuevo
   en una carpeta nueva con el comando de respaldo de abajo. Revisar cualquier
   diferencia contra esta captura: nunca aplicar por números de fila antiguos.
3. Resolver manualmente nombres nuevos, duplicados o ambiguos. Conservar los
   cinco IDs establecidos. Aprobar expresamente la asignación del producto oculto.
4. Ensayar sobre una copia completa: agregar una columna llamada `id` y escribir
   valores literales en las seis filas correctas. No pegar el CSV sobre la hoja:
   borraría información que no está en ese archivo. No usar fórmulas basadas en
   nombre o fila. Mantener todas las demás celdas y estados sin cambios.
5. Comparar el CSV de la copia con el anterior usando `verify`. No continuar si
   faltan filas, cambian otras celdas, aparecen IDs repetidos o no coinciden.
6. Solo después de autorización, repetir el cambio mínimo en el original.
   No cambiar permisos ni configuración de publicación.
7. Esperar la propagación, descargar el CSV publicado posterior y ejecutar la
   misma verificación. Comprobar los cinco productos, precios, variantes y un
   carrito antiguo localmente, interceptando WhatsApp sin enviar pedidos.
8. Guardar ambas capturas, el respaldo completo y el resultado. Conservar
   `stores/luna-urban/legacy-ids.json`: los carritos antiguos siguen necesitándolo.

Si falla la verificación, detener la entrega. Comparar cambios concurrentes antes
de revertir solo las celdas `id` recién agregadas; no restaurar toda la planilla
sobre ediciones nuevas. Mantener el puente de alias permite volver temporalmente
al catálogo anterior, siempre que sus nombres conocidos se conserven.

## Herramienta local

Desde la raíz del repositorio, con Node 22 o superior:

```powershell
node tools/prepare-sheet-ids.cjs luna-urban work/respaldo-ids-NUEVO
node tools/prepare-sheet-ids.cjs plan work/respaldo-ids-NUEVO docs/migration/luna-urban-new-ids.json
node tools/prepare-sheet-ids.cjs verify ANTES.csv DESPUES.csv work/respaldo-ids-NUEVO/legacy-ids.json docs/migration/luna-urban-new-ids.json
```

El primer comando guarda el respaldo antes de intentar resolver identidades:
actualmente informa el producto oculto sin equivalencia y conserva los archivos.
El segundo completa el plan con su asignación explícita. Si el primer comando
ya creó un plan porque todos los IDs existen, no ejecutar el segundo sobre él.
Los comandos rechazan sobrescribir respaldos o planes. `verify` permite cambiar
el orden de filas pero rechaza modificaciones de los demás valores. La herramienta
solo hace GET al CSV público y escribe archivos locales; no puede editar Sheets.
También detiene el proceso ante filas vacías intermedias o columnas sin encabezado,
para no generar referencias engañosas ni omitir celdas al comparar. No borrar esas
celdas automáticamente: inspeccionar el libro completo y acordar cómo tratarlas.
Las asignaciones nuevas no pueden reutilizar IDs ni alias históricos, incluso
cuando el producto anterior ya no figura en la captura.

Para altas futuras falta definir un mecanismo cómodo de asignación única una
sola vez. No pedir al dueño que derive un ID del nombre ni del número de fila.
