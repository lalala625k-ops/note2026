import React from 'react';
import { SnapLine } from '../types';

interface SnapGuidesProps {
  lines: SnapLine[];
}

export const SnapGuides: React.FC<SnapGuidesProps> = ({ lines }) => {
  if (!lines || lines.length === 0) return null;

  return (
    <>
      {lines.map((line, idx) => {
        if (line.type === 'vertical') {
          return (
            <div
              key={`snap-v-${idx}`}
              className="absolute pointer-events-none bg-blue-400"
              style={{
                left: `${line.position}px`,
                top: `${line.start}px`,
                width: '1px',
                height: `${line.end - line.start}px`,
                zIndex: 9998,
                boxShadow: '0 0 6px rgba(59, 130, 246, 0.8)',
              }}
            />
          );
        } else {
          return (
            <div
              key={`snap-h-${idx}`}
              className="absolute pointer-events-none bg-blue-400"
              style={{
                left: `${line.start}px`,
                top: `${line.position}px`,
                width: `${line.end - line.start}px`,
                height: '1px',
                zIndex: 9998,
                boxShadow: '0 0 6px rgba(59, 130, 246, 0.8)',
              }}
            />
          );
        }
      })}
    </>
  );
};
