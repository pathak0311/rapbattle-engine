import React from 'react';

interface ExtrudedTextProps {
  children: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  stroke?: number;
  offset?: number;
  letterSpacing?: number;
  lineHeight?: number;
  style?: React.CSSProperties;
}

/**
 * Streetwear-style 3D extruded text.
 * Uses -webkit-text-stroke for the outline plus a solid black duplicate layer
 * offset by a few pixels to fake depth. No drop-shadow / text-shadow / blur
 * (Pi 5 performance rule).
 */
export const ExtrudedText: React.FC<ExtrudedTextProps> = ({
  children,
  fontFamily,
  fontSize,
  color,
  stroke = 4,
  offset = 7,
  letterSpacing = 0,
  lineHeight = 1.1,
  style,
}) => {
  const shared: React.CSSProperties = {
    fontFamily,
    fontSize,
    fontWeight: 400,
    lineHeight,
    letterSpacing,
    whiteSpace: 'nowrap',
    WebkitTextStroke: `${stroke}px #000`,
    paintOrder: 'stroke fill',
  };

  return (
    <span
      style={{
        display: 'inline-block',
        ...style,
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
        }}
      >
        {/* Solid black offset duplicate layer -> 3D extrusion */}
        <span
          style={{
            ...shared,
            position: 'absolute',
            left: offset,
            top: offset,
            color: '#000',
            WebkitTextStroke: `${stroke}px #000`,
            zIndex: 0,
          }}
        >
          {children}
        </span>
        {/* Front face */}
        <span
          style={{
            ...shared,
            position: 'relative',
            color,
            zIndex: 1,
          }}
        >
          {children}
        </span>
      </span>
    </span>
  );
};
