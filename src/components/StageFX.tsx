import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

const W = 1080;
const H = 1920;

const HalftoneRing: React.FC<{
  cx: number;
  cy: number;
  radius: number;
  count: number;
  dot: number;
  rot: number;
  fill: string;
  opacity: number;
}> = ({cx, cy, radius, count, dot, rot, fill, opacity}) => (
  <g opacity={opacity}>
    {Array.from({length: count}).map((_, i) => {
      const a = (i / count) * Math.PI * 2 + rot;
      const r = dot * (0.45 + 0.55 * ((i % 4) / 3));
      return (
        <circle
          key={i}
          cx={cx + Math.cos(a) * radius}
          cy={cy + Math.sin(a) * radius}
          r={r}
          fill={fill}
        />
      );
    })}
  </g>
);

export const StageFX: React.FC<{
  color: string;
  secondaryColor: string;
  bassLevel: number;
  whiteFlash?: boolean;
}> = ({color, secondaryColor, bassLevel, whiteFlash}) => {
  const frame = useCurrentFrame();
  const bass = Math.max(0, Math.min(1, bassLevel));
  const pulse = 1 + bass * 0.06;
  const spin = frame * 0.004;

  const rays = Array.from({length: 18}).map((_, i) => {
    const a0 = (i / 18) * Math.PI * 2 + spin;
    const a1 = a0 + (Math.PI * 2) / 36;
    const R = 2400;
    const cx = W / 2;
    const cy = 700;
    return `${cx},${cy} ${cx + Math.cos(a0) * R},${cy + Math.sin(a0) * R} ${
      cx + Math.cos(a1) * R
    },${cy + Math.sin(a1) * R}`;
  });

  const floorLines = Array.from({length: 9}).map((_, i) => {
    const t = i / 8;
    const x = W / 2 + (t - 0.5) * 3200;
    return {x1: W / 2, y1: 1180, x2: x, y2: H};
  });

  const hLines = [1300, 1420, 1570, 1760];

  return (
    <AbsoluteFill style={{backgroundColor: '#07070c', overflow: 'hidden'}}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{position: 'absolute', left: 0, top: 0}}
      >
        {/* backdrop panels */}
        <rect x={0} y={0} width={W} height={1180} fill="#0d0d16" />
        <rect x={0} y={1180} width={W} height={740} fill="#050508" />

        {/* sunburst rays */}
        <g opacity={0.1 + bass * 0.05}>
          {rays.map((p, i) => (
            <polygon key={i} points={p} fill={i % 2 === 0 ? color : secondaryColor} />
          ))}
        </g>

        {/* beat-scaling halftone rings */}
        <g
          style={{
            transformOrigin: `${W / 2}px 700px`,
            scale: String(pulse),
          }}
        >
          <circle cx={W / 2} cy={700} r={520} fill={color} opacity={0.08} />
          <circle cx={W / 2} cy={700} r={340} fill={secondaryColor} opacity={0.08} />
          <HalftoneRing cx={W / 2} cy={700} radius={600} count={64} dot={16} rot={spin * 2} fill={color} opacity={0.35 + bass * 0.2} />
          <HalftoneRing cx={W / 2} cy={700} radius={470} count={52} dot={12} rot={-spin * 3} fill={secondaryColor} opacity={0.3 + bass * 0.2} />
          <HalftoneRing cx={W / 2} cy={700} radius={350} count={40} dot={9} rot={spin * 4} fill={color} opacity={0.25 + bass * 0.15} />
          <HalftoneRing cx={W / 2} cy={700} radius={240} count={28} dot={6} rot={-spin * 5} fill={secondaryColor} opacity={0.22} />
        </g>

        {/* corner halftone dot fields */}
        {Array.from({length: 7}).map((_, row) =>
          Array.from({length: 7 - row}).map((__, col) => (
            <circle
              key={`tl${row}-${col}`}
              cx={40 + col * 44}
              cy={40 + row * 44}
              r={3 + (7 - row - col) * 1.6}
              fill={secondaryColor}
              opacity={0.22}
            />
          )),
        )}
        {Array.from({length: 7}).map((_, row) =>
          Array.from({length: 7 - row}).map((__, col) => (
            <circle
              key={`br${row}-${col}`}
              cx={W - 40 - col * 44}
              cy={H - 40 - row * 44}
              r={3 + (7 - row - col) * 1.6}
              fill={color}
              opacity={0.22}
            />
          )),
        )}

        {/* stage floor */}
        <rect x={0} y={1180} width={W} height={10} fill={color} opacity={0.55 + bass * 0.3} />
        {floorLines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={i % 2 === 0 ? color : secondaryColor} strokeWidth={4} opacity={0.22} />
        ))}
        {hLines.map((y, i) => (
          <rect key={y} x={0} y={y} width={W} height={4 + i * 2} fill={secondaryColor} opacity={0.14} />
        ))}

        {/* bold diagonal slabs */}
        <polygon points={`0,0 260,0 0,360`} fill={color} opacity={0.18} />
        <polygon points={`${W},0 ${W - 260},0 ${W},360`} fill={secondaryColor} opacity={0.18} />
        <polygon points={`0,${H} 0,${H - 300} 300,${H}`} fill={secondaryColor} opacity={0.16} />
        <polygon points={`${W},${H} ${W},${H - 300} ${W - 300},${H}`} fill={color} opacity={0.16} />
      </svg>

      {whiteFlash ? (
        <AbsoluteFill style={{backgroundColor: '#ffffff', opacity: 0.92}} />
      ) : null}
    </AbsoluteFill>
  );
};
