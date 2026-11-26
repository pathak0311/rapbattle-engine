import React from 'react';
import {useCurrentFrame} from 'remotion';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const HostAvatar: React.FC<{
  bassLevel: number;
  vocalLevel: number;
  active?: boolean;
  size?: number;
  exiting?: boolean;
}> = ({bassLevel, vocalLevel, active = true, size = 360, exiting = false}) => {
  const frame = useCurrentFrame();
  const bass = clamp01(bassLevel);
  const vocal = clamp01(vocalLevel);

  const bounce = -bass * 14 - (active ? Math.abs(Math.sin(frame * 0.21)) * 4 : 0);
  const squash = 1 + bass * 0.05;
  const mouthH = 4 + vocal * 30;
  const blink = frame % 96 > 91 ? 0.15 : 1;
  const visorGlow = 0.75 + bass * 0.25;
  const micShift = vocal * 6;

  const INK = '#0a0a12';
  const HOOD = '#2b2f4a';
  const HOOD_LIGHT = '#3b4170';
  const CYAN = '#19f0ff';
  const MAGENTA = '#ff2bd6';
  const YELLOW = '#ffe14a';

  return (
    <div
      style={{
        width: size,
        height: size * 1.25,
        opacity: exiting ? 0 : active ? 1 : 0.7,
        translate: `0px ${exiting ? size * 0.4 : bounce}px`,
        scale: String(exiting ? 0.85 : squash),
        transformOrigin: '50% 100%',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 400 500">
        {/* shoulders / hoodie body */}
        <path d="M20 500 L40 400 Q70 345 140 330 L260 330 Q330 345 360 400 L380 500 Z" fill={HOOD} stroke={INK} strokeWidth="8" strokeLinejoin="round" />
        <path d="M60 500 L75 410 Q100 372 150 360 L150 500 Z" fill={HOOD_LIGHT} opacity="0.55" />
        {/* hoodie strings */}
        <line x1="165" y1="345" x2="160" y2="430" stroke={YELLOW} strokeWidth="7" strokeLinecap="round" />
        <line x1="235" y1="345" x2="240" y2="430" stroke={YELLOW} strokeWidth="7" strokeLinecap="round" />
        <circle cx="160" cy="436" r="8" fill={YELLOW} stroke={INK} strokeWidth="4" />
        <circle cx="240" cy="436" r="8" fill={YELLOW} stroke={INK} strokeWidth="4" />
        {/* chest badge */}
        <circle cx="300" cy="420" r="22" fill={MAGENTA} stroke={INK} strokeWidth="5" />
        <rect x="292" y="408" width="16" height="24" rx="8" fill={INK} />

        {/* hood back */}
        <path d="M60 300 Q50 90 200 60 Q350 90 340 300 Q300 350 200 350 Q100 350 60 300 Z" fill={HOOD} stroke={INK} strokeWidth="9" strokeLinejoin="round" />
        {/* face plate */}
        <path d="M95 280 Q90 130 200 112 Q310 130 305 280 Q290 335 200 335 Q110 335 95 280 Z" fill="#14142a" stroke={INK} strokeWidth="6" />

        {/* headphones */}
        <path d="M70 210 Q70 40 200 40 Q330 40 330 210" fill="none" stroke={INK} strokeWidth="26" strokeLinecap="round" />
        <path d="M70 210 Q70 40 200 40 Q330 40 330 210" fill="none" stroke={MAGENTA} strokeWidth="14" strokeLinecap="round" />
        <rect x="42" y="170" width="52" height="96" rx="22" fill={INK} />
        <rect x="50" y="180" width="36" height="76" rx="15" fill={MAGENTA} />
        <rect x="306" y="170" width="52" height="96" rx="22" fill={INK} />
        <rect x="314" y="180" width="36" height="76" rx="15" fill={MAGENTA} />
        <circle cx="68" cy="218" r="7" fill={YELLOW} />
        <circle cx="332" cy="218" r="7" fill={YELLOW} />

        {/* visor: layered solid glow */}
        <rect x="108" y="170" width="184" height="78" rx="39" fill={CYAN} opacity={0.18 * visorGlow} />
        <rect x="116" y="177" width="168" height="64" rx="32" fill={CYAN} opacity={0.3 * visorGlow} />
        <rect x="124" y="184" width="152" height="50" rx="25" fill={INK} stroke={CYAN} strokeWidth="5" />
        <g transform={`translate(0 ${(1 - blink) * 12})`}>
          <rect x="146" y={198} width="36" height={22 * blink} rx="8" fill={CYAN} />
          <rect x="218" y={198} width="36" height={22 * blink} rx="8" fill={CYAN} />
        </g>
        <rect x="136" y="190" width="70" height="6" rx="3" fill="#ffffff" opacity="0.5" />

        {/* mouth reacting to vocal level */}
        <rect x="160" y={290 - mouthH / 2} width="80" height={mouthH} rx={Math.min(18, mouthH / 2)} fill={INK} stroke={CYAN} strokeWidth="4" />
        {mouthH > 14 ? <rect x="172" y={290 + mouthH / 2 - 10} width="56" height="8" rx="4" fill={MAGENTA} /> : null}

        {/* mic in front of mouth */}
        <g transform={`translate(${-micShift} 0)`}>
          <rect x="266" y="300" width="22" height="120" rx="9" fill="#1d1d2e" stroke={INK} strokeWidth="5" transform="rotate(25 277 360)" />
          <circle cx="252" cy="288" r="30" fill={INK} />
          <circle cx="252" cy="288" r="24" fill="#8a8fb5" />
          <line x1="232" y1="280" x2="272" y2="280" stroke={INK} strokeWidth="3" />
          <line x1="230" y1="289" x2="274" y2="289" stroke={INK} strokeWidth="3" />
          <line x1="232" y1="298" x2="272" y2="298" stroke={INK} strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
};
