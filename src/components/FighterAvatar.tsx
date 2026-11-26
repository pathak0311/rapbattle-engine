import React from 'react';
import {Img, staticFile, useCurrentFrame, interpolate} from 'remotion';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const FighterAvatar: React.FC<{
  svgPath: string;
  color: string;
  bassLevel: number;
  vocalLevel: number;
  active: boolean;
  side: 'left' | 'right';
  exiting?: boolean;
}> = ({svgPath, color, bassLevel, vocalLevel, active, side, exiting}) => {
  const frame = useCurrentFrame();
  const bass = clamp01(bassLevel);
  const vocal = clamp01(vocalLevel);
  const dir = side === 'left' ? 1 : -1;
  const src = staticFile(svgPath);

  const nod = Math.sin(frame * 0.42) * (active ? 2.2 : 0.8) * dir + bass * 2.5 * dir;
  const punch = 1 + bass * (active ? 0.09 : 0.03);
  const jaw = vocal * 7; // percent of box height
  const micBob = Math.sin(frame * 0.5) * 6 + vocal * 12;

  const opacity = exiting ? 0.2 : active ? 1 : 0.55;
  const exitShift = exiting ? 18 : 0;

  const layer: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1',
        opacity,
        translate: `0% ${exitShift}%`,
        scale: String(punch),
        rotate: `${nod}deg`,
        transformOrigin: '50% 90%',
      }}
    >
      {/* solid ground plate in fighter colour */}
      <div
        style={{
          position: 'absolute',
          left: '12%',
          right: '12%',
          bottom: '-2%',
          height: '6%',
          borderRadius: '50%',
          backgroundColor: color,
          opacity: 0.55,
        }}
      />

      {/* upper head: 0-68% */}
      <div style={{...layer, clipPath: 'inset(0 0 32% 0)'}}>
        <Img src={src} style={layer} />
      </div>

      {/* lower jaw: 68-100%, drops with vocals */}
      <div
        style={{
          ...layer,
          clipPath: 'inset(68% 0 0 0)',
          translate: `0% ${jaw}%`,
        }}
      >
        <Img src={src} style={layer} />
      </div>

      {/* foreground microphone */}
      <svg
        viewBox="0 0 120 220"
        style={{
          position: 'absolute',
          bottom: '-4%',
          [side === 'left' ? 'right' : 'left']: '2%',
          width: '22%',
          height: 'auto',
          translate: `0px ${interpolate(micBob, [-6, 18], [4, -10])}px`,
          rotate: `${-14 * dir}deg`,
          scale: side === 'left' ? '1' : '-1 1',
        }}
      >
        <rect x="50" y="95" width="20" height="120" rx="8" fill="#111" stroke="#000" strokeWidth="4" />
        <rect x="55" y="120" width="6" height="70" rx="3" fill="#444" />
        <circle cx="60" cy="52" r="46" fill="#000" />
        <circle cx="60" cy="52" r="40" fill={color} />
        <circle cx="60" cy="52" r="40" fill="none" stroke="#000" strokeWidth="4" />
        {[-22, -8, 6, 20].map((dy) => (
          <line key={dy} x1="26" y1={52 + dy} x2="94" y2={52 + dy} stroke="#000" strokeWidth="4" opacity={0.55} />
        ))}
        <rect x="42" y="92" width="36" height="14" rx="4" fill="#000" />
      </svg>
    </div>
  );
};
