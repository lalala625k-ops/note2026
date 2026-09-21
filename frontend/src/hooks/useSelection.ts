import { useState, useRef, useCallback } from 'react';
import { Card, Rect } from '../types';
import { rectsIntersect } from '../utils/canvas';

export function useSelection() {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);

  const selectedCardIdsRef = useRef<Set<string>>(selectedCardIds);
  selectedCardIdsRef.current = selectedCardIds;

  const selectedGroupIdsRef = useRef<Set<string>>(selectedGroupIds);
  selectedGroupIdsRef.current = selectedGroupIds;

  const clearSelection = useCallback(() => {
    setSelectedCardIds(new Set());
    setSelectedGroupIds(new Set());
  }, []);

  const selectCard = useCallback((id: string, shiftKey: boolean) => {
    setSelectedCardIds((prev) => {
      const next = new Set(shiftKey ? prev : []);
      if (shiftKey && next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (!shiftKey) {
      setSelectedGroupIds(new Set());
    }
  }, []);

  const selectGroup = useCallback((id: string, shiftKey: boolean) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(shiftKey ? prev : []);
      if (shiftKey && next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (!shiftKey) {
      setSelectedCardIds(new Set());
    }
  }, []);

  const updateMarqueeSelection = useCallback((rect: Rect, cards: Card[], isShift: boolean) => {
    setSelectionRect(rect);
    const matched = new Set<string>(isShift ? selectedCardIdsRef.current : []);
    cards.forEach((c) => {
      if (rectsIntersect(rect, { x: c.x, y: c.y, width: c.width, height: c.height })) {
        matched.add(c.id);
      }
    });
    setSelectedCardIds(matched);
  }, []);

  return {
    selectedCardIds,
    setSelectedCardIds,
    selectedCardIdsRef,
    selectedGroupIds,
    setSelectedGroupIds,
    selectedGroupIdsRef,
    selectionRect,
    setSelectionRect,
    clearSelection,
    selectCard,
    selectGroup,
    updateMarqueeSelection,
  };
}
