import Matter from 'matter-js';
import type { NodeCategory } from '../types/node.types';

export const CATEGORY_PHYSICS: Record<NodeCategory, {
  mass: number;
  frictionAir: number;
  restitution: number;
  width: number;
  height: number;
}> = {
  idea: {
    mass: 1.0,
    frictionAir: 0.01,
    restitution: 0.3,
    width: 260,
    height: 120, // A bit larger to fit titles and content comfortably
  },
  tarea: {
    mass: 1.1,
    frictionAir: 0.012,
    restitution: 0.2,
    width: 260,
    height: 120,
  },
  referencia: {
    mass: 0.9,
    frictionAir: 0.008,
    restitution: 0.4,
    width: 260,
    height: 120,
  },
  alerta: {
    mass: 1.3,
    frictionAir: 0.015,
    restitution: 0.1,
    width: 260,
    height: 120,
  },
};

export function createNodeBody(
  world: Matter.World,
  id: string,
  x: number,
  y: number,
  category: NodeCategory,
  width?: number,
  height?: number
): Matter.Body {
  const config = CATEGORY_PHYSICS[category] || CATEGORY_PHYSICS.idea;
  const w = width ?? config.width;
  const h = height ?? config.height;

  const options: Matter.IChamferableBodyDefinition = {
    label: id, // Store node id in the label
    mass: config.mass,
    frictionAir: config.frictionAir,
    restitution: config.restitution,
    friction: 0.1,
    // Add chamfer (rounded corners) for smoother sliding and collisions
    chamfer: { radius: 12 },
  };

  const body = Matter.Bodies.rectangle(x, y, w, h, options);
  
  // Store dimensions inside userData for dynamic scaling detection
  (body as any).userData = { width: w, height: h };

  // Matter.js automatically overrides mass based on area/density unless we set it after creation
  Matter.Body.setMass(body, config.mass);

  Matter.Composite.add(world, body);
  return body;
}

export function destroyNodeBody(world: Matter.World, body: Matter.Body) {
  Matter.Composite.remove(world, body);
}
