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

      // Check if they share any tags
      const sharedTags = nodeA.tags.some(tag => nodeB.tags.includes(tag));
      
      const bodyA = bodies.get(nodeA.id);
      const bodyB = bodies.get(nodeB.id);
      if (!bodyA || !bodyB) continue;

      // Skip forces if either body is currently being dragged
      // In our drag hook, dragging body moves directly. We don't want magnetic forces adding noise
      if (bodyA.isStatic || bodyB.isStatic) continue;

      const dx = bodyB.position.x - bodyA.position.x;
      const dy = bodyB.position.y - bodyA.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) continue;

      // 1. Repulsion (Always active to prevent overlapping, regardless of tags)
      if (distance < REPULSION_DISTANCE) {
        const forceMagnitude = (1 - distance / REPULSION_DISTANCE) * repulsionStrength;
        const fx = (dx / distance) * forceMagnitude;
        const fy = (dy / distance) * forceMagnitude;

        Matter.Body.applyForce(bodyA, bodyA.position, { x: -fx, y: -fy });
        Matter.Body.applyForce(bodyB, bodyB.position, { x: fx, y: fy });
      }
      
      // 2. Attraction (Only active if they share tags)
      else if (sharedTags && distance < ATTRACTION_DISTANCE) {
        const forceMagnitude = (distance / ATTRACTION_DISTANCE) * attractionStrength;
        const fx = (dx / distance) * forceMagnitude;
        const fy = (dy / distance) * forceMagnitude;

        Matter.Body.applyForce(bodyA, bodyA.position, { x: fx, y: fy });
        Matter.Body.applyForce(bodyB, bodyB.position, { x: -fx, y: -fy });
      }
    }
  }
}
