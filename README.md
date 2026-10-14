# Pedido Listo — fase 1 de estabilización

Catálogos online editables para negocios que venden por Instagram y WhatsApp.

## Objetivo

Crear una base reutilizable para producir catálogos mobile first con flujo profesional:

card de producto → detalle → opciones → agregar al pedido → revisión → WhatsApp.

La prioridad del negocio es vender soluciones simples y útiles para negocios chicos sin quedar atados a mantenimiento manual constante. La versión principal a futuro será editable por el dueño mediante Google Sheets u otra fuente simple.

## Estructura

```text
template/catalogo-base/   Plantilla madre. No editar para clientes concretos.
demos/pasteleria/         Demo comercial para pastelería.
demos/ropa/               Demo comercial para ropa.
docs/                     Proceso, precios, QA, mensajes y cambios.
shared/catalog-core.js    Validación común de datos, carritos y carga CSV.
tests/                    Regresiones automatizadas y comprobación de navegador.
tools/export-catalog.cjs  Exportación independiente con todas las dependencias.
```

## Regla operativa

- No editar `template/catalogo-base` para un cliente real.
- Duplicar la plantilla o una demo y adaptar `config.js` y `products.js`.
- No prometer pagos, stock real, panel admin ni SEO garantizado si no está construido.
- No usar links gratis como cara final frente a clientes; usar dominio/subdominio profesional cuando se publique.

## Cómo probar localmente

Desde la raíz de `pedido-listo` (no desde una demo, porque el motor compartido está en `shared/`):

```bash
python -m http.server 8000
```

Abrir:

```text
http://localhost:8000/demos/ropa/
http://localhost:8000/demos/pasteleria/
http://localhost:8000/template/catalogo-base/
```

También se puede abrir `index.html` con doble clic para una revisión rápida, pero el servidor local es mejor.

## Exportar un catálogo independiente

Desde la raíz del proyecto, elegí una carpeta de destino nueva:

```bash
node tools/export-catalog.cjs demos/ropa ../outputs/ropa-fase-1
```

La exportación incluye el motor compartido y ajusta su ruta. Se puede servir desde la carpeta exportada. No se sobrescriben destinos existentes y no se publica nada. Para adaptar un comercio, trabajá sobre una exportación completa o mantené la estructura del repositorio; no copies solo la carpeta de una demo.

## Pruebas

```bash
node --test tests/*.test.cjs
```

Solo requieren Node.js y no acceden a la planilla real. La prueba adicional de navegador requiere Playwright y un Chromium disponible:

```bash
node tests/browser-smoke.cjs
```

Si Playwright no encuentra un navegador instalado, configurá `PLAYWRIGHT_CHROMIUM_EXECUTABLE` con la ruta de Chromium/Chrome. `--live` agrega una lectura de comprobación de la planilla real; nunca la edita ni envía pedidos. Los pedidos de las pruebas se interceptan.

Ver [FASE-1-ESTABILIZACION.md](docs/FASE-1-ESTABILIZACION.md) para contratos de datos, migración y límites.
