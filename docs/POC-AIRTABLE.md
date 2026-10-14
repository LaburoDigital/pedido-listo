# Prueba de concepto Airtable — preparación

14/10/2026. Estado: pendiente de cuenta/base gratuita conectada por el usuario.
No es un informe de pruebas ejecutadas. No se modificaron motor, tiendas ni publicaciones.

## Pregunta que debe responder

¿Un comerciante puede mantener su catálogo desde computadora y teléfono, incluidas
fotos, sin manipular enlaces, IDs ni código, con un costo y mantenimiento razonables
al operar varias tiendas? No adoptar Airtable solo por reducir el trabajo de interfaz.

## Aislamiento

Usar una base vacía propiedad del usuario, «Pedido Listo — Prueba», con datos ficticios.
Verificar el plan Free: una prueba promocional Team no demuestra compatibilidad Free.
No agregar métodos de pago. Autorizar solo esa base. La conexión de Codex puede
permitir operar datos pero no necesariamente proporciona una credencial de integración
para el sincronizador; comprobarlo antes de prometer sincronización desatendida.
Ninguna credencial privada puede estar en el código público de la tienda.

Crear los futuros componentes experimentales fuera de engine/, stores/ y releases/.
Consumir el contrato existente provider.load(): Promise<Product[]> y la validación
del motor sin cambiar sus archivos. La tienda experimental se genera en un destino
nuevo. No desplegar. Interceptar WhatsApp y no enviar mensajes.

## Catálogo ficticio

Tabla Productos: Producto (texto), Descripción (texto largo), Precio (número decimal),
Fotos (adjuntos), Talles y Colores (selección múltiple), Activo (casilla; inicialmente
desactivada), Categoría (selección). La identidad interna usa el ID del registro
combinado con la identidad del comercio, sin exponer edición de IDs al dueño.
Para una migración futura conservar los IDs ya existentes mediante una equivalencia
explícita; no sustituirlos por IDs de Airtable sin migrar los carritos.

Seis casos: remera con talles/colores, pantalón, gorra sin talles, producto borrador,
producto desactivado y producto de prueba con datos incorrectos. Las fotos se cargan
como adjuntos, nunca como URLs escritas por el comerciante.

## Fotos y sincronización que debe demostrar el prototipo

1. Leer registros en el proceso privado, con paginación, tiempo máximo y límite de
   consultas. No consultar Airtable por cada visita de un comprador.
2. Validar productos activos, precios, opciones y archivos. Un lote inválido no
   reemplaza silenciosamente el catálogo válido anterior. Mostrar al administrador
   qué producto requiere corrección y la fecha de la última sincronización exitosa.
3. Descargar los adjuntos nuevos antes de que caduquen sus URLs, validando origen,
   redirecciones, tipo y tamaño. Guardarlos con identidad estable por comercio y
   adjunto; al reemplazar una foto crear otra versión sin destruir la anterior.
4. Para la prueba usar archivos locales persistentes: no requiere otra cuenta ni
   servicio pago. Bloquear después la URL de Airtable y comprobar que la tienda
   sigue mostrando la copia. Esto demuestra independencia del enlace, no alojamiento
   comercial en la nube ni disponibilidad permanente de un servidor local.
5. Solo publicar localmente el nuevo catálogo cuando sus fotos y datos estén completos.
   Una respuesta vacía válida debe vaciarlo; un error de red no debe parecer un vacío.
   La política de antigüedad para pedidos requiere una decisión explícita: evitar
   tratar una copia vieja como precio vigente si una sincronización falla.
6. Para producción haría falta almacenamiento de imágenes y ejecución del sincronizador
   alojados. Evaluar un plan gratuito apropiado y pedir conexión por separado; no se
   crea ni contrata ningún servicio en esta preparación.

## Pruebas y evidencia requerida

- En computadora y teléfono físico: alta, foto desde galería/cámara, cambio de
  precio/descripción, talles/colores, activación y desactivación. Registrar pasos,
  tiempo, dispositivo y ayuda requerida; no confundir navegador emulado con app real.
- Renombrar y reordenar sin cambiar identidad; duplicar crea identidad nueva.
- Errores: precio vacío/negativo, variantes duplicadas, foto inválida, imagen fallida,
  red caída, permiso revocado, límite API y resultados paginados.
