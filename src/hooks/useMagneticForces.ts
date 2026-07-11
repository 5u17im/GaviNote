import { useEffect } from 'react';
import Matter from 'matter-js';
import { applyMagneticForces } from '../physics/forces';
import { NodeMeta } from '../types/node.types';

interface UseMagneticForcesProps {
  engine: Matter.Engine | null;
  bodiesRef: React.MutableRefObject<Map<string, Matter.Body>>;
  nodes: NodeMeta[];
  magnetStrength: number;
}

export function useMagneticForces({
  engine,
  bodiesRef,
  nodes,
  magnetStrength,
}: UseMagneticForcesProps) {
  useEffect(() => {
    if (!engine) return;

    const handleTick = () => {
      applyMagneticForces(bodiesRef.current, nodes, magnetStrength);
    };

    // Apply forces after the engine has updated positions but before rendering
    Matter.Events.on(engine, 'afterUpdate', handleTick);

    return () => {
      Matter.Events.off(engine, 'afterUpdate', handleTick);
    };
  }, [engine, nodes, magnetStrength, bodiesRef]);
}
