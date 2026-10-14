# Pedido Listo — fase 2

Catálogos administrables con un motor compartido, Google Sheets y pedidos por WhatsApp.
Cuatro tiendas configuradas: Luna Urban, pastelería, catálogo base y Casa Verde (ficticia).

## Organización

- engine/: funcionamiento común y adaptadores de catálogo.
- presentation/: un HTML y dos temas visuales conservados.
- stores/<id>/: configuración, productos, IDs anteriores, recursos y Netlify.
- tools/: generación y verificación de publicaciones por comercio.
- releases/: revisión Git verificada de cada publicación.
- tests/: regresiones, navegador y comparación visual contra fase 1.
- dist/: publicaciones generadas, fuera de Git.

## Probar sin publicar

Desde la raíz, con Node 22 o superior:

```powershell
node tools/build-store.cjs luna-urban
node tools/build-store.cjs pasteleria-demo
node tools/build-store.cjs catalogo-base
node tools/build-store.cjs casa-verde
node --test tests/*.test.cjs
```

Cada carpeta dist/<id> es autónoma y debe servirse por HTTP local.
Usar un destino nuevo en cada generación; el comando no sobrescribe carpetas.
El generador no despliega. No editar archivos generados.

Las pruebas de navegador usan Playwright/Chromium como herramientas de desarrollo:

```powershell
node tests/browser-shared.cjs
node tests/browser-parity.cjs
```

Interceptan Sheets, imágenes y WhatsApp. No modifican ni consultan la planilla real.
Los sitios publicados no necesitan dependencias npm ni servicios de pago.

## Agregar un comercio

Copiar solo configuración/datos/recursos de stores/catalogo-base, con otro id y
clave de carrito. No duplicar engine ni presentation. Seleccionar tema y fuente.
Cada tienda nueva se descubre automáticamente en las pruebas de navegador.

## Actualizar una publicación

Guardar cambios en Git y ejecutar tools/prepare-release.cjs con los IDs explícitos.
El comando ejecuta la suite completa y fija la revisión probada de esas tiendas.
tools/build-release.cjs reconstruye desde esa revisión y verifica su huella.
Los manifiestos de otras tiendas permanecen sin cambios. No se publica nada
desde estos comandos; una publicación real requiere autorización.

Ver [arquitectura, contratos y operación](docs/FASE-2-ARQUITECTURA.md),
[plan y decisiones](docs/FASE-2-PLAN.md) y [antecedentes de fase 1](docs/FASE-1-ESTABILIZACION.md).

Stock, pagos y panel propio quedan fuera de esta fase. El dueño puede editar
productos/precios en Sheets. Los IDs estables deben conservarse al renombrar o
reordenar filas; la planilla original no fue modificada.
