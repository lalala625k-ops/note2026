import React from 'react';
import { Rect } from '../types';

interface SelectionBoxProps {
  box: Rect | null;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({ box }) => {
  if (!box) return null;

  const left = box.width < 0 ? box.x + box.width : box.x;
  const top = box.height < 0 ? box.y + box.height : box.y;
  const width = Math.abs(box.width);
  const height = Math.abs(box.height);

  return (
    <div
      className="absolute border border-blue-400/80 bg-blue-500/10 pointer-events-none rounded-sm"
      style={{
        transform: `translate(${left}px, ${top}px)`,
        width: `${width}px`,
        height: `${height}px`,
        borderStyle: 'dashed',
        borderWidth: '1.5px',
        zIndex: 9999,
      }}
    />
  );
};
