# Pedido Listo — informe de fase 2

Fecha: 14 de octubre de 2026. Rama: `fase-2-arquitectura`.
Código verificado: `5525ec1c56fa46701df333d1e092c2a93303d1d7`.

## Resultado

Las cuatro tiendas usan un único motor. Se conservaron los temas actuales y las
capacidades de ropa: variantes, galerías, color/galería, doce imágenes, ofertas,
persistencia y validación previa a WhatsApp. Cada tienda tiene configuración,
datos, recursos y una publicación autónoma. Casa Verde demuestra la creación
de un comercio ficticio cambiando solamente configuración, datos y recursos.

No se incorporaron frameworks ni dependencias de producción. Se conservaron
scripts clásicos para reducir el alcance de la migración; los módulos puros
tienen APIs explícitas. No se reescribió la interfaz ni se refactorizó el CSS.

## Archivos y responsabilidades

- `engine/app.js`: controlador e interfaz comunes extraídos de ropa; las diferencias
  de tarjetas y apertura del carrito son configuración.
- `engine/core.js`: validaciones y compatibilidad de fase 1.
- `engine/catalog.js`: interfaz `provider.load(): Promise<Product[]>`, validada
  e independiente de Google Sheets.
- `engine/sources.js`: adaptadores CSV y datos locales.
- `engine/media.js`: funcionamiento compartido de imágenes y variantes.
- `presentation/index.template.html` y `presentation/themes/`: HTML común y los
  dos CSS originales.
- `stores/{luna-urban,pasteleria-demo,catalogo-base,casa-verde}/`: configuración,
  productos, alias, recursos y configuración de Netlify por tienda.
- `tools/build-store.cjs`: publicación autónoma en un destino nuevo.
- `tools/prepare-release.cjs`, `build-release.cjs`, `ignore-build.cjs`: verificación,
  revisión Git fijada y selección independiente de actualizaciones.
- `tools/export-catalog.cjs`: alias compatible con la orden anterior de exportación.
- `releases/<tienda>.json`: manifiesto local verificado de cada comercio.
- `tests/`: regresiones existentes adaptadas, arquitectura, versiones y navegador.
- `README.md` y documentación: operación, migración, contratos y límites actualizados.

Los `app.js`, HTML, CSS y archivos de configuración duplicados de las demos y la
plantilla se retiraron después de verificar equivalencia. El commit `4356604`
conserva la extracción junto a los originales; `4e1786d` conserva la fase 1.
El respaldo externo `work/respaldo-pedido-listo-20261014-100701/pedido-listo`, en la
carpeta superior al repositorio, permanece intacto.

## Pruebas ejecutadas

| Verificación | Resultado |
|---|---|
| Suite automatizada completa | 66 aprobadas; 0 fallos |
| Flujo de las cuatro tiendas | Aprobado: variantes, carrito, persistencia, error/reintento, revisión de precios y WhatsApp interceptado |
| Publicaciones independientes | Cuatro raíces propias; configuración y datos reales locales; sin archivos faltantes |
| Escritorio y móvil | Chrome: 1366×768 y 375×667 |
| Comparación con fase 1 | 18 capturas: catálogo, detalle y carrito de tres tiendas, dos tamaños |
| Proveedor ajeno a Sheets | Contrato probado con catálogo vacío, datos válidos, precio inválido, fallo y recuperación |
| Compatibilidad | IDs locales y alias de ropa conservados; carritos antiguos recuperados |
| Actualizaciones controladas | Cambios posteriores del motor/configuración no alteran una versión fijada; huella incorrecta impide generarla |
| Selección de actualización | Cambiar un manifiesto no activa la construcción de otra tienda |
| Revisión independiente | Hallazgo de cobertura fija corregido y revisión cerrada |

Las comparaciones esperan imágenes y sincronizan desplazamiento. La tolerancia
máxima es 4/255 por canal para composición de transparencias. Los dos CSS mantienen
las mismas reglas que fase 1. Las pruebas móviles usan emulación de tamaño en
Chrome; no equivalen a comprobar un teléfono físico o Safari.

Los registros y capturas quedan en `work/phase2-release-verification.log` y
`work/phase2-visual/`. El proceso de preparación ejecutó todas las pruebas desde
Git limpio antes de escribir los cuatro manifiestos.

## Distribución controlada

Cada manifiesto fija el commit y una huella SHA-256. `build-release` recupera ese
commit, construye la tienda y comprueba la huella antes de crear el destino final.
Las publicaciones listas están en `dist/<tienda>/`, fuera de Git.

Para una actualización futura se indican explícitamente las tiendas al ejecutar
`prepare-release`; verifica todas las configuraciones descubiertas y modifica solo
los manifiestos seleccionados. La configuración de Netlify usa esos manifiestos,
no el motor pendiente. Su conexión y cualquier publicación real siguen pendientes
de autorización. No se subió código ni se creó ningún sitio remoto.

## Problemas pendientes

1. **Diseño móvil del tema clásico:** conserva un defecto previo. A 375px, su grilla
   de doce columnas comprime las tarjetas (aproximadamente 15–45px en pastelería).
   Las capturas confirman que también sucede en fase 1. Requiere una corrección
   visual acotada antes de vender ese tema; no se cambió CSS fuera del alcance.
2. **IDs en Sheets:** sigue pendiente incorporar la columna `id` a la planilla real.
   Se conserva el mapa explícito de los cinco productos. No renombrarlos antes
   de completar esa migración autorizada.
3. **Salida a producción:** faltan dominio, contacto definitivo y comprobación
   autorizada de Netlify para cada cliente. Las reconstrucciones se verificaron
   localmente; no se probó un despliegue real.
4. **Dependencias externas existentes:** publicación CSV de Sheets e imágenes
   externas. No se agregaron stock, pagos, panel propio ni almacenamiento de pedidos.

No se modificó la planilla real, no se enviaron pedidos ni se publicó nada.
