import { Card } from '../types';

export function autoPackCards(cardsToPack: Card[], gap = 24): Map<string, { x: number; y: number }> {
  if (cardsToPack.length === 0) return new Map();

  // Find start origin (top-left of existing bounding box)
  let minX = Infinity;
  let minY = Infinity;
  let totalArea = 0;

  for (const c of cardsToPack) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    totalArea += (c.width + gap) * (c.height + gap);
  }

  // Calculate target grid width based on sqrt of total area (aspect ratio ~ 1.5:1)
  const targetWidth = Math.max(Math.sqrt(totalArea) * 1.3, 400);

  // Shelf-based 2D bin packing
  const positions = new Map<string, { x: number; y: number }>();

  let currentX = minX;
  let currentY = minY;
  let rowHeight = 0;

  for (const card of cardsToPack) {
    // If placing this card exceeds target width and we already placed something in this row, wrap
    if (currentX + card.width > minX + targetWidth && currentX > minX) {
      currentX = minX;
      currentY += rowHeight + gap;
      rowHeight = 0;
    }

    positions.set(card.id, { x: currentX, y: currentY });

    currentX += card.width + gap;
    rowHeight = Math.max(rowHeight, card.height);
  }

  return positions;
}
