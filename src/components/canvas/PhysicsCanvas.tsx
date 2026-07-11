'use client';

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { useGraviStore } from '../../store/useGraviStore';
import { usePhysicsEngine } from '../../hooks/usePhysicsEngine';
import { usePhysicsSync } from '../../hooks/usePhysicsSync';
import { useDragNode } from '../../hooks/useDragNode';
import { useMagneticForces } from '../../hooks/useMagneticForces';
import { useConnectionDraw } from '../../hooks/useConnectionDraw';
import { createNodeBody, destroyNodeBody, CATEGORY_PHYSICS } from '../../physics/bodies';
import { createSpringConstraint, destroyConstraint } from '../../physics/constraints';
import { INITIAL_DEMO_NODES, INITIAL_DEMO_CONNECTIONS } from './DemoNodes';
import { BackgroundDots } from './BackgroundDots';
import { NodeOverlay } from './NodeOverlay';
import { SVGConnectionLayer } from './SVGConnectionLayer';
import { HUDPanel } from '../hud/HUDPanel';
import { UndoToast } from '../hud/UndoToast';
import { NodeContextMenu } from '../nodes/NodeContextMenu';
import { DisintegrationEffect, triggerDisintegration } from '../particles/DisintegrationEffect';
import { CATEGORY_INFO } from '../nodes/registry';

