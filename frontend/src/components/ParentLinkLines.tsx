import React from 'react';
import { Card, Group } from '../types';

export interface InteractiveWire {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  sourceCardId: string;
  isSnapping?: boolean;
}

interface ParentLinkLinesProps {
  groups: Group[];
  cards: Card[];
  selectedGroupIds: Set<string>;
  selectedCardIds: Set<string>;
  dragOverGroupId: string | null;
  interactiveWire?: InteractiveWire | null;
}

export const ParentLinkLines: React.FC<ParentLinkLinesProps> = ({
  groups,
  cards,
  selectedGroupIds,
  selectedCardIds,
  dragOverGroupId,
  interactiveWire,
}) => {
  // Build list of established links
  const links: {
    groupId: string;
    groupTitle: string;
    gx: number;
    gy: number;
    cx: number;
    cy: number;
    isSelected: boolean;
    isHighlighted: boolean;
  }[] = [];

  groups.forEach((group) => {
    const gSize = group.width || 40;
    const gx = group.x + gSize / 2;
    const gy = group.y + gSize / 2;
    const isGroupSelected = selectedGroupIds.has(group.id);
    const isGroupDragOver = dragOverGroupId === group.id;

    cards
      .filter((card) => card.groupId === group.id)
      .forEach((card) => {
        const cx = card.x + card.width / 2;
        const cy = card.y + card.height / 2;
        const isCardSelected = selectedCardIds.has(card.id);

        links.push({
          groupId: group.id,
          groupTitle: group.title,
          gx,
          gy,
          cx,
          cy,
          isSelected: isGroupSelected || isCardSelected,
          isHighlighted: isGroupDragOver || isGroupSelected || isCardSelected,
        });
      });
  });

  if (links.length === 0 && !interactiveWire) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full z-0">
      <defs>
        <filter id="white-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Established solid white connection lines */}
      {links.map((link, idx) => {
        const strokeWidth = link.isSelected ? 2.5 : 2;
        const opacity = link.isHighlighted ? 1 : 0.85;

        return (
          <g key={`${link.groupId}-${idx}`} opacity={opacity}>
            {/* Subtle glow for highlighted links */}
            {link.isHighlighted && (
              <line
                x1={link.gx}
                y1={link.gy}
                x2={link.cx}
                y2={link.cy}
                stroke="#ffffff"
                strokeWidth={5}
                strokeOpacity={0.35}
                filter="url(#white-glow)"
              />
            )}

            {/* Solid White Line (实心白线) */}
            <line
              x1={link.gx}
              y1={link.gy}
              x2={link.cx}
              y2={link.cy}
              stroke="#ffffff"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Group-end solid white dot */}
            <circle cx={link.gx} cy={link.gy} r={3} fill="#ffffff" />

            {/* Card-end solid white dot */}
            <circle cx={link.cx} cy={link.cy} r={3} fill="#ffffff" />
          </g>
        );
      })}

      {/* Interactive pulling solid white wire (Ctrl+Drag) */}
      {interactiveWire && (
        <g>
          {/* Ambient glow for the interactive wire */}
          <line
            x1={interactiveWire.startX}
            y1={interactiveWire.startY}
            x2={interactiveWire.targetX}
            y2={interactiveWire.targetY}
            stroke="#ffffff"
            strokeWidth={interactiveWire.isSnapping ? 6 : 4}
            strokeOpacity={interactiveWire.isSnapping ? 0.5 : 0.25}
            filter="url(#white-glow)"
          />

          {/* Main interactive solid white line */}
          <line
            x1={interactiveWire.startX}
            y1={interactiveWire.startY}
            x2={interactiveWire.targetX}
            y2={interactiveWire.targetY}
            stroke={interactiveWire.isSnapping ? '#34d399' : '#ffffff'}
            strokeWidth={interactiveWire.isSnapping ? 3 : 2.5}
            strokeLinecap="round"
          />

          {/* Source node dot */}
          <circle
            cx={interactiveWire.startX}
            cy={interactiveWire.startY}
            r={4}
            fill="#ffffff"
          />

          {/* Target cursor / snap dot */}
          <circle
            cx={interactiveWire.targetX}
            cy={interactiveWire.targetY}
            r={interactiveWire.isSnapping ? 6 : 4.5}
            fill={interactiveWire.isSnapping ? '#34d399' : '#ffffff'}
            stroke="#000000"
            strokeWidth={1.5}
          />
        </g>
      )}
    </svg>
  );
};
