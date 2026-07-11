import Matter from 'matter-js';

export function createPhysicsEngine(gravityY: number) {
  const engine = Matter.Engine.create();
  
  // Set gravity
  engine.gravity.x = 0;
  engine.gravity.y = gravityY;
  
  return engine;
}

export function createArena(world: Matter.World, width: number = 6000, height: number = 6000) {
  const thickness = 500; // Thicker walls prevent high-velocity nodes from tunneling out
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Static walls (invisible bounds)
  const options: Matter.IChamferableBodyDefinition = {
    isStatic: true,
    restitution: 0.8, // Soft bouncy collision
    friction: 0.1,
  };

  // Coordinates centered around (0,0) so pan and zoom work nicely
  const topWall = Matter.Bodies.rectangle(0, -halfHeight - thickness / 2, width + thickness * 2, thickness, options);
  const bottomWall = Matter.Bodies.rectangle(0, halfHeight + thickness / 2, width + thickness * 2, thickness, options);
  const leftWall = Matter.Bodies.rectangle(-halfWidth - thickness / 2, 0, thickness, height + thickness * 2, options);
  const rightWall = Matter.Bodies.rectangle(halfWidth + thickness / 2, 0, thickness, height + thickness * 2, options);

  // Add walls to world
  Matter.Composite.add(world, [topWall, bottomWall, leftWall, rightWall]);

  return {
    topWall,
    bottomWall,
    leftWall,
    rightWall,
    width,
    height,
  };
}
