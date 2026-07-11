import { NodeMeta, Connection } from '../../types/node.types';
import { CATEGORY_PHYSICS } from '../../physics/bodies';

export const INITIAL_DEMO_NODES: NodeMeta[] = [
  {
    id: 'demo-1',
    title: '🚀 Bienvenido a GraviNote',
    content: 'Estás en un lienzo de física 2D. Arrástrame y suéltame hacia cualquier dirección para sentir la inercia del espacio.',
    tags: ['tutorial', 'bienvenida'],
    category: 'idea',
    initialX: 0,
    initialY: 0,
    width: CATEGORY_PHYSICS.idea.width,
    height: CATEGORY_PHYSICS.idea.height,
    createdAt: Date.now(),
  },
  {
    id: 'demo-2',
    title: '✨ Edición sin fricción',
    content: 'Haz doble clic en este texto o en cualquier nodo para editar su contenido sin detener la física del lienzo.',
    tags: ['tutorial', 'interaccion'],
    category: 'tarea',
    initialX: -320,
    initialY: -150,
    width: CATEGORY_PHYSICS.tarea.width,
    height: CATEGORY_PHYSICS.tarea.height,
    createdAt: Date.now() - 1000,
  },
  {
    id: 'demo-3',
    title: '🧲 Conexiones Elásticas',
    content: '¿Ves esta línea? Es un resorte físico. Si mueves el nodo central, yo lo seguiré flotando suavemente.',
    tags: ['tutorial', 'resortes'],
    category: 'referencia',
    initialX: 320,
    initialY: 150,
    width: CATEGORY_PHYSICS.referencia.width,
    height: CATEGORY_PHYSICS.referencia.height,
    createdAt: Date.now() - 2000,
  },
  {
    id: 'demo-4',
    title: '🗑️ Tu lienzo, tus reglas',
    content: '¿Listo para empezar? Presiona el botón \'Limpiar Lienzo\' en la barra inferior (o la tecla Supr) para empezar tu propio mapa desde cero.',
    tags: ['tutorial', 'personalizacion'],
    category: 'alerta',
    initialX: 0,
    initialY: 280,
    width: CATEGORY_PHYSICS.alerta.width,
    height: CATEGORY_PHYSICS.alerta.height,
    createdAt: Date.now() - 3000,
  },
];

export const INITIAL_DEMO_CONNECTIONS: Connection[] = [
  {
    id: 'demo-conn-12',
    sourceId: 'demo-1',
    targetId: 'demo-2',
    type: 'apoyo', // Verde Esmeralda
  },
  {
    id: 'demo-conn-13',
    sourceId: 'demo-1',
    targetId: 'demo-3',
    type: 'neutra', // Gris Acero
  },
];
