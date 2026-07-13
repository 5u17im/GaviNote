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
import { applyVortexSuction } from '../../physics/forces';
import { INITIAL_DEMO_NODES, INITIAL_DEMO_CONNECTIONS } from './DemoNodes';
import { BackgroundDots } from './BackgroundDots';
import { NodeOverlay } from './NodeOverlay';
import { SVGConnectionLayer } from './SVGConnectionLayer';
import { HUDPanel } from '../hud/HUDPanel';
import { UndoToast } from '../hud/UndoToast';
import { ConnectionLegend } from '../hud/ConnectionLegend';
import { NodeContextMenu } from '../nodes/NodeContextMenu';
import { DisintegrationEffect, triggerDisintegration } from '../particles/DisintegrationEffect';
import { CATEGORY_INFO } from '../nodes/registry';
import { calculateOptimalDimensions } from '../../utils/dimensions';

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
    removeConnection,
    selectNode,
    addConnection,
    cycleConnection,
    setPan,
    setZoom,
    loadState,
  } = useGraviStore();

  const { zoom, panX, panY, gravity, magnetStrength } = physicsConfig;

  // Screen coordinates to world coordinates conversion helper
  const screenToWorld = React.useCallback((clientX: number, clientY: number) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const worldX = (clientX - cx - panX) / zoom;
    const worldY = (clientY - cy - panY) / zoom;
    return { x: worldX, y: worldY };
  }, [panX, panY, zoom]);

  // Initialize Matter.js Engine
  const engineRef = usePhysicsEngine(gravity);
  
  // Registry of nodeId -> Matter.Body
  const bodiesRef = useRef<Map<string, Matter.Body>>(new Map());
  // Registry of connectionId -> Matter.Constraint
  const constraintsRef = useRef<Map<string, Matter.Constraint>>(new Map());
  // Registry of nodeId -> DOM Element
  const domRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Hook for pointer drag handler — move/up events are now registered on window
  // directly inside the hook to prevent the "wrong card moves" bug
  const dragNode = useDragNode({
    engineRef,
    bodiesRef,
    constraintsRef,
    domRefs,
    zoom,
    panX,
    panY,
  });

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
          // Auto-adjust dimensions of stored nodes to prevent text clipping
          const updatedNodes = parsed.nodes.map((node: unknown) => {
            const n = node as Record<string, unknown>;
            const dims = calculateOptimalDimensions(
              typeof n.title === 'string' ? n.title : '',
              typeof n.content === 'string' ? n.content : '',
              Array.isArray(n.tags) ? (n.tags as string[]) : []
            );
            return {
              ...n,
              width: dims.width,
              height: dims.height,
            };
          });
          loadState(updatedNodes, parsed.connections || []);
          return;
        }
      } catch (err) {
        console.error("Failed to restore saved local storage state:", err);
      }
    }
    
    // Fallback: load demo micro-ecosystem with auto-sized node cards
    const demoNodes = INITIAL_DEMO_NODES.map((node) => {
      const dims = calculateOptimalDimensions(node.title, node.content, node.tags);
      return {
        ...node,
        width: dims.width,
        height: dims.height,
      };
    });
    loadState(demoNodes, INITIAL_DEMO_CONNECTIONS);
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

  // Sync Matter.js bodies with Zustand nodes list (including dynamic resizing)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const currentBodies = bodiesRef.current;
    const nodeIds = new Set(nodes.map((n) => n.id));

    // 1. Add bodies for new nodes with dynamic width/height
    nodes.forEach((node) => {
      if (!currentBodies.has(node.id)) {
        const body = createNodeBody(
          engine.world,
          node.id,
          node.initialX,
          node.initialY,
          node.category,
          node.width,
          node.height
        );
        if (node.isPinned) {
          Matter.Body.setStatic(body, true);
        }
        currentBodies.set(node.id, body);
      } else {
        const body = currentBodies.get(node.id)!;
        const bodyWithData = body as Matter.Body & { userData: { width: number; height: number } };
        
        // Sync static state dynamically (except when dragging)
        const isPinned = node.isPinned || false;
        if (!dragNode.isDragging(node.id)) {
          if (body.isStatic !== isPinned) {
            Matter.Body.setStatic(body, isPinned);
          }
        }

        // Dynamic scaling: If node dimensions changed in React state, scale the Matter.js body
        const currentW = bodyWithData.userData?.width ?? 260;
        const currentH = bodyWithData.userData?.height ?? 120;
        const targetW = node.width ?? 260;
        const targetH = node.height ?? 120;

        if (currentW !== targetW || currentH !== targetH) {
          const scaleX = targetW / currentW;
          const scaleY = targetH / currentH;
          Matter.Body.scale(body, scaleX, scaleY);
          bodyWithData.userData = { width: targetW, height: targetH };
        }

        // Update physical properties dynamically if category changed
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
  }, [nodes, engineRef, dragNode]);

  // Sync Matter.js Constraints with Zustand connections list (destroying physical connections to deleting nodes)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const currentConstraints = constraintsRef.current;
    const nodeIds = new Set(nodes.map((n) => n.id));

    // 1. Add constraints for new connections (exclude deleting nodes)
    connections.forEach((conn) => {
      const nodeA = nodes.find(n => n.id === conn.sourceId);
      const nodeB = nodes.find(n => n.id === conn.targetId);
      if (nodeA?.isDeleting || nodeB?.isDeleting) return;

      if (!currentConstraints.has(conn.id)) {
        const bodyA = bodiesRef.current.get(conn.sourceId);
        const bodyB = bodiesRef.current.get(conn.targetId);

        if (bodyA && bodyB) {
          const constraint = createSpringConstraint(engine.world, bodyA, bodyB);
          currentConstraints.set(conn.id, constraint);
        }
      }
    });

    // 2. Remove constraints for deleted connections, or if either node is deleting/deleted
    for (const [id, constraint] of currentConstraints.entries()) {
      const conn = connections.find(c => c.id === id);
      if (!conn) {
        destroyConstraint(engine.world, constraint);
        currentConstraints.delete(id);
        continue;
      }

      const nodeA = nodes.find(n => n.id === conn.sourceId);
      const nodeB = nodes.find(n => n.id === conn.targetId);

      if (!nodeIds.has(conn.sourceId) || !nodeIds.has(conn.targetId) || nodeA?.isDeleting || nodeB?.isDeleting) {
        destroyConstraint(engine.world, constraint);
        currentConstraints.delete(id);
      }
    }
  }, [connections, nodes, engineRef]);

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
    zoom,
    panX,
    panY,
  });

  // Hook for magnetic attraction/repulsión between nodes
  useMagneticForces({
    engineRef,
    bodiesRef,
    nodes,
    magnetStrength,
  });

  // Hook for vortex suction toward the black hole
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const handleTick = () => {
      const vx = window.innerWidth - 56;
      const vy = window.innerHeight - 56;
      const vortexWorld = screenToWorld(vx, vy);

      applyVortexSuction(bodiesRef.current, nodes, vortexWorld, (nodeId) => {
        // Trigger particle explosion at the center of the vortex
        const body = bodiesRef.current.get(nodeId);
        const node = nodes.find((n) => n.id === nodeId);
        if (body && node) {
          const color = CATEGORY_INFO[node.category]?.color || '#00E5FF';
          triggerDisintegration(body.position.x, body.position.y, color);
        }
        removeNode(nodeId);
      });
    };

    Matter.Events.on(engine, 'afterUpdate', handleTick);
    return () => {
      Matter.Events.off(engine, 'afterUpdate', handleTick);
    };
  }, [engineRef, nodes, removeNode, panX, panY, zoom, screenToWorld]);



  // Hook for connection drawing (Shift + Drag)
  const connDraw = useConnectionDraw({
    nodes,
    domRefs,
    addConnection,
    screenToWorld,
  });



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

    // Shockwave Pulse on Alt + Double Click
    if (e.altKey) {
      const bodies = Array.from(bodiesRef.current.values());
      bodies.forEach((body) => {
        if (body.isStatic) return;

        const dx = body.position.x - x;
        const dy = body.position.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        const maxDist = 600; // range of shockwave
        if (distance < maxDist) {
          const forceFactor = 1 - distance / maxDist;
          const forceMagnitude = forceFactor * 0.08; // shockwave strength
          const fx = (dx / distance) * forceMagnitude;
          const fy = (dy / distance) * forceMagnitude;

          Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
        }
      });

      // Visual pulse particles expanding in a ring
      for (let i = 0; i < 36; i++) {
        const angle = (i * 10 * Math.PI) / 180;
        const px = x + Math.cos(angle) * 15;
        const py = y + Math.sin(angle) * 15;
        triggerDisintegration(px, py, '#00FF87');
      }
      return;
    }

    const category = 'idea';
    const dims = calculateOptimalDimensions('', '', []); // Get dynamic initial dimensions

    addNode({
      title: '',
      content: '',
      tags: [],
      category: category,
      initialX: x,
      initialY: y,
      width: dims.width,
      height: dims.height,
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
    updateNode(id, { isDeleting: true, isPinned: false });
    const body = bodiesRef.current.get(id);
    if (body) {
      Matter.Body.setStatic(body, false);
    }
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
          onRemoveConnection={removeConnection}
        />

        {/* Disintegration particles canvas layer */}
        <DisintegrationEffect />

        {/* React Node cards overlay */}
        <NodeOverlay
          nodes={nodes}
          selectedId={selectedId}
          onSelect={selectNode}
          onUpdate={(id, title, content, tags, width, height) => 
            updateNode(id, { title, content, tags, width, height })
          }
          onDragStart={handleNodePointerDown}
          onContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
          domRefs={domRefs}
        />
      </div>

      {/* Settings HUD panel */}
      <HUDPanel />

      {/* Connection telemetry legend */}
      <ConnectionLegend />

      {/* Undo deleted note Toast banner */}
      <UndoToast />

      {/* Black Hole (Gravity Trash Vortex) UI */}
      <div 
        className="absolute bottom-6 right-6 z-30 w-16 h-16 rounded-full border border-[#00E5FF]/20 flex items-center justify-center pointer-events-none select-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,0,0,0.95) 0%, rgba(11,15,25,0.7) 70%, rgba(0,229,255,0.05) 100%)',
          boxShadow: '0 0 25px rgba(0, 229, 255, 0.15), inset 0 0 15px rgba(0, 229, 255, 0.2)',
        }}
      >
        <div 
          className="absolute w-12 h-12 rounded-full border-2 border-dashed border-[#00E5FF]/30 animate-spin"
          style={{ animationDuration: '6s' }}
        />
        <div 
          className="absolute w-8 h-8 rounded-full border border-dotted border-[#CE93D8]/40 animate-spin"
          style={{ animationDuration: '3s', animationDirection: 'reverse' }}
        />
        <span className="absolute text-[8px] font-mono text-white/30 tracking-widest uppercase mt-0.5">Vortex</span>
      </div>

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
          isPinned={nodes.find((n) => n.id === contextMenu.nodeId)?.isPinned || false}
          onTogglePin={() => {
            const node = nodes.find((n) => n.id === contextMenu.nodeId);
            if (node) {
              const nextPinned = !node.isPinned;
              updateNode(contextMenu.nodeId, { isPinned: nextPinned });
              const body = bodiesRef.current.get(contextMenu.nodeId);
              if (body) {
                Matter.Body.setStatic(body, nextPinned);
                if (!nextPinned) {
                  // Give it a tiny random drift velocity so it doesn't look frozen/dead
                  Matter.Body.setVelocity(body, {
                    x: (Math.random() - 0.5) * 1.5,
                    y: (Math.random() - 0.5) * 1.5,
                  });
                }
              }
            }
          }}
        />
      )}
    </div>
  );
}