- Reemplazar/eliminar foto y verificar que la versión nueva coincide con el catálogo.
- Expiración simulada del enlace de origen; prueba real posterior si hay acceso y tiempo.
- Carga en tienda aislada, carrito, conciliación de variantes/precios y WhatsApp
  interceptado con total correcto. Ningún pedido real.
- Segundo comercio ficticio aislado: ningún producto, foto o credencial cruzado.
- Medir consultas por cambio y mes; recuperar el servicio tras un fallo sin intervención
  sobre el catálogo por parte del desarrollador.

## Hallazgos documentales, no resultados de campo

Airtable Free incluye 1.000 registros/base, 1 GB de adjuntos/base y 1.000 consultas
API/espacio/mes. Team cuesta USD 24 por colaborador/mes con facturación mensual o
USD 20 con anual. El espacio inicial puede arrancar con una promoción Team; no usar
funciones promocionales para concluir que algo funciona gratis.
Fuente: https://support.airtable.com/articles/2277136852-airtable-plans-overview

Las URLs de descarga de adjuntos expiran; no sirven como dirección permanente en
el catálogo. Fuente: https://support.airtable.com/articles/9671148410-airtable-attachment-url-behavior

Ejemplo calculado, sin reintentos ni escrituras: para un catálogo de hasta 100 registros,
una lectura por hora consume 720 solicitudes en 30 días; cada 15 minutos consume
2.880. Con 500 registros, cinco páginas por lectura elevan la lectura horaria a 3.600.
Varias bases del mismo espacio comparten el límite. La sincronización por cambios
debe investigarse y probarse; no asumir que webhooks o automatizaciones son ilimitados.
Fuente: https://support.airtable.com/articles/7735693959-managing-api-call-limits-in-airtable

## Comparación preliminar con un panel propio y Supabase

| Criterio | Airtable + sincronizador | Panel propio + Supabase |
|---|---|---|
| Experiencia | Edición y adjuntos ya disponibles; falta ensayo móvil | Se puede diseñar por tarea, pero hay que construirla y probarla |
| Código a mantener | Adaptador, copias de fotos, sincronización, errores y credenciales | Interfaz, autenticación, validación, datos, fotos, permisos y recuperación |
| Costos iniciales | Prototipo local gratuito; alojamiento productivo aún no resuelto | Free sirve para prototipo; costo de desarrollo mayor |
| Varios comercios | Más bases/conexiones; cuotas compartidas por espacio o gestión de espacios separados | Un proyecto puede alojar varios comercios con aislamiento por fila y almacenamiento |
| Escalabilidad | Atención a cuota API, asientos y sincronización | Control mayor, responsabilidad mayor por seguridad y operación |
| Independencia | Dependencia de formatos, planes y aplicaciones de Airtable | Dependencia de Supabase y de nuestro propio código; Postgres facilita exportar datos |

Supabase Free: 500 MB de base, 1 GB de archivos, 5 GB de salida más 5 GB cacheada;
máximo dos proyectos activos y pausa tras una semana inactiva. Pro desde USD 25/mes,
primer proyecto incluido y adicionales desde USD 10/mes; consumos adicionales pueden
sumarse. No equivale a USD 25 por comercio si comparten un proyecto. Tampoco convierte
el panel, los respaldos y el soporte en gratuitos.
Fuente: https://supabase.com/pricing

Compartir un proyecto exige permisos comprobados por comercio en datos y fotos,
incluyendo pruebas negativas de acceso cruzado. No exponer claves administrativas.
Referencias: https://supabase.com/docs/guides/database/postgres/row-level-security y
https://supabase.com/docs/guides/storage/buckets/fundamentals

## Criterio de elección

Aceptar Airtable solo si las tareas habituales funcionan sin ayuda en ambos
dispositivos, las fotos siguen disponibles al vencer su enlace de origen, la
sincronización refleja cambios y errores de forma entendible y el presupuesto de
consultas/almacenamiento es viable para varios comercios. Si requiere demasiadas
piezas para conseguir eso, su ventaja frente a un panel propio disminuye.

Pendiente: conectar base, configurar catálogo y fotos ficticias, implementar el
experimento aislado y ejecutar las pruebas. No hay evidencia todavía para elegir
Airtable como solución comercial ni para descartarlo por completo.
