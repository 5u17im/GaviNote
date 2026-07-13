import { NodeMeta, Connection, NodeCategory, ConnectionType } from '../types/node.types';


export function exportStateToJSON(nodes: NodeMeta[], connections: Connection[]) {
  try {
    const data = {
      nodes,
      connections,
      exportedAt: Date.now(),
      app: 'GraviNote',
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `gravinote-respaldo-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log("Canvas exported successfully.");
  } catch (error) {
    console.error("Failed to export canvas state:", error);
  }
}

export function importStateFromJSON(
  file: File,
  onLoad: (nodes: NodeMeta[], connections: Connection[]) => void
) {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      const data = JSON.parse(result);
      
      // Basic validation
      if (!data || !Array.isArray(data.nodes)) {
        alert("El archivo JSON no es un respaldo válido de GraviNote (Falta lista de nodos).");
        return;
      }

      // Format loaded nodes with fresh createdAt timestamps to prevent issues
      const loadedNodes: NodeMeta[] = data.nodes.map((node: unknown) => {
        const n = node as Record<string, unknown>;
        return {
          id: typeof n.id === 'string' ? n.id : `node-${Math.random().toString(36).substr(2, 9)}`,
          title: typeof n.title === 'string' ? n.title : '',
          content: typeof n.content === 'string' ? n.content : '',
          tags: Array.isArray(n.tags) ? (n.tags as string[]) : [],
          category: (typeof n.category === 'string' ? n.category : 'idea') as NodeCategory,
          initialX: typeof n.initialX === 'number' ? n.initialX : 0,
          initialY: typeof n.initialY === 'number' ? n.initialY : 0,
          width: typeof n.width === 'number' ? n.width : 260,
          height: typeof n.height === 'number' ? n.height : 120,
          createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
        };
      });

      const loadedConnections: Connection[] = Array.isArray(data.connections)
        ? data.connections.map((c: unknown) => {
            const conn = c as Record<string, unknown>;
            return {
              id: typeof conn.id === 'string' ? conn.id : `conn-${Math.random().toString(36).substr(2, 9)}`,
              sourceId: typeof conn.sourceId === 'string' ? conn.sourceId : '',
              targetId: typeof conn.targetId === 'string' ? conn.targetId : '',
              type: (typeof conn.type === 'string' ? conn.type : 'neutra') as ConnectionType,
            };
          })
        : [];

      onLoad(loadedNodes, loadedConnections);
      console.log("Canvas state imported successfully.");
    } catch (error) {
      console.error("Failed to parse imported JSON:", error);
      alert("Error al leer el archivo. Asegúrate de que sea un archivo JSON válido.");
    }
  };

  reader.readAsText(file);
}
