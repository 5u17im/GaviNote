import { NodeMeta, Connection } from '../types/node.types';

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
      const loadedNodes: NodeMeta[] = data.nodes.map((node: any) => ({
        id: node.id || `node-${Math.random().toString(36).substr(2, 9)}`,
        title: node.title || '',
        content: node.content || '',
        tags: Array.isArray(node.tags) ? node.tags : [],
        category: node.category || 'idea',
        initialX: typeof node.initialX === 'number' ? node.initialX : 0,
        initialY: typeof node.initialY === 'number' ? node.initialY : 0,
        width: typeof node.width === 'number' ? node.width : 260,
        height: typeof node.height === 'number' ? node.height : 120,
        createdAt: node.createdAt || Date.now(),
      }));

      const loadedConnections: Connection[] = Array.isArray(data.connections)
        ? data.connections.map((c: any) => ({
            id: c.id || `conn-${Math.random().toString(36).substr(2, 9)}`,
            sourceId: c.sourceId,
            targetId: c.targetId,
            type: c.type || 'neutra',
          }))
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
