import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Group } from './types';
import { CardComponent } from './components/CardComponent';
import { GroupComponent } from './components/GroupComponent';
import { ParentLinkLines, InteractiveWire } from './components/ParentLinkLines';
import { SelectionBox } from './components/SelectionBox';
import { SnapGuides } from './components/SnapGuides';
import { PieDateMenu } from './components/PieDateMenu';
import { screenToWorld, computeFitViewport, computeCardFocusViewport } from './utils/canvas';
import { autoPackCards } from './utils/packing';
import { alignCards } from './utils/alignment';
import { loadInitialData, saveStateDebounced, flushStoredCards, exportBackup, importBackupFromFile } from './utils/storage';
import { SearchModal } from './components/SearchModal';

import { useViewport } from './hooks/useViewport';
import { useSelection } from './hooks/useSelection';
import { useGroups } from './hooks/useGroups';
import { useCardResize } from './hooks/useCardResize';
import { useCardDrag } from './hooks/useCardDrag';
import { useClipboardPaste } from './hooks/useClipboardPaste';
import { useShortcuts } from './hooks/useShortcuts';
import { useHistory } from './hooks/useHistory';

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const cardsRef = useRef<Card[]>(cards);
  cardsRef.current = cards;

  const maxZIndexRef = useRef(10);
  const containerRef = useRef<HTMLDivElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const clickedCardInfoRef = useRef<{ id: string; wasAlreadySelected: boolean; shiftKey: boolean } | null>(null);
  const hasCardDraggedRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  // Sub-hooks
  const { pushHistory, undo } = useHistory();
  const {
    viewport,
    setViewport,
    viewportRef,
    mouseWorldRef,
    handleWheel,
    handleCardDoubleClick,
    handleCanvasDoubleClick,
  } = useViewport();

  const {
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
  } = useSelection();

  const {
    groups,
    setGroups,
    groupsRef,
    refreshGroupBounds,
    createEmptyParent,
    createGroupFromSelection,
    fitParentToBounds,
    renameGroup,
    updateGroupSize,
  } = useGroups([]);

  const {
    startScale,
    startResize,
    startGroupResize,
    updateScale,
    updateResize,
    updateGroupResize,
    resetResize,
  } = useCardResize();

  const {
    snapLines,
    dragOverGroupId,
    setDragOverGroupId,
    initDragCards,
    initDragGroup,
    updateCardPositions,
    updateGroupPositions,
    finishCardDrag,
  } = useCardDrag();

  // Drag interaction state
  const dragModeRef = useRef<'pan' | 'select' | 'drag-card' | 'drag-group' | 'connect-card' | 'scale-card' | 'resize-card' | 'resize-group' | 'pie-menu' | null>(null);
  const [interactiveWire, setInteractiveWire] = useState<InteractiveWire | null>(null);
  const connectingCardIdRef = useRef<string | null>(null);
  const dragOverGroupIdRef = useRef<string | null>(null);
  const [activePieMenu, setActivePieMenu] = useState<{
    card: Card;
    center: { x: number; y: number };
    pointer: { x: number; y: number };
    isRightMouseDown: boolean;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef<{ screenX: number; screenY: number; vpX: number; vpY: number; worldX: number; worldY: number }>({
    screenX: 0,
    screenY: 0,
    vpX: 0,
    vpY: 0,
    worldX: 0,
    worldY: 0,
  });

  const commitState = useCallback((newCards: Card[], newGroups: Group[]) => {
    setCards(newCards);
    setGroups(newGroups);
    saveStateDebounced(newCards, newGroups);
  }, [setGroups]);

  // Initial Data Loading
  useEffect(() => {
    loadInitialData().then(({ cards: initCards, groups: initGroups }) => {
      // Normalize any legacy oversized parent boxes down to compact 40px circle
      const normalizedGroups = initGroups.map((g) => {
        if (g.width && g.width > 60) {
          const oldW = g.width;
          const oldH = g.height;
          const newSize = 40;
          return {
            ...g,
            x: Math.round(g.x + oldW / 2 - newSize / 2),
            y: Math.round(g.y + oldH / 2 - newSize / 2),
            width: newSize,
            height: newSize,
          };
        }
        return g;
      });
      setCards(initCards);
      setGroups(normalizedGroups);
      const fit = computeFitViewport(initCards, normalizedGroups, window.innerWidth, window.innerHeight);
      if (fit) setViewport(fit);
      let maxZ = 10;
      initCards.forEach((c) => { if (c.zIndex && c.zIndex > maxZ) maxZ = c.zIndex; });
      maxZIndexRef.current = maxZ + 1;
    });

    const handleBeforeUnload = () => flushStoredCards();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [setGroups, setViewport]);

  // Card update helper
  const handleCardUpdate = useCallback((id: string, updates: Partial<Card>) => {
    pushHistory(cardsRef.current, groupsRef.current);
    setCards((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      saveStateDebounced(next, groupsRef.current);
      return next;
    });
  }, [pushHistory]);

  // Create card at cursor
  const createCardAtCursor = useCallback((cardData: Partial<Card>): Card => {
    pushHistory(cardsRef.current, groupsRef.current);
    maxZIndexRef.current += 1;
    const w = cardData.width || 260;
    const h = cardData.height || 180;
    const center = mouseWorldRef.current;

    const newCard: Card = {
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: cardData.type || 'text',
      x: center.x - w / 2,
      y: center.y - h / 2,
      width: w,
      height: h,
      zIndex: maxZIndexRef.current,
      content: cardData.content || '',
      title: cardData.title,
      url: cardData.url,
      image: cardData.image,
      description: cardData.description,
      favicon: cardData.favicon,
    };

    setCards((prev) => {
      const next = [...prev, newCard];
      saveStateDebounced(next, groupsRef.current);
      return next;
    });
    setSelectedCardIds(new Set([newCard.id]));
    return newCard;
  }, [pushHistory, mouseWorldRef, setSelectedCardIds]);

  // Actions
  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev) {
      setCards(prev.cards);
      setGroups(prev.groups);
      saveStateDebounced(prev.cards, prev.groups);
    }
  }, [undo, setGroups]);

  const handleDeleteSelected = useCallback(() => {
    const cardIds = selectedCardIdsRef.current;
    const groupIds = selectedGroupIdsRef.current;
    if (cardIds.size === 0 && groupIds.size === 0) return;

    pushHistory(cardsRef.current, groupsRef.current);
    const nextCards = cardsRef.current.filter((c) => !cardIds.has(c.id) && (!c.groupId || !groupIds.has(c.groupId)));
    const nextGroups = groupsRef.current.filter((g) => !groupIds.has(g.id));
    commitState(nextCards, refreshGroupBounds(nextCards, nextGroups));
    clearSelection();
  }, [pushHistory, commitState, refreshGroupBounds, clearSelection]);

  const handleCreateNewParentAtCursor = useCallback(() => {
    pushHistory(cardsRef.current, groupsRef.current);
    const target = mouseWorldRef.current;
    const vp = viewportRef.current;
    // Exactly 5 times standard font size (8px * 5 = 40px) scaled inversely by current zoom
    // so on the user's screen it always maintains a constant comfortable 40px relative size!
    const baseFontSize = 8;
    const size = Math.max(20, Math.min(120, Math.round((baseFontSize * 5) / vp.zoom)));
    const newParent = createEmptyParent(target.x - size / 2, target.y - size / 2, size, size);
    setSelectedGroupIds(new Set([newParent.id]));
    saveStateDebounced(cardsRef.current, [...groupsRef.current, newParent]);
    showToast(`已在光标处创建父物体「${newParent.title}」，按住 Ctrl 拖拽卡片即可链接`);
  }, [pushHistory, createEmptyParent, setSelectedGroupIds, showToast, mouseWorldRef, viewportRef]);

  const handleGroup = useCallback(() => {
    const selectedCards = cardsRef.current.filter((c) => selectedCardIdsRef.current.has(c.id));
    if (selectedCards.length === 0) {
      handleCreateNewParentAtCursor();
      return;
    }

    pushHistory(cardsRef.current, groupsRef.current);
    const res = createGroupFromSelection(selectedCards, mouseWorldRef.current);
    if (!res) return;

    const nextCards = cardsRef.current.map((c) => {
      const updated = res.updatedCards.find((u) => u.id === c.id);
      return updated || c;
    });
    const nextGroups = [...groupsRef.current, res.newGroup];
    commitState(nextCards, nextGroups);
    setSelectedGroupIds(new Set([res.newGroup.id]));
    showToast(`已创建父物体「${res.newGroup.title}」，已链接 ${selectedCards.length} 项`);
  }, [createGroupFromSelection, pushHistory, commitState, setSelectedGroupIds, handleCreateNewParentAtCursor, showToast, mouseWorldRef]);

  const handleUngroup = useCallback(() => {
    const gIds = selectedGroupIdsRef.current;
    if (gIds.size === 0) return;

    pushHistory(cardsRef.current, groupsRef.current);
    const nextCards = cardsRef.current.map((c) => (c.groupId && gIds.has(c.groupId) ? { ...c, groupId: null } : c));
    const nextGroups = groupsRef.current.filter((g) => !gIds.has(g.id));
    commitState(nextCards, nextGroups);
    setSelectedGroupIds(new Set());
    showToast('已解散所选父物体');
  }, [pushHistory, commitState, setSelectedGroupIds, showToast]);

  const handleUngroupSpecific = useCallback((gId: string) => {
    pushHistory(cardsRef.current, groupsRef.current);
    const nextCards = cardsRef.current.map((c) => (c.groupId === gId ? { ...c, groupId: null } : c));
    const nextGroups = groupsRef.current.filter((g) => g.id !== gId);
    commitState(nextCards, nextGroups);
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      next.delete(gId);
      return next;
    });
    showToast('已解散父物体');
  }, [pushHistory, commitState, setSelectedGroupIds, showToast]);

  const handleFitParentSpecific = useCallback((gId: string) => {
    pushHistory(cardsRef.current, groupsRef.current);
    fitParentToBounds(gId, cardsRef.current);
    showToast('已自适应贴合子卡片');
  }, [pushHistory, fitParentToBounds, showToast]);

  const handleAutoPack = useCallback(() => {
    pushHistory(cardsRef.current, groupsRef.current);
    const selIds = selectedCardIdsRef.current;
    const targets = selIds.size > 0 ? cardsRef.current.filter((c) => selIds.has(c.id)) : cardsRef.current;
    const packedMap = autoPackCards(targets);

    const nextCards = cardsRef.current.map((c) => {
      const p = packedMap.get(c.id);
      return p ? { ...c, x: p.x, y: p.y } : c;
    });
    commitState(nextCards, refreshGroupBounds(nextCards, groupsRef.current));
  }, [pushHistory, commitState, refreshGroupBounds]);

  const handleAlign = useCallback((dir: 'top' | 'bottom' | 'left' | 'right') => {
    const selCards = cardsRef.current.filter((c) => selectedCardIdsRef.current.has(c.id));
    if (selCards.length <= 1) return;

    pushHistory(cardsRef.current, groupsRef.current);
    const alignedMap = alignCards(selCards, dir);
    const nextCards = cardsRef.current.map((c) => {
      const pos = alignedMap.get(c.id);
      return pos ? { ...c, x: pos.x, y: pos.y } : c;
    });
    commitState(nextCards, refreshGroupBounds(nextCards, groupsRef.current));
  }, [pushHistory, commitState, refreshGroupBounds]);

  // Card Copy & Paste
  const copiedCardsRef = useRef<Card[]>([]);

  const handleCopy = useCallback(() => {
    const selIds = selectedCardIdsRef.current;
    if (selIds.size === 0) return;
    const cardsToCopy = cardsRef.current.filter((c) => selIds.has(c.id));
    if (cardsToCopy.length === 0) return;

    copiedCardsRef.current = cardsToCopy;
    try {
      navigator.clipboard.writeText(
        JSON.stringify({
          __type: 'infinite-canvas-cards',
          cards: cardsToCopy,
        })
      );
    } catch {
      // Fallback to internal ref
    }
    showToast(`已复制 ${cardsToCopy.length} 张便签`);
  }, [showToast]);

  const handlePasteCopiedCards = useCallback(
    (sourceCards: Card[]) => {
      if (sourceCards.length === 0) return;
      pushHistory(cardsRef.current, groupsRef.current);

      const minX = Math.min(...sourceCards.map((c) => c.x));
      const minY = Math.min(...sourceCards.map((c) => c.y));
      const maxX = Math.max(...sourceCards.map((c) => c.x + c.width));
      const maxY = Math.max(...sourceCards.map((c) => c.y + c.height));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const targetWorld = mouseWorldRef.current;
      const offsetX = targetWorld.x - centerX;
      const offsetY = targetWorld.y - centerY;

      const newCards: Card[] = sourceCards.map((src) => {
        maxZIndexRef.current += 1;
        return {
          ...src,
          id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          x: Math.round(src.x + offsetX),
          y: Math.round(src.y + offsetY),
          zIndex: maxZIndexRef.current,
          groupId: null,
        };
      });

      setCards((prev) => {
        const next = [...prev, ...newCards];
        saveStateDebounced(next, groupsRef.current);
        return next;
      });

      setSelectedCardIds(new Set(newCards.map((c) => c.id)));
      showToast(`已在光标处粘贴 ${newCards.length} 张便签`);
    },
    [pushHistory, showToast, setSelectedCardIds, mouseWorldRef]
  );

  const handleDuplicateSelected = useCallback(() => {
    const selIds = selectedCardIdsRef.current;
    if (selIds.size === 0) return;
    const selected = cardsRef.current.filter((c) => selIds.has(c.id));
    if (selected.length === 0) return;
    handlePasteCopiedCards(selected);
  }, [handlePasteCopiedCards]);

  const handleCreateNewNoteAtCursor = useCallback(() => {
    createCardAtCursor({ type: 'text', content: '', width: 260, height: 180 });
    showToast('已在光标处新建便签');
  }, [createCardAtCursor, showToast]);

  // Shortcuts & Paste
  const { handlePaste } = useClipboardPaste({
    createCardAtCursor,
    updateCard: handleCardUpdate,
    pasteCopiedCards: handlePasteCopiedCards,
    getCopiedCards: () => copiedCardsRef.current,
    showToast,
  });
  const { isShiftPressedRef, isSpacePressedRef, isAltPressedRef } = useShortcuts({
    onNewCard: () => createCardAtCursor({ type: 'text', content: '', width: 260, height: 180 }),
    onDelete: handleDeleteSelected,
    onUndo: handleUndo,
    onGroup: handleGroup,
    onUngroup: handleUngroup,
    onAutoPack: handleAutoPack,
    onAlign: handleAlign,
    onExportBackup: () => { exportBackup(cardsRef.current, groupsRef.current); showToast('已导出备份'); },
    onPaste: handlePaste,
    onCopy: handleCopy,
    onDuplicate: handleDuplicateSelected,
    onSearch: () => setIsSearchOpen(true),
  });

  // Confirm or clear date from Right-Click Radial Pie Menu
  const handleConfirmPieDate = useCallback(
    (cardId: string, dateStr: string | null) => {
      pushHistory(cardsRef.current, groupsRef.current);
      setCards((prev) => {
        const next = prev.map((c) => (c.id === cardId ? { ...c, reminder: dateStr } : c));
        saveStateDebounced(next, groupsRef.current);
        return next;
      });
      if (dateStr) {
        showToast(`已标记日期: ${dateStr}`);
      } else {
        showToast('已清除标记日期');
      }
      setActivePieMenu(null);
    },
    [pushHistory, showToast]
  );

  // Confirm or clear title from Right-Click Radial Pie Menu
  const handleConfirmPieTitle = useCallback(
    (cardId: string, title: string | null) => {
      pushHistory(cardsRef.current, groupsRef.current);
      setCards((prev) => {
        const next = prev.map((c) => (c.id === cardId ? { ...c, title: title || undefined } : c));
        saveStateDebounced(next, groupsRef.current);
        return next;
      });
      if (title) {
        showToast(`已设置标题: ${title}`);
      } else {
        showToast('已清除卡片标题');
      }
      setActivePieMenu(null);
    },
    [pushHistory, showToast]
  );

  // Toggle tag from Right-Click Radial Pie Menu
  const handleTogglePieTag = useCallback(
    (cardId: string, tag: string) => {
      const cleanTag = tag.trim();
      if (!cleanTag) return;

      pushHistory(cardsRef.current, groupsRef.current);
      setCards((prev) => {
        const next = prev.map((c) => {
          if (c.id !== cardId) return c;
          const currentTags = Array.isArray(c.tags) ? [...c.tags] : [];
          const idx = currentTags.indexOf(cleanTag);
          if (idx >= 0) {
            currentTags.splice(idx, 1);
            showToast(`已移除标签「${cleanTag}」`);
          } else {
            currentTags.push(cleanTag);
            showToast(`已添加标签「${cleanTag}」`);
          }
          return { ...c, tags: currentTags };
        });
        saveStateDebounced(next, groupsRef.current);
        return next;
      });
    },
    [pushHistory, showToast]
  );

  // Mouse canvas interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    const isMiddle = e.button === 1;
    const isRight = e.button === 2;
    const isLeft = e.button === 0;
    const spaceOrAlt = isSpacePressedRef.current || isAltPressedRef.current;

    // Middle click: prevent default browser autoscroll immediately
    if (isMiddle) {
      e.preventDefault();
    }

    const target = e.target as HTMLElement;
    const cardEl = target.closest('[data-card-id]') as HTMLElement | null;

    // Right Click on Card -> Open & Drag Pie Date Menu
    if (isRight && cardEl) {
      e.preventDefault();
      e.stopPropagation();
      const cardId = cardEl.getAttribute('data-card-id')!;
      const targetCard = cardsRef.current.find((c) => c.id === cardId);
      if (targetCard) {
        dragModeRef.current = 'pie-menu';
        setActivePieMenu({
          card: targetCard,
          center: { x: e.clientX, y: e.clientY },
          pointer: { x: e.clientX, y: e.clientY },
          isRightMouseDown: true,
        });
      }
      return;
    }

    // Middle click anywhere, or Right Click on Blank Canvas, or Space+Left / Alt+Left = Pan Canvas
    const isPan = isMiddle || isRight || (spaceOrAlt && isLeft);
    const world = screenToWorld(e.clientX, e.clientY, viewportRef.current);

    dragStartRef.current = {
      screenX: e.clientX,
      screenY: e.clientY,
      vpX: viewportRef.current.x,
      vpY: viewportRef.current.y,
      worldX: world.x,
      worldY: world.y,
    };

    if (isPan) {
      dragModeRef.current = 'pan';
      setIsPanning(true);
      return;
    }

    if (isLeft) {
      if (cardEl || target.closest('[data-group-id]')) return;
      dragModeRef.current = 'select';
      if (!e.shiftKey) clearSelection();
      setSelectionRect({ x: world.x, y: world.y, width: 0, height: 0 });
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const mode = dragModeRef.current;
      if (!mode) return;
      const vp = viewportRef.current;

      if (mode === 'pie-menu') {
        setActivePieMenu((prev) => (prev ? { ...prev, pointer: { x: e.clientX, y: e.clientY } } : null));
        return;
      }

      if (mode === 'pan') {
        setViewport({
          ...vp,
          x: dragStartRef.current.vpX + (e.clientX - dragStartRef.current.screenX),
          y: dragStartRef.current.vpY + (e.clientY - dragStartRef.current.screenY),
        });
        return;
      }

      if (mode === 'select') {
        const currentWorld = screenToWorld(e.clientX, e.clientY, vp);
        const rect = {
          x: Math.min(dragStartRef.current.worldX, currentWorld.x),
          y: Math.min(dragStartRef.current.worldY, currentWorld.y),
          width: Math.abs(currentWorld.x - dragStartRef.current.worldX),
          height: Math.abs(currentWorld.y - dragStartRef.current.worldY),
        };
        updateMarqueeSelection(rect, cardsRef.current, e.shiftKey);
        return;
      }

      const deltaX = (e.clientX - dragStartRef.current.screenX) / vp.zoom;
      const deltaY = (e.clientY - dragStartRef.current.screenY) / vp.zoom;

      if (mode === 'connect-card') {
        const currentWorld = screenToWorld(e.clientX, e.clientY, vp);
        const sourceId = connectingCardIdRef.current;
        const sourceCard = cardsRef.current.find((c) => c.id === sourceId);
        if (sourceCard) {
          const hoveredGroup = groupsRef.current.find((g) => {
            const gSize = g.width || 40;
            const gx = g.x + gSize / 2;
            const gy = g.y + gSize / 2;
            const gr = gSize / 2;
            return Math.hypot(currentWorld.x - gx, currentWorld.y - gy) <= gr + 30;
          });

          const targetGId = hoveredGroup ? hoveredGroup.id : null;
          dragOverGroupIdRef.current = targetGId;
          setDragOverGroupId(targetGId);

          setInteractiveWire({
            startX: sourceCard.x + sourceCard.width / 2,
            startY: sourceCard.y + sourceCard.height / 2,
            targetX: hoveredGroup ? hoveredGroup.x + (hoveredGroup.width || 40) / 2 : currentWorld.x,
            targetY: hoveredGroup ? hoveredGroup.y + (hoveredGroup.height || 40) / 2 : currentWorld.y,
            sourceCardId: sourceCard.id,
            isSnapping: !!hoveredGroup,
          });
        }
        return;
      }

      if (mode === 'drag-card') {
        if (Math.hypot(e.clientX - dragStartRef.current.screenX, e.clientY - dragStartRef.current.screenY) > 3) {
          hasCardDraggedRef.current = true;
        }
        const snap = isShiftPressedRef.current && isSpacePressedRef.current;
        updateCardPositions(deltaX, deltaY, selectedCardIdsRef.current, cardsRef.current, snap, setCards, groupsRef.current, e.ctrlKey);
      } else if (mode === 'drag-group') {
        const gId = Array.from(selectedGroupIdsRef.current)[0];
        if (gId) updateGroupPositions(deltaX, deltaY, gId, setGroups, setCards);
      } else if (mode === 'scale-card') {
        updateScale(e.clientX, vp.zoom, setCards);
      } else if (mode === 'resize-card') {
        updateResize(e.clientX, e.clientY, vp.zoom, setCards);
      } else if (mode === 'resize-group') {
        updateGroupResize(e.clientX, e.clientY, vp.zoom, setGroups);
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      const mode = dragModeRef.current;
      dragModeRef.current = null;
      setIsPanning(false);
      setSelectionRect(null);
      resetResize();

      if (mode === 'connect-card') {
        const sourceId = connectingCardIdRef.current;
        const targetGId = dragOverGroupIdRef.current;
        connectingCardIdRef.current = null;
        dragOverGroupIdRef.current = null;
        setInteractiveWire(null);
        setDragOverGroupId(null);

        if (sourceId) {
          if (targetGId) {
            pushHistory(cardsRef.current, groupsRef.current);
            const targetGroup = groupsRef.current.find((g) => g.id === targetGId);
            const nextCards = cardsRef.current.map((c) =>
              c.id === sourceId ? { ...c, groupId: targetGId } : c
            );
            commitState(nextCards, groupsRef.current);
            showToast(`已生成实心白线并链接到「${targetGroup?.title || '父物体'}」`);
          } else {
            const targetCard = cardsRef.current.find((c) => c.id === sourceId);
            if (targetCard?.groupId) {
              pushHistory(cardsRef.current, groupsRef.current);
              const nextCards = cardsRef.current.map((c) =>
                c.id === sourceId ? { ...c, groupId: null } : c
              );
              commitState(nextCards, groupsRef.current);
              showToast('已断开卡片连线');
            }
          }
        }
        return;
      }

      if (mode === 'pie-menu' || e.button === 2) {
        setActivePieMenu((prev) => (prev ? { ...prev, pointer: { x: e.clientX, y: e.clientY }, isRightMouseDown: false } : null));
      }
      if (mode === 'drag-card') {
        const info = clickedCardInfoRef.current;
        if (!hasCardDraggedRef.current && info && info.wasAlreadySelected && !info.shiftKey) {
          setSelectedCardIds(new Set([info.id]));
        }
        clickedCardInfoRef.current = null;
        hasCardDraggedRef.current = false;

        const { nextCards, toastMessage } = finishCardDrag(
          cardsRef.current,
          groupsRef.current,
          selectedCardIdsRef.current,
          e.ctrlKey
        );
        if (toastMessage) {
          showToast(toastMessage);
        }
        commitState(nextCards, groupsRef.current);
      } else if (mode === 'drag-group' || mode === 'scale-card' || mode === 'resize-card' || mode === 'resize-group') {
        saveStateDebounced(cardsRef.current, groupsRef.current);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [setViewport, updateMarqueeSelection, updateCardPositions, updateGroupPositions, updateScale, updateResize, updateGroupResize, resetResize, finishCardDrag, refreshGroupBounds, commitState, setSelectionRect, setSelectedCardIds, showToast, setDragOverGroupId]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const dropWorld = screenToWorld(e.clientX, e.clientY, viewportRef.current);
    mouseWorldRef.current = dropWorld;
    const file = e.dataTransfer.files?.[0];
    if (file?.name.endsWith('.json')) {
      try {
        const restored = await importBackupFromFile(file);
        pushHistory(cardsRef.current, groupsRef.current);
        commitState(restored.cards, restored.groups);
        const fit = computeFitViewport(restored.cards, restored.groups, window.innerWidth, window.innerHeight);
        if (fit) setViewport(fit);
        showToast('已恢复备份');
      } catch {
        showToast('导入失败');
      }
      return;
    }

    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        const img = new Image();
        img.src = base64Data;
        img.onload = async () => {
          const maxInitWidth = 360;
          const ratio = img.naturalWidth / img.naturalHeight;
          const cardW = Math.min(img.naturalWidth, maxInitWidth);
          const cardH = cardW / ratio;

          const created = createCardAtCursor({
            type: 'image',
            image: base64Data,
            width: cardW,
            height: cardH,
            title: '',
            content: '',
            isParsing: true,
          });

          try {
            const res = await fetch('/api/recognize-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: base64Data }),
            });
            if (res.ok) {
              const ocr = await res.json();
              if (ocr.success) {
                handleCardUpdate(created.id, {
                  title: ocr.title || '',
                  content: ocr.text || '',
                  isParsing: false,
                });
                return;
              }
            }
          } catch {
            // ignore
          }
          handleCardUpdate(created.id, { isParsing: false });
        };
      };
      reader.readAsDataURL(file);
      return;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-screen h-screen overflow-hidden select-none ${
        isPanning ? 'cursor-grabbing [&_*]:!cursor-grabbing' : 'cursor-default'
      }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-card-id]') || target.closest('[data-group-id]')) {
          return;
        }
        setIsSearchOpen(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top-Left Minimal Floating Controls */}
      <div className="fixed top-4 left-4 z-[10000] flex items-center gap-1.5 bg-neutral-900/85 backdrop-blur-md border border-white/10 px-2 py-1.5 shadow-2xl rounded-none select-none text-neutral-300">
        <button
          type="button"
          onClick={handleCreateNewNoteAtCursor}
          title="新建便签 (Ctrl+N，光标所在位置)"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-200 hover:text-white hover:bg-white/10 transition-colors border border-white/10 hover:border-white/20 rounded-none shadow-sm cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>新建便签</span>
        </button>

        <button
          type="button"
          onClick={handleCreateNewParentAtCursor}
          title="新建圆形父物体 (Ctrl+J，光标所在位置)"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-200 hover:text-white hover:bg-white/10 transition-colors border border-white/10 hover:border-white/20 rounded-none shadow-sm cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth="2" />
            <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          </svg>
          <span>新建父物体</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          title="搜索便签 (双击空白画布 或 Ctrl+F)"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-200 hover:text-white hover:bg-white/10 transition-colors border border-white/10 hover:border-white/20 rounded-none shadow-sm cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>搜索</span>
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <button
          type="button"
          onClick={() => handleCanvasDoubleClick(cardsRef.current, groupsRef.current)}
          title="自适应全览所有便签"
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors rounded-none cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          disabled={selectedCardIds.size === 0}
          title={selectedCardIds.size > 0 ? `复制选中便签 (${selectedCardIds.size} 张, Ctrl+C)` : '请先选择便签以复制'}
          className={`p-1.5 transition-colors rounded-none ${
            selectedCardIds.size > 0 ? 'text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer' : 'text-neutral-600 cursor-not-allowed'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => {
            if (copiedCardsRef.current.length > 0) {
              handlePasteCopiedCards(copiedCardsRef.current);
            } else {
              showToast('暂无复制的便签内容');
            }
          }}
          title="粘贴便签 (Ctrl+V，光标所在位置)"
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors rounded-none cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>
      </div>
      <div
        className="absolute inset-0 origin-top-left pointer-events-auto"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          willChange: 'transform',
        }}
      >
        <ParentLinkLines
          groups={groups}
          cards={cards}
          selectedGroupIds={selectedGroupIds}
          selectedCardIds={selectedCardIds}
          dragOverGroupId={dragOverGroupId}
          interactiveWire={interactiveWire}
        />

        {groups.map((group) => {
          const childCount = cards.filter((c) => c.groupId === group.id).length;
          const isDragOver = dragOverGroupId === group.id;
          return (
            <GroupComponent
              key={group.id}
              group={group}
              isSelected={selectedGroupIds.has(group.id)}
              childCount={childCount}
              isDragOver={isDragOver}
              onSelect={(e) => {
                const vp = viewportRef.current;
                dragStartRef.current = {
                  screenX: e.clientX,
                  screenY: e.clientY,
                  vpX: vp.x,
                  vpY: vp.y,
                  worldX: (e.clientX - vp.x) / vp.zoom,
                  worldY: (e.clientY - vp.y) / vp.zoom,
                };
                dragModeRef.current = 'drag-group';
                initDragGroup(group, cardsRef.current);
                selectGroup(group.id, e.shiftKey);
              }}
              onRename={renameGroup}
              onUngroup={handleUngroupSpecific}
            />
          );
        })}

        {cards.map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            isSelected={selectedCardIds.has(card.id)}
            onSelect={(e) => {
              if (e.ctrlKey) {
                // Ctrl + Drag: Card stays completely in place! Only generate solid white connecting wire
                dragModeRef.current = 'connect-card';
                connectingCardIdRef.current = card.id;
                const vp = viewportRef.current;
                const currentWorld = screenToWorld(e.clientX, e.clientY, vp);
                setInteractiveWire({
                  startX: card.x + card.width / 2,
                  startY: card.y + card.height / 2,
                  targetX: currentWorld.x,
                  targetY: currentWorld.y,
                  sourceCardId: card.id,
                });
                return;
              }

              dragModeRef.current = 'drag-card';
              hasCardDraggedRef.current = false;
              pushHistory(cardsRef.current, groupsRef.current);

              const wasAlreadySelected = selectedCardIdsRef.current.has(card.id);
              clickedCardInfoRef.current = { id: card.id, wasAlreadySelected, shiftKey: e.shiftKey };

              let nextIds: Set<string>;
              if (e.shiftKey) {
                nextIds = new Set(selectedCardIdsRef.current);
                nextIds.add(card.id);
                selectCard(card.id, true);
              } else if (wasAlreadySelected) {
                // Retain all currently selected cards for simultaneous dragging
                nextIds = new Set(selectedCardIdsRef.current);
              } else {
                nextIds = new Set([card.id]);
                selectCard(card.id, false);
              }
              initDragCards(cardsRef.current.filter((c) => nextIds.has(c.id)));
            }}
            onUpdate={handleCardUpdate}
            onDoubleClick={handleCardDoubleClick}
            onStartScale={(c, clientX) => {
              pushHistory(cardsRef.current, groupsRef.current);
              dragModeRef.current = 'scale-card';
              startScale(c, clientX);
            }}
            onStartResize={(c, handle, e) => {
              pushHistory(cardsRef.current, groupsRef.current);
              dragModeRef.current = 'resize-card';
              startResize(c, handle, e.clientX, e.clientY);
              setSelectedCardIds(new Set([c.id]));
            }}
            zoom={viewport.zoom}
          />
        ))}

        <SelectionBox box={selectionRect} />
        <SnapGuides lines={snapLines} />
      </div>

      {/* Card Right-Click Drag Radial Pie Date Menu */}
      {activePieMenu && (
        <PieDateMenu
          card={cards.find((c) => c.id === activePieMenu.card.id) || activePieMenu.card}
          allCards={cards}
          centerPosition={activePieMenu.center}
          currentPointerPosition={activePieMenu.pointer}
          isRightMouseDown={activePieMenu.isRightMouseDown}
          onConfirmDate={(dateStr: string | null) => handleConfirmPieDate(activePieMenu.card.id, dateStr)}
          onConfirmTitle={(title: string | null) => handleConfirmPieTitle(activePieMenu.card.id, title)}
          onToggleTag={(tag: string) => handleTogglePieTag(activePieMenu.card.id, tag)}
          onClose={() => setActivePieMenu(null)}
        />
      )}

      {/* Global Card & Note Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        cards={cards}
        onSelectCard={(c) => {
          setSelectedCardIds(new Set([c.id]));
          setViewport(computeCardFocusViewport(c, window.innerWidth, window.innerHeight));
        }}
      />

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] px-4 py-2 bg-neutral-900/90 text-neutral-200 text-xs font-medium ring-1 ring-white/15 shadow-2xl backdrop-blur-md pointer-events-none transition-all">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
