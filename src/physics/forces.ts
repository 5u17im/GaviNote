import Matter from 'matter-js';
import { NodeMeta } from '../types/node.types';

const ATTRACTION_DISTANCE = 450;  // px - Range where tags start drawing nodes together
const REPULSION_DISTANCE = 150;   // px - Min distance to prevent overlapping
const ATTRACTION_BASE_STRENGTH = 0.00008;
const REPULSION_BASE_STRENGTH = 0.0004;

// Cell size equals the max interaction range so any pair within range falls in
// the same or an adjacent grid cell — reduces the O(N^2) scan to near O(N).
const CELL_SIZE = ATTRACTION_DISTANCE;

interface GridEntry {
  node: NodeMeta;
  body: Matter.Body;
}

function applyPairForce(
  a: GridEntry,
  b: GridEntry,
  attractionStrength: number,
  repulsionStrength: number
) {
  const { node: nodeA, body: bodyA } = a;
  const { node: nodeB, body: bodyB } = b;

  // Skip if both are static
  if (bodyA.isStatic && bodyB.isStatic) return;

  const dx = bodyB.position.x - bodyA.position.x;
  const dy = bodyB.position.y - bodyA.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return;

  // 1. Repulsion (Always active to prevent overlapping, regardless of tags)
  if (distance < REPULSION_DISTANCE) {
    const forceMagnitude = (1 - distance / REPULSION_DISTANCE) * repulsionStrength;
    const fx = (dx / distance) * forceMagnitude;
    const fy = (dy / distance) * forceMagnitude;

    if (!bodyA.isStatic) Matter.Body.applyForce(bodyA, bodyA.position, { x: -fx, y: -fy });
    if (!bodyB.isStatic) Matter.Body.applyForce(bodyB, bodyB.position, { x: fx, y: fy });
    return;
  }

  // 2. Attraction (Only active if they share tags)
  if (distance < ATTRACTION_DISTANCE) {
    const sharedTags = nodeA.tags.some((tag) => nodeB.tags.includes(tag));
    if (!sharedTags) return;

    // Central ideas act as gravitational wells: 4x stronger attraction
    const isAOrBCentral = nodeA.category === 'central' || nodeB.category === 'central';
    const currentAttractionStrength = isAOrBCentral ? attractionStrength * 4 : attractionStrength;

    const forceMagnitude = (distance / ATTRACTION_DISTANCE) * currentAttractionStrength;
    const fx = (dx / distance) * forceMagnitude;
    const fy = (dy / distance) * forceMagnitude;

    if (!bodyA.isStatic) Matter.Body.applyForce(bodyA, bodyA.position, { x: fx, y: fy });
    if (!bodyB.isStatic) Matter.Body.applyForce(bodyB, bodyB.position, { x: -fx, y: -fy });
  }
}

export function applyMagneticForces(
  bodies: Map<string, Matter.Body>,
  nodes: NodeMeta[],
  magnetMultiplier: number = 1.0
) {
  if (nodes.length < 2) return;

  const attractionStrength = ATTRACTION_BASE_STRENGTH * magnetMultiplier;
  const repulsionStrength = REPULSION_BASE_STRENGTH;

  // Build a spatial hash grid: cellKey -> entries
  const grid = new Map<string, GridEntry[]>();
  const cellKey = (cx: number, cy: number) => `${cx},${cy}`;

  for (const node of nodes) {
    if (node.isDeleting) continue;
    const body = bodies.get(node.id);
    if (!body) continue;

    const cx = Math.floor(body.position.x / CELL_SIZE);
    const cy = Math.floor(body.position.y / CELL_SIZE);
    const key = cellKey(cx, cy);
    const bucket = grid.get(key);
    if (bucket) bucket.push({ node, body });
    else grid.set(key, [{ node, body }]);
  }

  // For each cell, compare against itself and the forward-half of its neighbors
  // to evaluate every pair exactly once.
  const NEIGHBOR_OFFSETS: Array<[number, number]> = [
    [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
  ];

  for (const [key, bucket] of grid.entries()) {
    const [cx, cy] = key.split(',').map(Number);

    for (const [ox, oy] of NEIGHBOR_OFFSETS) {
      const neighbor = grid.get(cellKey(cx + ox, cy + oy));
      if (!neighbor) continue;

      if (ox === 0 && oy === 0) {
        // Same cell: unique pairs within the bucket
        for (let i = 0; i < bucket.length; i++) {
          for (let j = i + 1; j < bucket.length; j++) {
            applyPairForce(bucket[i], bucket[j], attractionStrength, repulsionStrength);
          }
        }
      } else {
        // Different cell: all cross pairs (each neighbor pair visited once via offsets)
        for (const a of bucket) {
          for (const b of neighbor) {
            applyPairForce(a, b, attractionStrength, repulsionStrength);
          }
        }
      }
    }
  }
}

export function applyVortexSuction(
  world: Matter.World,
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

    // Double safety: remove any leftover constraints connected to this body from the Matter.js world
    const worldConstraints = Matter.Composite.allConstraints(world);
    worldConstraints.forEach((constraint) => {
      if (constraint.bodyA === body || constraint.bodyB === body) {
        Matter.Composite.remove(world, constraint);
      }
    });

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

    // 1. Suction pull force (scaled by vortexGravity config). Strong base pull so
    // a node accelerates into the core and visibly stretches (spaghettification).
    const pullStrength = 0.18 * vortexGravity;
    const fx = (dx / distance) * pullStrength;
    const fy = (dy / distance) * pullStrength;

    // 2. Spiral tangential force (whirlpool effect scaled by vortexGravity config)
    const spiralStrength = 0.06 * vortexGravity;
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
