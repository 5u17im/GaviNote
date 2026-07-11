import { NodeCategory } from '../types/node.types';

// Standard base physics configuration sizes as fallbacks
export const CATEGORY_BASE_SIZES: Record<NodeCategory, { width: number; height: number }> = {
  idea: { width: 240, height: 110 },
  tarea: { width: 240, height: 110 },
  referencia: { width: 240, height: 110 },
  alerta: { width: 240, height: 110 },
};

/**
 * Calculates the optimal width and height for a node based on its textual content
 * to ensure that no words are clipped with "..." and spacing feels natural.
 */
export function calculateOptimalDimensions(
  title: string,
  content: string,
  tags: string[]
): { width: number; height: number } {
  // Estimate longest word length to expand width if necessary (preventing word truncation)
  const allWords = [...title.split(/\s+/), ...content.split(/\s+/)];
  const maxWordLength = allWords.reduce((max, word) => Math.max(max, word.length), 0);

  // Dynamic base width (wider if we have very long technical words)
  let width = 240;
  if (maxWordLength > 14) {
    width = 280; // Expand width to comfortably fit long words without truncation
  } else if (maxWordLength > 10) {
    width = 260;
  }

  // Calculate height elements dynamically
  const paddingHeight = 20; // Internal spacing
  const borderMargin = 6;   // Outer glass border space
  const headerHeight = 18;  // Category + Time row
  
  // Title height estimate (Inter font, title is bold text-xs)
  const charsPerLineTitle = Math.floor((width - 24) / 7.2); // ~7.2px per character at text-xs
  const titleLines = Math.max(1, Math.ceil((title || 'Sin Título').length / charsPerLineTitle));
  const titleHeight = titleLines * 16; // 16px line height

  // Content height estimate (Inter font, description is text-[10.5px])
  const charsPerLineContent = Math.floor((width - 24) / 6.2); // ~6.2px per character at text-[10.5px]
  const contentLines = Math.max(1, Math.ceil((content || '').length / charsPerLineContent));
  
  // We clamp the preview lines to max 4 to keep cards balanced on the physics field
  const clampedLines = Math.min(4, contentLines);
  const contentHeight = clampedLines * 14; // 14px line height (leading-normal)

  // Tags height
  const tagsHeight = tags.length > 0 ? 18 : 0;

  // Gap between sections
  const gaps = 10;

  // Add all together
  const rawHeight = paddingHeight + borderMargin + headerHeight + titleHeight + contentHeight + tagsHeight + gaps;

  // Set hard bounds to maintain aesthetic consistency in the canvas
  const height = Math.max(105, Math.min(180, Math.round(rawHeight)));

  return { width, height };
}
