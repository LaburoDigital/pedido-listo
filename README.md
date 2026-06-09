# Pedido Listo v0.3

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
```

## Regla operativa

- No editar `template/catalogo-base` para un cliente real.
- Duplicar la plantilla o una demo y adaptar `config.js` y `products.js`.
- No prometer pagos, stock real, panel admin ni SEO garantizado si no está construido.
- No usar links gratis como cara final frente a clientes; usar dominio/subdominio profesional cuando se publique.

## Cómo probar localmente

Desde la carpeta de una demo:

```bash
python -m http.server 8000
```

Abrir:

```text
http://localhost:8000
```

También se puede abrir `index.html` con doble clic para una revisión rápida, pero el servidor local es mejor.
