import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '../types';
import { getNowFormatted } from '../utils/dateParser';
import { getTopTags } from '../utils/tagUtils';
import { PieDateInputModal } from './PieDateInputModal';
import { PieTitleInputModal } from './PieTitleInputModal';
import { PieTagModal } from './PieTagModal';

export interface PieDateMenuProps {
  card: Card;
  allCards: Card[];
  centerPosition: { x: number; y: number };
  currentPointerPosition: { x: number; y: number };
  isRightMouseDown: boolean;
  onConfirmDate: (dateStr: string | null) => void;
  onConfirmTitle: (title: string | null) => void;
  onToggleTag: (tag: string) => void;
  onClose: () => void;
}

type MenuMode = 'pie' | 'date-input' | 'title-input' | 'tag-search';
type SectorType = 'title' | 'date' | 'now' | 'tag_0' | 'tag_1' | 'tag_2' | 'tag_3' | 'tag_4' | 'tag_other';

function getSectorPath(startDeg: number, endDeg: number, rInner = 36, rOuter = 124, cx = 130, cy = 130) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const a1 = toRad(startDeg);
  const a2 = toRad(endDeg);

  const x1O = cx + rOuter * Math.cos(a1);
  const y1O = cy + rOuter * Math.sin(a1);
  const x2O = cx + rOuter * Math.cos(a2);
  const y2O = cy + rOuter * Math.sin(a2);

  const x1I = cx + rInner * Math.cos(a2);
  const y1I = cy + rInner * Math.sin(a2);
  const x2I = cx + rInner * Math.cos(a1);
  const y2I = cy + rInner * Math.sin(a1);

  return `M ${x1O} ${y1O} A ${rOuter} ${rOuter} 0 0 1 ${x2O} ${y2O} L ${x1I} ${y1I} A ${rInner} ${rInner} 0 0 0 ${x2I} ${y2I} Z`;
}

