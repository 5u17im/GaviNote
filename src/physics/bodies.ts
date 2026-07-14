import Matter from 'matter-js';
import type { NodeCategory } from '../types/node.types';

/**
 * A Matter.Body augmented with GraviNote-specific metadata.
 * Avoids scattered `as unknown as { ... }` casts across the codebase.
 */
export interface NodeBody extends Matter.Body {
  userData: { width: number; height: number };
  isDragging?: boolean;
}

export const CATEGORY_PHYSICS: Record<NodeCategory, {
  mass: number;
  frictionAir: number;
  restitution: number;
  width: number;
  height: number;
}> = {
  central: {
    mass: 2.5,
    frictionAir: 0.02,
    restitution: 0.1,
    width: 280,
    height: 130,
  },
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
): NodeBody {
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

  const body = Matter.Bodies.rectangle(x, y, w, h, options) as NodeBody;

  // Store dimensions inside userData for dynamic scaling detection
  body.userData = { width: w, height: h };

  // Matter.js automatically overrides mass based on area/density unless we set it after creation
  Matter.Body.setMass(body, config.mass);

  Matter.Composite.add(world, body);
  return body;
}

export function destroyNodeBody(world: Matter.World, body: Matter.Body) {
  Matter.Composite.remove(world, body);
}

type PhysicsProps = { mass: number; frictionAir: number; restitution: number };

/**
 * Sync a body's physical props (mass/friction/restitution) to its category config.
 *
 * CRITICAL: never call Matter.Body.setMass on a static body. Static bodies have
 * mass = inertia = Infinity, and setMass computes `inertia / (mass / 6)` which is
 * `Infinity / Infinity = NaN`. The NaN inverseInertia then leaks into the constraint
 * solver and corrupts the position/angle of any connected body (frozen, no
 * collisions, impossible to move or delete). Static bodies keep the mass/inertia
 * that Matter set for them; the real values are restored from `_original` on unpin.
 */
export function syncBodyPhysics(body: Matter.Body, config: PhysicsProps | undefined) {
  if (!config || body.isStatic) return;
  if (body.mass !== config.mass) {
    Matter.Body.setMass(body, config.mass);
  }
  body.frictionAir = config.frictionAir;
  body.restitution = config.restitution;
}

/**
 * Single source of truth for pinning a node's body. Toggling static state and
 * zeroing/kicking velocity in one place avoids the scattered setStatic calls that
 * previously drifted out of sync.
 */
export function setBodyPinned(body: Matter.Body, pinned: boolean) {
  if (body.isStatic === pinned) return;
  Matter.Body.setStatic(body, pinned);
  if (pinned) {
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(body, 0);
  } else {
    // A tiny drift so an unpinned node doesn't look frozen/dead.
    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 1.5,
      y: (Math.random() - 0.5) * 1.5,
    });
  }
}

/**
 * Detect and repair a body whose simulation state became non-finite (NaN/Infinity).
 * Acts as a last line of defense so a single corrupted frame can't permanently
 * brick a node. Returns true when a repair was applied.
 */
export function sanitizeBody(body: Matter.Body, fallbackX: number, fallbackY: number): boolean {
  const bad =
    !Number.isFinite(body.position.x) ||
    !Number.isFinite(body.position.y) ||
    !Number.isFinite(body.angle) ||
    !Number.isFinite(body.velocity.x) ||
    !Number.isFinite(body.velocity.y);

  if (!bad) return false;

  const x = Number.isFinite(fallbackX) ? fallbackX : 0;
  const y = Number.isFinite(fallbackY) ? fallbackY : 0;

  // Matter.Body.setPosition/setAngle derive a delta from the *current* value, so
  // they can't recover from NaN. Reset the internal scalars directly instead.
  const internal = body as unknown as {
    position: Matter.Vector;
    positionPrev: Matter.Vector;
    velocity: Matter.Vector;
    force: Matter.Vector;
    angle: number;
    anglePrev: number;
    angularVelocity: number;
    speed: number;
    angularSpeed: number;
    torque: number;
  };

  internal.position.x = x;
  internal.position.y = y;
  internal.positionPrev.x = x;
  internal.positionPrev.y = y;
  internal.angle = 0;
  internal.anglePrev = 0;
  internal.velocity.x = 0;
  internal.velocity.y = 0;
  internal.angularVelocity = 0;
  internal.speed = 0;
  internal.angularSpeed = 0;
  internal.force.x = 0;
  internal.force.y = 0;
  internal.torque = 0;
  return true;
}
