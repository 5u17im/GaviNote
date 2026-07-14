import { describe, it, expect, beforeEach } from 'vitest';
import { useGraviStore } from './useGraviStore';

const baseNode = {
  title: 'Test',
  content: 'Body',
  tags: ['x'],
  category: 'idea' as const,
  initialX: 0,
  initialY: 0,
  width: 260,
  height: 120,
};

describe('useGraviStore', () => {
  beforeEach(() => {
    useGraviStore.getState().clearCanvas();
  });

  it('adds a node and returns its id', () => {
    const id = useGraviStore.getState().addNode(baseNode);
    const { nodes } = useGraviStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe(id);
    expect(nodes[0].createdAt).toBeGreaterThan(0);
  });

  it('updates a node with a patch', () => {
    const id = useGraviStore.getState().addNode(baseNode);
    useGraviStore.getState().updateNode(id, { title: 'Changed' });
    expect(useGraviStore.getState().nodes[0].title).toBe('Changed');
  });

  it('removes a node and its connections, allowing undo', () => {
    const store = useGraviStore.getState();
    const a = store.addNode(baseNode);
    const b = store.addNode(baseNode);
    store.addConnection(a, b, 'apoyo');
    store.removeNode(a);

    expect(useGraviStore.getState().nodes).toHaveLength(1);
    expect(useGraviStore.getState().connections).toHaveLength(0);

    useGraviStore.getState().recoverNode();
    expect(useGraviStore.getState().nodes).toHaveLength(2);
    expect(useGraviStore.getState().connections).toHaveLength(1);
  });

  it('prevents duplicate and self connections', () => {
    const store = useGraviStore.getState();
    const a = store.addNode(baseNode);
    const b = store.addNode(baseNode);
    expect(store.addConnection(a, a)).toBeNull();
    expect(store.addConnection(a, b)).not.toBeNull();
    expect(useGraviStore.getState().addConnection(b, a)).toBeNull();
    expect(useGraviStore.getState().connections).toHaveLength(1);
  });

  it('cycles connection type neutra -> apoyo -> conflicto -> neutra', () => {
    const store = useGraviStore.getState();
    const a = store.addNode(baseNode);
    const b = store.addNode(baseNode);
    const cid = store.addConnection(a, b, 'neutra')!;
    const typeOf = () => useGraviStore.getState().connections.find((c) => c.id === cid)!.type;

    useGraviStore.getState().cycleConnection(cid);
    expect(typeOf()).toBe('apoyo');
    useGraviStore.getState().cycleConnection(cid);
    expect(typeOf()).toBe('conflicto');
    useGraviStore.getState().cycleConnection(cid);
    expect(typeOf()).toBe('neutra');
  });

  it('clamps zoom between 0.15 and 3.0', () => {
    useGraviStore.getState().setZoom(10);
    expect(useGraviStore.getState().physicsConfig.zoom).toBe(3.0);
    useGraviStore.getState().setZoom(0);
    expect(useGraviStore.getState().physicsConfig.zoom).toBe(0.15);
  });

  it('supports functional pan updates', () => {
    useGraviStore.getState().setPan(100, 50);
    useGraviStore.getState().setPan((x) => x + 10, (y) => y - 5);
    expect(useGraviStore.getState().physicsConfig.panX).toBe(110);
    expect(useGraviStore.getState().physicsConfig.panY).toBe(45);
  });

  it('loadState replaces the graph', () => {
    const store = useGraviStore.getState();
    store.addNode(baseNode);
    store.loadState(
      [{ ...baseNode, id: 'n1', createdAt: 1 }],
      []
    );
    expect(useGraviStore.getState().nodes).toHaveLength(1);
    expect(useGraviStore.getState().nodes[0].id).toBe('n1');
  });
});
