import { useEffect, useRef } from 'react';

interface UseShortcutsProps {
  onNewCard: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onAutoPack: () => void;
  onAlign: (direction: 'top' | 'bottom' | 'left' | 'right') => void;
  onExportBackup: () => void;
  onPaste: (e: ClipboardEvent) => void;
  onCopy?: () => void;
  onDuplicate?: () => void;
  onSearch?: () => void;
}

export function useShortcuts({
  onNewCard,
  onDelete,
  onUndo,
  onGroup,
  onUngroup,
  onAutoPack,
  onAlign,
  onExportBackup,
  onPaste,
  onCopy,
  onDuplicate,
  onSearch,
}: UseShortcutsProps) {
  const isShiftPressedRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const isAltPressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputFocused = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === 'Shift') isShiftPressedRef.current = true;
      if (e.key === ' ' || e.code === 'Space') isSpacePressedRef.current = true;
      if (e.key === 'Alt') isAltPressedRef.current = true;

      // PRD 1.3: Ctrl + N (New blank text card)
      if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        onNewCard();
        return;
      }

      // Ctrl + F or Ctrl + K (Search cards)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.key === 'k' || e.key === 'K')) {
        if (!isInputFocused && onSearch) {
          e.preventDefault();
          onSearch();
          return;
        }
      }

      // Ctrl + C (Copy selected cards)
      if (e.ctrlKey && !e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        if (!isInputFocused && onCopy) {
          e.preventDefault();
          onCopy();
          return;
        }
      }

      // Ctrl + D (Duplicate selected cards directly)
      if (e.ctrlKey && !e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        if (!isInputFocused && onDuplicate) {
          e.preventDefault();
          onDuplicate();
          return;
        }
      }

      // PRD 1.3: Ctrl + Z (Undo)
      if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        if (!isInputFocused) {
          e.preventDefault();
          onUndo();
          return;
        }
      }

      // PRD 1.3: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused) {
        e.preventDefault();
        onDelete();
        return;
      }

      // Ctrl + J: Create Parent Object (at mouse cursor)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        onGroup();
        return;
      }

      // PRD 1.4: Ctrl + G / Ctrl + Shift + G (Group / Ungroup)
      if (e.ctrlKey && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        if (e.shiftKey) onUngroup();
        else onGroup();
        return;
      }

      // PRD 1.5: Ctrl + P (Auto pack cards)
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        onAutoPack();
        return;
      }

      // PRD 1.5: Ctrl + Arrow keys (Alignment)
      if (e.ctrlKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowUp') onAlign('top');
        if (e.key === 'ArrowDown') onAlign('bottom');
        if (e.key === 'ArrowLeft') onAlign('left');
        if (e.key === 'ArrowRight') onAlign('right');
        return;
      }

      // PRD 2.3: Backup export (Ctrl + S / Ctrl + E)
      if (e.ctrlKey && ['s', 'S', 'e', 'E'].includes(e.key)) {
        e.preventDefault();
        onExportBackup();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') isShiftPressedRef.current = false;
      if (e.key === ' ' || e.code === 'Space') isSpacePressedRef.current = false;
      if (e.key === 'Alt') isAltPressedRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', onPaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', onPaste);
    };
  }, [onNewCard, onDelete, onUndo, onGroup, onUngroup, onAutoPack, onAlign, onExportBackup, onPaste, onCopy, onDuplicate, onSearch]);

  return { isShiftPressedRef, isSpacePressedRef, isAltPressedRef };
}
