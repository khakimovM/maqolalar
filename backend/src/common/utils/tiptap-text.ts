/**
 * Tiptap JSON (rich text) ichidan plain text ajratib oladi.
 * Article.searchText uchun ishlatiladi — qidiruv shu matn bo'yicha ishlaydi.
 */
export function extractTiptapText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';

  const n = node as Record<string, any>;
  const parts: string[] = [];

  if (typeof n.text === 'string') parts.push(n.text);

  if (Array.isArray(n.content)) {
    for (const child of n.content) {
      parts.push(extractTiptapText(child));
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
