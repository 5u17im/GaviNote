# Registro de Cambios (Changelog) — GraviNote

Todos los cambios notables en este proyecto serán documentados en este archivo. El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [SemVer](https://semver.org/spec/v2.0.0.html).

> **Empresa:** Nothing Sense  
> **Desarrollador:** 5u17im

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
- **Advertencias de Renderizado (Zustand):** Eliminado el aviso `Cannot update a component while rendering a different component` al simplificar el flujo de `UndoToast.tsx`, derivando la visibilidad directamente del store (eliminando estados locales duplicados) y difiriendo la limpieza en un `setTimeout` asíncrono. También se corrigió el escapado de caracteres especiales en JSX.

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
