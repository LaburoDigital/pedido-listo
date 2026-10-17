# PROJECT_STATUS — Pedido Listo

Última verificación: 17/10/2026 (Claude). Documento vivo: registra el estado
**verificado** del repositorio y las diferencias con el documento de traspaso
original. Lo que no se pudo verificar se marca como tal.

## Respaldo (17/10/2026)

- Rama `respaldo/2026-10-17-trabajo-local`: contiene la historia de
  `fase-3-supabase-datos-auth` (654eb4f) más el commit 053b2aa con los 52
  archivos que no estaban versionados (`admin-foundation/` y
  `experiments/sheets-pilot/`), más este documento.
- Excluidos a propósito (ignorados por `.gitignore`): `node_modules/`,
  `admin-foundation/.local/` (logs de pruebas), `supabase/.temp/`,
  `supabase/.branches/`, `experiments/sheets-pilot/build/`, `dist/`, `work/`.
- Bundle verificado con las 8 ramas locales:
  `work/respaldo-2026-10-17/pedido-listo-completo.bundle`.
- Escaneo de secretos sobre los archivos nuevos y los commits no publicados:
  sin claves. ImageKit (`IMAGEKIT_PRIVATE_KEY`) se lee de las propiedades del
  script; Supabase, de variables de entorno (`.env.example` vacío).

## Diferencias con el documento de traspaso

| Tema | Traspaso decía | Verificado |
|---|---|---|
| Trabajo sin respaldo | `admin-foundation/` y piloto sin commit | Además, **7 commits** (ramas `fase-1-estabilizacion`, `fase-2-arquitectura`, `fase-3-administracion`, `fase-3-supabase-datos-auth`, `preparacion-primera-entrega`) nunca se subieron. En GitHub solo existen `main` y `dev`. |
| Visibilidad del repo | No mencionada | `LaburoDigital/pedido-listo` es **público**. |
| Publicación | Netlify en el historial; Cloudflare candidato | **GitHub Pages está activo** desde `main`: `laburodigital.github.io/pedido-listo/` sirve el README y la demo de pastelería (v0.3/v0.9) responde. No hay `netlify.toml` en `main` ni `dev`. Los `stores/<id>/netlify.toml` existen solo en ramas locales y `docs/FASE-2-INFORME.md` indica que la conexión con Netlify nunca se hizo. No se pudo verificar la cuenta Netlify (requiere sesión). |
| Las cuatro tiendas | Nombres a verificar | `stores/`: `casa-verde` (plantas), `catalogo-base` (tortas), `luna-urban` (ropa), `pasteleria-demo` (tortas). Manifiestos en `releases/` fijados al commit `5525ec1`, que **no está en GitHub**. |
| `index.html`/`app.js`/`config.js`/`styles.css` | Archivos del motor | Esa es la estructura v0.9 de `demos/` y `template/`. El motor actual está en `engine/` (`app.js`, `catalog.js`, `core.js`, `media.js`, `sources.js`), con configuración por tienda en `stores/<id>/store.json` y `products.json`. |
| Experimento Airtable | Rama `fase-3-administracion`, commit 654eb4f | Está versionado en `experiments/airtable-local/`; `fase-3-administracion` y `fase-3-supabase-datos-auth` apuntan al mismo commit. |
| `origin/HEAD` | Referencia dañada | Confirmado. Es solo un aviso; no afecta ramas ni datos. |

## Decisiones vigentes

- **No cambiar la visibilidad del repo todavía.** En el plan gratuito de GitHub,
  pasar a privado desactiva GitHub Pages y cortaría la demo publicada. Antes:
  decidir dónde vive la demo (Netlify/Cloudflare) o mover el código sensible a
  un repo privado aparte.
- Flujo: Claude desarrolla → Codex revisa el PR → Claude corrige → Juan
  autoriza el merge. ChatGPT interviene en arquitectura, seguridad, costos y
  decisiones importantes. Si Codex no está conectado: revisión de diffs en chat.
- Sin nuevas funcionalidades hasta terminar la auditoría.

## Pendiente

- Copia completa fuera de OneDrive (falta permiso de carpeta).
- Push de las ramas (lo hace Juan con sus credenciales).
- Auditoría completa de solo lectura: motor, contrato de catálogo, panel
  Supabase, piloto, inventario y ejecución de pruebas.
