import { useEffect } from 'react';
import { ConstellationEntry } from '../components/canvas/ConstellationLayer';

interface UseConstellationShortcutsProps {
  selectedId: string | null;
  constellationEntries: ConstellationEntry[];
  collapsedKeys: Set<string>;
  onToggleCollapse: (key: string, nodeIds: string[]) => void;
  onExpandAll: () => void;
}

function findEntryByNode(
  entries: ConstellationEntry[],
  nodeId: string | null
): ConstellationEntry | undefined {
  if (!nodeId) return undefined;
  return entries.find((e) => e.nodeIds.includes(nodeId));
}

/**
 * Keyboard shortcuts for constellations (Idea 1):
 *   C        → collapse/expand the constellation of the selected node
 *   Shift+C  → collapse/expand every constellation
 */
export function useConstellationShortcuts({
  selectedId,
  constellationEntries,
  collapsedKeys,
  onToggleCollapse,
  onExpandAll,
}: UseConstellationShortcutsProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (isTyping) return;
      if (e.key !== 'c' && e.key !== 'C') return;

      // Avoid hijacking Ctrl/Cmd+C (copy).
      if (e.ctrlKey || e.metaKey) return;

      if (e.shiftKey) {
        // Collapse all if any are still expanded, otherwise expand all.
        const anyExpanded = constellationEntries.some((e) => !collapsedKeys.has(e.key));
        if (anyExpanded) {
          for (const entry of constellationEntries) {
            if (!collapsedKeys.has(entry.key)) onToggleCollapse(entry.key, entry.nodeIds);
          }
        } else {
          onExpandAll();
        }
        return;
      }

      const entry = findEntryByNode(constellationEntries, selectedId);
      if (!entry) return;
      onToggleCollapse(entry.key, entry.nodeIds);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, constellationEntries, collapsedKeys, onToggleCollapse, onExpandAll]);
}