export const PieDateMenu: React.FC<PieDateMenuProps> = ({
  card,
  allCards,
  centerPosition,
  currentPointerPosition,
  isRightMouseDown,
  onConfirmDate,
  onConfirmTitle,
  onToggleTag,
  onClose,
}) => {
  const [mode, setMode] = useState<MenuMode>('pie');
  const wasDraggingRef = useRef(false);

  // Compute gesture offset relative to center
  const dx = currentPointerPosition.x - centerPosition.x;
  const dy = currentPointerPosition.y - centerPosition.y;
  const dist = Math.hypot(dx, dy);
  const threshold = 18;
  const isDragging = isRightMouseDown && dist > threshold;

  if (isDragging) {
    wasDraggingRef.current = true;
  }

  // 5 most used tags + 1 other tag
  const topTags = useMemo(() => {
    return getTopTags(allCards, 5);
  }, [allCards]);

  const cardTags = useMemo(() => {
    return Array.isArray(card.tags) ? card.tags : [];
  }, [card.tags]);

  // Gesture Angle Mapping
  const activeSector: SectorType | null = useMemo(() => {
    if (!isDragging) return null;
    const rawDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    // Right Side: Functions
    if (dx >= 0) {
      if (rawDeg < -30) return 'title';
      if (rawDeg < 30) return 'date';
      return 'now';
    }

    // Left Side: Tags
    const deg = rawDeg < 0 ? rawDeg + 360 : rawDeg;
    if (deg >= 240) return 'tag_0';
    if (deg >= 210) return 'tag_1';
    if (deg >= 180) return 'tag_2';
    if (deg >= 150) return 'tag_3';
    if (deg >= 120) return 'tag_4';
    return 'tag_other';
  }, [isDragging, dx, dy]);

  // Gesture release handler
  useEffect(() => {
    if (!isRightMouseDown && wasDraggingRef.current && mode === 'pie') {
      wasDraggingRef.current = false;
      if (dist > threshold && activeSector) {
        if (activeSector === 'now') {
          const nowInfo = getNowFormatted();
          onConfirmDate(nowInfo.formattedText);
        } else if (activeSector === 'date') {
          setMode('date-input');
        } else if (activeSector === 'title') {
          setMode('title-input');
        } else if (activeSector === 'tag_other') {
          setMode('tag-search');
        } else if (activeSector.startsWith('tag_')) {
          const idx = parseInt(activeSector.replace('tag_', ''), 10);
          const tag = topTags[idx];
          if (tag) onToggleTag(tag);
        }
      }
    }
  }, [isRightMouseDown, mode, dist, activeSector, onConfirmDate, onToggleTag, topTags]);

  // Global ESC close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const clampedX = Math.max(160, Math.min(window.innerWidth - 160, centerPosition.x));
  const clampedY = Math.max(140, Math.min(window.innerHeight - 150, centerPosition.y));

  // Geometry constants
  const cx = 130;
  const cy = 130;
  const rInner = 36;
  const rOuter = 124;

  // Mid positions for icons and text
  const getSectorCenter = (midDeg: number, radius = 80) => {
    const rad = (midDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const leftTagSectors = [
    { type: 'tag_0' as SectorType, start: 242, end: 268, mid: 255, tag: topTags[0] },
    { type: 'tag_1' as SectorType, start: 212, end: 238, mid: 225, tag: topTags[1] },
    { type: 'tag_2' as SectorType, start: 182, end: 208, mid: 195, tag: topTags[2] },
    { type: 'tag_3' as SectorType, start: 152, end: 178, mid: 165, tag: topTags[3] },
    { type: 'tag_4' as SectorType, start: 122, end: 148, mid: 135, tag: topTags[4] },
    { type: 'tag_other' as SectorType, start: 92, end: 118, mid: 105, tag: '其他...' },
  ];

  const rightFuncSectors = [
    { type: 'title' as SectorType, start: -88, end: -32, mid: -60, label: '设置标题', sub: '命名' },
    { type: 'date' as SectorType, start: -28, end: 28, mid: 0, label: '输入时间', sub: '提醒' },
    { type: 'now' as SectorType, start: 32, end: 88, mid: 60, label: 'NOW', sub: '标记' },
  ];

  // Helper text computation
  const getHelperText = () => {
    if (!isDragging || !activeSector) {
      return '左侧快捷标签 · 右侧功能设置 · 滑向松开或点击';
    }
    if (activeSector === 'title') return '松开右键确认: 设置标题';
    if (activeSector === 'date') return '松开右键确认: 输入时间 (智能识别)';
    if (activeSector === 'now') return '松开右键确认: NOW (标记此刻)';
    if (activeSector === 'tag_other') return '松开右键确认: 搜索与管理其他标签';
    if (activeSector.startsWith('tag_')) {
      const idx = parseInt(activeSector.replace('tag_', ''), 10);
      const tag = topTags[idx];
      const has = cardTags.includes(tag);
      return `松开右键确认: ${has ? '移除' : '添加'}标签「${tag}」`;
    }
    return '滑向目标扇区松开确认';
  };

  return (
    <div
      className="fixed inset-0 z-[10002] pointer-events-auto select-none"
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {mode === 'pie' ? (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Radial Wheel Container (260x260) */}
          <div className="relative w-[260px] h-[260px] flex items-center justify-center animate-in fade-in zoom-in-95 duration-100">
            {/* Outer Subtle Background Halo */}
            <div className="absolute inset-0 rounded-full border border-white/10 bg-black/65 backdrop-blur-xl shadow-2xl" />

            {/* SVG Interactive Sectors */}
            <svg className="absolute inset-0 w-full h-full pointer-events-auto" viewBox="0 0 260 260">
              {/* Left Side: 6 Tag Sectors */}
              {leftTagSectors.map((s) => {
                const isActive = activeSector === s.type;
                const isTagged = s.type !== 'tag_other' && cardTags.includes(s.tag);
                return (
                  <path
                    key={s.type}
                    d={getSectorPath(s.start, s.end, rInner, rOuter, cx, cy)}
                    onClick={() => {
                      if (s.type === 'tag_other') {
                        setMode('tag-search');
                      } else {
                        onToggleTag(s.tag);
                      }
                    }}
                    className={`transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'fill-cyan-500/40 stroke-cyan-400 stroke-[2.5px] filter drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                        : isTagged
                        ? 'fill-cyan-900/35 stroke-cyan-500/60 stroke-[1.5px] hover:fill-cyan-800/40'
                        : 'fill-white/[0.04] stroke-white/10 hover:fill-cyan-950/30 hover:stroke-cyan-400/40'
                    }`}
                  />
                );
              })}

              {/* Right Side: 3 Function Sectors */}
              {/* R1: Title */}
              <path
                d={getSectorPath(-88, -32, rInner, rOuter, cx, cy)}
                onClick={() => setMode('title-input')}
                className={`transition-all duration-150 cursor-pointer ${
                  activeSector === 'title'
                    ? 'fill-purple-600/40 stroke-purple-400 stroke-[2.5px] filter drop-shadow-[0_0_12px_rgba(168,85,247,0.6)]'
                    : 'fill-white/[0.04] stroke-white/10 hover:fill-purple-900/30 hover:stroke-purple-400/50'
                }`}
              />

              {/* R2: Input Date */}
              <path
                d={getSectorPath(-28, 28, rInner, rOuter, cx, cy)}
                onClick={() => setMode('date-input')}
                className={`transition-all duration-150 cursor-pointer ${
                  activeSector === 'date'
                    ? 'fill-blue-600/40 stroke-blue-400 stroke-[2.5px] filter drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                    : 'fill-white/[0.04] stroke-white/10 hover:fill-blue-900/30 hover:stroke-blue-400/50'
                }`}
              />

              {/* R3: NOW */}
              <path
                d={getSectorPath(32, 88, rInner, rOuter, cx, cy)}
                onClick={() => {
                  const nowInfo = getNowFormatted();
                  onConfirmDate(nowInfo.formattedText);
                }}
                className={`transition-all duration-150 cursor-pointer ${
                  activeSector === 'now'
                    ? 'fill-emerald-600/40 stroke-emerald-400 stroke-[2.5px] filter drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                    : 'fill-white/[0.04] stroke-white/10 hover:fill-emerald-900/30 hover:stroke-emerald-400/50'
                }`}
              />
            </svg>

            {/* Left Sector Contents: Tags */}
            {leftTagSectors.map((s) => {
              const pos = getSectorCenter(s.mid, 80);
              const isActive = activeSector === s.type;
              const isTagged = s.type !== 'tag_other' && cardTags.includes(s.tag);

              return (
                <div
                  key={s.type}
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center transition-transform duration-150"
                  style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                >
                  <span
                    className={`text-[11px] font-medium tracking-tight truncate max-w-[64px] ${
                      isActive
                        ? 'text-cyan-200 font-bold scale-110 drop-shadow'
                        : isTagged
                        ? 'text-cyan-300 font-semibold'
                        : 'text-neutral-300'
                    }`}
                  >
                    {isTagged ? '✓ ' : s.type === 'tag_other' ? '🔍 ' : '#'}{s.tag}
                  </span>
                  {s.type === 'tag_other' && (
                    <span className="text-[9px] text-neutral-400 scale-90">更多标签</span>
                  )}
                </div>
              );
            })}

            {/* Right Sector 1: Title (R1: mid = -60°) */}
            {(() => {
              const pos = getSectorCenter(-60, 78);
              return (
                <div
                  className={`absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-transform duration-150 ${
                    activeSector === 'title' ? 'scale-105 text-purple-300' : 'text-neutral-300'
                  }`}
                  style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                >
                  <svg className="w-4 h-4 text-purple-400 drop-shadow mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-[11px] font-bold tracking-wide">设置标题</span>
                  <span className="text-[9px] text-neutral-400">命名</span>
                </div>
              );
            })()}

            {/* Right Sector 2: Input Date (R2: mid = 0°) */}
            {(() => {
              const pos = getSectorCenter(0, 78);
              return (
                <div
                  className={`absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-transform duration-150 ${
                    activeSector === 'date' ? 'scale-105 text-blue-300' : 'text-neutral-300'
                  }`}
                  style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                >
                  <svg className="w-4 h-4 text-blue-400 drop-shadow mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[11px] font-bold tracking-wide">输入时间</span>
                  <span className="text-[9px] text-neutral-400">智能识别</span>
                </div>
              );
            })()}

            {/* Right Sector 3: NOW (R3: mid = 60°) */}
            {(() => {
              const pos = getSectorCenter(60, 78);
              return (
                <div
                  className={`absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-transform duration-150 ${
                    activeSector === 'now' ? 'scale-105 text-emerald-300' : 'text-neutral-300'
                  }`}
                  style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                >
                  <svg className="w-4 h-4 text-emerald-400 drop-shadow mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-[11px] font-bold tracking-wide">NOW</span>
                  <span className="text-[9px] text-neutral-400">标记此刻</span>
                </div>
              );
            })()}

            {/* Center Hub */}
            <div className="absolute w-12 h-12 rounded-full bg-neutral-900 border border-white/20 flex items-center justify-center z-10 shadow-lg backdrop-blur-md">
              {isDragging ? (
                <div
                  className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_white] transition-transform duration-75"
                  style={{
                    transform: `translate(${Math.max(-10, Math.min(10, dx / 3))}px, ${Math.max(-10, Math.min(10, dy / 3))}px)`,
                  }}
                />
              ) : card.reminder ? (
                <button
                  type="button"
                  onClick={() => onConfirmDate(null)}
                  title="清除已标记的日期"
                  className="w-full h-full rounded-full flex flex-col items-center justify-center text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                >
                  <span className="font-bold">清除日</span>
                </button>
              ) : (
                <div className="w-2 h-2 rounded-full bg-neutral-500" />
              )}
            </div>
          </div>

          {/* Helper Hint */}
          <div className="mt-2 text-center text-[11px] text-neutral-400 font-mono select-none bg-neutral-900/85 px-3 py-1.5 border border-white/10 backdrop-blur-md shadow-lg">
            {getHelperText()}
          </div>
        </div>
      ) : mode === 'date-input' ? (
        <PieDateInputModal
          card={card}
          position={{ x: clampedX, y: clampedY }}
          onConfirm={(dateStr) => onConfirmDate(dateStr)}
          onClearDate={() => onConfirmDate(null)}
          onBackToPie={() => setMode('pie')}
          onClose={onClose}
        />
      ) : mode === 'title-input' ? (
        <PieTitleInputModal
          initialTitle={card.title || ''}
          position={{ x: clampedX, y: clampedY }}
          onConfirm={(title) => onConfirmTitle(title)}
          onBackToPie={() => setMode('pie')}
          onClose={onClose}
        />
      ) : (
        <PieTagModal
          card={card}
          allCards={allCards}
          position={{ x: clampedX, y: clampedY }}
          onToggleTag={onToggleTag}
          onBackToPie={() => setMode('pie')}
          onClose={onClose}
        />
      )}
    </div>
  );
};
