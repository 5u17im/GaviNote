import Matter from 'matter-js';
import { NodeMeta } from '../types/node.types';

const ATTRACTION_DISTANCE = 450;  // px - Range where tags start drawing nodes together
const REPULSION_DISTANCE = 150;   // px - Min distance to prevent overlapping
const ATTRACTION_BASE_STRENGTH = 0.00008;
const REPULSION_BASE_STRENGTH = 0.0004;

export function applyMagneticForces(
  bodies: Map<string, Matter.Body>,
  nodes: NodeMeta[],
  magnetMultiplier: number = 1.0
) {
  if (nodes.length < 2) return;

  const attractionStrength = ATTRACTION_BASE_STRENGTH * magnetMultiplier;
  const repulsionStrength = REPULSION_BASE_STRENGTH;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Skip deleting nodes
      if (nodeA.isDeleting || nodeB.isDeleting) continue;

      // Check if they share any tags
      const sharedTags = nodeA.tags.some(tag => nodeB.tags.includes(tag));
      
      const bodyA = bodies.get(nodeA.id);
      const bodyB = bodies.get(nodeB.id);
      if (!bodyA || !bodyB) continue;

      // Skip if both are static
      if (bodyA.isStatic && bodyB.isStatic) continue;

      const dx = bodyB.position.x - bodyA.position.x;
      const dy = bodyB.position.y - bodyA.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) continue;

      // 1. Repulsion (Always active to prevent overlapping, regardless of tags)
      if (distance < REPULSION_DISTANCE) {
        const forceMagnitude = (1 - distance / REPULSION_DISTANCE) * repulsionStrength;
        const fx = (dx / distance) * forceMagnitude;
        const fy = (dy / distance) * forceMagnitude;

        if (!bodyA.isStatic) {
          Matter.Body.applyForce(bodyA, bodyA.position, { x: -fx, y: -fy });
        }
        if (!bodyB.isStatic) {
          Matter.Body.applyForce(bodyB, bodyB.position, { x: fx, y: fy });
        }
      }
      
      // 2. Attraction (Only active if they share tags)
      else if (sharedTags && distance < ATTRACTION_DISTANCE) {
        // Central ideas act as gravitational wells: 4x stronger attraction
        const isAOrBCentral = nodeA.category === 'central' || nodeB.category === 'central';
        const currentAttractionStrength = isAOrBCentral ? attractionStrength * 4 : attractionStrength;

        const forceMagnitude = (distance / ATTRACTION_DISTANCE) * currentAttractionStrength;
        const fx = (dx / distance) * forceMagnitude;
        const fy = (dy / distance) * forceMagnitude;

        if (!bodyA.isStatic) {
          Matter.Body.applyForce(bodyA, bodyA.position, { x: fx, y: fy });
        }
        if (!bodyB.isStatic) {
          Matter.Body.applyForce(bodyB, bodyB.position, { x: -fx, y: -fy });
        }
      }
    }
  }
}

export function applyVortexSuction(
  bodies: Map<string, Matter.Body>,
  nodes: NodeMeta[],
  vortexWorldPos: { x: number; y: number },
  vortexGravity: number,
  onReachVortex: (id: string) => void
) {
  nodes.forEach((node) => {
    if (!node.isDeleting) return;

    const body = bodies.get(node.id);
    if (!body) return;

    // Turn off collisions to slide cleanly into the black hole
    if (body.collisionFilter.mask !== 0) {
      body.collisionFilter.mask = 0;
    }

    // Reset friction and mass for uniform suction speed
    body.frictionAir = 0;
    body.mass = 1.0;

    const dx = vortexWorldPos.x - body.position.x;
    const dy = vortexWorldPos.y - body.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 55) {
      // Singularity reached
      onReachVortex(node.id);
      return;
    }

    // 1. Suction pull force (scaled by vortexGravity config)
    const pullStrength = 0.05 * vortexGravity;
    const fx = (dx / distance) * pullStrength;
    const fy = (dy / distance) * pullStrength;

    // 2. Spiral tangential force (whirlpool effect scaled by vortexGravity config)
    const spiralStrength = 0.03 * vortexGravity;
    const sx = (-dy / distance) * spiralStrength;
    const sy = (dx / distance) * spiralStrength;

    // Ensure it can move
    if (body.isStatic) {
      Matter.Body.setStatic(body, false);
    }

    Matter.Body.applyForce(body, body.position, {
      x: fx + sx,
      y: fy + sy,
    });
  });
}
