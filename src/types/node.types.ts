export type NodeCategory = 'idea' | 'tarea' | 'referencia' | 'alerta';

export interface NodeMeta {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: NodeCategory;
  initialX: number;
  initialY: number;
  width: number;
  height: number;
  createdAt: number;
}

export type ConnectionType = 'neutra' | 'apoyo' | 'conflicto';

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  label?: string;
}

export interface PhysicsConfig {
  gravity: number;        // 0.0 a 1.0
  airFriction: number;    // default 0.01
  magnetStrength: number; // default 1.0 (multiplier)
  zoom: number;           // default 1.0
  panX: number;           // default 0.0
  panY: number;           // default 0.0
}
