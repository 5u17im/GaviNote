import { describe, it, expect } from 'vitest';
import Matter from 'matter-js';
import {
  createNodeBody,
  syncBodyPhysics,
  setBodyPinned,
  sanitizeBody,
  CATEGORY_PHYSICS,
} from './bodies';
import { createSpringConstraint } from './constraints';

function makeWorld() {
  const engine = Matter.Engine.create();
  engine.enableSleeping = false;
  return engine;
}

describe('syncBodyPhysics', () => {
  it('updates mass/friction/restitution on a dynamic body', () => {
    const engine = makeWorld();
    const body = createNodeBody(engine.world, 'a', 0, 0, 'idea');
    syncBodyPhysics(body, CATEGORY_PHYSICS.alerta);
    expect(body.mass).toBeCloseTo(CATEGORY_PHYSICS.alerta.mass);
    expect(body.frictionAir).toBe(CATEGORY_PHYSICS.alerta.frictionAir);
    expect(body.restitution).toBe(CATEGORY_PHYSICS.alerta.restitution);
  });

  it('never corrupts a static (pinned) body with NaN inertia — bug B regression', () => {
    const engine = makeWorld();
    const body = createNodeBody(engine.world, 'a', 0, 0, 'idea');
    setBodyPinned(body, true);

    // This is exactly what runs every time the nodes list changes while pinned.
    syncBodyPhysics(body, CATEGORY_PHYSICS.idea);

    expect(body.isStatic).toBe(true);
    expect(Number.isFinite(body.inverseInertia)).toBe(true);
    expect(Number.isFinite(body.inverseMass)).toBe(true);
  });

  it('a connected body stays finite after its neighbor is pinned and synced', () => {
    const engine = makeWorld();
    const a = createNodeBody(engine.world, 'a', 0, 0, 'idea');
    const b = createNodeBody(engine.world, 'b', 260, 0, 'idea');
    createSpringConstraint(engine.world, a, b);

    setBodyPinned(a, true);
    syncBodyPhysics(a, CATEGORY_PHYSICS.idea);
    syncBodyPhysics(b, CATEGORY_PHYSICS.idea);

    for (let i = 0; i < 30; i++) {
      Matter.Engine.update(engine, 16.666);
    }

    expect(Number.isFinite(b.position.x)).toBe(true);
    expect(Number.isFinite(b.position.y)).toBe(true);
    expect(Number.isFinite(b.angle)).toBe(true);
  });
});

describe('setBodyPinned', () => {
  it('makes a body static and clears its velocity', () => {
    const engine = makeWorld();
    const body = createNodeBody(engine.world, 'a', 0, 0, 'idea');
    Matter.Body.setVelocity(body, { x: 5, y: 5 });
    setBodyPinned(body, true);
    expect(body.isStatic).toBe(true);
    expect(body.velocity).toEqual({ x: 0, y: 0 });
  });

  it('restores dynamic state and original mass when unpinned', () => {
    const engine = makeWorld();
    const body = createNodeBody(engine.world, 'a', 0, 0, 'idea');
    const originalMass = body.mass;
    setBodyPinned(body, true);
    setBodyPinned(body, false);
    expect(body.isStatic).toBe(false);
    expect(body.mass).toBeCloseTo(originalMass);
    expect(Number.isFinite(body.inverseInertia)).toBe(true);
  });

  it('is a no-op when the state already matches', () => {
    const engine = makeWorld();
    const body = createNodeBody(engine.world, 'a', 0, 0, 'idea');
    setBodyPinned(body, false);
    expect(body.isStatic).toBe(false);
  });
});

describe('sanitizeBody', () => {
  it('repairs a body with a NaN position back to the fallback', () => {
    const engine = makeWorld();
    const body = createNodeBody(engine.world, 'a', 10, 20, 'idea');
    body.position.x = NaN;
    const repaired = sanitizeBody(body, 100, 200);
    expect(repaired).toBe(true);
    expect(body.position).toEqual({ x: 100, y: 200 });
    expect(body.velocity).toEqual({ x: 0, y: 0 });
  });

  it('leaves a healthy body untouched', () => {
    const engine = makeWorld();
    const body = createNodeBody(engine.world, 'a', 10, 20, 'idea');
    const repaired = sanitizeBody(body, 100, 200);
    expect(repaired).toBe(false);
    expect(body.position.x).toBeCloseTo(10);
    expect(body.position.y).toBeCloseTo(20);
  });
});
