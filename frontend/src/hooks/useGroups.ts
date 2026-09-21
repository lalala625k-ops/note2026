import { useState, useRef, useCallback } from 'react';
import { Group, Card } from '../types';
import { getBoundingBox } from '../utils/canvas';

export function useGroups(initialGroups: Group[] = []) {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const groupsRef = useRef<Group[]>(groups);
  groupsRef.current = groups;

  const refreshGroupBounds = useCallback((_currentCards: Card[], currentGroups: Group[]): Group[] => {
    // In circular hub mode, parents are independent circular nodes and do not stretch
    return currentGroups;
  }, []);

  const createEmptyParent = useCallback(
    (x: number, y: number, width = 40, height = 40, title?: string): Group => {
      const groupNum = groupsRef.current.length + 1;
      const newParent: Group = {
        id: `parent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title || `父物体 ${groupNum}`,
        x: Math.round(x),
        y: Math.round(y),
        width,
        height,
        zIndex: 5,
      };

      setGroups((prev) => [...prev, newParent]);
      return newParent;
    },
    []
  );

  const createGroupFromSelection = useCallback(
    (selectedCards: Card[], cursorPosition?: { x: number; y: number }): { newGroup: Group; updatedCards: Card[] } | null => {
      if (selectedCards.length === 0) return null;
      const box = getBoundingBox(selectedCards, []);
      if (!box) return null;

      const size = 40;
      const groupNum = groupsRef.current.length + 1;
      const cx = cursorPosition ? cursorPosition.x : box.x + box.width / 2;
      const cy = cursorPosition ? cursorPosition.y : box.y + box.height / 2;

      const newGroup: Group = {
        id: `parent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: `父物体 ${groupNum}`,
        x: Math.round(cx - size / 2),
        y: Math.round(cy - size / 2),
        width: size,
        height: size,
        zIndex: 5,
      };

      const selectedIdSet = new Set(selectedCards.map((c) => c.id));
      const updatedCards = selectedCards.map((c) => ({
        ...c,
        groupId: selectedIdSet.has(c.id) ? newGroup.id : c.groupId,
      }));

      return { newGroup, updatedCards };
    },
    []
  );

  const fitParentToBounds = useCallback((groupId: string, currentCards: Card[]) => {
    const groupCards = currentCards.filter((c) => c.groupId === groupId);
    if (groupCards.length === 0) return;

    const padding = 28;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const c of groupCards) {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + c.width);
      maxY = Math.max(maxY, c.y + c.height);
    }

    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              x: Math.round(minX - padding),
              y: Math.round(minY - padding - 8),
              width: Math.round(maxX - minX + padding * 2),
              height: Math.round(maxY - minY + padding * 2 + 8),
            }
          : g
      )
    );
  }, []);

  const renameGroup = useCallback((id: string, newTitle: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, title: newTitle } : g)));
  }, []);

  const updateGroupSize = useCallback((id: string, updates: Partial<Group>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }, []);

  return {
    groups,
    setGroups,
    groupsRef,
    refreshGroupBounds,
    createEmptyParent,
    createGroupFromSelection,
    fitParentToBounds,
    renameGroup,
    updateGroupSize,
  };
}
