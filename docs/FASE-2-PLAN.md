# Fase 2: ejecución y decisiones

Base: 4e1786d. Rama: fase-2-arquitectura. Respaldo previo externo conservado.
Alcance aprobado: motor común, contrato de catálogo, configuraciones independientes,
dos temas sin refactorizar CSS, compatibilidad de carritos y publicación controlada.
No editar Sheets, no enviar pedidos, no publicar.

1. Caracterizar las demos originales y probar contrato de catálogo/empaquetado.
2. Extraer código existente, conservar originales hasta comparar navegador.
3. Migrar configuraciones y agregar cuarta tienda de datos locales.
4. Comparar escritorio/móvil, ejecutar regresiones; retirar copias verificadas.
5. Implementar publicaciones fijadas a una revisión Git verificada por tienda.
6. Revisión final, pruebas completas e informe.

Decisiones:
- Trabajar en la rama local solicitada, sin otro checkout ni cambiar el respaldo.
- Conservar scripts clásicos con APIs explícitas para módulos puros: evita cambiar
  simultáneamente carga, pruebas e interfaz. Sin framework ni dependencias de producción.
- Mantener controlador/interfaz existente junto en app.js; extraer catálogo y medios,
  sin fragmentar funciones que comparten estado solo para cumplir un número de archivos.
- Cada publicación se reconstruye desde un commit fijado por comercio. Cambiar el
  motor o un comercio no promueve los demás. El comando de preparación prueba el commit
  antes de escribir su manifiesto; todos los comandos son locales, sin despliegue.

Interfaces a verificar:
- Adaptadores -> catálogo: load(): Promise<Product[]>; error lanza excepción, [] válido.
- Catálogo -> app: solo load(), validación común antes de devolver productos.
- Configuración -> app: valores actuales + presentación/comportamiento/clave de carrito.
- Build -> publicación: carpeta autónoma, lista explícita, sin archivos de otros clientes.
- Release -> build: commit exacto y huella de archivos, sin usar código pendiente.

Progreso: inspección terminada; Git limpio al inicio; rama creada.
