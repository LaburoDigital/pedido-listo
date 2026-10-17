# Fase 2: panel local de productos

Alcance aprobado: acceso con los usuarios locales existentes, catálogo por comercio, búsqueda,
edición y alta, variantes, activación, validaciones y interfaz móvil. No commits ni instalaciones.
Se conserva la rama actual y se respaldaron los 17 archivos previos en .local/phase1-before-panel.json.

Diseño: HTML/CSS/JS sin dependencias. Tres vistas: acceso, listado y formulario. Un servidor
estático de desarrollo escucha solo en 127.0.0.1 y entrega únicamente archivos permitidos y
configuración pública local. Supabase Auth y PostgREST reciben directamente las peticiones
del navegador, con sesión de usuario y RLS existente. No hay backend comercial nuevo.
Sesión en memoria (recargar requiere ingresar); renovación serializada antes de peticiones.

No existe estado de publicación en la base. Los filtros son borrador, activo e inactivo;
un aviso permanente indica que guardar no publica. No se inventan publicaciones ni columnas.
Los campos de fotografías permanecen intactos. Bloqueo de cambios a colores asociados a fotos
para no alterar su correspondencia; los productos sin fotos sí permiten editar colores.
El adaptador se expone al navegador sin duplicar su validación; motor y tiendas son solo lectura.

Pruebas: modelo de edición (precios, metadatos, variantes, identidad), cliente HTTP/sesiones,
servidor estático seguro, navegador con Auth y base local reales en escritorio y móvil,
errores de red, recarga, aislamiento y regresión de fase 1. Evidencias sin claves ni contraseñas.
Guardado y error son estados explícitos; las escrituras no se reintentan automáticamente.
Sin versiones de filas en la fase 1: detectar cambios desde apertura antes de editar, documentar
el límite de concurrencia entre la comprobación y escritura; no afirmar bloqueo transaccional.
