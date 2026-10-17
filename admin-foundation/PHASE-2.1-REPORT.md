# Fase 2.1 — estabilización local del panel

Fecha: 15/10/2026. Resultado: criterios de la fase 2.1 verificados en el entorno local.
No se instalaron herramientas, hicieron commits, pushes ni despliegues. No se modificaron
las cuatro tiendas, el motor, publicaciones, respaldos ni Airtable.

## Cambios de comportamiento

- Sesión persistente mediante Supabase Auth: localStorage conserva solamente tokens,
  vencimiento e identidad mínima. Al recargar se verifica el usuario con Auth antes de cargar
  comercios o productos. No se guardan contraseñas ni catálogos.
- Renovación bajo Web Locks compartido entre pestañas del mismo origen; respuestas anteriores
  a un cambio de sesión se descartan. Salir elimina inmediatamente sesión y datos del formulario,
  propaga el cierre a las otras pestañas y solicita revocación de la sesión actual en Auth.
- Fallos de conexión o errores temporales 429/5xx al renovar no borran sesión ni edición.
  Tokens rechazados sí exigen volver a ingresar. Un error de escritura incierto nunca se reintenta
  automáticamente.
- `products.revision` es un UUID controlado por PostgreSQL. Toda edición autenticada debe enviar
  su valor exacto mediante `If-Match`. Un trigger comprueba la revisión dentro del bloqueo de la
  fila: falta de versión devuelve HTTP 428; versión obsoleta devuelve HTTP 409.
- Toda edición exitosa cambia la revisión, incluidas las operaciones administrativas. Los permisos
  de columnas impiden que el usuario elija o cambie revisión, ID permanente o comercio.
- El conflicto conserva los campos editados y deshabilita Guardar. Recargar datos actuales requiere
  confirmación para reemplazar cambios locales; cancelar o una falla de lectura los conserva.

## Migración y compatibilidad

Se aplicó únicamente en Supabase local `20261015180445_product_revision.sql`. La columna nueva
asigna revisión a filas existentes sin cambiar sus IDs, comercio, datos comerciales, variantes
ni referencias de fotografías. No requiere migrar los datos de las tiendas.

Un editor antiguo que no envíe `If-Match` ya no puede actualizar productos: debe recargar la versión
nueva del panel. El adaptador sigue entregando el mismo contrato comercial al motor, sin exponer
la revisión interna. RLS y los permisos de pertenencia no se ampliaron. No hay RPC privilegiada
ni función SECURITY DEFINER nueva.

## Evidencia ejecutada

| Suite | Resultado | Cobertura principal |
| --- | --- | --- |
| General, compatibilidad y pruebas locales de Airtable existentes | 122/122 | Cuatro catálogos, motor, precios, variantes, identidad, galerías, validaciones, servidor, sesiones y errores |
| HTTP real local | 9/9 | Login de dos usuarios, refresh, rechazo anónimo, aislamiento en ambas direcciones, inmutabilidad y carreras |
| PostgreSQL/pgTAP | 47/47 | RLS, permisos, constraints, identidad y versión obligatoria/obsoleta |
| Navegador de fase 2 | 5 escenarios completos | Escritorio/móvil, alta, edición, filtros, estados, errores de red, opciones con `;`, asociaciones de fotografías |
| Navegador de estabilización | 3 escenarios completos | Dos recorridos 1440/390 px y respuesta tardía de otra cuenta; control adicional a 320 px |

La prueba HTTP de concurrencia abre dos sesiones reales del mismo comerciante y realiza cinco
pares de escrituras competidoras: siempre una respuesta 200 y una 409, con la fila final igual
a la escritura ganadora. También rechaza una actualización sin versión, cambios de identidad y
una versión invalidada por mantenimiento administrativo. El aislamiento entre comercios usa los
dos usuarios auténticos de prueba, no el token privilegiado.

En navegador se comprobó renovación real una sola vez entre dos pestañas, recarga sin login,
cierre coordinado, cambio a comercio B, conflicto con formulario intacto, cancelación, recarga
con confirmación, continuación del guardado y descarte de una respuesta tardía del comercio A.
Fallos de red, token inválido y respuesta temporal 503 se inyectan expresamente para verificar
esos errores; no sustituyen las pruebas reales de Auth/RLS. No hubo errores de JavaScript.

Comandos de reproducción, con el entorno privado local preparado según README:

