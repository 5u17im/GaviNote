import Matter from 'matter-js';

export function createSpringConstraint(
  world: Matter.World,
  bodyA: Matter.Body,
  bodyB: Matter.Body,
  length: number = 260,
  stiffness: number = 0.006,
  damping: number = 0.05
): Matter.Constraint {
  const constraint = Matter.Constraint.create({
    bodyA,
    bodyB,
    length,
    stiffness,
    damping,
    // Label as source-target for easy mapping
    label: `${bodyA.label}::${bodyB.label}`,
  });

  Matter.Composite.add(world, constraint);
  return constraint;
}

export function destroyConstraint(world: Matter.World, constraint: Matter.Constraint) {
  Matter.Composite.remove(world, constraint);
}
