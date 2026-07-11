# GraviNote — Tutorial de Integración y Uso

> **Versión:** 1.0.0  
> **Empresa:** Nothing Sense  
> **Desarrollador Principal:** 5u17im  
> **Audiencia:** Nuevos desarrolladores del equipo + usuarios finales  
> **Fecha:** 10 de julio de 2026

---

## PARTE 1: PARA NUEVOS DESARROLLADORES

### Introducción Rápida

Antes de empezar, ten en cuenta los tres principios que gobiernan GraviNote:

1. **El motor de física es ciego.** Matter.js no sabe qué es un nodo, solo mueve cuerpos circulares/rectangulares con propiedades físicas. La UI no debe jamás modificar directamente el motor; usa los helpers de `src/physics/`.
2. **Las posiciones no son estado de React.** Nunca uses `useState` para la coordenada (x, y) de un nodo durante la simulación. Eso saturaria el hilo principal.
3. **El registro de nodos es tu punto de entrada.** Para agregar un nuevo tipo de nodo, no toques el motor ni el canvas. Solo trabaja con los tres archivos que se indican en el tutorial.

---

### 1.1 Cómo Agregar un Nuevo Tipo de Nodo

Este proceso requiere exactamente **3 archivos** y ninguna modificación al motor de física:

---

#### Paso 1: Define el tipo en `node.types.ts`

```typescript
// src/types/node.types.ts

// ANTES:
export type NodeCategory = 'idea' | 'tarea' | 'referencia' | 'alerta';

// DESPUÉS (agregando el nuevo tipo "pregunta"):
export type NodeCategory = 'idea' | 'tarea' | 'referencia' | 'alerta' | 'pregunta';
```

---

#### Paso 2: Crea el componente visual del nodo

Crea el archivo `src/components/nodes/registry/PreguntaNode.tsx`:

```tsx
// src/components/nodes/registry/PreguntaNode.tsx
import type { NodeMeta } from '@/types/node.types';

// Color de acento para este tipo (sólido, nunca gradiente)
export const PREGUNTA_COLOR = '#4CAF50'; // verde esmeralda

interface Props {
  node: NodeMeta;
  isSelected: boolean;
  onDoubleClick: () => void;
}

export function PreguntaNode({ node, isSelected, onDoubleClick }: Props) {
  return (
    <div
      onDoubleClick={onDoubleClick}
      style={{
        // Glassmorphism base
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        // Borde neón en el color de la categoría
        border: `1px solid ${isSelected
          ? PREGUNTA_COLOR
          : 'rgba(76, 175, 80, 0.3)'}`,
        boxShadow: isSelected
          ? `0 0 16px ${PREGUNTA_COLOR}55`
          : `0 0 6px ${PREGUNTA_COLOR}22`,
        borderRadius: '12px',
        padding: '16px',
        minWidth: '180px',
        cursor: 'grab',
      }}
    >
      {/* Indicador de tipo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', color: PREGUNTA_COLOR, fontFamily: 'JetBrains Mono' }}>
          ❓ PREGUNTA
        </span>
      </div>

      {/* Contenido */}
      <p style={{ color: '#F0F4FF', fontSize: '14px', fontFamily: 'Inter', margin: 0 }}>
        {node.content || 'Escribe tu pregunta...'}
      </p>

      {/* Tags */}
      {node.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '10px', flexWrap: 'wrap' }}>
          {node.tags.map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '11px',
                color: PREGUNTA_COLOR,
                fontFamily: 'JetBrains Mono',
                background: `${PREGUNTA_COLOR}18`,
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Configuración física de este tipo de nodo
// El motor usará estos valores al crear el cuerpo en Matter.js
export const PREGUNTA_PHYSICS = {
  mass: 1.2,         // más pesado que una idea (1.0)
  frictionAir: 0.015, // frena un poco más rápido
  restitution: 0.4,   // rebota 40% de su energía al chocar
  width: 200,
  height: 80,
};
```

---

