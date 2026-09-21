import { Card } from '../types';

export type AlignDirection = 'top' | 'bottom' | 'left' | 'right';

export function alignCards(
  selectedCards: Card[],
  direction: AlignDirection
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (selectedCards.length <= 1) return result;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const c of selectedCards) {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x + c.width);
    minY = Math.min(minY, c.y);
    maxY = Math.max(maxY, c.y + c.height);
  }

  for (const c of selectedCards) {
    let newX = c.x;
    let newY = c.y;

    switch (direction) {
      case 'left':
        newX = minX;
        break;
      case 'right':
        newX = maxX - c.width;
        break;
      case 'top':
        newY = minY;
        break;
      case 'bottom':
        newY = maxY - c.height;
        break;
    }

    result.set(c.id, { x: newX, y: newY });
  }

  return result;
}
