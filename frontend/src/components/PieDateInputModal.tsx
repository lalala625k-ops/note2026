import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../types';
import { parseReminderDate, ParsedDateResult } from '../utils/dateParser';

interface PieDateInputModalProps {
  card: Card;
  position: { x: number; y: number };
  onConfirm: (dateStr: string) => void;
  onClearDate: () => void;
  onBackToPie: () => void;
  onClose: () => void;
}

export const PieDateInputModal: React.FC<PieDateInputModalProps> = ({
  card,
  position,
  onConfirm,
  onClearDate,
  onBackToPie,
  onClose,
}) => {
  const [dateInput, setDateInput] = useState(card.reminder || '');
  const [parseResult, setParseResult] = useState<ParsedDateResult>({
    isValid: false,
    parsedDate: null,
    formattedText: '',
    summaryText: '',
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const res = parseReminderDate(dateInput);
    setParseResult(res);
  }, [dateInput]);

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
      if (parseResult.isValid && parseResult.formattedText) {
        e.preventDefault();
        onConfirm(parseResult.formattedText);
      }
    }
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
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs font-semibold text-neutral-200 tracking-wide">标记卡片日期</span>
        </div>
        <button
          type="button"
          onClick={onBackToPie}
          className="text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded-none border border-white/10 hover:border-white/20 transition-colors"
        >
          返回饼菜单
        </button>
      </div>

      {/* Input Box */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
            <span>输入年月日 (缺省年默认今年)</span>
            {card.reminder && (
              <span className="text-neutral-500 font-mono truncate max-w-[120px]" title={card.reminder}>
                当前: {card.reminder}
              </span>
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="如: 06/26, 6-26, 0626, 2026/06/26..."
            className={`w-full bg-neutral-950/90 text-sm px-3 py-2 outline-none font-sans rounded-none transition-colors border ${
              parseResult.isValid
                ? 'border-emerald-500 ring-1 ring-emerald-500/50 text-white'
                : 'border-neutral-700 text-neutral-300 focus:border-neutral-500'
            }`}
          />
        </div>

        {/* Smart Recognition Live Status */}
        <div
          className={`text-xs px-3 py-2 border transition-all rounded-none ${
            parseResult.isValid
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-neutral-950/60 border-neutral-800 text-neutral-500'
          }`}
        >
          {parseResult.isValid ? (
            <div className="flex items-center gap-1.5 font-sans">
              <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">识别为: {parseResult.summaryText}</span>
            </div>
          ) : dateInput.trim() ? (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 flex-shrink-0" />
              <span>日期不完整或格式不合法 (保持灰色，无法确认)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-neutral-500">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-700 flex-shrink-0" />
              <span>支持 06/26, 6/26, 0626, 2026-06-26, 今天, 明天...</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {card.reminder && (
              <button
                type="button"
                onClick={onClearDate}
                className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/50 transition-colors rounded-none"
              >
                清除日期
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
              disabled={!parseResult.isValid}
              onClick={() => {
                if (parseResult.isValid && parseResult.formattedText) {
                  onConfirm(parseResult.formattedText);
                }
              }}
              className={`px-4 py-1.5 text-xs font-medium rounded-none transition-all ${
                parseResult.isValid
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 cursor-pointer'
                  : 'bg-neutral-800 text-neutral-600 border border-neutral-700/60 cursor-not-allowed'
              }`}
            >
              确认标记 (Enter)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