#### Paso 3: Registra el nodo en el índice central

```typescript
// src/components/nodes/registry/index.ts

import { IdeaNode, IDEA_PHYSICS } from './IdeaNode';
import { TaskNode, TASK_PHYSICS } from './TaskNode';
import { ReferenceNode, REFERENCE_PHYSICS } from './ReferenceNode';
import { AlertNode, ALERT_PHYSICS } from './AlertNode';
import { PreguntaNode, PREGUNTA_PHYSICS } from './PreguntaNode'; // 👈 nuevo

import type { NodeCategory } from '@/types/node.types';

// Registro central: categoría → componente + física
export const NODE_REGISTRY: Record<NodeCategory, {
  component: React.ComponentType<any>;
  physics: { mass: number; frictionAir: number; restitution: number; width: number; height: number };
  label: string;
  color: string;
}> = {
  idea:        { component: IdeaNode,      physics: IDEA_PHYSICS,      label: 'Idea',        color: '#00E5FF' },
  tarea:       { component: TaskNode,      physics: TASK_PHYSICS,      label: 'Tarea',       color: '#FFB300' },
  referencia:  { component: ReferenceNode, physics: REFERENCE_PHYSICS, label: 'Referencia',  color: '#CE93D8' },
  alerta:      { component: AlertNode,     physics: ALERT_PHYSICS,     label: 'Alerta',      color: '#FF5252' },
  pregunta:    { component: PreguntaNode,  physics: PREGUNTA_PHYSICS,  label: 'Pregunta',    color: '#4CAF50' }, // 👈
};
```

**Listo.** El motor de física leerá automáticamente `PREGUNTA_PHYSICS` al crear el cuerpo. El componente visual se renderizará cuando el store tenga un nodo con `category: 'pregunta'`. No se modificó ningún otro archivo.

---

### 1.2 Cómo Ajustar las Variables de Física

Todas las constantes físicas de Matter.js se configuran en dos lugares:

#### Variables Globales del Motor (aplican a todos los nodos)

```typescript
// src/physics/engine.ts

export function createPhysicsEngine(config: PhysicsConfig) {
  const engine = Matter.Engine.create({
    gravity: {
      x: 0,
      y: config.gravity,  // 0 = gravedad cero, 1 = normal terrestre
    },
  });

  return engine;
}
```

| Variable | Tipo | Rango Recomendado | Efecto |
|----------|------|-------------------|--------|
| `gravity.y` | `number` | `0.0 – 1.0` | 0 = flotan, 1 = caen como en la Tierra |
| `gravity.x` | `number` | `-0.5 – 0.5` | Gravedad lateral (efecto "viento") |
| `engine.timing.timeScale` | `number` | `0.1 – 2.0` | Velocidad de la simulación (cámara lenta / rápida) |

#### Variables por Tipo de Nodo (en cada archivo del registry)

```typescript
// En cualquier archivo NodeXxx.tsx, el objeto PHYSICS

export const MI_NODO_PHYSICS = {
  mass: 1.0,
  // Cuánto rebota al chocar con otro nodo (0 = plastilina, 1 = pelota de acero)
  restitution: 0.3,
  // Fricción con el aire: 0.001 = casi sin resistencia, 0.1 = mucha resistencia
  frictionAir: 0.01,
  // Fricción con superficies (si hay gravedad activada)
  friction: 0.05,
  // Dimensiones del cuerpo físico (no necesariamente igual al tamaño visual)
  width: 200,
  height: 80,
};
```

#### Variables de Magnetismo

```typescript
// src/physics/forces.ts

// Distancia máxima a la que dos nodos con tags compartidos se atraen
export const ATTRACTION_DISTANCE = 400;   // píxeles

// Distancia mínima antes de que se repelen (para no colisionar)
export const REPULSION_DISTANCE  = 120;   // píxeles

// Intensidad de la atracción (valores muy altos crean comportamiento inestable)
export const ATTRACTION_STRENGTH = 0.00008;

// Intensidad de la repulsión (debe ser mayor que la atracción para evitar colapso)
export const REPULSION_STRENGTH  = 0.0003;
```

