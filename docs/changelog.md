# Registro de Cambios (Changelog) — GraviNote

Todos los cambios notables en este proyecto serán documentados en este archivo. El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [SemVer](https://semver.org/spec/v2.0.0.html).

> **Empresa:** Nothing Sense  
> **Desarrollador:** 5u17im

---

## [1.1.0] - 2026-07-13

### Añadido
- **Suite de Pruebas (Vitest):** Configuración `vitest.config.ts` (jsdom) y 33 pruebas unitarias sobre `sanitize`, `serializer`, el store de Zustand y las fuerzas físicas. Scripts `test` y `test:watch`.
- **Bus de Comandos Tipado:** Nuevo `utils/commandBus.ts` que reemplaza los `window` CustomEvents (`trigger-bigbang`, `trigger-clear-canvas`, `trigger-zoom-fit`, `edit-node-*`) con un bus seguro en tipos y testeable.
- **Hook `useCanvasCommands`:** Extrae los listeners de comandos globales (Big Bang, Limpiar, Zoom-to-Fit) fuera de `PhysicsCanvas`.
- **Utilidades de Robustez:** `utils/logger.ts` (logging solo en desarrollo) y `utils/sanitize.ts` (saneo y límites de texto para títulos, contenido y etiquetas).
- **Versionado de Esquema:** `serializer.ts` incorpora `SCHEMA_VERSION`, `validateSnapshot` y `serializeSnapshot` para importaciones seguras y compatibilidad futura.
- **Accesibilidad (RNF-02):** `NodeCard` navegable por teclado (`tabIndex`, `role`, atributos `aria-*`, Enter para editar); atajos globales de teclado (Supr/Backspace elimina, Escape deselecciona).
- **Tipo `NodeBody`:** Tipo dedicado en `bodies.ts` que elimina los casts `as unknown as { ... }`.

### Cambiado
- **Rendimiento de Fuerzas:** `forces.ts` migrado de O(N²) a una **rejilla espacial (spatial hash grid)**, reduciendo drásticamente el coste con muchos nodos.
- **Sincronización RAF:** `usePhysicsSync` usa un `Map` de nodos por frame y refs de SVG cacheadas en lugar de búsquedas y consultas al DOM repetidas.
- **Fuentes:** Migradas de `@import` de Google Fonts a `next/font/google` (auto-hospedadas) con variables CSS dedicadas.
- **Store en Slices:** `useGraviStore` recompuesto a partir de `nodesSlice`, `connectionsSlice` y `physicsSlice` conforme a la arquitectura documentada.
- **Viewport Responsivo:** `PhysicsCanvas` escucha `resize` y usa dimensiones de viewport en estado en lugar de leer `window.innerWidth/Height` directamente.

### Corregido
- **Persistencia Corrupta:** La carga desde `localStorage` ahora valida y sanea el snapshot, descartando conexiones huérfanas y datos inválidos.
- **Advertencia de Linter:** Documentado el `eslint-disable` del efecto de inicialización en `usePhysicsEngine`.

---

## [1.0.0] - 2026-07-10

### Añadido
- **Implementación del Core:** Estructura base de Next.js 16.2.10 en español, variables CSS en `globals.css` y layouts con fuentes de Google (`DM Serif Display`, `Inter`, `JetBrains Mono`).
- **Motor de Física (Matter.js):** Configuración de arena de contención `6000x6000px` con bordes invisibles suaves, e inercia/amortiguación adaptada.
- **Zustand Store:** Manejo de estado centralizado para nodos, conexiones, variables físicas (gravedad, fricción del aire, magnetismo), zoom, desplazamiento (panning) y carga de demostraciones.
- **Sincronización por RAF:** Renderizador optimizado a 60 FPS mediante `requestAnimationFrame` que aplica posiciones directamente en los atributos `transform` del DOM y `d` de SVG (0 re-renders de React).
- **Arrastre e Inercia:** Arrastre de nodos basado en coordenadas del mundo real con velocidad instantánea acumulativa para inercia de lanzamiento al soltar.
- **Conexiones Elásticas & Semánticas:** Resortes físicos suaves entre nodos. Capa SVG con Click-to-Cycle (Neutro, Apoyo, Conflicto) e hilado Bézier interactivo.
- **Efecto de Desintegración:** Partículas físicas de canvas que simulan la explosión y flotado de nodos eliminados.
- **HUD e Interfaz:** Sliders interactivos de física, panel de atajos de teclado, botones para comandos (Big Bang, Limpiar, Centrar) y serializadores JSON para descarga/carga de respaldos locales.
- **Persistencia Local:** Auto-guardado en localStorage con debounce de 500ms y toast de recuperación (deshacer borrado) con contador visual de 10 segundos.

### Corregido
- **Aviso de Hidratación (SSR):** Solucionado de raíz el error de Hydration Mismatch en Next.js App Router mediante la carga dinámica de `PhysicsCanvas` (`dynamic` import con `ssr: false`) en `page.tsx`, convirtiendo la vista raíz en un Client Component.
- **Linter de React (Acceso a Refs):** Solucionados los errores de compilación `Cannot access refs during render` al refactorizar las llamadas de los hooks `usePhysicsSync`, `useMagneticForces` y `useDragNode` para pasar la referencia mutable `engineRef` directamente, evaluando `.current` únicamente en callbacks y efectos.
- **Prefijos CSS:** Corrección del orden de las directivas `-webkit-backdrop-filter` y `backdrop-filter` en la hoja de estilos de glassmorphism.
- **Gestos Interactivos de Nodos:** Corrección de conflictos de pointer capture implementando un umbral de arrastre de `4px` en `useDragNode.ts`, permitiendo procesar de manera nativa y sin interferencias los eventos de click, doble click (editar) y right-click (menú contextual).
- **Ruteo de Conexiones SVG:** Ruteo unificado de puntero en el visor para permitir el dibujado y enlace de resortes SVG con `Shift + Drag` cuando el foco está capturado por una tarjeta de nodo.
- **Menú Contextual:** Elevación de las coordenadas del menú contextual a la raíz del visor en `PhysicsCanvas.tsx` en espacio de pantalla (screen-space), previniendo desvíos por zoom y paneo de cámara.
- **Advertencias de Renderizado (Zustand):** Eliminado definitivamente el aviso `Cannot update a component while rendering a different component` al re-diseñar `UndoToast.tsx` para animar la barra con CSS `@keyframes` por GPU, eliminando el 100% de estados locales e intervalos. La visibilidad se deriva directamente del store y la expiración se gestiona asíncronamente con un único `setTimeout`.

---

## [1.0.0-fase0] - 2026-07-10

### Añadido
- **PRD (Documento de Requerimientos de Producto):** Definición de la visión del producto, perfiles de usuario, historias de usuario con criterios de aceptación detallados y hitos de desarrollo.
- **Especificación de Arquitectura:** Diseño del bridge de sincronización Matter.js ↔ React sin re-renders innecesarios (manipulación DOM directa en RAF), esquema de Zustand Slices, cálculo de trazados Bézier para conexiones y fórmulas físicas de magnetismo.
- **Tutorial de Integración y Uso:** Manual para desarrolladores explicando cómo añadir un nuevo tipo de nodo (ejemplo paso a paso para el tipo `pregunta`), y guía completa de usuario para interactuar con el lienzo físico.
- **Plan de Implementación:** Pipeline técnico secuencial para el desarrollo dividido en 4 fases de ejecución.
- **Registro de Cambios (Changelog):** Este archivo para la bitácora y auditoría de adiciones, cambios y correcciones.

---

### Notas de Versión
* La documentación técnica inicial ha sido consolidada en la carpeta `/docs` del proyecto como base de conocimiento técnico y funcional.
* El lienzo se ha definido como **Modo Oscuro único** con soporte de fuentes editoriales (`DM Serif Display` + `Inter` + `JetBrains Mono`).
