import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

export interface ReactiveStageProps {
  activeColor: string;
  bassLevel: number;
  time: number;
  totalDuration?: number;
}

export const ReactiveStage: React.FC<ReactiveStageProps> = ({
  activeColor,
  bassLevel,
  time,
  totalDuration = 121.78,
}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  const hueShift = interpolate(
    t,
    [0, Math.max(1, totalDuration)],
    [0, 360],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  const bgColor = activeColor;
  const gridOpacity = 0.14 + bassLevel * 0.22;
  const lineOpacity = 0.08 + bassLevel * 0.14;
  const sparkScale = 1 + bassLevel * 0.4;
  const sparkOpacity = 0.3 + bassLevel * 0.5;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '1080px',
        height: '1920px',
        background: `radial-gradient(ellipse at center, ${bgColor}28 0%, #070A12 72%)`,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* Perspective floor grid */}
      <svg
        width="1080"
        height="1920"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) perspective(1200px) rotateX(65deg) scale(1.4)',
          opacity: gridOpacity,
        }}
        viewBox="-540 -960 1080 1920"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="gridFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={activeColor} stopOpacity={0.65} />
            <stop offset="100%" stopColor={activeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <g stroke="url(#gridFade)" strokeWidth="2">
          {/* Horizontal lines */}
          {Array.from({length: 24}).map((_, i) => (
            <line
              key={`h${i}`}
              x1="-540"
              x2="540"
              y1={-960 + i * 80 + (t * 40) % 80}
              y2={-960 + i * 80 + (t * 40) % 80}
            />
          ))}
          {/* Vertical lines */}
          {Array.from({length: 16}).map((_, i) => (
            <line
              key={`v${i}`}
              y1="-960"
              y2="960"
              x1={-540 + i * 67.5}
              x2={-540 + i * 67.5}
            />
          ))}
        </g>
      </svg>

      {/* Radial speed lines */}
      <svg
        width="1080"
        height="1920"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: lineOpacity,
          pointerEvents: 'none',
        }}
        viewBox="-540 -960 1080 1920"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="speedLines" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={activeColor} stopOpacity={0} />
            <stop offset="70%" stopColor={activeColor} stopOpacity={0.45} />
            <stop offset="100%" stopColor={activeColor} stopOpacity={0} />
          </radialGradient>
        </defs>
        {Array.from({length: 20}).map((_, i) => (
          <line
            key={`speed${i}`}
            x1="0"
            y1="0"
            x2={Math.cos((i / 20) * Math.PI * 2) * 1400}
            y2={Math.sin((i / 20) * Math.PI * 2) * 1400}
            stroke="url(#speedLines)"
            strokeWidth={2}
            style={{
              transformOrigin: 'center',
              transform: `rotate(${t * 15 + i * 18 + hueShift * 0.1}deg)`,
            }}
          />
        ))}
      </svg>

      {/* Bass-reactive sparks */}
      <svg
        width="1080"
        height="1920"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: sparkOpacity,
          pointerEvents: 'none',
        }}
        viewBox="-540 -960 1080 1920"
        preserveAspectRatio="none"
      >
        {Array.from({length: 30}).map((_, i) => {
          const angle = (i / 30) * Math.PI * 2;
          const baseRadius = 200 + (i * 17) % 400;
          const radius = baseRadius * sparkScale + Math.sin(t * 8 + i) * 40 * bassLevel;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius * 0.6;
          return (
            <circle
              key={`spark${i}`}
              cx={x}
              cy={y}
              r={2 + bassLevel * 4}
              fill={activeColor}
            />
          );
        })}
      </svg>
    </div>
  );
};
