# Fase 1 — registro de preparación y ejecución local

## Estado actual: 15/10/2026

La autorización posterior permite CLI y contenedores locales, con detención por debajo de 10 GB.
La fase 1 está verificada en Supabase LOCAL; no implica entrega de un panel ni despliegue.

- Rama confirmada: fase-3-supabase-datos-auth; HEAD 654eb4f.
- CLI 2.121.0 instalada exclusivamente como devDependency de admin-foundation, con lockfile.
- Supabase local arrancado; migraciones 20261014000100 y 20261014000200 aplicadas.
- Dos comercios, dos usuarios reales de Auth y tres productos ficticios creados.
- Credenciales de prueba fuera del repositorio y OneDrive, en LocalAppData, con ACL del usuario.
  Se agregó una guarda y prueba para rechazar recibos dentro del repositorio o rutas relativas.
- Primer login real: HTTP 422 email_provider_disabled. Causa: auth.email.enable_signup=false
  deshabilitaba el proveedor de correo. Corrección: true allí, conservando auth.enable_signup=false.
  Reinicio exclusivamente local conservando volúmenes; prueba de signup_disabled incorporada.
- HTTP real: 8/8 (incluye contenedor padre y siete subpruebas); dos logins, refresh, accesos
  anónimos inválidos, aislamiento A/B, escalamiento, precios, variantes e identidad inmutable.
- PostgreSQL/pgTAP: 39/39; transacción revertida. Incluye trigger de identidad con permisos
  temporalmente ampliados, sin depender exclusivamente de las restricciones de columnas.
- Suite offline: 95/95 (73 existentes, 7 del experimento anterior, 15 de esta fase).
- Navegador: 4/4 tiendas y 4/4 publicaciones independientes temporales, escritorio y móvil.
  Sin pedidos reales; no se regeneraron capturas anteriores de responsive/parity.
- Integridad: 183 archivos protegidos, cero cambios (incluye motor, tiendas y respaldos).
- Revisión independiente final: sin hallazgos críticos o importantes.
- C: 21,70 GiB libres al cierre; no se alcanzó el umbral de 10 GB. Sin limpieza destructiva.
- Git: solo admin-foundation/ nueva, 17 archivos visibles; sin commit, push ni despliegue.
  node_modules, logs, temporales y credenciales no entran en el conjunto versionable.
- Supabase queda ejecutándose localmente. No se creó proyecto remoto ni se modificó Airtable.

Decisión: la autorización más reciente reemplaza la prohibición inicial de instalar herramientas.
Se conserva abajo el registro histórico de preparación; sus pendientes ya fueron resueltos arriba.

## Preparación previa, 14/10/2026 (histórico)

Base: 654eb4f. Rama: fase-3-supabase-datos-auth. Estado inicial: limpio.
Alcance autorizado: solo admin-foundation; sin instalaciones, descargas ni cambios remotos.

1. Inspección de motor y catálogos: realizada.
2. Fixture de 2 comercios, 2 definiciones de usuarios y 3 filas de productos: preparado.
3. Adaptador: pruebas escritas antes; primer intento falló por módulo aún inexistente;
   implementación posterior: 10 pruebas locales aprobadas.
4. Migraciones y suite SQL: preparadas, NO ejecutadas.
5. Seeder y suite HTTP de Auth/RLS: preparados, NO ejecutados.
6. Suite completa final: 94/94 (73 existentes + 7 del experimento local previo + 14 nuevas).
   Primer intento en sandbox: 6 fallos por EPERM en renombrados/repositorio temporal;
   repetición con permisos locales adecuados: todas aprobadas, sin cambiar código previo.
7. Navegador existente: 4/4 tiendas + 4 publicaciones independientes temporales,
   escritorio y móvil, con datos ficticios e interceptación de WhatsApp: aprobado.
   No se ejecutaron las suites de capturas responsive/parity para no reemplazar evidencias
   existentes; no se modificó presentación ni motor en esta fase.
8. Revisión estática independiente: tres hallazgos importantes reproducidos con tres pruebas
   fallidas (10 aprobadas / 3 fallidas), luego corregidos y suite completa en verde:
   - Rango de precios incompatible con la tolerancia numérica del motor: límite común <10 millones.
   - Colores equivalentes por espacios/mayúsculas: rechazo para evitar fotos mal asociadas.
   - Modo color con fotos faltantes: cardinalidad exacta tras deduplicación.
   No hubo hallazgos menores aplazados. La revisión estática NO certifica RLS.
9. node --check: los dos scripts .mjs y la suite HTTP pasan sintaxis JavaScript.
10. Integridad: 183 archivos protegidos comparados por SHA256, cero diferencias;
    incluye motor, tiendas, presentación, dist, releases y respaldo anterior.
11. Git final de preparación: solo admin-foundation/ nueva, sin cambios de archivos previos,
    sin commit, push ni despliegue. SQL, Auth, seeder y RLS reales siguen pendientes.

Decisiones de alcance:
- Se trabaja en la rama indicada por el usuario, sin crear otro worktree.
- No se ejecutan asistentes de instalación del skill ni npm install: prohibición expresa del usuario.
- El proyecto aislado no necesita dependencias; CLI/lockfile quedan para su instalación autorizada.
- La validación SQL estructural y el adaptador comercial protegen límites diferentes; no se implementa
  publicación ni validación de disponibilidad de fotografías.
- No hay mecanismo automático de sincronización o actualización entre tiendas.
