import React from 'react';
import {spring} from 'remotion';
import {GOAL, SPOT, ballAt, clamp01, RESET_SEC, type Kick} from './timeline';

// Keeper dive in canvas px (negative = screen left). Driven by spring only.
export const keeperDx = (k: Kick, f: number, fps: number): number => {
  const react = k.strikeF + 5;
  const target = k.outcome === 'save' ? k.aim * 110 : k.outcome === 'goal' ? -k.aim * 140 : k.aim * 30;
  const sp = f < react ? 0 : spring({frame: f - react, fps, config: {damping: 13, stiffness: 150, mass: 0.8}});
  const back = f >= k.resetF ? clamp01((f - k.resetF) / (RESET_SEC * fps)) : 0;
  return target * sp * (1 - back);
};

const pentagon = (r: number): string =>
  Array.from({length: 5}, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
  }).join('') + 'Z';
const PENT = pentagon(14);

const BOKEH = Array.from({length: 64}, (_, i) => ({
  x: ((i * 197) % 1040) + 20,
  y: 30 + ((i * 89) % 360),
  r: 3 + (i % 5) * 2.2,
  c: ['#3BA7FF', '#F5C542', '#FFFFFF'][i % 3],
}));

const VERTICALS = Array.from({length: 13}, (_, i) => GOAL.left + i * 40);
const HORIZONTALS = Array.from({length: 7}, (_, i) => GOAL.top + i * 40);

const KeeperShape: React.FC<{color: string}> = ({color}) => (
  <g>
    <path d="M-44,-204 Q0,-222 44,-204 L54,-112 L-54,-112 Z" fill="#0B1020" stroke={color} strokeWidth={6} strokeLinejoin="round" />
    <path d="M-42,-196 L-104,-150 L-118,-126 L-104,-116 L-70,-132 L-40,-162 Z" fill="#0B1020" stroke={color} strokeWidth={5} strokeLinejoin="round" />
    <path d="M42,-196 L104,-150 L118,-126 L104,-116 L70,-132 L40,-162 Z" fill="#0B1020" stroke={color} strokeWidth={5} strokeLinejoin="round" />
    <circle cx={-111} cy={-122} r={20} fill="#E2E8F0" stroke={color} strokeWidth={4} />
    <circle cx={111} cy={-122} r={20} fill="#E2E8F0" stroke={color} strokeWidth={4} />
    <rect x={-50} y={-116} width={100} height={44} rx={8} fill="#0B1020" stroke={color} strokeWidth={5} />
    <rect x={-42} y={-74} width={36} height={74} rx={10} fill="#0B1020" stroke={color} strokeWidth={5} />
    <rect x={6} y={-74} width={36} height={74} rx={10} fill="#0B1020" stroke={color} strokeWidth={5} />
    <circle cx={0} cy={-234} r={27} fill="#0B1020" stroke={color} strokeWidth={6} />
  </g>
);

interface PitchProps {
  frame: number;
  fps: number;
  kicks: Kick[];
  activeIdx: number;
  f1Color: string;
  f2Color: string;
  beatKick: number;
}

