# Administración: preparación aislada de Supabase, fase 1

Estado al 15/10/2026: **Auth y RLS comprobados contra Supabase local**, con dos usuarios reales
de prueba: 8/8 pruebas HTTP y 39/39 SQL. CLI local fijada en 2.121.0; PostgreSQL 17.
Esta carpeta no se importa desde ninguna tienda ni altera su motor, CSS o publicación.
No incluye panel, carga de fotografías, Storage, publicación, stock, pagos ni pedidos persistentes.

## Alcance y decisiones

- Tres tablas: `stores`, `store_memberships` y `products`. Supabase administra `auth.users`.
- Membresía = permiso para administrar el catálogo de ese comercio. No hay roles extra todavía.
- `(store_id, id)` es la identidad del producto. El ID es texto: admite los IDs existentes como
  `ropa-001`; para altas nuevas Postgres genera UUID sin depender de nombres ni filas.
- Los clientes autenticados no pueden insertar IDs explícitos ni editar `id`, `store_id`
  o equivalencias antiguas. El seeder privilegiado sí puede importar IDs existentes.
  Un trigger además impide CAMBIAR identidad, incluso con permisos más amplios.
- Altas/bajas de comercios y pertenencias están reservadas al aprovisionamiento de confianza.
  No hay rutas públicas de aprovisionamiento ni funciones `security definer`.
- Las políticas usan `auth.uid()` y pertenencias de la base. No confían en un ID que mande
  el navegador ni en `user_metadata`, que el usuario puede editar.
- No existe acceso anónimo. Los futuros catálogos públicos necesitarán una solución separada;
  **no se deben abrir las tablas de administración para conectar una tienda**.
- No se permite eliminación permanente por la API normal; se usa `available=false`.
- `is_draft=true` permite nombre vacío y precio nulo, pero exige `available=false`.
  `is_draft=false` significa datos comerciales completos, **no significa publicado**.
  Guardado y publicación seguirán siendo estados independientes en una fase posterior.
- Precios: `numeric` sin escala forzada, de 0 a menos de 10 millones y máximo dos decimales
  significativos. La base rechaza negativos, NaN, infinito y decimales extra sin redondear.
  El límite evita falsos rechazos por la tolerancia de centavos del motor JavaScript actual;
  por ejemplo `9999999999.97` falla en ese parser por representación binaria. El máximo admitido
  aquí es `9999999.99`. Si un comercio necesita precios mayores, revisar el parser en otra fase.
  Un precio vacío es inválido; el nulo solo se admite en borradores.
- `option_groups` mantiene grupos ordenados `{id,label,options}`. `catalog_data` conserva
  los metadatos del motor, incluidas `image`, `gallery`, `images`, `mediaMode`, `imageLabels`,
  `imagePosition`, `imageFit`, categorías, textos, etiquetas, ofertas y orden visual.
  SQL valida tipos/listas; el adaptador añade validación comercial y de galerías completas.
  Los metadatos no admiten claves desconocidas que suplanten ID, precio o disponibilidad.
- Las referencias de imágenes de la muestra usan un dominio `.test` ficticio. **No se suben,
  descargan ni comprueba su alojamiento.** No hay buckets. Solo preservamos su representación.
- `legacy_cart_ids` y `legacy_names` permiten conservar las equivalencias existentes.
  No se migran datos reales; la importación futura debe verificar equivalencias sin ambigüedad.
- La única dependencia de desarrollo nueva es Supabase CLI 2.121.0, instalada en esta carpeta
  y fijada en package.json/package-lock.json. Sin framework ni SDK de ejecución.
  El seeder y la suite HTTP usan `fetch` y módulos estándar de Node >=22.

## Compatibilidad del adaptador

`src/product-mapper.cjs` exporta:

- `toProduct(row)`: valida y transforma una fila completa; no acepta borradores.
- `mapCatalog(rows, storeId)`: exige un solo comercio, omite borradores/desactivados, conserva orden.
- `legacyProducts(rows, storeId)`: devuelve las equivalencias que admite `reconcileCart`.
- `createProvider(readRows, storeId)`: implementa `load(): Promise<Product[]>` para `engine/catalog.js`.
  El lector se suministra desde afuera; no contiene credenciales ni una integración con tiendas.

El adaptador valida usando el motor existente sin modificarlo. `[]` significa catálogo vacío;
un error del lector se propaga y nunca se reemplaza por productos de ejemplo.
El chequeo de comercio en JS es defensa adicional, **no reemplaza ni prueba RLS**.
Galerías por color conservan colores y vistas ordenados. El motor deduplica URLs: una matriz
incompleta tras esa deduplicación se rechaza, no se rellena repitiendo fotos de otro color.
El modo explícito `color` exige exactamente una foto por color; los colores equivalentes
tras quitar espacios externos y pasar a minúsculas se rechazan, porque el motor los confundiría.

## Ejecutable ahora: sin red, instalaciones ni Docker

Desde esta carpeta:

```powershell
node --test tests/*.test.cjs
```

Desde la raíz del repositorio, la suite existente sigue igual:

```powershell
node --test tests/*.test.cjs
```

