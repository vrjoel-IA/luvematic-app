# Adaptación responsive de LUVEMATIC

Fecha: 9 de septiembre de 2026. Cambios locales en el repositorio frontend; no publicados.

## Cambios

- Dimensiones con border-box para evitar que el padding supere el ancho de pantalla.
- Acceso y selección de módulos con altura flexible y contenido desplazable.
- Tarjetas que admiten anchos inferiores a sus mínimos anteriores de 320–350 px.
- Formularios de dos o tres columnas en escritorio y una columna hasta 768 px.
- Filtros, acciones y cabeceras que cambian de fila cuando falta espacio.
- Menús móviles con nombre accesible, estado expandido y desplazamiento interno.
- Ventanas limitadas al ancho y altura disponibles; desplazamiento hasta sus acciones finales.
- Tablas con columnas legibles y desplazamiento horizontal dentro de su contenedor, accesible mediante teclado.
- Estilos de campos y botones secundarios de mantenimientos; controles móviles de al menos 44 px de altura y campos con texto de 16 px.
- Cabecera del técnico adaptada a móvil y botones de cierre apilados en pantallas estrechas.
- Firma ajustada al contenedor mediante ResizeObserver, conservando los trazos al redimensionar y permitiendo entrada táctil.
- Barra de asignación con posición sticky y espacio propio en el contenido.

No se han cambiado consultas, políticas RLS, autenticación ni operaciones de guardado de datos. No se han añadido dependencias de la aplicación.

## Validación

43 pantallas o estados, en ocho dimensiones: **344 combinaciones verificadas, sin fallos pendientes**. Incluyendo repeticiones tras los ajustes, se ejecutaron 399 comprobaciones finales satisfactorias.

| Ancho | Alto | Uso simulado |
| --- | --- | --- |
| 320 | 740 | Móvil pequeño |
| 375 | 812 | Móvil |
| 390 | 844 | Móvil |
| 768 | 1024 | Tablet vertical |
| 1024 | 768 | Tablet / ordenador compacto |
| 1440 | 900 | Ordenador |
| 844 | 390 | Horizontal |
| 390 | 400 | Altura disponible reducida |

Cobertura: acceso, registro, espera de aprobación, selección de módulos, avisos, clientes, historial, usuarios, productividad, mantenimientos, instalaciones, puertas, accesorios, contratos, grupos, incidencias y los cinco pasos del técnico. Incluye menús abiertos, ventanas, firma con ratón y eventos táctiles, borrado y redimensionado.

Las pruebas comprueban desbordamientos horizontales, recortes en tarjetas, columnas de formularios, límites de las ventanas, errores del navegador y acceso a controles tras desplazamiento. Las capturas se han revisado en móvil y escritorio.

- Compilación: npm run build correcto.
- Diff: git diff --check correcto.
- ESLint de src: 39 errores y 6 advertencias tanto en HEAD original como tras el cambio; **ninguna incidencia nueva**. El lint global del proyecto sigue requiriendo resolver esos problemas previos.
- Vite mantiene el aviso sobre un paquete de JavaScript superior a 500 kB.

## Evidencias locales

Los resultados y capturas se encuentran en ../responsive-audit/:

- summary.json: resultados consolidados.
- final/results.json: matriz principal.
- additional/results.json: estados adicionales.
- completed/results.json: pantalla de visita completada.
- recheck/results.json: comprobaciones tras mejorar tablas y desplazamiento.
- low-height/results.json: controles de menús y ventanas con altura reducida.
- final/lint.json: comparación del análisis estático.
- final/: capturas de escritorio y móvil. Las capturas actualizadas de tablas móviles están en recheck/.

Las copias de los archivos originales modificados en la primera pasada están en ../.responsive-backup/; Git conserva la versión original de todos los archivos rastreados.

## Repetir las pruebas

1. Iniciar Vite en frontend: npm run dev -- --host 127.0.0.1 --port 5173 --strictPort.
2. Tener Playwright con Chromium instalado en el entorno de pruebas. El script admite PLAYWRIGHT_MODULE para indicar una instalación existente; en esta revisión se reutilizó una instalación local.
3. Ejecutar desde frontend: node scripts/responsive-check.cjs.

Variables opcionales: RESPONSIVE_BASE_URL, RESPONSIVE_OUTPUT, RESPONSIVE_SCENE (expresión regular) y RESPONSIVE_SIZES (lista JSON de pares ancho/alto).

El navegador utiliza datos ficticios e intercepta las peticiones externas. Ninguna prueba accede a Supabase real ni guarda datos en producción.

## Límites

Verificado en Chromium con emulación de tamaños y eventos táctiles. La altura reducida simula menos espacio disponible; no reproduce el teclado virtual real de iOS o Android. Queda pendiente una comprobación en dispositivos físicos y Safari/iOS, incluida la PWA instalada. Esta revisión no certifica la seguridad ni el funcionamiento completo del backend.