> **Consejo:** Si los nodos se "fusionan" en un punto (colapso), aumenta `REPULSION_STRENGTH`. Si nunca se acercan, aumenta `ATTRACTION_STRENGTH` o `ATTRACTION_DISTANCE`.

#### Tablas de Referencia Rápida

**Perfiles de Comportamiento Físico Predefinidos:**

| Perfil | `mass` | `frictionAir` | `restitution` | Sensación |
|--------|--------|---------------|---------------|-----------|
| Burbuja | 0.5 | 0.003 | 0.6 | Ligero, rebota mucho |
| Papel | 0.8 | 0.025 | 0.1 | Flota despacio, frena rápido |
| Piedra | 2.0 | 0.005 | 0.2 | Pesado, poca resistencia al aire |
| Pluma (default) | 1.0 | 0.01 | 0.3 | Equilibrado |

---

### 1.3 Cómo Funciona la Sincronización Matter.js → React (Diagrama de Flujo)

```
[Tick del Motor Matter.js — 60 veces/segundo]
          ↓
  body.position.x, body.position.y actualizados
          ↓
  Para cada body:
    ¿Existe domRefs.current.get(body.id)?
      SÍ → element.style.transform = `translate(${x}px, ${y}px)`
      NO → ignorar (el componente aún no montó)
          ↓
  FIN — React NO re-renderizó nada en este frame
          ↓
[Evento de usuario: doble clic → editar texto]
          ↓
  useGraviStore.updateNode(id, { content: nuevoTexto })
          ↓
  Solo el NodeCard con ese id re-renderiza
          ↓
  El RAF loop continúa sin interrupciones
```

---

## PARTE 2: MANUAL DE USO PARA EL USUARIO FINAL

### 2.1 Primeros Pasos: El Lienzo

Al abrir GraviNote, encontrarás un lienzo oscuro con una grilla de puntos que reacciona suavemente al movimiento de tu cursor. Este es tu espacio de trabajo. No tiene bordes: puedes hacer zoom y desplazarte en cualquier dirección.

**Navegar por el lienzo:**

| Acción | Resultado |
|--------|-----------|
| Rueda del mouse | Alejar / acercar (zoom) |
| Clic central + arrastrar | Desplazar el lienzo (pan) |
| Dos dedos (táctil) | Zoom con pellizco |

---

### 2.2 Crear tu Primera Nota

1. **Haz doble clic** en cualquier parte vacía del lienzo.
2. Aparecerá una tarjeta flotante en el punto exacto donde hiciste clic.
3. Escribe el contenido de tu nota directamente.
4. Presiona `Escape` o haz clic fuera de la tarjeta para "soltarla".
5. La nota empezará a flotar suavemente en el espacio.

> **Consejo:** Puedes crear notas rápidamente sin soltar el ritmo de escritura. Cada doble clic en el vacío crea una nueva nota.

---

### 2.3 Categorizar tus Notas

Las notas tienen cuatro tipos, cada uno con un color neón distinto en su borde:

| Tipo | Color | Cuándo usarlo |
|------|-------|---------------|
| Idea | Cian | Conceptos nuevos, lluvia de ideas |
| Tarea | Ámbar | Acciones, pendientes, TODO |
| Referencia | Violeta | Fuentes, links, citas |
| Alerta | Coral | Problemas, advertencias, bloqueos |

**Para cambiar el tipo:** Haz clic derecho sobre la nota → selecciona "Categorizar" → elige el tipo.

---

### 2.4 Mover y Lanzar Notas

- **Arrastrar:** Haz clic y arrastra cualquier nota. Mientras la mueves, está bajo tu control.
- **Lanzar:** Al soltar con velocidad, la nota conserva el movimiento y sale disparada en esa dirección, desacelerándose gradualmente.

> **Tip:** Haz un movimiento rápido y suéltala para crear efectos de "lanzamiento". Experimenta con la física.

