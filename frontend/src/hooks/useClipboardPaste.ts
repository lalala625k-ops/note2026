import { useCallback } from 'react';
import { Card } from '../types';

interface UseClipboardPasteProps {
  createCardAtCursor: (cardData: Partial<Card>) => Card;
  updateCard: (id: string, updates: Partial<Card>) => void;
  showToast?: (msg: string) => void;
  pasteCopiedCards?: (cards: Card[]) => void;
  getCopiedCards?: () => Card[];
}

export function useClipboardPaste({
  createCardAtCursor,
  updateCard,
  showToast,
  pasteCopiedCards,
  getCopiedCards,
}: UseClipboardPasteProps) {
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      e.preventDefault();
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // 0. Check if clipboard contains copied cards (infinite-canvas-cards)
      const rawText = clipboardData.getData('text/plain')?.trim();
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          if (
            parsed &&
            parsed.__type === 'infinite-canvas-cards' &&
            Array.isArray(parsed.cards) &&
            parsed.cards.length > 0
          ) {
            pasteCopiedCards?.(parsed.cards);
            return;
          }
        } catch {
          // Not JSON, continue with normal paste handlers
        }
      }

      // Fallback internal copied cards if clipboard read was blank/intercepted
      const internalCards = getCopiedCards?.();
      if (internalCards && internalCards.length > 0 && !rawText && clipboardData.items.length === 0) {
        pasteCopiedCards?.(internalCards);
        return;
      }

      // 1. Image
      const items = Array.from(clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith('image/'));

      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) {
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

              // PRD 1.2: RapidOCR background extraction
              try {
                const res = await fetch('/api/recognize-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: base64Data }),
                });
                if (res.ok) {
                  const ocr = await res.json();
                  if (ocr.success) {
                    updateCard(created.id, {
                      title: ocr.title || '',
                      content: ocr.text || '',
                      isParsing: false,
                    });
                  } else {
                    updateCard(created.id, { isParsing: false });
                  }
                } else {
                  updateCard(created.id, { isParsing: false });
                }
              } catch (err) {
                console.warn('OCR request skipped or failed:', err);
                updateCard(created.id, { isParsing: false });
              }
            };
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      // 2. URL or Plain Text
      const text = clipboardData.getData('text/plain')?.trim();
      const html = clipboardData.getData('text/html');

      let targetUrl = '';
      let targetTitle = '';

      if (text) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
        if (urlMatch) {
          targetUrl = urlMatch[1];
          let cleaned = text.replace(targetUrl, '').trim();
          cleaned = cleaned.replace(/^[:：\-—\s]+|[:：\-—\s]+$/g, '').trim();
          // Strip wrapping brackets like 《...》 or 【...】 without deleting the title inside
          const bracketMatch = cleaned.match(/^[《【\["“](.*?)[》】\]"”]$/);
          if (bracketMatch) {
            cleaned = bracketMatch[1].trim();
          }
          if (cleaned && cleaned.length < 120) {
            targetTitle = cleaned;
          }
        }
      }

      if (html && !targetUrl) {
        try {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const anchor = doc.querySelector('a[href]');
          if (anchor) {
            const href = anchor.getAttribute('href');
            if (href && /^https?:\/\//i.test(href)) {
              targetUrl = href;
              const aText = anchor.textContent?.trim();
              if (aText) targetTitle = aText;
            }
          }
        } catch {
          // ignore html parse error
        }
      }

      // Valid URL
      if (targetUrl && (!text || text.length < 500)) {
        const initialTitle = targetTitle || targetUrl;
        const created = createCardAtCursor({
          type: 'web',
          url: targetUrl,
          title: initialTitle,
          width: 280,
          height: 200,
          isParsing: true,
        });

        try {
          const res = await fetch(`/api/fetch-metadata?url=${encodeURIComponent(targetUrl)}`);
          if (res.ok) {
            const meta = await res.json();
            const finalTitle = targetTitle && targetTitle !== targetUrl ? targetTitle : meta.title || initialTitle;

            if (meta.image) {
              const img = new Image();
              let isHandled = false;
              const finishWithImage = () => {
                if (isHandled) return;
                isHandled = true;
                const ratio = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : (16 / 9);
                const imgHeight = created.width / ratio;
                const footerHeight = 68;
                const newHeight = Math.round(imgHeight + footerHeight);
                updateCard(created.id, {
                  title: finalTitle,
                  image: meta.image,
                  description: meta.description || '',
                  favicon: meta.favicon || '',
                  height: newHeight,
                  isParsing: false,
                });
              };

              img.onload = finishWithImage;
              img.onerror = () => {
                if (isHandled) return;
                isHandled = true;
                updateCard(created.id, {
                  title: finalTitle,
                  image: '',
                  description: meta.description || '',
                  favicon: meta.favicon || '',
                  height: 90,
                  isParsing: false,
                });
              };
              img.src = meta.image;

              // Safety timeout: if image download hangs, finalize cleanly
              setTimeout(() => {
                if (!isHandled) {
                  finishWithImage();
                }
              }, 6000);
            } else {
              updateCard(created.id, {
                title: finalTitle,
                image: '',
                description: meta.description || '',
                favicon: meta.favicon || '',
                height: 90,
                isParsing: false,
              });
            }
          } else {
            updateCard(created.id, { isParsing: false, height: 90 });
          }
        } catch (err) {
          console.warn('Metadata fetch failed:', err);
          updateCard(created.id, { isParsing: false, height: 90 });
        }
      } else if (text) {
        createCardAtCursor({
          type: 'text',
          content: text,
          width: 260,
          height: 180,
        });
      }
    },
    [createCardAtCursor, updateCard, pasteCopiedCards, getCopiedCards]
  );

  return { handlePaste };
}
