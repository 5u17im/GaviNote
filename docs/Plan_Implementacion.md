# Plan de Implementación — GraviNote

> **Empresa:** Nothing Sense | **Desarrollador:** 5u17im  
> **Stack:** Next.js 16.2.10 · Matter.js · Zustand · Framer Motion · Tailwind CSS  
> **Deploy:** Vercel | **Idioma UI:** Español

---

## Decisiones de Diseño Aprobadas (via /grill-me)

| # | Área | Decisión |
|---|------|----------|
| 1 | **Renderizado de Nodos** | DOM overlay absolutamente posicionado sobre Matter.js (texto seleccionable, accesible, 60 FPS hasta ~200 nodos) |
| 2 | **Persistencia** | localStorage con autosave debounce 500ms + botón "Exportar / Importar Respaldo (JSON)" en HUD |
| 3 | **Lienzo** | Infinito híbrido: CSS transform (scale + translate3d GPU) para viewport; Matter.js opera en Arena de Contención 6000×6000px con 4 paredes estáticas invisibles con restitución suave. Screen-to-world coordinate mapping en tiempo real. HUD: botón "Zoom to Fit" + atajo `0` |
| 4 | **Conexiones — Física** | Matter.Constraint con stiffness: 0.005–0.01, damping: 0.05. "Efecto Ecosistema": arrastrar un nodo padre arrastra sus hijos suavemente |
| 5 | **Conexiones — Visual** | SVG Bézier dinámico: curvatura responde a la distancia (se relaja si cerca, se tensa si lejos). **3 tipos semánticos con Click-to-Cycle:** Neutro (#64748B, continua) → Apoyo (#059669, gruesa) → Conflicto (#DC2626, punteada) → Neutro |
| 6 | **Onboarding** | 4 nodos demo interactivos (Ecosistema funcional: 🟢 Nodo Central 'Bienvenido', 🔵 Nodo 2 'Edición sin fricción' [conectado con resorte], 🟣 Nodo 3 'Conexiones Elásticas' [conectado con resorte], 🔴 Nodo 4 'Tu lienzo, tus reglas' [libre]). HUD resalta botón 'Limpiar Lienzo y Empezar' |
| 7 | **Mobile** | Soporte táctil básico: arrastrar con un dedo, pellizcar para zoom. Sin rediseño de layout específico para móvil |
| 8 | **Deshacer** | Solo para borrado: toast de 10 segundos con botón "Recuperar nota" |
| 9 | **Deploy** | Vercel (integración nativa Next.js, CDN global, SSL automático) |
| 10 | **Tipografía** | `DM Serif Display` (logo/títulos) · `Inter` (cuerpo de nodos) · `JetBrains Mono` (tags/metadatos) |
| 11 | **Tema** | Dark Mode único: fondo `#0B0F19`, sin modo claro |

---

## Fases de Ejecución

### Fase 0: Paquete Documental ✅
- PRD completo
- Especificación de Arquitectura
- Tutorial de Integración y Uso para Desarrolladores + Manual de Usuario

---

### Fase 1: Entorno y Lienzo de Física
**Archivos clave a crear:**

- `src/app/layout.tsx` — Fuentes Google (DM Serif Display, Inter, JetBrains Mono), metadatos SEO en español
- `src/app/globals.css` — Variables CSS del sistema de diseño, reset
- `src/physics/engine.ts` — Factory: Engine + Runner + World
- `src/physics/bodies.ts` — Helpers: createNodeBody, destroyNodeBody
- `src/components/canvas/PhysicsCanvas.tsx` — Contenedor principal, inicializa motor, monta arena 6000×6000
- `src/components/canvas/BackgroundDots.tsx` — Grilla de puntos reactiva al cursor (canvas 2D)
- `src/hooks/usePhysicsEngine.ts` — Ciclo de vida del motor con cleanup correcto

**Criterio de aceptación:** 10 cuerpos flotantes en el lienzo a 60 FPS, sin fugas de memoria al desmontar.

---

### Fase 2: Sistema de Nodos y Sincronización de Estado
**Archivos clave a crear:**

- `src/types/node.types.ts` — NodeMeta, NodeCategory, NodeType
- `src/store/useGraviStore.ts` — Store Zustand con slices: nodes, connections, physicsConfig
- `src/hooks/usePhysicsSync.ts` — Bridge RAF: lee posiciones de Matter.js, aplica via `element.style.transform` (0 re-renders)
- `src/hooks/useDragNode.ts` — Drag con screen-to-world mapping, conserva inercia al soltar
- `src/components/nodes/NodeCard.tsx` — Tarjeta glassmorphism base
- `src/components/nodes/NodeEditor.tsx` — Modo edición (ancla el cuerpo físico)
- `src/components/nodes/NodeContextMenu.tsx` — Menú clic derecho: Categorizar, Editar, Eliminar
- `src/components/canvas/NodeOverlay.tsx` — Renderiza todos los NodeCard sobre el canvas

**Criterio de aceptación:** Crear, editar, categorizar y borrar nodos. El texto de los nodos no interfiere con el arrastre.

---

### Fase 3: Lógica Magnética, Conexiones y Onboarding
**Archivos clave a crear:**

- `src/physics/forces.ts` — Atracción/repulsión por etiquetas compartidas
- `src/physics/constraints.ts` — Helpers para Matter.Constraint (resortes)
- `src/hooks/useMagneticForces.ts` — Aplica fuerzas magnéticas en cada tick
- `src/hooks/useConnectionDraw.ts` — Shift+Drag para iniciar conexión, gestión de previsualización
- `src/components/canvas/SVGConnectionLayer.tsx` — Bézier dinámico, Click-to-Cycle de tipo, catenaria reactiva a distancia
- `src/utils/bezier.ts` — Cálculo de puntos de control
- `src/components/canvas/DemoNodes.ts` — Datos de los 4 nodos de tutorial inicial:
  * **Nodo 1 (Central/Idea - Cian):** Título: `🚀 Bienvenido a GraviNote`, Contenido: `Estás en un lienzo de física 2D. Arrástrame y suéltame hacia cualquier dirección para sentir la inercia del espacio.`
  * **Nodo 2 (Tarea - Ámbar, Conectado al central):** Título: `✨ Edición sin fricción`, Contenido: `Haz doble clic en este texto o en cualquier nodo para editar su contenido sin detener la física del lienzo.`
  * **Nodo 3 (Referencia - Violeta, Conectado al central):** Título: `🧲 Conexiones Elásticas`, Contenido: `¿Ves esta línea? Es un resorte físico. Si mueves el nodo central, yo lo seguiré flotando suavemente.`
  * **Nodo 4 (Alerta - Coral, Libre/Flotando):** Título: `🗑️ Tu lienzo, tus reglas`, Contenido: `¿Listo para empezar? Presiona el botón 'Limpiar Lienzo' en la barra inferior (o la tecla Supr) para empezar tu propio mapa desde cero.`

**Criterio de aceptación:** Magnetismo funcional, conexiones elásticas que arrastran nodos hijos, Click-to-Cycle en 3 tipos.

---

### Fase 4: Capa Visual, HUD y Exportación
**Archivos clave a crear:**

- `src/components/hud/HUDPanel.tsx` — Panel flotante Framer Motion con todos los controles
- `src/components/hud/GravitySlider.tsx` — Control de gravedad 0–1
- `src/components/hud/FrictionSlider.tsx` — Control de fricción de aire
- `src/components/hud/HUDActions.tsx` — Big Bang, Limpiar y Empezar, Exportar, Importar, Zoom Fit
- `src/components/particles/DisintegrationEffect.tsx` — Burst de 12–20 partículas en canvas 2D
- `src/components/nodes/registry/` — IdeaNode, TaskNode, ReferenceNode, AlertNode (glassmorphism completo, borde neón sólido por categoría)
- `src/utils/serializer.ts` — Serialización / deserialización del estado completo
- `src/utils/colorMap.ts` — Mapeo categoría → color sólido neón

**Sistema de colores de nodos:**
| Categoría | Color | Hex |
|-----------|-------|-----|
| Idea | Cian | `#00E5FF` |
| Tarea | Ámbar | `#FFB300` |
| Referencia | Violeta | `#CE93D8` |
| Alerta | Coral | `#FF5252` |

**Sistema de colores de conexiones:**
| Tipo | Estilo SVG | Hex |
|------|-----------|-----|
| Neutra | Continua | `#64748B` |
| Apoyo | Continua gruesa | `#059669` |
| Conflicto | Punteada (dasharray 6,4) | `#DC2626` |

**Criterio de aceptación:** Glassmorphism correcto en todas las categorías, HUD funcional, animación de desintegración completa, export/import JSON funcional.

---

## Plan de Verificación

| Prueba | Criterio |
|--------|----------|
| FPS | ≥ 60 FPS con 100 nodos activos en hardware con GPU integrada |
| Memory | Sin fugas al montar/desmontar 50 nodos en secuencia |
| Persistencia | Estado restaurado correctamente tras cierre y reapertura del navegador |
| Idioma | Cero strings en inglés visibles al usuario en la UI |
| Export/Import | JSON exportado puede reimportarse sin pérdida de datos |
| Arena | Nodos rebotan suavemente en los bordes de la arena 6000×6000 |
| Tactil | Arrastre con un dedo y zoom con pellizco funcionales en tablet |

---

*Nothing Sense © 2026 — Desarrollador: 5u17im*
