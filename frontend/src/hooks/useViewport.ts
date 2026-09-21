import { useState, useRef, useEffect, useCallback } from 'react';
import { Viewport, Card, Group } from '../types';
import { clamp, computeFitViewport, computeCardFocusViewport } from '../utils/canvas';

export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1.0 });
  const viewportRef = useRef<Viewport>(viewport);
  viewportRef.current = viewport;

  const previousViewportRef = useRef<Viewport | null>(null);
  const focusedCardIdRef = useRef<string | null>(null);

  const mouseScreenRef = useRef<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
  });
  const mouseWorldRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseScreenRef.current = { x: e.clientX, y: e.clientY };
    const vp = viewportRef.current;
    mouseWorldRef.current = {
      x: (e.clientX - vp.x) / vp.zoom,
      y: (e.clientY - vp.y) / vp.zoom,
    };
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Wheel zoom centered at mouse pointer (0.2x ~ 3.0x)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const target = e.target as HTMLElement;

    // 1. Disable canvas zooming if user is scrolling inside an active text editing area or scrollable text container
    if (
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'INPUT' ||
      target.closest('textarea') ||
      target.closest('.overflow-y-auto') ||
      target.closest('.overflow-auto')
    ) {
      return;
    }

    // 2. Disable canvas zooming if scrolling on any selected card (isolated to card text scrolling)
    const cardEl = target.closest('[data-card-id]');
    if (cardEl && cardEl.getAttribute('data-selected') === 'true') {
      return;
    }

    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const { clientX, clientY } = e;

    setViewport((prev) => {
      const nextZoom = clamp(prev.zoom * zoomFactor, 0.2, 3.0);
      const nextX = clientX - (clientX - prev.x) * (nextZoom / prev.zoom);
      const nextY = clientY - (clientY - prev.y) * (nextZoom / prev.zoom);
      return { x: nextX, y: nextY, zoom: nextZoom };
    });
  }, []);

  // Double click card: smooth 80% focus toggle
  const handleCardDoubleClick = useCallback((card: Card) => {
    if (focusedCardIdRef.current === card.id && previousViewportRef.current) {
      setViewport(previousViewportRef.current);
      previousViewportRef.current = null;
      focusedCardIdRef.current = null;
    } else {
      previousViewportRef.current = viewportRef.current;
      focusedCardIdRef.current = card.id;
      setViewport(computeCardFocusViewport(card, window.innerWidth, window.innerHeight));
    }
  }, []);

  // Double click blank canvas: fit all cards & groups
  const handleCanvasDoubleClick = useCallback((cards: Card[], groups: Group[]) => {
    const fitted = computeFitViewport(cards, groups, window.innerWidth, window.innerHeight);
    if (fitted) {
      setViewport(fitted);
      previousViewportRef.current = null;
      focusedCardIdRef.current = null;
    }
  }, []);

  return {
    viewport,
    setViewport,
    viewportRef,
    mouseScreenRef,
    mouseWorldRef,
    handleWheel,
    handleCardDoubleClick,
    handleCanvasDoubleClick,
  };
}
