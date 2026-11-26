import React from 'react';
import {bangersFont} from '../fonts';

export const StickerText: React.FC<{
  text: string;
  color: string;
  fontSize?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
}> = ({text, color, fontSize = 96, maxWidth = 900, align = 'center'}) => {
  const base: React.CSSProperties = {
    fontFamily: bangersFont,
    fontSize,
    lineHeight: 1.02,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: align,
    maxWidth,
    margin: 0,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        maxWidth,
        transform: 'rotate(-3deg) skewX(-4deg)',
        padding: '6px 12px 14px 6px',
      }}
    >
      {/* solid black comic extrusion layer */}
      <div
        aria-hidden
        style={{
          ...base,
          position: 'absolute',
          left: 6,
          top: 6,
          width: '100%',
          color: '#000',
          WebkitTextStroke: '3px #000',
        }}
      >
        {text}
      </div>
      <div
        style={{
          ...base,
          position: 'relative',
          color,
          WebkitTextStroke: '3px #000',
          paintOrder: 'stroke fill',
        }}
      >
        {text}
      </div>
    </div>
  );
};
