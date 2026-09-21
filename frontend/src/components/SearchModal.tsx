import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  onSelectCard: (card: Card) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  cards,
  onSelectCard,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards.slice(0, 15);

    return cards.filter((card) => {
      const titleMatch = card.title?.toLowerCase().includes(q);
      const contentMatch = card.content?.toLowerCase().includes(q);
      const urlMatch = card.url?.toLowerCase().includes(q);
      const descMatch = card.description?.toLowerCase().includes(q);
      const cleanQ = q.replace(/^#/, '');
      const tagMatch = card.tags?.some((t) => t.toLowerCase().includes(cleanQ));
      return Boolean(titleMatch || contentMatch || urlMatch || descMatch || tagMatch);
    });
  }, [cards, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCards]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCards.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCards.length) % Math.max(1, filteredCards.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCards[selectedIndex]) {
        onSelectCard(filteredCards[selectedIndex]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const getTypeBadge = (type: Card['type']) => {
    switch (type) {
      case 'image':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">图片</span>;
      case 'web':
        return <span className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">网页</span>;
      case 'text':
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">文本</span>;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[20000] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-neutral-900 border border-white/15 shadow-2xl rounded-none flex flex-col overflow-hidden text-neutral-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3 border-b border-white/10 bg-neutral-800/50">
          <svg className="w-4 h-4 text-neutral-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索文本内容、图片标题或网页名称..."
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 outline-none font-sans"
          />
          <kbd className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 bg-neutral-800 border border-white/10">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/5">
          {filteredCards.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              未找到匹配 "{query}" 的便签
            </div>
          ) : (
            filteredCards.map((card, idx) => {
              const isSelected = idx === selectedIndex;
              const displayTitle = card.title || (card.type === 'web' ? card.url : '未命名便签');
              const snippet = card.content || card.description || card.url || '';

              return (
                <div
                  key={card.id}
                  onClick={() => {
                    onSelectCard(card);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 p-2.5 transition-colors cursor-pointer rounded-none select-none ${
                    isSelected ? 'bg-blue-600/30 text-white' : 'hover:bg-white/5 text-neutral-300'
                  }`}
                >
                  {/* Thumbnail / Icon */}
                  <div className="w-10 h-10 flex-shrink-0 bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                    {card.image ? (
                      <img
                        src={card.image}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                    ) : card.favicon ? (
                      <img src={card.favicon} alt="" className="w-4 h-4 pointer-events-none" referrerPolicy="no-referrer" />
                    ) : (
                      <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>

                  {/* Title & Snippet */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-100 truncate">{displayTitle}</span>
                      {getTypeBadge(card.type)}
                    </div>
                    {snippet && (
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5 font-sans leading-tight">
                        {snippet}
                      </p>
                    )}
                    {card.tags && card.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {card.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="px-1 py-0.2 text-[9px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20"
                          >
                            #{t}
                          </span>
                        ))}
                        {card.tags.length > 4 && (
                          <span className="text-[9px] text-neutral-500">+{card.tags.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Direct Jump Indicator */}
                  {isSelected && (
                    <span className="text-[10px] font-mono text-blue-400 flex items-center gap-1">
                      <span>跳转</span>
                      <span>↵</span>
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-neutral-950/80 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500 font-sans">
          <span>共 {cards.length} 张便签，匹配 {filteredCards.length} 个结果</span>
          <span>双击画布或按 <kbd className="font-mono text-[10px] text-neutral-400">Ctrl+F</kbd> 打开搜索</span>
        </div>
      </div>
    </div>
  );
};
