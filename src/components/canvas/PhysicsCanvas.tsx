'use client';

import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { useGraviStore } from '../../store/useGraviStore';
import { usePhysicsEngine } from '../../hooks/usePhysicsEngine';
import { usePhysicsSync } from '../../hooks/usePhysicsSync';
import type { ConnectionPathRefs } from '../../hooks/usePhysicsSync';
import { useDragNode } from '../../hooks/useDragNode';
import { useMagneticForces } from '../../hooks/useMagneticForces';
import { useConnectionDraw } from '../../hooks/useConnectionDraw';
import { useCanvasCommands } from '../../hooks/useCanvasCommands';
import { createNodeBody, destroyNodeBody, syncBodyPhysics, setBodyPinned, CATEGORY_PHYSICS, type NodeBody } from '../../physics/bodies';
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
import { logError } from '../../utils/logger';
import { validateSnapshot, serializeSnapshot } from '../../utils/serializer';
import { commandBus } from '../../utils/commandBus';

export function PhysicsCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Zustand Store
  const {
    nodes,
    connections,
    selectedId,
    searchQuery,
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

  const { zoom, panX, panY, gravity, magnetStrength, vortexGravity = 1.0 } = physicsConfig;

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
  // Registry of connectionId -> SVG path elements (avoids getElementById per frame)
  const svgRefs = useRef<Map<string, ConnectionPathRefs>>(new Map());

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

  // Multi-touch tracking for pinch-to-zoom (CU-09 / RNF-05)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

  // Spacebar tracking
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);

  // Viewport size tracked in state so the world transform re-centers on window resize
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Restore state from Local Storage or load demo on mount
  useEffect(() => {
    const saved = localStorage.getItem('gravinote-saved-state');
    if (saved) {
      try {
        const snapshot = validateSnapshot(JSON.parse(saved));
        if (snapshot && snapshot.nodes.length > 0) {
          // Auto-adjust dimensions of stored nodes to prevent text clipping
          const updatedNodes = snapshot.nodes.map((node) => {
            const dims = calculateOptimalDimensions(node.title, node.content, node.tags);
            return {
              ...node,
              width: dims.width,
              height: dims.height,
            };
          });
          loadState(updatedNodes, snapshot.connections);
          return;
        }
      } catch (err) {
        logError("Failed to restore saved local storage state:", err);
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

  // Debounced Auto-save to Local Storage (excluding deleting nodes and their connections)
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const unsubscribe = useGraviStore.subscribe((state) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const activeNodes = state.nodes.filter((n) => !n.isDeleting);
        const activeNodeIds = new Set(activeNodes.map((n) => n.id));
        const activeConnections = state.connections.filter(
          (c) => activeNodeIds.has(c.sourceId) && activeNodeIds.has(c.targetId)
        );

        const dataToSave = serializeSnapshot(activeNodes, activeConnections);
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
          setBodyPinned(body, true);
        }
        currentBodies.set(node.id, body);
      } else {
        const body = currentBodies.get(node.id)!;
        const bodyWithData = body as NodeBody;
        
        // Sync static state dynamically (except when dragging)
        const isPinned = node.isPinned || false;
        if (!dragNode.isDragging(node.id) && body.isStatic !== isPinned) {
          setBodyPinned(body, isPinned);
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

        // Update physical properties dynamically if category changed.
        // syncBodyPhysics skips static bodies to avoid the NaN-inertia corruption
        // that would otherwise propagate to connected nodes via the constraint solver.
        syncBodyPhysics(body, CATEGORY_PHYSICS[node.category]);
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

    // 3. Reset constraint length to 260px if neither node is pinned (unpinned self-healing)
    for (const [id, constraint] of currentConstraints.entries()) {
      const conn = connections.find(c => c.id === id);
      if (conn && constraint.bodyA && constraint.bodyB) {
        const nodeA = nodes.find(n => n.id === conn.sourceId);
        const nodeB = nodes.find(n => n.id === conn.targetId);
        const isAnyPinned = nodeA?.isPinned || nodeB?.isPinned || false;
        
        if (!isAnyPinned && constraint.length !== 260) {
          constraint.length = 260;
        }
      }
    }
  }, [connections, nodes, engineRef]);

  // Global canvas commands (Big Bang, Clear, Zoom-to-Fit) via the typed command bus
  useCanvasCommands({ bodiesRef, nodes, setZoom, setPan });

  // Hook for DOM & SVG coordinates synchronization (Runs RAF loop)
  usePhysicsSync({
    engineRef,
    bodiesRef,
    domRefs,
    svgRefs,
    nodes,
    connections,
    zoom,
    panX,
    panY,
    searchQuery,
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
      const vx = window.innerWidth - 72;
      const vy = window.innerHeight - 56;
      const vortexWorld = screenToWorld(vx, vy);

      applyVortexSuction(engine.world, bodiesRef.current, nodes, vortexWorld, vortexGravity, (nodeId) => {
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
  }, [engineRef, nodes, removeNode, panX, panY, zoom, screenToWorld, vortexGravity]);



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

  // Wheel zoom — registered as a native, non-passive listener (see effect below).
  // React attaches onWheel passively, so e.preventDefault() there is ignored and
  // Ctrl+Wheel (trackpad pinch) would zoom the whole browser page (HUD included).

  // Distance between the two active pointers (used for pinch-to-zoom)
  const pinchDistance = () => {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  // Pan background pointer handlers
  const handlePanStart = (e: React.PointerEvent) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // A second finger down starts a pinch gesture and cancels any active pan
    if (pointersRef.current.size === 2) {
      panDragRef.current.isDragging = false;
      pinchRef.current = { startDist: pinchDistance(), startZoom: zoom };
      selectNode(null);
      e.stopPropagation();
      return;
    }

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
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch-to-zoom: scale zoom by the ratio of current/initial finger distance
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const dist = pinchDistance();
      if (pinchRef.current.startDist > 0) {
        const ratio = dist / pinchRef.current.startDist;
        setZoom(pinchRef.current.startZoom * ratio);
      }
      return;
    }

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
    pointersRef.current.delete(e.pointerId);

    // Leaving fewer than two pointers ends the pinch gesture
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }

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

  // Keyboard: delete selected node (Supr/Backspace) and deselect (Escape) — RNF-02
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (isTyping) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        handleRemoveNode(selectedId);
        selectNode(null);
      } else if (e.key === 'Escape' && selectedId) {
        selectNode(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Move DOM focus to the selected node so keyboard users keep context (RNF-02)
  useEffect(() => {
    if (selectedId) {
      const el = domRefs.current.get(selectedId);
      if (el && document.activeElement !== el) {
        el.focus({ preventScroll: true });
      }
    }
  }, [selectedId]);

  // Native, non-passive wheel listener so preventDefault actually stops the
  // browser's Ctrl+Wheel page zoom (which would scale the fixed HUD too).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 0.08;
      const direction = e.deltaY < 0 ? 1 : -1;
      setZoom((z) => z + direction * zoomFactor);
    };
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, [setZoom]);

  const cx = viewport.width / 2;
  const cy = viewport.height / 2;

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePanStart}
      onPointerMove={handlePanMove}
      onPointerUp={handlePanEnd}
      onPointerCancel={handlePanEnd}
      className={`relative w-dvw h-dvh overflow-hidden bg-[#0B0F19] ${
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
          svgRefs={svgRefs}
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
        className="fixed bottom-6 right-10 z-30 w-16 h-16 rounded-full border border-[#00E5FF]/20 flex items-center justify-center pointer-events-none select-none"
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
            commandBus.emit('editNode', contextMenu.nodeId);
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
                setBodyPinned(body, nextPinned);
              }
            }
          }}
        />
      )}
    </div>
  );
}
