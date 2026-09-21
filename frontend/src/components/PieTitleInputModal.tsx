import React, { useState, useEffect, useRef } from 'react';

interface PieTitleInputModalProps {
  initialTitle: string;
  position: { x: number; y: number };
  onConfirm: (title: string | null) => void;
  onBackToPie: () => void;
  onClose: () => void;
}

export const PieTitleInputModal: React.FC<PieTitleInputModalProps> = ({
  initialTitle,
  position,
  onConfirm,
  onBackToPie,
  onClose,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm(title.trim() || null);
    }
  };

  const handleClear = () => {
    onConfirm(null);
  };

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto bg-neutral-900/95 border border-white/15 shadow-2xl backdrop-blur-xl text-neutral-100 w-80 p-4 select-none animate-in fade-in zoom-in-95 duration-100 rounded-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-xs font-semibold text-neutral-200 tracking-wide">设置便签标题</span>
        </div>
        <button
          type="button"
          onClick={onBackToPie}
          className="text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded-none border border-white/10 hover:border-white/20 transition-colors"
        >
          返回饼菜单
        </button>
      </div>

      {/* Input */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
            <span>输入卡片标题</span>
            {initialTitle && (
              <span className="text-neutral-500 font-mono truncate max-w-[120px]" title={initialTitle}>
                原: {initialTitle}
              </span>
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="如: 待办清单, 读书笔记, 项目灵感..."
            className="w-full bg-neutral-950/90 text-sm px-3 py-2 outline-none font-sans rounded-none transition-colors border border-neutral-700 text-neutral-100 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {initialTitle && (
              <button
                type="button"
                onClick={handleClear}
                className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/50 transition-colors rounded-none"
              >
                清除标题
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors rounded-none"
            >
              取消 (ESC)
            </button>
            <button
              type="button"
              onClick={() => onConfirm(title.trim() || null)}
              className="px-4 py-1.5 text-xs font-medium rounded-none transition-all bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/50 cursor-pointer"
            >
              保存标题 (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