```powershell
# Desde la raíz del repositorio:
node --test tests/*.test.cjs experiments/airtable-local/*.test.cjs admin-foundation/tests/*.test.cjs
# Desde admin-foundation, en serie:
npm run test:integration
.\node_modules\.bin\supabase.cmd test db
npm run test:panel
npm run test:stability
```

Logs finales, sin credenciales: `.local/phase21-general-final.log`, `phase21-auth-final.log`,
`phase21-sql-final.log`, `phase21-browser-final.log` y `phase21-stability-final.log`.
Capturas de escritorio, celular y conflicto en:
`C:/Users/JJ/Documents/Codex/2026-10-14/referenced-chatgpt-conversation-this-is-an/outputs/panel-fase-2-1/`.

## Errores encontrados y resueltos durante el ciclo

1. La prueba de recarga confundía el título de bienvenida con el catálogo y recargaba antes
   de completar el login. La espera ahora distingue la vista y verifica la identidad restaurada.
2. Auth devuelve 403 para ciertos tokens inválidos; ahora se descartan igual que un 401 al
   validar usuario, sin confundir ese rechazo con un permiso de edición.
3. El rechazo de un refresh durante restauración quedaba oculto como respuesta vieja; ahora
   muestra sesión vencida y elimina persistencia.
4. La revisión independiente detectó que un 429/503 de refresh borraba una edición. Se reprodujo
   con pruebas que fallaron, se corrigió su clasificación y se verificó conservación/reintento
   con pruebas unitarias y un 503 inyectado en navegador de escritorio y celular.

## Archivos de esta fase

Creados:

- `panel/session.js`
- `supabase/migrations/20261015180445_product_revision.sql`
- `supabase/tests/concurrency.test.sql`
- `tests/concurrency.integration.mjs`
- `tests/panel-session.test.cjs`
- `tests/panel-stability-browser.cjs`
- `PHASE-2.1-REPORT.md`

Modificados respecto al estado previo respaldado:

- `panel/client.js`, `panel/app.js`, `panel/index.html`: sesión, escrituras condicionales y conflicto.
- `scripts/serve-panel.cjs`: ruta autorizada del módulo de sesión.
- `scripts/local-api.mjs`: cabeceras de prueba para actualización condicional.
- `tests/panel-client.test.cjs`, `tests/panel-browser.cjs`, `tests/auth-isolation.integration.mjs`,
  `supabase/tests/isolation.test.sql`: regresiones y adaptación al contrato de versión.
- `package.json`: comandos de pruebas, sin dependencias nuevas.
- `README.md`, `panel/README.md`: procedimiento y límites actuales.

Se conserva `.local/phase2-before-21.json` con el estado anterior a esta fase, además de los
respaldos anteriores. CSS, modelo comercial, adaptador, fixtures, dependencias y su lockfile
no cambiaron en esta fase.

## Límites y estado final

- Verificación local en Chrome instalado. Celular emulado a 390 y 320 px; no se probó un teléfono
  físico ni se certificaron otros navegadores. Web Locks coordina las pestañas del mismo origen.
- localStorage contiene tokens de usuario accesibles al JavaScript del origen. La CSP y la
  ausencia de scripts externos reducen riesgo, pero no sustituyen prevención de XSS. No se
  introdujeron claves privadas ni un backend propio. Usar Salir en equipos compartidos.
- Supabase revoca la renovación al salir; un JWT de acceso ya emitido puede seguir siendo válido
  hasta su expiración. El panel lo elimina localmente y deja de usarlo. No se implementó revocación
  adicional por petición ni se afirma invalidación instantánea de un token copiado previamente.
- No hay combinación automática de ediciones ni borradores persistentes de formularios. Una
  recarga confirmada reemplaza los campos locales. Un cambio de cuenta vacía los datos anteriores.
- No hay publicación, carga de fotografías, pagos, stock, recuperación de contraseña ni servicios
  remotos nuevos. Guardar sigue siendo distinto de publicar.
- Git: rama `fase-3-supabase-datos-auth`, sin commits ni pushes. `admin-foundation/` continúa
  completamente sin seguimiento, como al inicio; no hay cambios tracked ni staged en el repositorio.
- Verificación SHA-256 de los 183 archivos protegidos: **0 cambios**, incluidos motor, tiendas,
  publicaciones y respaldo. Docker local sigue operativo; panel responde en `http://127.0.0.1:4175/`.
- Espacio libre final observado en C: **21,16 GiB**, por encima del mínimo de 10 GB.