Las pruebas locales verifican el contrato con los cuatro catálogos existentes, medios por color,
IDs, equivalencias del carrito, precios, datos inválidos y guardas para las pruebas locales.
**No ejecutan PostgreSQL, Auth ni políticas RLS.** No hay tests de texto que pretendan demostrar RLS.

## Repetir las pruebas reales locales

La instalación y descarga local fueron autorizadas y realizadas. Detenerse si C: baja de 10 GB.
No usar `supabase link`, `db push` ni credenciales de un proyecto remoto.
Nada inicia Docker ni Supabase automáticamente al ejecutar `npm test`.

Desde esta carpeta, usando `node_modules/.bin/supabase.cmd`:

1. Comprobar espacio y Docker. La CLI instalada es 2.121.0; no actualizarla implícitamente.
2. Arrancar con `start --exclude postgres-meta,mailpit,supavisor`; verificar puertos y migraciones
   con `migration up --local`. El primer arranque aplica las migraciones automáticamente.
   No usar una base local ajena. Un reset solo se hará sobre este entorno de prueba identificado,
   con aprobación si ya contiene datos; ningún script ejecuta reset.
3. Ejecutar `supabase test db`: usa pgTAP dentro del entorno local, transacción y rollback.
   Incluye acceso bidireccional, anónimo, permisos de columnas, constraints y defensa del trigger
   aun dando temporalmente UPDATE de identidad y pertenencia a ambos comercios.
4. Definir variables de `.env.example` en la sesión con claves **locales** obtenidas de
   `status -o json`, capturando su salida en una variable sin imprimirla. El archivo `.env`
   no se carga automáticamente. No pegar claves en chats, logs o commits. Definir
   `PEDIDO_LISTO_TEST_STATE_DIR` como `$env:LOCALAPPDATA\PedidoListo\supabase-phase1`.
5. **Ya están creados los fixtures; no volver a sembrarlos.** En un entorno nuevo vacío,
   ejecutar `node scripts/seed-local.mjs`. Crea dos comercios,
   dos usuarios mediante la API administrativa de Auth, dos productos y un borrador ficticios.
   Genera contraseñas aleatorias; no hay contraseñas fijas en fixtures.
6. Ejecutar `node --test tests/auth-isolation.integration.mjs`. Inicia sesiones email/contraseña
   reales y prueba las operaciones vía PostgREST usando tokens de los dos usuarios.
7. Registrar los resultados. Ambas suites pasaron en este entorno el 15/10/2026.

La suite real falla si faltan servidor, claves o datos. No los sustituye por mocks ni los omite
silenciosamente. La URL admitida es exactamente `http://127.0.0.1:54321`; rechaza redirecciones,
usa timeout y exige `PEDIDO_LISTO_LOCAL_TESTS=1`. Una URL local no impide por sí sola un túnel
configurado por el operador: por eso debe verificarse que ese puerto corresponde a ESTE Supabase.

`service_role` solo aprovisiona/limpia fixtures. Las afirmaciones de aislamiento usan sesiones
normales. La prueba de doble membresía agrega una pertenencia temporal y la elimina al terminar;
también limpia únicamente los productos creados por esa ejecución y cierra las sesiones.
Si un proceso se interrumpe, revisar residuos antes de repetir. No hay limpieza destructiva automática.

El recibo `test-users.json` contiene contraseñas aleatorias de prueba y se guarda únicamente
en `PEDIDO_LISTO_TEST_STATE_DIR`, fuera del repositorio. En esta computadora se usó una carpeta
privada bajo LocalAppData, fuera de OneDrive, con ACL restringida al usuario actual.
El script rechaza rutas relativas o dentro del repositorio. En otra computadora, preparar
también los permisos y evitar carpetas sincronizadas. Si el seeder falla, conserva el recibo
parcial y no vuelve a ejecutar sobre él; diagnosticar primero. Nunca copiar el recibo a informes.
Las claves administrativas no se guardan en él.

El primer login falló con `email_provider_disabled`: `[auth.email].enable_signup=false`
deshabilita también el proveedor de correo. Se dejó en `true`, manteniendo
`[auth].enable_signup=false`. La prueba HTTP comprueba que iniciar sesión funciona y que el
registro público devuelve `signup_disabled`. Se reinició solo este proyecto conservando volúmenes.
Referencia: [configuración del proveedor y registro](https://github.com/supabase/supabase/issues/40582).

## Riesgos y límites pendientes

- Estas pruebas verifican el entorno local y los casos cubiertos; no son una auditoría de producción.
- No se certifican flujo de recuperación de contraseña, correo de producción, OAuth o MFA.
- Fase 2.1 agrega revisión atómica de productos; ver `PHASE-2.1-REPORT.md` y `panel/README.md`.
  No hay publicación ni alojamiento de fotos.
- `service_role` y el administrador de PostgreSQL tienen privilegios elevados; RLS no los aísla.
- Antes de producción deben revisarse costos, backups (incluidos futuros archivos), permisos,
  sesiones y límites. Este trabajo no contrata ni despliega servicios.

Referencias consultadas: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[permisos por columna](https://supabase.com/docs/guides/database/postgres/column-level-security),
[pruebas locales](https://supabase.com/docs/guides/local-development/testing/overview).
