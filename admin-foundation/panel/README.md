# Panel de productos — uso local

Estado: fase 2 y estabilización 2.1 verificadas localmente. No publica cambios en las tiendas.

## Abrir

Con Docker y el Supabase de admin-foundation ya encendidos, ejecutar desde admin-foundation:

```powershell
npm run panel
```

Abrir http://127.0.0.1:4175. El servidor entrega solo rutas autorizadas y una clave pública.
No instalar dependencias ni iniciar proyectos remotos para este procedimiento.
Ingresar con uno de los dos usuarios ficticios preparados en fase 1. Sus contraseñas aleatorias
están en el recibo privado de pruebas bajo LocalAppData/PedidoListo/supabase-phase1/test-users.json.
No copiar ese archivo al repositorio, a informes ni a chats. El panel no lo sirve ni lo lee.

## Administrar

- Buscar por nombre o categoría; filtrar Todos, Activos, Inactivos o Borradores.
- Nuevo producto: completar nombre y precio, elegir estado, agregar variantes y guardar.
- Editar: actualizar descripción, categoría, precios y opciones; guardar confirma administración.
- Cada opción tiene su propio campo: un punto y coma dentro del texto se conserva literalmente.
- Activo requiere nombre y precio válidos; Inactivo conserva el producto; Borrador permite
  dejar nombre y precio pendientes. No hay botón de eliminación permanente.
- Precio admite coma o punto decimal, máximo dos decimales y sin separadores de miles.
- Fotografías y metadatos existentes se conservan. Los colores asociados están bloqueados;
  también se rechazan variantes que reinterpretarían una galería automática.
- Ante un error de lectura, usar Reintentar. Si no se confirma una escritura, comprobar el
  catálogo antes de repetir: el panel no reintenta automáticamente ni afirma que se guardó.

## Límites de esta fase

La sesión se conserva en este navegador. Supabase valida la identidad al recargar; si vence,
el panel intenta renovarla. Usar **Salir** en equipos compartidos: elimina la sesión guardada,
vacía formularios/listados y cierra las demás pestañas de este mismo origen. Si falta conexión,
el cierre local se realiza igualmente y se avisa que no se pudo confirmar la revocación remota.
No se guardan contraseñas ni catálogos. No hay recuperación de contraseña ni registro público
en el panel. El servidor solo escucha en 127.0.0.1; las pruebas móviles
usan tamaños de pantalla emulados en Chrome, no un teléfono conectado por Wi-Fi.

Guardar y publicar son distintos: todos los datos están sin publicación. Activo no significa
visible en una tienda. No hay carga de fotos, pagos, despliegue ni integración de las cuatro tiendas.

La base controla las ediciones simultáneas de forma atómica. Si otra persona guardó primero,
el panel conserva tu formulario y bloquea el guardado. **Recargar datos actuales** pide
confirmación antes de reemplazarlo. Cancelar conserva tus cambios; si falla la conexión,
también se conservan. No hay combinación automática de ediciones ni guardado de borradores
locales: si necesitás conservar ambos textos, copiá tu texto antes de confirmar la recarga.
Las políticas RLS se comprueban con tokens auténticos y protegen el aislamiento incluso
cuando se evita el formulario y se llama directamente a la API.

Los tokens de Auth están en localStorage, accesibles al JavaScript del mismo origen, como
en una aplicación cliente de Supabase. CSP restringida y ausencia de scripts externos reducen
la superficie; esto no hace al almacenamiento inmune a XSS. No hay claves privadas en el panel.
La coordinación de renovación usa Web Locks (Chrome instalado y navegadores modernos con
contexto seguro). Las pruebas cubren Chrome local, no todos los navegadores. Usar siempre el
mismo origen/puerto del panel; la persistencia y los eventos entre pestañas dependen de él.

## Pruebas y ubicación

Desde la raíz, la suite general usa:
`node --test tests/*.test.cjs experiments/airtable-local/*.test.cjs admin-foundation/tests/*.test.cjs`

Las pruebas reales necesitan el entorno local y variables de .env.example, más NODE_PATH a la
instalación existente de Playwright y PLAYWRIGHT_CHROMIUM_EXECUTABLE al Chrome instalado.
No usan mocks para Auth/RLS. Ver README de admin-foundation para cargar claves locales en memoria.
Para navegador definir PEDIDO_LISTO_PANEL_EVIDENCE como carpeta de capturas, y opcionalmente
SUPABASE_PUBLIC_KEY con la clave publicable local. Ejecutar `npm run test:panel` y
`npm run test:stability`. Para API usar `npm run test:integration`: se ejecuta en serie porque
los escenarios comparten los dos usuarios ficticios. No ejecutar varias suites mutantes a la vez.
Los tokens privilegiados solo preparan/comprueban/retiran fixtures en el proceso de pruebas;
el navegador del panel recibe clave pública y sesiones normales de comercio.

Los resultados y archivos de la estabilización se detallan en `../PHASE-2.1-REPORT.md`.
Sin instalaciones, cambios al motor/tiendas, commits, pushes ni despliegues.
