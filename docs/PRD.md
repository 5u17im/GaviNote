# GraviNote — Product Requirements Document (PRD)

> **Versión:** 1.0.0  
> **Fecha:** 10 de julio de 2026  
> **Empresa:** Nothing Sense  
> **Desarrollador Principal:** 5u17im  
> **Clasificación:** Documento Interno — Uso Técnico y de Producto

---

## 1. Visión del Producto

**GraviNote** redefine la forma en que los usuarios capturan y relacionan ideas. En lugar de listas y cuadrículas estáticas, cada nota existe como un cuerpo físico flotando en un lienzo de gravedad cero. Las conexiones entre conceptos se forman naturalmente mediante hilos elásticos y magnetismo basado en etiquetas, haciendo que la estructura de conocimiento emerja de forma orgánica, no forzada.

> *"Las mejores ideas nunca permanecen quietas."*

---

## 2. Definición de Usuarios

### 2.1 Personas

| ID | Persona | Descripción | Motivación Principal |
|----|---------|-------------|----------------------|
| P1 | **El Pensador Caótico** | Estudiante universitario o investigador que genera ideas en ráfagas y las organiza después | Externalizar su monólogo interno de forma no lineal |
| P2 | **El Arquitecto de Proyectos** | Product Manager o Tech Lead que mapea dependencias entre tareas y equipos | Visualizar relaciones y dependencias de un proyecto en tiempo real |
| P3 | **El Creativo Visual** | Diseñador, escritor o artista que piensa en clusters de conceptos, no en jerarquías | Expresar relaciones abstractas con libertad espacial total |
| P4 | **El Desarrollador Explorador** | Ingeniero de software que quiere extender la herramienta con nuevos tipos de nodos | API interna clara para programar nodos personalizados |

---

## 3. Casos de Uso Clave

### CU-01: Crear una Nota Flotante
**Actor:** Cualquier usuario autenticado  
**Precondición:** El lienzo de física está activo.  
**Flujo Principal:**  
1. El usuario hace doble clic en el lienzo vacío.
2. Aparece un nodo nuevo en el punto de clic con animación de "materialización" (escala 0 → 1 con bounce).
3. El cursor se posiciona dentro del campo de texto.
4. El usuario escribe el contenido.
5. Al presionar `Escape` o hacer clic fuera, la nota se "suelta" y adopta el comportamiento físico.

**Postcondición:** Un cuerpo físico con metadata está activo en el motor de Matter.js y en el store de Zustand.

---

### CU-02: Arrastrar y Lanzar un Nodo
**Actor:** Cualquier usuario  
**Precondición:** Existe al menos un nodo en el lienzo.  
**Flujo Principal:**  
1. El usuario hace clic y arrastra un nodo.
2. El nodo sigue al cursor con un ligero offset de inercia.
3. Al soltar, el nodo conserva la velocidad del mouse en el momento del release.
4. El nodo desacelera gradualmente por fricción de aire (air friction: 0.01).

---

### CU-03: Conectar Dos Notas con un Hilo
**Actor:** Cualquier usuario  
**Flujo Principal:**  
1. El usuario presiona `Shift` y arrastra desde un nodo hacia otro.
2. Durante el arrastre se renderiza una línea de previsualización (punteada, color neón).
3. Al soltar sobre otro nodo, se crea un `Constraint` de Matter.js y una curva Bézier SVG se renderiza como "hilo de neón".
4. El hilo se deforma elásticamente cuando los nodos se mueven.

---

### CU-04: Magnetismo Automático por Etiquetas
**Actor:** Sistema (automático)  
**Flujo Principal:**  
1. El usuario asigna la etiqueta `#diseño` a dos notas separadas.
2. El algoritmo de atracción detecta que ambas comparten el mismo tag.
3. Aplica una fuerza atractiva suave (`Matter.Body.applyForce`) en cada tick del motor.
4. Las notas migran gradualmente el uno hacia el otro sin colisionar (la repulsión de proximidad las mantiene a distancia segura).

---

### CU-05: Borrar un Nodo con Animación de Desintegración
**Actor:** Cualquier usuario  
**Flujo Principal:**  
1. El usuario presiona `Backspace` con un nodo seleccionado, o hace clic derecho → "Eliminar".
2. El nodo inicia una animación: se eleva y acelera hacia arriba.
3. En el punto máximo, estalla en 12–20 partículas de color que se dispersan y se desvanecen.
4. Se elimina el cuerpo de Matter.js y la entrada del store de Zustand.
5. Los hilos conectados se eliminan simultáneamente con una animación de "corte".

---