---

### 2.5 Agregar Etiquetas a una Nota

Las etiquetas (tags) son la magia de GraviNote: las notas con etiquetas en común se atraen entre sí automáticamente.

1. Haz clic derecho sobre una nota → "Editar etiquetas".
2. Escribe etiquetas separadas por espacios (ej: `#diseño #ux #prioridad`).
3. Confirma con `Enter`.

Ahora, si otra nota tiene la etiqueta `#diseño`, ambas comenzarán a acercarse lentamente sin que tengas que moverlas.

---

### 2.6 Conectar Notas con Hilos

Para crear una conexión visual explícita entre dos notas:

1. Mantén presionado `Shift`.
2. Haz clic y arrastra desde una nota hacia otra.
3. Verás una línea de previsualización en color neón mientras arrastras.
4. Suéltala sobre la nota destino.

Un hilo elástico de neón quedará conectando ambas notas. El hilo se estira y se contrae cuando las notas se mueven.

**Para eliminar una conexión:** Haz clic derecho sobre el hilo → "Eliminar conexión".

---

### 2.7 Borrar una Nota

**Método 1 — Teclado:**
1. Haz clic sobre la nota para seleccionarla (borde iluminado).
2. Presiona `Backspace` o `Delete`.

**Método 2 — Menú contextual:**
1. Haz clic derecho sobre la nota.
2. Selecciona "Eliminar".

En ambos casos, la nota se elevará y se fragmentará en partículas de luz antes de desaparecer. Los hilos conectados se cortarán simultáneamente.

---

### 2.8 El Panel de Control (HUD)

El panel de control flota en la esquina superior derecha de la pantalla. Haz clic en el ícono ⚙ para desplegarlo.

#### Controles de Física

| Control | Descripción | Default |
|---------|-------------|---------|
| **Gravedad** | Deslizador 0–1. En 0 las notas flotan sin caer. En 1 caen como si hubiera gravedad normal. | 0.0 |
| **Fricción de Aire** | Qué tan rápido desaceleran las notas al moverse. En 0 se mueven eternamente; en 0.1 se detienen casi de inmediato. | 0.01 |
| **Fuerza Magnética** | Intensidad de la atracción entre notas con etiquetas compartidas. | Media |

#### Acciones Globales

| Botón | Efecto |
|-------|--------|
| **Big Bang** | Lanza todas las notas en direcciones aleatorias desde el centro del lienzo con un efecto de explosión. |
| **Limpiar Lienzo** | Elimina todas las notas con la animación de desintegración. Pide confirmación. |
| **Exportar → JSON** | Descarga un archivo `.json` con todo el estado del lienzo (notas, conexiones, posiciones). |
| **Exportar → PNG** | Captura el lienzo visible y lo descarga como imagen. |
| **Importar** | Carga un archivo `.json` exportado previamente para restaurar el estado. |

---

### 2.9 Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Doble clic` | Crear nueva nota (en lienzo vacío) / Editar nota (sobre una nota) |
| `Shift + Arrastrar` | Crear conexión entre notas |
| `Escape` | Salir del modo edición / Deseleccionar |
| `Backspace` / `Delete` | Eliminar nota seleccionada |
| `Ctrl + Z` | Deshacer última acción |
| `Ctrl + Shift + Z` | Rehacer |
| `Ctrl + E` | Exportar como JSON |
| `Ctrl + I` | Importar archivo |
| `Space + Arrastrar` | Pan del lienzo (alternativa a clic central) |
| `+` / `-` | Zoom in / Zoom out |
| `0` | Restablecer zoom al 100% |

---

### 2.10 Consejos de Flujo de Trabajo

**Para sesiones de brainstorming:**
1. Put gravity to **0** and friction of air to **0.005** (almost none).
2. Create notes quickly with double click.
3. Don't worry about layout, tags will self-organize the map in minutes.

---

*Manual generado por Nothing Sense © 2026 — Desarrollador: 5u17im*
