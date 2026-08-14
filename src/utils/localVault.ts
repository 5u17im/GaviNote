import { NodeMeta, Connection, NodeCategory } from '../types/node.types';

const VAULT_STORAGE_KEY = 'gravinote_second_brain_vault_v1';
const VAULT_METADATA_KEY = 'gravinote_second_brain_vault_meta';

export interface LocalVaultData {
  version: string;
  lastSaved: number;
  nodes: NodeMeta[];
  connections: Connection[];
}

/**
 * Saves current notes and connections directly to browser LocalStorage.
 * This data resides solely on the client machine and is never committed to Git.
 */
export function saveLocalVault(nodes: NodeMeta[], connections: Connection[]): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const data: LocalVaultData = {
      version: '1.0.0',
      lastSaved: Date.now(),
      nodes,
      connections,
    };
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(
      VAULT_METADATA_KEY,
      JSON.stringify({
        noteCount: nodes.length,
        connCount: connections.length,
        lastSaved: Date.now(),
      })
    );
    return true;
  } catch (error) {
    console.error('Error saving local vault:', error);
    return false;
  }
}

/**
 * Loads the user's local vault from LocalStorage.
 */
export function loadLocalVault(): LocalVaultData | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.connections)) {
      return parsed as LocalVaultData;
    }
    return null;
  } catch (error) {
    console.error('Error loading local vault:', error);
    return null;
  }
}

/**
 * Clears the local vault from storage.
 */
export function clearLocalVault(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(VAULT_STORAGE_KEY);
  localStorage.removeItem(VAULT_METADATA_KEY);
}

/**
 * Converts a NodeMeta into standard Obsidian-compatible Markdown with YAML frontmatter.
 */
export function nodeToObsidianMarkdown(node: NodeMeta): string {
  const frontmatter = [
    '---',
    `title: "${node.title.replace(/"/g, '\\"')}"`,
    `category: ${node.category}`,
    `tags: [${node.tags.map((t) => `"${t}"`).join(', ')}]`,
    `pinned: ${Boolean(node.isPinned)}`,
    `created: "${new Date(node.createdAt).toISOString()}"`,
    `updated: "${new Date(node.updatedAt || node.createdAt).toISOString()}"`,
    '---',
    '',
    `# ${node.title}`,
    '',
    node.content,
  ].join('\n');

  return frontmatter;
}

/**
 * Parses an Obsidian markdown string (with optional YAML frontmatter) into a NodeMeta partial.
 */
export function parseObsidianMarkdown(
  filename: string,
  rawContent: string
): Omit<NodeMeta, 'id' | 'createdAt'> {
  let title = filename.replace(/\.md$/i, '');
  let category: NodeCategory = 'idea';
  let tags: string[] = [];
  let isPinned = false;
  let content = rawContent;

  // Simple YAML frontmatter parser
  const frontmatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const frontmatterText = frontmatterMatch[1];
    content = rawContent.slice(frontmatterMatch[0].length).trim();

    const titleMatch = frontmatterText.match(/title:\s*["']?(.*?)["']?$/m);
    if (titleMatch && titleMatch[1].trim()) {
      title = titleMatch[1].trim();
    }

    const categoryMatch = frontmatterText.match(/category:\s*["']?(central|idea|tarea|referencia|alerta)["']?$/m);
    if (categoryMatch && categoryMatch[1]) {
      category = categoryMatch[1] as NodeCategory;
    }

    const tagsMatch = frontmatterText.match(/tags:\s*\[(.*?)\]/m);
    if (tagsMatch && tagsMatch[1]) {
      tags = tagsMatch[1]
        .split(',')
        .map((t) => t.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }

    const pinnedMatch = frontmatterText.match(/pinned:\s*(true|false)/m);
    if (pinnedMatch) {
      isPinned = pinnedMatch[1] === 'true';
    }
  } else {
    // If no frontmatter, check for # Title at top
    const h1Match = content.match(/^#\s+(.*?)$/m);
    if (h1Match && h1Match[1].trim()) {
      title = h1Match[1].trim();
      content = content.replace(/^#\s+.*?\r?\n/, '').trim();
    }
  }

  // Also extract #inlineTags from content if no frontmatter tags
  const inlineTagsMatch = content.match(/#([a-zA-Z0-9_\u00C0-\u017F]+)/g);
  if (inlineTagsMatch) {
    const foundTags = inlineTagsMatch.map((t) => t.slice(1).toLowerCase());
    tags = Array.from(new Set([...tags, ...foundTags]));
  }

  return {
    title,
    content,
    tags,
    category,
    isPinned,
    initialX: (Math.random() - 0.5) * 600,
    initialY: (Math.random() - 0.5) * 400,
    width: 220,
    height: 120,
  };
}

/**
 * Downloads a single note as an Obsidian `.md` file.
 */
export function downloadNoteAsMarkdown(node: NodeMeta): void {
  const markdown = nodeToObsidianMarkdown(node);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = (node.title || 'nota').replace(/[/\\?%*:|"<>]/g, '-');
  a.href = url;
  a.download = `${safeTitle}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports all vault notes as individual markdown files bundled in a JSON or triggers sequential downloads.
 */
export function exportVaultToMarkdownFiles(nodes: NodeMeta[]): void {
  const exportPayload = {
    vaultName: 'GraviNote-SecondBrain',
    exportedAt: new Date().toISOString(),
    files: nodes.map((node) => ({
      filename: `${(node.title || 'nota').replace(/[/\\?%*:|"<>]/g, '-')}.md`,
      content: nodeToObsidianMarkdown(node),
    })),
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GraviNote_SecondBrain_Vault_${new Date().toISOString().slice(0, 10)}.vault.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