### CU-06: Ajustar Física Global desde el HUD
**Actor:** Cualquier usuario  
**Flujo Principal:**  
1. El usuario despliega el panel HUD flotante (icono de gravedad en esquina superior derecha).
2. Desliza el control de "Gravedad" de 0 a 1 (default: 0, gravedad cero).
3. Al aumentar la gravedad, todos los nodos comienzan a caer suavemente.
4. El deslizador de "Fricción de Aire" controla qué tan rápido pierden velocidad.
5. Botón "Big Bang": lanza todos los nodos en direcciones aleatorias desde el centro.
6. Botón "Limpiar Lienzo": activa la animación de desintegración en todos los nodos.

---

### CU-07: Editar el Contenido de una Nota
**Actor:** Cualquier usuario  
**Flujo Principal:**  
1. El usuario hace doble clic sobre un nodo existente.
2. El nodo se "ancla" momentáneamente (se pausa su cuerpo físico).
3. El contenido se vuelve editable.
4. Al salir de la edición, el nodo vuelve a ser dinámico.

---

### CU-08: Asignar Categoría (Color / Tipo)
**Actor:** Cualquier usuario  
**Flujo Principal:**  
1. El usuario hace clic derecho sobre un nodo → "Categorizar".
2. Un menú de categorías aparece: Idea (cian), Tarea (ámbar), Referencia (violeta), Alerta (coral).
3. Al seleccionar, el borde neón del nodo cambia de color y la masa del cuerpo cambia proporcionalmente.

> **Nota:** Existe además una categoría interna `central` (pozo gravitatorio) usada por el sistema para nodos ancla de mayor masa. No se ofrece en el menú de categorización al usuario; se documenta en `Arquitectura.md` y `Tutorial.md`.

---

### CU-09: Zoom y Navegación del Lienzo
**Actor:** Cualquier usuario  
**Flujo Principal:**  
1. El usuario usa la rueda del mouse para hacer zoom in/out del lienzo.
2. En táctil, el usuario hace *pinch* con dos dedos para hacer zoom (el zoom se limita entre 0.15x y 3.0x).
3. Con clic central + arrastre, barra espaciadora + arrastre, o arrastre del fondo, el usuario hace pan por el lienzo.
4. El lienzo es conceptualmente infinito.

---

### CU-10: Exportar el Mapa
**Actor:** Cualquier usuario  
**Flujo Principal:**  
1. Desde el HUD, el usuario elige "Exportar" → descarga un archivo JSON con los datos del mapa.
2. En formato JSON: se serializa el store de Zustand (posiciones, contenido, etiquetas, conexiones) mediante `utils/serializer.ts`.

> **Nota (v1.1.0):** La exportación a **PNG** queda **fuera de scope** de V1 (ver §6). Para una captura visual, el usuario puede usar la captura de pantalla del sistema operativo. Se evita añadir `html2canvas` porque los `transform` del viewport, el SVG de conexiones y el glassmorphism no se renderizan de forma fiable, y supondría una dependencia adicional.

---

### CU-11: Importar / Restaurar un Mapa
**Actor:** Cualquier usuario  
**Flujo Principal:**  
1. Desde el HUD → "Importar" → selección de archivo JSON exportado previamente.
2. Se reconstruye el estado: nodos, posiciones y conexiones se restauran.
3. Los cuerpos físicos se re-inicializan en Matter.js con las posiciones guardadas.

---

### CU-12: Modo Colaboración (V2 — Fuera de Scope Inicial)
**Nota:** Definido para roadmap futuro. Requiere WebSockets y CRDT.

---

## 4. Historias de Usuario con Criterios de Aceptación

### HU-001
> **Como** pensador caótico, **quiero** crear notas con doble clic en cualquier parte del lienzo **para** capturar ideas sin interrumpir mi flujo.

**Criterios de Aceptación:**
- [ ] El doble clic en el lienzo vacío (no sobre un nodo) crea un nuevo nodo.
- [ ] El nodo aparece exactamente en la posición del doble clic (±5px de tolerancia).
- [ ] La animación de creación dura entre 200ms y 400ms.
- [ ] El cursor se sitúa automáticamente en el campo de texto.

---

### HU-002
> **Como** arquitecto de proyectos, **quiero** conectar notas con hilos visuales **para** mostrar dependencias entre tareas.

**Criterios de Aceptación:**
- [ ] `Shift + Drag` desde un nodo inicia la creación de una conexión.
- [ ] Una línea de previsualización se muestra durante el arrastre.
- [ ] Al soltar sobre otro nodo, la conexión se establece y persiste en el store.
- [ ] El hilo se mueve elásticamente cuando cualquiera de los dos nodos se mueve.
- [ ] Un nodo puede tener hasta 10 conexiones simultáneas sin degradar el rendimiento.

