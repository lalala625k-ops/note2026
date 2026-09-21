import React, { useState, useRef, useEffect } from 'react';
import { Group } from '../types';

interface GroupComponentProps {
  group: Group;
  isSelected: boolean;
  childCount: number;
  isDragOver: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onRename: (id: string, newTitle: string) => void;
  onUngroup?: (id: string) => void;
}

export const GroupComponent: React.FC<GroupComponentProps> = ({
  group,
  isSelected,
  childCount,
  isDragOver,
  onSelect,
  onRename,
  onUngroup,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(group.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const size = group.width || 40;

  useEffect(() => {
    setTitle(group.title);
  }, [group.title]);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleFinishRename = () => {
    setIsEditingTitle(false);
    if (title.trim() && title !== group.title) {
      onRename(group.id, title.trim());
    } else {
      setTitle(group.title);
    }
  };

  const iconDimension = Math.max(14, Math.min(22, Math.round(size * 0.45)));

  return (
    <div
      data-group-id={group.id}
      className={`group absolute top-0 left-0 select-none flex flex-col items-center justify-center rounded-full cursor-grab active:cursor-grabbing shadow-xl ${
        isDragOver
          ? 'bg-emerald-400 text-neutral-950 ring-4 ring-emerald-300 ring-offset-2 ring-offset-neutral-950 scale-110 shadow-[0_0_25px_rgba(52,211,153,0.8)]'
          : isSelected
          ? 'bg-white text-neutral-950 ring-4 ring-blue-500 ring-offset-2 ring-offset-neutral-950 shadow-[0_0_20px_rgba(255,255,255,0.7)]'
          : 'bg-white text-neutral-900 border-2 border-neutral-300 hover:border-black hover:shadow-2xl'
      }`}
      style={{
        transform: `translate(${group.x}px, ${group.y}px)`,
        width: size,
        height: size,
        zIndex: group.zIndex ?? 5,
        willChange: 'transform',
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditingTitle(true);
      }}
    >
      {/* Dissolve / Delete button on hover */}
      {onUngroup && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUngroup(group.id);
          }}
          title="解散父物体 (保留子卡片)"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-neutral-900 text-white border border-white/40 hover:bg-red-600 hover:border-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30 cursor-pointer shadow-md"
        >
          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Child count badge (top-left pill) */}
      {childCount > 0 && !isDragOver && (
        <div
          title={`${childCount} 个关联子卡片`}
          className="absolute -top-1.5 -left-1.5 px-1 min-w-[16px] h-4 text-[9px] font-bold font-mono rounded-full bg-blue-600 text-white border border-white flex items-center justify-center shadow z-20 pointer-events-none"
        >
          {childCount}
        </div>
      )}

      {/* Center Icon */}
      <div className="flex flex-col items-center justify-center pointer-events-none">
        {isDragOver ? (
          <svg
            style={{ width: iconDimension, height: iconDimension }}
            className="text-neutral-950 animate-bounce"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        ) : (
          <div className="flex items-center justify-center">
            {/* Minimalist Solid Hub Node: Concentric Rings */}
            <svg
              style={{ width: iconDimension, height: iconDimension }}
              className="text-neutral-900"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="8.5" strokeWidth="2.5" />
              <circle cx="12" cy="12" r="3" fill="currentColor" strokeWidth="0" />
            </svg>
          </div>
        )}
      </div>

      {/* Label and Title below the circle */}
      <div className="absolute top-full mt-1 flex flex-col items-center z-20 pointer-events-auto">
        {isEditingTitle ? (
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleFinishRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFinishRename();
              if (e.key === 'Escape') {
                setTitle(group.title);
                setIsEditingTitle(false);
              }
            }}
            className="w-20 px-1 py-0.5 text-[10px] font-semibold text-center text-white bg-neutral-950 border border-white/40 rounded shadow-lg outline-none"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            title="双击重命名父物体"
            className="px-1.5 py-0.5 text-[9px] font-medium text-neutral-300 bg-neutral-900/90 border border-white/15 rounded shadow-md whitespace-nowrap max-w-[100px] truncate select-none cursor-text hover:text-white hover:border-white/30 transition-colors"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingTitle(true);
            }}
          >
            {group.title}
          </div>
        )}
      </div>
    </div>
  );
};