export const Pitch: React.FC<PitchProps> = ({frame, fps, kicks, activeIdx, f1Color, f2Color, beatKick}) => {
  const k = activeIdx >= 0 ? kicks[activeIdx] : null;
  const ball = k ? ballAt(k, frame, fps) : {x: SPOT.x, y: SPOT.y, scale: 1, inFlight: false};
  const dx = k ? keeperDx(k, frame, fps) : 0;
  const keeperColor = k ? (k.keeper === 'fighter1' ? f1Color : f2Color) : '#94A3B8';
  const bulge = k && k.outcome === 'goal' && frame >= k.impactF ? spring({frame: frame - k.impactF, fps, config: {damping: 8, stiffness: 110}}) : 0;
  const bulgeScale = 1 + 0.06 * bulge;
  const keeperTilt = (dx / 150) * 62;
  const dustP = k && frame >= k.strikeF && frame < k.strikeF + 14 ? (frame - k.strikeF) / 14 : -1;
  const trailFrames = k && frame >= k.strikeF && frame < k.impactF ? [5, 10].filter((d) => frame - d >= k.strikeF) : [];
  const spin = frame * (ball.inFlight ? 22 : 3);
  const shadowOp = 0.3 + 0.1 * beatKick;

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <linearGradient id="sk-stand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03050D" />
          <stop offset="1" stopColor="#0B1630" />
        </linearGradient>
        <linearGradient id="sk-pitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0F5A2F" />
          <stop offset="0.5" stopColor="#0B4426" />
          <stop offset="1" stopColor="#063019" />
        </linearGradient>
        <linearGradient id="sk-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <radialGradient id="sk-spot" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* stands */}
      <rect x={0} y={0} width={1080} height={440} fill="url(#sk-stand)" />
      {Array.from({length: 7}, (_, i) => (
        <rect key={'row' + i} x={0} y={40 + i * 56} width={1080} height={22} fill="#FFFFFF" fillOpacity={i % 2 ? 0.03 : 0.07} />
      ))}
      {BOKEH.map((b, i) => (
        <circle
          key={'b' + i}
          cx={b.x}
          cy={b.y}
          r={b.r}
          fill={b.c}
          opacity={0.18 + 0.3 * (0.5 + 0.5 * Math.sin(frame / 14 + i))}
        />
      ))}

      {/* floodlight beams */}
      {[
        'M60,0 L330,460 L170,460 Z',
        'M1020,0 L750,460 L910,460 Z',
        'M360,0 L420,440 L300,440 Z',
        'M720,0 L660,440 L780,440 Z',
      ].map((d, i) => (
        <path key={'beam' + i} d={d} fill="url(#sk-beam)" opacity={0.35 + 0.25 * beatKick} />
      ))}

      {/* pitch */}
      <rect x={0} y={430} width={1080} height={1490} fill="url(#sk-pitch)" />
      {Array.from({length: 7}, (_, i) => (
        <rect key={'str' + i} x={0} y={430 + i * 230} width={1080} height={115} fill="#FFFFFF" fillOpacity={0.035} />
      ))}
      <ellipse cx={540} cy={1000} rx={620} ry={420} fill="url(#sk-spot)" />
      <path d="M130,1180 L240,760 L840,760 L950,1180" fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={6} />
      <path d="M330,760 L360,700 L720,700 L750,760" fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={5} />
      <circle cx={SPOT.x} cy={SPOT.y} r={9} fill="#FFFFFF" />

      {/* goal net (bulges on goals) */}
      <g transform={`translate(540,580) scale(${bulgeScale}) translate(-540,-580)`}>
        <rect x={GOAL.left} y={GOAL.top} width={GOAL.right - GOAL.left} height={GOAL.bottom - GOAL.top} fill="#050C1C" fillOpacity={0.85} />
        {VERTICALS.map((x) => (
          <line key={'v' + x} x1={x} y1={GOAL.top} x2={x} y2={GOAL.bottom} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={2} />
        ))}
        {HORIZONTALS.map((y) => (
          <line key={'h' + y} x1={GOAL.left} y1={y} x2={GOAL.right} y2={y} stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={2} />
        ))}
      </g>

      {/* goalkeeper */}
      <g transform={`translate(${540 + dx},${GOAL.bottom})`}>
        <g transform={`rotate(${keeperTilt}, 0, -120)`}>
          <KeeperShape color={keeperColor} />
        </g>
      </g>

      {/* frame */}
      <rect x={292} y={452} width={496} height={16} fill="#FFFFFF" />
      <rect x={292} y={452} width={16} height={256} fill="#FFFFFF" />
      <rect x={772} y={452} width={16} height={256} fill="#FFFFFF" />

      {/* strike dust ring */}
      {dustP >= 0 && (
        <circle cx={SPOT.x} cy={SPOT.y} r={24 + 100 * dustP} fill="none" stroke="#E2E8F0" strokeWidth={6} opacity={1 - dustP} />
      )}

      {/* ball trail */}
      {trailFrames.map((d, i) => {
        const p = ballAt(k as Kick, frame - d, fps);
        return (
          <circle key={'tr' + d} cx={p.x} cy={p.y} r={34 * p.scale} fill="#FFFFFF" opacity={0.2 - i * 0.1} />
        );
      })}

      {/* ball */}
      <ellipse cx={ball.x} cy={ball.y + 34 * ball.scale} rx={34 * ball.scale} ry={9 * ball.scale} fill="#000000" opacity={shadowOp} />
      <g transform={`translate(${ball.x},${ball.y}) scale(${ball.scale}) rotate(${spin})`}>
        <circle r={34} fill="#F8FAFC" stroke="#0B1020" strokeWidth={4} />
        <path d={PENT} fill="#0B1020" />
      </g>
    </svg>
  );
};