export function PhysicsCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Zustand Store
  const {
    nodes,
    connections,
    selectedId,
    physicsConfig,
    addNode,
    updateNode,
    removeNode,
    selectNode,
    addConnection,
    cycleConnection,
    setPan,
    setZoom,
    loadState,
  } = useGraviStore();

  const { zoom, panX, panY, gravity, magnetStrength } = physicsConfig;

  // Initialize Matter.js Engine
  const engineRef = usePhysicsEngine(gravity);
  
  // Registry of nodeId -> Matter.Body
  const bodiesRef = useRef<Map<string, Matter.Body>>(new Map());
  // Registry of connectionId -> Matter.Constraint
  const constraintsRef = useRef<Map<string, Matter.Constraint>>(new Map());
  // Registry of nodeId -> DOM Element
  const domRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Mouse drag pan state
  const panDragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // Spacebar tracking
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);

  // Restore state from Local Storage or load demo on mount
  useEffect(() => {
    const saved = localStorage.getItem('gravinote-saved-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.nodes)) {
          loadState(parsed.nodes, parsed.connections || []);
          return;
        }
      } catch (err) {
        console.error("Failed to restore saved local storage state:", err);
      }
    }
    
    // Fallback: load demo micro-ecosystem
    loadState(INITIAL_DEMO_NODES, INITIAL_DEMO_CONNECTIONS);
  }, [loadState]);

  // Debounced Auto-save to Local Storage
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const unsubscribe = useGraviStore.subscribe((state) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const dataToSave = {
          nodes: state.nodes,
          connections: state.connections,
        };
        localStorage.setItem('gravinote-saved-state', JSON.stringify(dataToSave));
      }, 500); // 500ms debounce
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Sync Matter.js bodies with Zustand nodes list
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const currentBodies = bodiesRef.current;
    const nodeIds = new Set(nodes.map((n) => n.id));

    // 1. Add bodies for new nodes
    nodes.forEach((node) => {
      if (!currentBodies.has(node.id)) {
        const body = createNodeBody(
          engine.world,
          node.id,
          node.initialX,
          node.initialY,
          node.category
        );
        currentBodies.set(node.id, body);
      } else {
        // Update physical properties dynamically if category changed
        const body = currentBodies.get(node.id)!;
        const config = CATEGORY_PHYSICS[node.category];
        if (config) {
          if (body.mass !== config.mass) {
            Matter.Body.setMass(body, config.mass);
          }
          body.frictionAir = config.frictionAir;
          body.restitution = config.restitution;
        }
      }
    });

    // 2. Remove bodies for deleted nodes
    for (const [id, body] of currentBodies.entries()) {
      if (!nodeIds.has(id)) {
        destroyNodeBody(engine.world, body);
        currentBodies.delete(id);
        domRefs.current.delete(id);
      }
    }
  }, [nodes, engineRef]);

  // Sync Matter.js Constraints with Zustand connections list
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const currentConstraints = constraintsRef.current;
    const connectionIds = new Set(connections.map((c) => c.id));

    // 1. Add constraints for new connections
    connections.forEach((conn) => {
      if (!currentConstraints.has(conn.id)) {
        const bodyA = bodiesRef.current.get(conn.sourceId);
        const bodyB = bodiesRef.current.get(conn.targetId);

        if (bodyA && bodyB) {
          const constraint = createSpringConstraint(engine.world, bodyA, bodyB);
          currentConstraints.set(conn.id, constraint);
        }
      }
    });

    // 2. Remove constraints for deleted connections
    for (const [id, constraint] of currentConstraints.entries()) {
      if (!connectionIds.has(id)) {
        destroyConstraint(engine.world, constraint);
        currentConstraints.delete(id);
      }
    }
  }, [connections, engineRef]);

  // Command Listener: Big Bang (applies radial forces)
  useEffect(() => {
    const handleBigBang = () => {
      const bodies = Array.from(bodiesRef.current.values());
      bodies.forEach((body) => {
        Matter.Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 16,
          y: (Math.random() - 0.5) * 16,
        });
      });
    };

    window.addEventListener('trigger-bigbang', handleBigBang);
    return () => window.removeEventListener('trigger-bigbang', handleBigBang);
  }, []);

  // Command Listener: Clear Canvas (triggers explosions on all nodes, then clears store)
  useEffect(() => {
    const handleClearCanvas = () => {
      const bodies = bodiesRef.current;
      
      bodies.forEach((body, nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          const color = CATEGORY_INFO[node.category]?.color || '#00E5FF';
          triggerDisintegration(body.position.x, body.position.y, color);
        }
      });

      // Clear the store after a slight delay to allow explosion particles to render
      setTimeout(() => {
        useGraviStore.getState().clearCanvas();
      }, 400);
    };

    window.addEventListener('trigger-clear-canvas', handleClearCanvas);
    return () => window.removeEventListener('trigger-clear-canvas', handleClearCanvas);
  }, [nodes]);

  // Command Listener: Zoom to Fit (calculates bounding box of all bodies)
  useEffect(() => {
    const handleZoomFit = () => {
      const bodies = Array.from(bodiesRef.current.values());
      if (bodies.length === 0) {
        setZoom(1.0);
        setPan(0, 0);
        return;
      }

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      bodies.forEach((body) => {
        minX = Math.min(minX, body.position.x);
        maxX = Math.max(maxX, body.position.x);
        minY = Math.min(minY, body.position.y);
        maxY = Math.max(maxY, body.position.y);
      });

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // Box dimensions including node margins
      const boxWidth = Math.max(100, maxX - minX + 300);
      const boxHeight = Math.max(100, maxY - minY + 200);

      const zoomX = (window.innerWidth - 120) / boxWidth;
      const zoomY = (window.innerHeight - 120) / boxHeight;
      
      const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.3), 1.25);

      setZoom(newZoom);
      setPan(-centerX * newZoom, -centerY * newZoom);
    };

    window.addEventListener('trigger-zoom-fit', handleZoomFit);
    return () => window.removeEventListener('trigger-zoom-fit', handleZoomFit);
  }, [setZoom, setPan]);

  // Hook for DOM & SVG coordinates synchronization (Runs RAF loop)
  usePhysicsSync({
    engineRef,
    bodiesRef,
    domRefs,
    nodes,
    connections,
  });

  // Hook for magnetic attraction/repulsión between nodes
  useMagneticForces({
    engineRef,
    bodiesRef,
    nodes,
    magnetStrength,
  });

  // Screen coordinates to world coordinates conversion helper
  const screenToWorld = (clientX: number, clientY: number) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const worldX = (clientX - cx - panX) / zoom;
    const worldY = (clientY - cy - panY) / zoom;
    return { x: worldX, y: worldY };
  };

  // Hook for connection drawing (Shift + Drag)
  const connDraw = useConnectionDraw({
    nodes,
    domRefs,
    addConnection,
    screenToWorld,
  });

  // Hook for pointer drag handler
  const dragNode = useDragNode({
    engineRef,
    bodiesRef,
    zoom,
    panX,
    panY,
  });

  const handleNodePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (connDraw.isDrawing) {
      connDraw.moveConnection(e);
    } else {
      dragNode.onPointerMove(e);
    }
  };

  const handleNodePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (connDraw.isDrawing) {
      connDraw.endConnection(e);
    } else {
      dragNode.onPointerUp(e);
    }
  };

  // Spacebar key listeners for Panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Double click to create new node
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;

    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const category = 'idea';
    const config = CATEGORY_PHYSICS[category];

    addNode({
      title: '',
      content: '',
      tags: [],
      category: category,
      initialX: x,
      initialY: y,
      width: config.width,
      height: config.height,
    });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    setZoom((z) => z + direction * zoomFactor);
  };

  // Pan background pointer handlers
  const handlePanStart = (e: React.PointerEvent) => {
    const isMiddleClick = e.button === 1;
    const isBackgroundLeftClick = e.button === 0 && e.target === containerRef.current;

    if (isSpacePressed || isMiddleClick || isBackgroundLeftClick) {
      if (containerRef.current) {
        containerRef.current.setPointerCapture(e.pointerId);
      }
      
      panDragRef.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: panX,
        startPanY: panY,
      };
      
      selectNode(null);
      e.stopPropagation();
    }
  };

  const handlePanMove = (e: React.PointerEvent) => {
    if (panDragRef.current.isDragging) {
      const dx = e.clientX - panDragRef.current.startX;
      const dy = e.clientY - panDragRef.current.startY;
      setPan(
        panDragRef.current.startPanX + dx,
        panDragRef.current.startPanY + dy
      );
    } else if (connDraw.isDrawing) {
      connDraw.moveConnection(e);
    }
  };

  const handlePanEnd = (e: React.PointerEvent) => {
    if (panDragRef.current.isDragging) {
      try {
        if (containerRef.current) {
          containerRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {}
      panDragRef.current.isDragging = false;
    } else if (connDraw.isDrawing) {
      connDraw.endConnection(e);
    }
  };

  // Pointer Down handler on nodes
  const handleNodePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    const body = bodiesRef.current.get(id);
    if (!body) return;

    const didStartConn = connDraw.startConnection(e, id, body.position);
    
    if (!didStartConn) {
      dragNode.onPointerDown(e, id);
    }
  };

  // Safe wrapper for note removal that triggers particle disintegration
  const handleRemoveNode = (id: string) => {
    const body = bodiesRef.current.get(id);
    const node = nodes.find((n) => n.id === id);
    
    if (body && node) {
      const color = CATEGORY_INFO[node.category]?.color || '#00E5FF';
      triggerDisintegration(body.position.x, body.position.y, color);
    }

    removeNode(id);
  };

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onPointerDown={handlePanStart}
      onPointerMove={handlePanMove}
      onPointerUp={handlePanEnd}
      className={`relative w-screen h-screen overflow-hidden bg-[#0B0F19] ${
        isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Background Dots Canvas */}
      <BackgroundDots zoom={zoom} panX={panX} panY={panY} />

      {/* World transform viewport */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${cx}px`,
          top: `${cy}px`,
          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
          transformOrigin: '0 0',
          width: 0,
          height: 0,
        }}
      >
        {/* SVG connection lines overlay */}
        <SVGConnectionLayer
          connections={connections}
          drawingState={connDraw.drawingState}
          onCycleConnection={cycleConnection}
        />

        {/* Disintegration particles canvas layer */}
        <DisintegrationEffect />

        {/* React Node cards overlay */}
        <NodeOverlay
          nodes={nodes}
          selectedId={selectedId}
          onSelect={selectNode}
          onUpdate={(id, title, content, tags) => updateNode(id, { title, content, tags })}
          onDelete={handleRemoveNode} // Trigger particle explosion during delete
          onChangeCategory={(id, cat) => updateNode(id, { category: cat })}
          onDragStart={handleNodePointerDown}
          onDragMove={handleNodePointerMove}
          onDragEnd={handleNodePointerUp}
          onContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
          domRefs={domRefs}
        />
      </div>

      {/* Settings HUD panel */}
      <HUDPanel />

      {/* Undo deleted note Toast banner */}
      <UndoToast />

      {/* Hoisted Context Menu at the screen root level (handles screen-space coords) */}
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            const event = new CustomEvent(`edit-node-${contextMenu.nodeId}`);
            window.dispatchEvent(event);
            setContextMenu(null);
          }}
          onDelete={() => {
            handleRemoveNode(contextMenu.nodeId);
            setContextMenu(null);
          }}
          onChangeCategory={(cat) => {
            updateNode(contextMenu.nodeId, { category: cat });
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
}
