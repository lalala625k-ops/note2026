import { Card } from '../types';

export const DEFAULT_SUGGESTED_TAGS: string[] = ['灵感', '工作', '待办', '参考', '重要'];

export interface TagWithCount {
  tag: string;
  count: number;
}

/**
 * Computes frequency for all tags used across all cards, sorted by frequency descending.
 */
export function getAllTagsWithCounts(cards: Card[]): TagWithCount[] {
  const countsMap = new Map<string, number>();

  cards.forEach((card) => {
    if (Array.isArray(card.tags)) {
      card.tags.forEach((tag) => {
        const clean = tag.trim();
        if (clean) {
          countsMap.set(clean, (countsMap.get(clean) || 0) + 1);
        }
      });
    }
  });

  const list: TagWithCount[] = [];
  countsMap.forEach((count, tag) => {
    list.push({ tag, count });
  });

  // Sort by count descending, then alphabetically
  return list.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Returns the top N most frequently used tags.
 * If canvas has fewer than N tags, fills up with sensible defaults without duplicates.
 */
export function getTopTags(cards: Card[], limit = 5): string[] {
  const all = getAllTagsWithCounts(cards);
  const result: string[] = all.slice(0, limit).map((item) => item.tag);

  if (result.length < limit) {
    for (const defTag of DEFAULT_SUGGESTED_TAGS) {
      if (!result.includes(defTag)) {
        result.push(defTag);
        if (result.length >= limit) break;
      }
    }
  }

  return result.slice(0, limit);
}
