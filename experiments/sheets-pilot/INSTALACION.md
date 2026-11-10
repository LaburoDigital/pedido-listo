# Instalación independiente — procedimiento replicable (piloto)

Objetivo: instalar el piloto para un comercio ficticio nuevo, en cuentas que no son las del piloto actual, midiendo tiempo, pasos manuales y costos. Sirve también para probar el aislamiento entre dos instalaciones.

Reglas: el dueño crea sus cuentas e inicia sesión él mismo. Nunca se pasan contraseñas, códigos ni claves por chat. Sin servicios pagos. Sin datos ni fotos reales. No se tocan el piloto existente, Supabase ni las cuatro tiendas.

## Tiempos: medidos vs estimados
Los tiempos de la columna "Inicio/Fin" se completan solo con lo observado. Hasta hoy:

| Dato | Valor | Tipo |
|---|---|---|
| Subida de una foto desde iPhone (uploadPhotoData) | 2,9 s y 3,2 s | Medido 09/11 |
| Primera lectura del CSV con la versión nueva tras publicar | 3,7 s | Medido 10/11 (1 medición) |
| Ventana con lecturas viejas/nuevas alternadas | hasta ~287 s | Medido 10/11 (1 medición) |
| Pasos 1.x (crear cuentas) | sin dato | Estimación pendiente; no hay medición |
| Pasos 2.x (Apps Script, OAuth, despliegue, publicar hoja) | sin dato | La primera instalación del piloto no se cronometró |
| Instalación completa | sin dato | Umbral de decisión: ~2 h (reevaluar precio y alcance si se supera) |

No se usan estimaciones como resultado: cualquier número sin medición queda marcado "Estimación" en la tabla del paso.

## 0. Preparación (Claude, antes de la sesión)
- [ ] Paquete generado con `node experiments/sheets-pilot/build.cjs` desde el commit acordado; anotar commit y ruta.
- [ ] `Code.gs`, `Index.html` y `appsscript.json` listos para copiar y pegar.
- [ ] Cronómetro: anotar hora de inicio y fin de cada paso en la tabla de abajo.

## 1. Cuentas (dueño)
| # | Paso | Quién | Inicio | Fin | Notas / fricción |
|---|---|---|---|---|---|
| 1.1 | Crear cuenta Google nueva del comercio (ej. casaverde.prueba) | Dueño | | | ¿pidió teléfono? |
| 1.2 | Crear ImageKit Free con esa cuenta, sin tarjeta | Dueño | | | ¿pidió tarjeta o datos fiscales? |
| 1.3 | Anotar en un lugar privado el "URL endpoint" de ImageKit | Dueño | | | La clave privada NO se copia al chat |

## 2. Apps Script (dueño, guiado por Claude)
| # | Paso | Quién | Inicio | Fin | Notas |
|---|---|---|---|---|---|
| 2.1 | script.google.com → Nuevo proyecto → nombre "Pedido Listo — <comercio>" | Dueño | | | |
| 2.2 | Pegar `Code.gs`, `Index.html` y `appsscript.json` (ver manifiesto en configuración) | Dueño | | | |
| 2.3 | Ejecutar `setupPilot` → revisar permisos → aprobar OAuth | Dueño | | | Aviso "app no verificada": anotar texto exacto |
| 2.4 | Propiedades del script: `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` | Dueño | | | Claude no ve los valores |
| 2.5 | Implementar → Aplicación web → Ejecutar como: yo · Acceso: solo yo | Dueño | | | Verificar en pantalla |
| 2.6 | Publicar en la web SOLO la hoja "Catálogo público" como CSV | Dueño | | | Nunca la hoja Privado |
| 2.7 | Guardar el enlace CSV en `PUBLIC_CSV_URL` | Dueño | | | Es público, no es secreto |

## 3. Primer uso (dueño desde el celular)
| # | Paso | Inicio | Fin | Notas |
|---|---|---|---|---|
| 3.1 | Abrir el panel en el celular (método de acceso cotidiano elegido) | | | ¿pidió volver a iniciar sesión? |
| 3.2 | Crear 1 producto con Color (2) y Talle (2), precio ficticio | | | |
| 3.3 | Subir 1 foto por color | | | |
| 3.4 | Publicar y comprobar (esperar ~5 min antes de dar por visible a todos) | | | anotar versión y hora |
| 3.5 | Tienda (localhost o vista previa) con el CSV nuevo: fotos por color, variantes, carrito, enlace WhatsApp interceptado | | | sin enviar |

## 4. Aislamiento entre instalaciones (A = piloto actual, B = nueva)
No se marca como probado hasta completar las dos instalaciones y todas las filas.
| # | Comprobación | Resultado esperado | Resultado |
|---|---|---|---|
| 4.1 | Abrir el panel A con la cuenta B (solo B en el navegador) | Google deniega el acceso | |
| 4.2 | Abrir el panel B con la cuenta A | Google deniega el acceso | |
| 4.3 | Planillas Privado y Público de B: propietario y uso compartido | Solo la cuenta B; Público publicado, Privado no | |
| 4.4 | Fotos subidas desde B | Solo en el ImageKit de B (URL con el endpoint de B) | |
| 4.5 | CSV de A y de B tras publicar en B | A sin cambios (versión y precio) | |
| 4.6 | Tienda A con carrito guardado y tienda B en el mismo navegador | Carritos separados (storageKey distinto) | |
| 4.7 | Propiedades del script A vs B | Claves y endpoints distintos; ninguna compartida | |

## 5. Costos
| Concepto | Costo observado | Recurrente | A nombre de |
|---|---|---|---|
| Cuenta Google | | | Comercio |
| Apps Script / Sheets | | | Comercio |
| ImageKit Free (límites del plan) | | | Comercio |
| Hosting de la tienda (no incluido en esta prueba) | | | |

## 6. Cierre
- Tiempo total del dueño · tiempo total de Claude · pasos que el dueño no pudo hacer solo.
- Si supera ~2 h en total, reevaluar precio y alcance (decisión de ChatGPT/Juan).
