export const MAX_TITLE_LENGTH = 120;
export const MAX_CONTENT_LENGTH = 2000;
export const MAX_TAG_LENGTH = 40;

/**
 * Normalizes and bounds free-text before it enters the store or gets persisted.
 * React escapes text on render, so the goal here is to strip control characters
 * and cap length to avoid layout/perf abuse and corrupt payloads.
 */
export function sanitizeText(value: string, maxLength: number = MAX_CONTENT_LENGTH): string {
  return value
    // Remove ASCII control chars except tab (\x09) and newline (\x0A)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, maxLength);
}

export function sanitizeTitle(value: string): string {
  return sanitizeText(value, MAX_TITLE_LENGTH);
}

export function sanitizeTag(value: string): string {
  return sanitizeText(value, MAX_TAG_LENGTH).replace(/[#\s]/g, '');
}
