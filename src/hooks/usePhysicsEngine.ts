import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { createPhysicsEngine, createArena } from '../physics/engine';

export function usePhysicsEngine(gravityY: number) {
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // Initialize engine once on mount
  useEffect(() => {
    const engine = createPhysicsEngine(gravityY);
    engineRef.current = engine;

    // Create boundaries for 6000x6000px arena
    createArena(engine.world);

    // Create runner for 60 FPS physics updates
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    console.log("Matter.js Engine started successfully.");

    return () => {
      console.log("Cleaning up Matter.js Engine...");
      if (runnerRef.current) {
        Matter.Runner.stop(runnerRef.current);
      }
      if (engineRef.current) {
        // Clear all composites and events
        Matter.World.clear(engineRef.current.world, false);
        Matter.Engine.clear(engineRef.current);
      }
    };
  }, []); // Run once on mount

  // Update gravity dynamically when config changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.gravity.y = gravityY;
    }
  }, [gravityY]);

  return engineRef;
}
