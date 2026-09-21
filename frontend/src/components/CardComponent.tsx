import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../types';

export type ResizeHandleDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface CardComponentProps {
  card: Card;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onUpdate: (id: string, updates: Partial<Card>) => void;
  onDoubleClick: (card: Card) => void;
  onStartScale: (card: Card, startClientX: number, startWidth: number, startHeight: number) => void;
  onStartResize: (card: Card, handle: ResizeHandleDirection, e: React.MouseEvent) => void;
  zoom: number;
}

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  isSelected,
  onSelect,
  onUpdate,
  onDoubleClick,
  onStartScale,
  onStartResize,
  zoom,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [textContent, setTextContent] = useState(card.content || '');
  const [hoverTimeout, setHoverTimeout] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(card.title || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const adjustedKeyRef = useRef<string | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wasSelectedAtPointerDownRef = useRef(false);

  useEffect(() => {
    setImgLoadError(false);
    setIsImgLoaded(false);
  }, [card.image]);

  // Adjust card height according to header image aspect ratio
  useEffect(() => {
    if (card.type === 'web' && card.image && !imgLoadError) {
      const img = new Image();
      img.src = card.image;
      const onDone = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const ratio = img.naturalWidth / img.naturalHeight;
          const imgHeight = card.width / ratio;
          const footerHeight = footerRef.current?.offsetHeight || 68;
          const targetHeight = Math.round(imgHeight + footerHeight);
          const key = `${card.id}_${card.image}_${Math.round(card.width)}`;

          if (Math.abs(card.height - targetHeight) > 4 && adjustedKeyRef.current !== key) {
            adjustedKeyRef.current = key;
            onUpdate(card.id, { height: targetHeight });
          }
        }
      };
      if (img.complete) {
        onDone();
      } else {
        img.onload = onDone;
      }
    }
  }, [card.id, card.image, card.type]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      const imgHeight = card.width / ratio;
      const footerHeight = footerRef.current?.offsetHeight || 68;
      const targetHeight = Math.round(imgHeight + footerHeight);
      const key = `${card.id}_${card.image}_${Math.round(card.width)}`;

      if (Math.abs(card.height - targetHeight) > 4 && adjustedKeyRef.current !== key) {
        adjustedKeyRef.current = key;
        onUpdate(card.id, { height: targetHeight });
      }
    }
  };

  useEffect(() => {
    setTitleText(card.title || '');
  }, [card.title]);

  useEffect(() => {
    setTextContent(card.content || '');
  }, [card.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (titleText !== card.title) {
      onUpdate(card.id, { title: titleText });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setTitleText(card.title || '');
      setIsEditingTitle(false);
    }
  };

  useEffect(() => {
    if (!isSelected) {
      if (isEditing) {
        setIsEditing(false);
        if (textContent !== card.content) {
          onUpdate(card.id, { content: textContent });
        }
      }
      if (isEditingTitle) {
        setIsEditingTitle(false);
        if (titleText !== card.title) {
          onUpdate(card.id, { title: titleText });
        }
      }
    }
  }, [isSelected, isEditing, isEditingTitle, textContent, titleText, card.content, card.title, card.id, onUpdate]);

  const handleBlur = () => {
    setIsEditing(false);
    if (textContent !== card.content) {
      onUpdate(card.id, { content: textContent });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    wasSelectedAtPointerDownRef.current = isSelected;

    // Middle click: prevent browser autoscroll and allow bubbling to canvas for panning
    if (e.button === 1) {
      e.preventDefault();
      return;
    }

    // Ctrl + Alt + Left click: proportional scale
    if (e.ctrlKey && e.altKey && e.button === 0) {
      e.stopPropagation();
      e.preventDefault();
      onStartScale(card, e.clientX, card.width, card.height);
      return;
    }

    if (e.button === 0) {
      onSelect(e);
    }
  };

  const handleMouseEnter = () => {
    if (card.type === 'web' && card.description && isSelected) {
      const timer = window.setTimeout(() => setShowTooltip(true), 300);
      setHoverTimeout(timer);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowTooltip(false);
  };

  const handleWebLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only open website when the card was already selected/highlighted before pointer down
    if (!wasSelectedAtPointerDownRef.current || !isSelected) return;

    if (card.url) {
      window.open(card.url, '_blank', 'noopener,noreferrer');
    }
  };

  const renderContent = () => {
    switch (card.type) {
      case 'image':
        return (
          <div className="w-full h-full flex flex-col overflow-hidden relative rounded-none">
            {card.title && (
              <div className={`px-3 py-1.5 bg-neutral-900/90 text-neutral-200 text-xs font-medium truncate border-b border-white/10 select-none ${card.reminder ? 'pr-20' : ''}`}>
                {card.title}
              </div>
            )}
            <div className="flex-1 bg-black/40 flex items-center justify-center overflow-hidden relative">
              {card.isParsing && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950/75 backdrop-blur-sm pointer-events-none select-none animate-in fade-in duration-150">
                  <div className="relative flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full border border-blue-500/20 animate-ping absolute" />
                    <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-blue-400 border-r-blue-400/60 animate-spin" />
                  </div>
                  <div className="mt-2.5 flex items-center gap-1 text-[11px] font-mono text-neutral-300">
                    <span>图片解析中</span>
                    <span className="inline-block animate-pulse">...</span>
                  </div>
                </div>
              )}
              <img
                src={card.image}
                alt={card.title || 'Image'}
                className="w-full h-full object-contain pointer-events-none"
                referrerPolicy="no-referrer"
                draggable={false}
                onLoad={() => setIsImgLoaded(true)}
                onError={() => setIsImgLoaded(true)}
              />
              {card.tags && card.tags.length > 0 && (
                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 z-10 pointer-events-none">
                  {card.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 text-[9px] font-mono text-cyan-200 bg-neutral-950/85 border border-cyan-500/40 backdrop-blur-sm shadow">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'web':
        const showHeaderArea = (card.image && !imgLoadError) || card.isParsing;
        return (
          <div className="w-full h-full flex flex-col overflow-hidden rounded-none bg-neutral-900/90 select-none">
            {showHeaderArea ? (
              <>
                <div className="w-full flex-1 bg-black/40 overflow-hidden relative flex items-center justify-center pointer-events-none min-h-0">
                  {card.isParsing && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950/75 backdrop-blur-sm pointer-events-none select-none animate-in fade-in duration-150">
                      <div className="relative flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full border border-blue-500/20 animate-ping absolute" />
                        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-blue-400 border-r-blue-400/60 animate-spin" />
                      </div>
                      <div className="mt-2.5 flex items-center gap-1 text-[11px] font-mono text-neutral-300">
                        <span>头图解析中</span>
                        <span className="inline-block animate-pulse">...</span>
                      </div>
                    </div>
                  )}
                  {card.image && !imgLoadError && (
                    <img
                      src={card.image}
                      alt={card.title || 'Web preview'}
                      className="w-full h-full object-contain pointer-events-none"
                      referrerPolicy="no-referrer"
                      onLoad={(e) => {
                        setIsImgLoaded(true);
                        handleImageLoad(e);
                      }}
                      onError={() => {
                        setIsImgLoaded(true);
                        setImgLoadError(true);
                      }}
                      draggable={false}
                    />
                  )}
                </div>
                <div
                  ref={footerRef}
                  className="flex-shrink-0 p-3 bg-neutral-900/95 border-t border-white/5 flex flex-col justify-center"
                >
                  <div className="flex items-center gap-2">
                    {card.favicon ? (
                      <img
                        src={card.favicon}
                        alt="icon"
                        className="w-4 h-4 flex-shrink-0 pointer-events-none"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <svg className="w-4 h-4 text-blue-400 flex-shrink-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    )}
                    {isEditingTitle ? (
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={titleText}
                        autoFocus
                        onChange={(e) => setTitleText(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full bg-neutral-800 text-neutral-100 text-xs px-1.5 py-0.5 border border-blue-500 rounded-none outline-none font-sans"
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            setIsEditingTitle(true);
                          }
                        }}
                        title={isSelected ? "双击可编辑网页标题" : undefined}
                        className={`text-xs font-medium text-neutral-200 line-clamp-2 select-none leading-snug ${
                          isSelected ? "hover:text-white cursor-text" : "cursor-default"
                        }`}
                      >
                        {card.title || card.url}
                      </span>
                    )}
                  </div>

                  {/* Explicit bottom link - only opens website when clicked after card is highlighted */}
                  {card.url && (
                    <div className="mt-1 flex items-center">
                      <button
                        type="button"
                        onClick={handleWebLinkClick}
                        title={isSelected ? `在新标签页打开: ${card.url}` : '请先单击高亮卡片'}
                        className={`text-[11px] font-mono flex items-center gap-1 transition-colors truncate select-none text-left ${
                          isSelected
                            ? 'text-blue-400 hover:text-blue-300 hover:underline cursor-pointer'
                            : 'text-neutral-500 cursor-default'
                        }`}
                      >
                        <svg className="w-3 h-3 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="truncate">{card.url.replace(/^https?:\/\//, '')}</span>
                      </button>
                    </div>
                  )}

                  {/* Tags */}
                  {card.tags && card.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {card.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.2 text-[9px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 select-none"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div
                ref={footerRef}
                className="w-full h-full p-4 bg-neutral-900/95 flex flex-col justify-center relative overflow-hidden"
              >
                {card.isParsing && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-neutral-950/85 backdrop-blur-sm pointer-events-none select-none animate-in fade-in duration-150">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-500/20 border-t-blue-400 animate-spin" />
                    <span className="text-xs font-mono text-blue-300">网页解析中...</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {card.favicon ? (
                    <img
                      src={card.favicon}
                      alt="icon"
                      className="w-4 h-4 flex-shrink-0 pointer-events-none"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <svg className="w-4 h-4 text-blue-400 flex-shrink-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                  {isEditingTitle ? (
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={titleText}
                      autoFocus
                      onChange={(e) => setTitleText(e.target.value)}
                      onBlur={handleTitleBlur}
                      onKeyDown={handleTitleKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full bg-neutral-800 text-neutral-100 text-xs px-1.5 py-0.5 border border-blue-500 rounded-none outline-none font-sans"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          setIsEditingTitle(true);
                        }
                      }}
                      title={isSelected ? "双击可编辑网页标题" : undefined}
                      className={`text-xs font-medium text-neutral-200 line-clamp-2 select-none leading-snug ${
                        isSelected ? "hover:text-white cursor-text" : "cursor-default"
                      }`}
                    >
                      {card.title || card.url}
                    </span>
                  )}
                </div>

                {card.url && (
                  <div className="mt-1 flex items-center">
                    <button
                      type="button"
                      onClick={handleWebLinkClick}
                      title={isSelected ? `在新标签页打开: ${card.url}` : '请先单击高亮卡片'}
                      className={`text-[11px] font-mono flex items-center gap-1 transition-colors truncate select-none text-left ${
                        isSelected
                          ? 'text-blue-400 hover:text-blue-300 hover:underline cursor-pointer'
                          : 'text-neutral-500 cursor-default'
                      }`}
                    >
                      <svg className="w-3 h-3 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="truncate">{card.url.replace(/^https?:\/\//, '')}</span>
                    </button>
                  </div>
                )}

                {/* Tags */}
                {card.tags && card.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {card.tags.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.2 text-[9px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 select-none"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'text':
      default:
        return (
          <div className="w-full h-full flex flex-col rounded-none overflow-hidden">
            {card.title && (
              <div className={`px-3 py-1.5 bg-white/[0.04] text-neutral-200 text-xs font-semibold truncate border-b border-white/10 select-none ${card.reminder ? 'pr-20' : ''}`}>
                {card.title}
              </div>
            )}
            <div className={`flex-1 p-4 flex flex-col overflow-hidden ${isSelected ? 'pointer-events-auto' : 'pointer-events-none select-none'}`}>
              {isSelected && isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  onBlur={handleBlur}
                  onWheel={(e) => {
                    // Prevent canvas zoom while scrolling inside textarea
                    e.stopPropagation();
                  }}
                  className="w-full h-full bg-transparent text-neutral-100 text-sm outline-none resize-none font-sans leading-relaxed selection:bg-blue-500/30"
                  style={{ cursor: 'text' }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  onClick={(e) => {
                    if (isSelected) {
                      e.stopPropagation();
                      setIsEditing(true);
                    }
                  }}
                  onWheel={(e) => {
                    if (isSelected) {
                      e.stopPropagation();
                    }
                  }}
                  className={`w-full h-full text-neutral-100 text-sm whitespace-pre-wrap font-sans leading-relaxed ${
                    isSelected ? 'overflow-y-auto cursor-text select-text' : 'overflow-hidden cursor-default'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {textContent || (
                    <span className="text-neutral-500 italic select-none">
                      {isSelected ? '点击输入文本...' : '空白便签'}
                    </span>
                  )}
                </div>
              )}
            </div>
            {card.tags && card.tags.length > 0 && (
              <div className="px-3 py-1 flex flex-wrap gap-1 border-t border-white/5 bg-black/20 flex-shrink-0 select-none">
                {card.tags.map((t) => (
                  <span
                    key={t}
                    className="px-1.5 py-0.2 text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  const createResizeHandle = (dir: ResizeHandleDirection, cursorClass: string, styleClass: string) => (
    <div
      className={`absolute z-40 ${cursorClass} ${styleClass}`}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onStartResize(card, dir, e);
      }}
    />
  );

  return (
    <div
      data-card-id={card.id}
      data-selected={isSelected ? 'true' : 'false'}
      onWheel={(e) => {
        // When card is selected, isolate all wheel events to this card so canvas never zooms
        if (isSelected) {
          e.stopPropagation();
        }
      }}
      className={`absolute rounded-none transition-shadow duration-150 backdrop-blur-md select-none group ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-2xl shadow-blue-500/20 z-30'
          : 'ring-1 ring-white/10 shadow-lg hover:ring-white/20'
      } bg-neutral-900/80`}
      style={{
        transform: `translate(${card.x}px, ${card.y}px)`,
        width: `${card.width}px`,
        height: `${card.height}px`,
        zIndex: card.zIndex,
        boxShadow: isSelected
          ? '0 0 0 2px rgba(59, 130, 246, 0.8), 0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          : '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(card);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {renderContent()}

      {/* Reminder Badge Indicator */}
      {card.reminder && (
        <div
          title={`提醒时间: ${card.reminder}`}
          className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono flex items-center gap-1 shadow-lg pointer-events-none z-20 backdrop-blur-md"
        >
          <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span>{card.reminder.slice(5)}</span>
        </div>
      )}

      {/* Resize Handles */}
      {createResizeHandle('n', 'cursor-ns-resize', 'top-0 left-2 right-2 h-1.5 -translate-y-1/2')}
      {createResizeHandle('s', 'cursor-ns-resize', 'bottom-0 left-2 right-2 h-1.5 translate-y-1/2')}
      {createResizeHandle('w', 'cursor-ew-resize', 'left-0 top-2 bottom-2 w-1.5 -translate-x-1/2')}
      {createResizeHandle('e', 'cursor-ew-resize', 'right-0 top-2 bottom-2 w-1.5 translate-x-1/2')}
      {createResizeHandle('nw', 'cursor-nwse-resize', `top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center ${isSelected ? 'bg-blue-500 border border-white' : 'hover:bg-blue-400/50'}`)}
      {createResizeHandle('ne', 'cursor-nesw-resize', `top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center ${isSelected ? 'bg-blue-500 border border-white' : 'hover:bg-blue-400/50'}`)}
      {createResizeHandle('se', 'cursor-nwse-resize', `bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center ${isSelected ? 'bg-blue-500 border border-white' : 'hover:bg-blue-400/50'}`)}
      {createResizeHandle('sw', 'cursor-nesw-resize', `bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center ${isSelected ? 'bg-blue-500 border border-white' : 'hover:bg-blue-400/50'}`)}

      {/* Web card hover >300ms description bubble */}
      {showTooltip && card.type === 'web' && card.description && (
        <div
          className="absolute left-0 top-full mt-2 w-72 p-3 bg-neutral-900/95 text-neutral-200 text-xs rounded-none ring-1 ring-white/15 shadow-2xl z-50 pointer-events-none backdrop-blur-lg leading-normal animate-in fade-in zoom-in-95 duration-150"
          style={{ wordBreak: 'break-word' }}
        >
          {card.description}
        </div>
      )}
    </div>
  );
};
