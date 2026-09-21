import { Card, SnapLine } from '../types';

export function calculateMagneticSnapping(
  draggedCard: Card,
  otherCards: Card[],
  threshold = 12
): { deltaX: number; deltaY: number; snapLines: SnapLine[] } {
  let deltaX = 0;
  let deltaY = 0;
  const snapLines: SnapLine[] = [];

  const draggedLeft = draggedCard.x;
  const draggedRight = draggedCard.x + draggedCard.width;
  const draggedCenterX = draggedCard.x + draggedCard.width / 2;

  const draggedTop = draggedCard.y;
  const draggedBottom = draggedCard.y + draggedCard.height;
  const draggedCenterY = draggedCard.y + draggedCard.height / 2;

  let minDiffX = Infinity;
  let minDiffY = Infinity;

  for (const other of otherCards) {
    const otherLeft = other.x;
    const otherRight = other.x + other.width;
    const otherCenterX = other.x + other.width / 2;

    const otherTop = other.y;
    const otherBottom = other.y + other.height;
    const otherCenterY = other.y + other.height / 2;

    // X-axis alignment pairs: [draggedVal, otherVal, linePosition]
    const xPairs = [
      { d: draggedLeft, o: otherLeft, pos: otherLeft },
      { d: draggedLeft, o: otherRight, pos: otherRight },
      { d: draggedRight, o: otherLeft, pos: otherLeft },
      { d: draggedRight, o: otherRight, pos: otherRight },
      { d: draggedCenterX, o: otherCenterX, pos: otherCenterX },
    ];

    for (const pair of xPairs) {
      const diff = pair.o - pair.d;
      if (Math.abs(diff) <= threshold && Math.abs(diff) < Math.abs(minDiffX)) {
        minDiffX = diff;
        deltaX = diff;
      }
    }

    // Y-axis alignment pairs
    const yPairs = [
      { d: draggedTop, o: otherTop, pos: otherTop },
      { d: draggedTop, o: otherBottom, pos: otherBottom },
      { d: draggedBottom, o: otherTop, pos: otherTop },
      { d: draggedBottom, o: otherBottom, pos: otherBottom },
      { d: draggedCenterY, o: otherCenterY, pos: otherCenterY },
    ];

    for (const pair of yPairs) {
      const diff = pair.o - pair.d;
      if (Math.abs(diff) <= threshold && Math.abs(diff) < Math.abs(minDiffY)) {
        minDiffY = diff;
        deltaY = diff;
      }
    }
  }

  // Generate snap guide lines if snapped
  if (Math.abs(deltaX) > 0 || Math.abs(minDiffX) <= threshold) {
    const newLeft = draggedLeft + deltaX;
    const newRight = draggedRight + deltaX;
    const newCenterX = draggedCenterX + deltaX;

    for (const other of otherCards) {
      const otherLeft = other.x;
      const otherRight = other.x + other.width;
      const otherCenterX = other.x + other.width / 2;

      for (const val of [newLeft, newRight, newCenterX]) {
        for (const target of [otherLeft, otherRight, otherCenterX]) {
          if (Math.abs(val - target) < 1) {
            const startY = Math.min(draggedTop + deltaY, other.y) - 20;
            const endY = Math.max(draggedBottom + deltaY, other.y + other.height) + 20;
            snapLines.push({
              type: 'vertical',
              position: target,
              start: startY,
              end: endY,
            });
          }
        }
      }
    }
  }

  if (Math.abs(deltaY) > 0 || Math.abs(minDiffY) <= threshold) {
    const newTop = draggedTop + deltaY;
    const newBottom = draggedBottom + deltaY;
    const newCenterY = draggedCenterY + deltaY;

    for (const other of otherCards) {
      const otherTop = other.y;
      const otherBottom = other.y + other.height;
      const otherCenterY = other.y + other.height / 2;

      for (const val of [newTop, newBottom, newCenterY]) {
        for (const target of [otherTop, otherBottom, otherCenterY]) {
          if (Math.abs(val - target) < 1) {
            const startX = Math.min(draggedLeft + deltaX, other.x) - 20;
            const endX = Math.max(draggedRight + deltaX, other.x + other.width) + 20;
            snapLines.push({
              type: 'horizontal',
              position: target,
              start: startX,
              end: endX,
            });
          }
        }
      }
    }
  }

  return { deltaX, deltaY, snapLines };
}