---

### HU-003
> **Como** creativo visual, **quiero** que las notas se atraigan según sus etiquetas **para** que mi mapa se auto-organice visualmente.

**Criterios de Aceptación:**
- [ ] Dos nodos con la misma etiqueta se atraen con fuerza configurable (base: `0.00008`, rango de atracción hasta 450px; ver `ATTRACTION_BASE_STRENGTH`/`ATTRACTION_DISTANCE` en `src/physics/forces.ts`).
- [ ] La fuerza de atracción nunca colapsa los nodos (hay repulsión de proximidad < 150px, `REPULSION_DISTANCE`).
- [ ] La atracción/repulsión no impide el arrastre manual del usuario.
- [ ] El rendimiento se mantiene a 60 FPS con hasta 100 nodos con etiquetas activas.

---

### HU-004
> **Como** desarrollador explorador, **quiero** una API interna clara **para** programar nuevos tipos de nodos sin romper la arquitectura existente.

**Criterios de Aceptación:**
- [x] Existe un registro central de categorías de nodos (`CATEGORY_INFO` en `src/components/nodes/registry/index.ts`) con metadata y color por categoría.
- [ ] Un nuevo tipo de nodo se puede agregar en ≤ 3 archivos sin modificar el motor de física.
- [x] El tutorial de integración está disponible en el repositorio.

> **Estado de implementación (v1.1.0):** el registro actual es estático (`CATEGORY_INFO`), no un `NODE_REGISTRY` extensible. Añadir una categoría implica tocar `NodeCategory`, `CATEGORY_INFO` y la lógica de `NodeCard`. Pendiente para una futura versión convertirlo en un registro plug-in real.

---

## 5. Requisitos No Funcionales

| ID | Categoría | Requisito |
|----|-----------|-----------|
| RNF-01 | Rendimiento | El motor de física debe correr a mínimo 60 FPS con 200 nodos activos en hardware moderno (GPU integrada). El cálculo de fuerzas usa un *spatial hash grid* (cuasi O(N)); existe una prueba de rendimiento en `src/physics/forces.test.ts` que acota el tiempo de un tick de fuerzas con 200 nodos como proxy verificable del presupuesto de frame (16.6ms). |
| RNF-02 | Accesibilidad | Todos los nodos deben ser navegables por teclado (`Tab`, `Enter`, `Escape`). |
| RNF-03 | Persistencia | El estado del lienzo se persiste en `localStorage` con debounce de 500ms. |
| RNF-04 | Compatibilidad | Chrome 110+, Firefox 115+, Safari 16+, Edge 110+. |
| RNF-05 | Responsive / Táctil | El lienzo funciona en pantallas desde 768px de ancho (tablet landscape). Soporta gestos táctiles: arrastre de un dedo para pan y *pinch* de dos dedos para zoom. |
| RNF-06 | Seguridad | Contenido de notas saneado a la entrada (`utils/sanitize.ts`: elimina caracteres de control y limita longitud); el renderizado se apoya en el escape nativo de React. No se usa DOMPurify porque no se renderiza HTML crudo. |
| RNF-07 | Escalabilidad | Arquitectura preparada para soporte multi-usuario en V2 (WebSockets-ready). |

---

## 6. Alcance de la Versión 1.0

### ✅ In Scope
- Lienzo de física infinito con zoom y pan
- Creación, edición y eliminación de nodos
- Drag & drop con inercia física
- Conexiones elásticas entre nodos
- Magnetismo por etiquetas
- Categorización de nodos por color
- HUD de control de física
- Animación de desintegración
- Exportar/Importar en JSON
- Zoom táctil por *pinch* (dos dedos)
- Persistencia en localStorage

### ❌ Out of Scope (V2)
- Colaboración en tiempo real
- Autenticación y cuentas de usuario
- Backend / base de datos en la nube
- Aplicación móvil nativa
- Modo de presentación / slides
- Exportación a PNG / imagen (se recomienda captura del SO)

---

## 7. Roadmap de Hitos

| Hito | Entregable | ETA |
|------|-----------|-----|
| M1 | Documentación técnica completa | Semana 1 |
| M2 | Canvas de física funcional a 60 FPS | Semana 2 |
| M3 | Sistema de nodos y estado sincronizado | Semana 3 |
| M4 | Magnetismo y conexiones elásticas | Semana 4 |
| M5 | Capa visual completa (Glassmorphism + HUD) | Semana 5 |
| M6 | QA, Exportación y Launch V1.0 | Semana 6 |

---

*Documento generado por Nothing Sense © 2026 — Desarrollador: 5u17im*
