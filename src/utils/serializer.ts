import { NodeMeta, Connection, NodeCategory, ConnectionType } from '../types/node.types';
import { logError, logInfo } from './logger';
import { sanitizeText } from './sanitize';

export const SCHEMA_VERSION = 1;

const VALID_CATEGORIES: NodeCategory[] = ['central', 'idea', 'tarea', 'referencia', 'alerta'];
const VALID_CONNECTION_TYPES: ConnectionType[] = ['neutra', 'apoyo', 'conflicto'];

export interface GraviSnapshot {
  nodes: NodeMeta[];
  connections: Connection[];
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeNode(raw: unknown): NodeMeta | null {
  if (!isRecord(raw)) return null;

  const category = (typeof raw.category === 'string' && VALID_CATEGORIES.includes(raw.category as NodeCategory)
    ? raw.category
    : 'idea') as NodeCategory;

  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : randomId('node'),
    title: sanitizeText(typeof raw.title === 'string' ? raw.title : ''),
    content: sanitizeText(typeof raw.content === 'string' ? raw.content : ''),
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === 'string').map((t) => sanitizeText(t, 40))
      : [],
    category,
    initialX: typeof raw.initialX === 'number' && Number.isFinite(raw.initialX) ? raw.initialX : 0,
    initialY: typeof raw.initialY === 'number' && Number.isFinite(raw.initialY) ? raw.initialY : 0,
    width: typeof raw.width === 'number' && Number.isFinite(raw.width) ? raw.width : 260,
    height: typeof raw.height === 'number' && Number.isFinite(raw.height) ? raw.height : 120,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    isPinned: typeof raw.isPinned === 'boolean' ? raw.isPinned : undefined,
  };
}

function sanitizeConnection(raw: unknown, validNodeIds: Set<string>): Connection | null {
  if (!isRecord(raw)) return null;
  const sourceId = typeof raw.sourceId === 'string' ? raw.sourceId : '';
  const targetId = typeof raw.targetId === 'string' ? raw.targetId : '';

  // Drop connections that reference missing nodes to keep the graph consistent
  if (!validNodeIds.has(sourceId) || !validNodeIds.has(targetId) || sourceId === targetId) {
    return null;
  }

  const type = (typeof raw.type === 'string' && VALID_CONNECTION_TYPES.includes(raw.type as ConnectionType)
    ? raw.type
    : 'neutra') as ConnectionType;

  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : randomId('conn'),
    sourceId,
    targetId,
    type,
  };
}

/**
 * Validates and sanitizes an arbitrary parsed object into a safe GraviSnapshot.
 * Returns null if the payload cannot be interpreted as a valid snapshot.
 * Forward-compatible: unknown future versions are still parsed best-effort.
 */
export function validateSnapshot(raw: unknown): GraviSnapshot | null {
  if (!isRecord(raw) || !Array.isArray(raw.nodes)) {
    return null;
  }

  const nodes = raw.nodes
    .map(sanitizeNode)
    .filter((n): n is NodeMeta => n !== null);

  const validNodeIds = new Set(nodes.map((n) => n.id));

  const connections = Array.isArray(raw.connections)
    ? raw.connections
        .map((c) => sanitizeConnection(c, validNodeIds))
        .filter((c): c is Connection => c !== null)
    : [];

  return { nodes, connections };
}

export function serializeSnapshot(nodes: NodeMeta[], connections: Connection[]) {
  return {
    version: SCHEMA_VERSION,
    app: 'GraviNote',
    exportedAt: Date.now(),
    nodes,
    connections,
  };
}

export function exportStateToJSON(nodes: NodeMeta[], connections: Connection[]) {
  try {
    const jsonString = JSON.stringify(serializeSnapshot(nodes, connections), null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `gravinote-respaldo-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logInfo('Canvas exported successfully.');
  } catch (error) {
    logError('Failed to export canvas state:', error);
  }
}

export function importStateFromJSON(
  file: File,
  onLoad: (nodes: NodeMeta[], connections: Connection[]) => void
) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      const snapshot = validateSnapshot(JSON.parse(result));

      if (!snapshot) {
        alert('El archivo JSON no es un respaldo válido de GraviNote (Falta lista de nodos).');
        return;
      }

      onLoad(snapshot.nodes, snapshot.connections);
      logInfo('Canvas state imported successfully.');
    } catch (error) {
      logError('Failed to parse imported JSON:', error);
      alert('Error al leer el archivo. Asegúrate de que sea un archivo JSON válido.');
    }
  };

  reader.readAsText(file);
}
