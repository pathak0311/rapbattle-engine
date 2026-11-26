import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile} from 'remotion';
import {FONT_ANTON, FONT_BANGERS} from '../../fonts';
import type {BattleManifest, Fighter} from '../../types';
import {type Kick, type Side} from './timeline';

const clampX = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const countsAt = (kicks: Kick[], f: number, side: Side) => {
  let shots = 0;
  let goals = 0;
  for (const k of kicks) {
    if (k.impactF <= f && k.speaker === side) {
      shots++;
      if (k.outcome === 'goal') goals++;
    }
  }
  return {shots, goals};
};

const lastSurname = (f: Fighter) => f.name.split(' ').slice(-1)[0];

// ---------- scoreboard (ticks after every kick, goals pop) ----------
interface ScoreProps {
  frame: number;
  fps: number;
  kicks: Kick[];
  battle: BattleManifest;
}
export const ScoreBoard: React.FC<ScoreProps> = ({frame, fps, kicks, battle}) => {
  const f1 = battle.fighters.fighter1;
  const f2 = battle.fighters.fighter2;
  const c1 = countsAt(kicks, frame, 'fighter1');
  const c2 = countsAt(kicks, frame, 'fighter2');
  let last: Kick | null = null;
  for (const k of kicks) if (k.impactF <= frame) last = k;
  const pop = last ? spring({frame: frame - last.impactF, fps, config: {damping: 9, stiffness: 170}}) : 1;
  const popFor = (side: Side) => (last && last.speaker === side ? 1 + 0.28 * (1 - pop) : 1);
  const flashOp = last ? interpolate(frame - last.impactF, [0, 10], [0.35, 0], clampX) : 0;

  const col = (f: Fighter, c: {shots: number; goals: number}, side: Side, align: 'left' | 'right') => (
    <div style={{display: 'flex', flexDirection: align === 'left' ? 'row' : 'row-reverse', alignItems: 'center', gap: 18, width: 300}}>
      <div style={{width: 120, height: 120, borderRadius: 60, overflow: 'hidden', border: `5px solid ${f.color}`, flex: '0 0 auto', background: '#05070F'}}>
        <Img src={staticFile(f.portrait ?? f.svg ?? '')} style={{width: '100%', height: '100%', display: 'block'}} />
      </div>
      <div style={{textAlign: align, display: 'flex', flexDirection: 'column', gap: 6}}>
        <div style={{fontFamily: FONT_ANTON, fontSize: 30, color: f.color, letterSpacing: 1, lineHeight: 1}}>{lastSurname(f)}</div>
        <div style={{fontFamily: FONT_ANTON, fontSize: 22, color: '#CBD5E1', letterSpacing: 2}}>SHOTS {c.shots}</div>
      </div>
      <span style={{display: 'none'}}>{side}</span>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        top: 40,
        width: 1000,
        height: 250,
        borderRadius: 28,
        background: 'linear-gradient(180deg, rgba(11,18,38,0.94), rgba(4,6,14,0.94))',
        border: '3px solid rgba(255,255,255,0.16)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill style={{background: '#FFFFFF', opacity: flashOp}} />
      <div style={{position: 'absolute', top: 14, left: 0, right: 0, textAlign: 'center', fontFamily: FONT_ANTON, fontSize: 24, letterSpacing: 6, color: '#94A3B8'}}>
        PENALTY SHOOTOUT
      </div>
      <div style={{position: 'absolute', top: 16, right: 26, fontFamily: FONT_ANTON, fontSize: 22, letterSpacing: 2, color: '#FF5A5A'}}>
        {frame % 30 < 18 ? '● LIVE' : '○ LIVE'}
      </div>
      <div style={{position: 'absolute', top: 58, left: 26, right: 26, bottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        {col(f1, c1, 'fighter1', 'left')}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 260}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, fontFamily: FONT_BANGERS, lineHeight: 0.9}}>
            <span style={{fontSize: 150, color: f1.color, transform: `scale(${popFor('fighter1')})`, display: 'inline-block'}}>{c1.goals}</span>
            <span style={{fontSize: 80, color: '#FFFFFF'}}>–</span>
            <span style={{fontSize: 150, color: f2.color, transform: `scale(${popFor('fighter2')})`, display: 'inline-block'}}>{c2.goals}</span>
          </div>
          <div style={{fontFamily: FONT_ANTON, fontSize: 20, letterSpacing: 5, color: '#94A3B8', marginTop: 4}}>GOALS</div>
        </div>
        {col(f2, c2, 'fighter2', 'right')}
      </div>
    </div>
  );
};

// ---------- fighter cards with lip-sync ----------
interface CardProps {
  fighter: Fighter;
  cx: number;
  active: boolean;
  pop: number;
  speaking: boolean;
  level: number;
}
export const FighterCard: React.FC<CardProps> = ({fighter, cx, active, pop, speaking, level}) => {
  const scale = active ? 0.94 + 0.06 * pop : 0.86;
  const opacity = active ? 1 : 0.42;
  const mouths = fighter.mouthSvgs && fighter.mouthSvgs.length === 3 ? fighter.mouthSvgs : [fighter.portrait ?? ''];
  const src = mouths[speaking && active ? Math.min(2, Math.max(0, level)) : 0] ?? mouths[0];
  return (
    <div style={{position: 'absolute', left: cx - 170, top: 1150, width: 340, transform: `scale(${scale})`, transformOrigin: 'center top', opacity}}>
      <div
        style={{
          width: 340,
          height: 340,
          borderRadius: 28,
          overflow: 'hidden',
          border: `7px solid ${fighter.color}`,
          boxSizing: 'border-box',
          background: `radial-gradient(circle at 50% 35%, ${fighter.color}66, #05070F 75%)`,
        }}
      >
        <Img src={staticFile(src)} style={{width: '100%', height: '100%', display: 'block'}} />
      </div>
      <div style={{textAlign: 'center', marginTop: 14, fontFamily: FONT_ANTON, fontSize: 38, color: fighter.color, letterSpacing: 1, lineHeight: 1.05}}>
        {fighter.name}
      </div>
      <div style={{textAlign: 'center', marginTop: 8, fontFamily: FONT_ANTON, fontSize: 24, color: '#CBD5E1', letterSpacing: 3}}>
        {active && speaking ? '● ON THE MIC' : fighter.badge}
      </div>
    </div>
  );
};

// ---------- karaoke caption for the current kick ----------
export const CaptionBox: React.FC<{frame: number; fps: number; kick: Kick; color: string}> = ({frame, fps, kick, color}) => {
  const t = frame / fps;
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        top: 1660,
        width: 960,
        height: 170,
        boxSizing: 'border-box',
        padding: '16px 30px',
        background: 'rgba(4,7,16,0.88)',
        borderLeft: `10px solid ${color}`,
        borderRadius: 18,
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'center',
        columnGap: 14,
      }}
    >
      {kick.line.words.map((w, i) => {
        const past = t >= w.end;
        const now = t >= w.start && t < w.end;
        const s = now ? interpolate(t - w.start, [0, 0.15], [1, 1.12], clampX) : 1;
        const c = now ? '#FFFFFF' : past ? color : 'rgba(255,255,255,0.32)';
        return (
          <span
            key={i}
            style={{fontFamily: FONT_ANTON, fontSize: 50, lineHeight: 1.08, color: c, display: 'inline-block', transform: `scale(${s})`}}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

// ---------- kick label under the spot ----------
export const KickLabel: React.FC<{kick: Kick; frame: number}> = ({kick, frame}) => {
  if (frame >= kick.nextF) return null;
  const color = kick.speaker === 'fighter1' ? '#3BA7FF' : '#F5C542';
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 1050, textAlign: 'center', fontFamily: FONT_ANTON, fontSize: 40, letterSpacing: 6, color}}>
      KICK {String(kick.n).padStart(2, '0')} · {kick.speaker === 'fighter1' ? 'MESSI' : 'RONALDO'}
    </div>
  );
};

// ---------- ticker of all kicks (ticks to done, G / S / P) ----------
export const KickPills: React.FC<{frame: number; kicks: Kick[]; activeIdx: number; f1Color: string; f2Color: string}> = ({frame, kicks, activeIdx, f1Color, f2Color}) => {
  const w = 46;
  const gap = 6;
  const total = kicks.length * w + (kicks.length - 1) * gap;
  const x0 = (1080 - total) / 2;
  return (
    <>
      {kicks.map((k, i) => {
        const done = frame >= k.impactF;
        const color = k.speaker === 'fighter1' ? f1Color : f2Color;
        const bg = !done ? 'rgba(255,255,255,0.08)' : k.outcome === 'goal' ? color : k.outcome === 'save' ? '#E2E8F0' : '#FF5A5A';
        const label = !done ? String(k.n) : k.outcome === 'goal' ? 'G' : k.outcome === 'save' ? 'S' : 'P';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x0 + i * (w + gap),
              top: 1852,
              width: w,
              height: 46,
              borderRadius: 10,
              boxSizing: 'border-box',
              background: bg,
              border: i === activeIdx ? '3px solid #FFFFFF' : '3px solid transparent',
              color: done ? '#05070F' : '#64748B',
              fontFamily: FONT_ANTON,
              fontSize: 24,
              textAlign: 'center',
              lineHeight: '40px',
            }}
          >
            {label}
          </div>
        );
      })}
    </>
  );
};

// ---------- GOAL / SAVE / POST stingers on each impact ----------
export const Stinger: React.FC<{frame: number; fps: number; kick: Kick; battle: BattleManifest}> = ({frame, fps, kick, battle}) => {
  const dt = frame - kick.impactF;
  if (dt < 0 || dt > 48) return null;
  const pop = spring({frame: dt, fps, config: {damping: 8, stiffness: 200, mass: 0.6}});
  const fade = interpolate(dt, [34, 48], [1, 0], clampX);
  const shooter = battle.fighters[kick.speaker];
  const keeper = battle.fighters[kick.keeper];
  const title = kick.outcome === 'goal' ? 'GOAL!' : kick.outcome === 'save' ? 'SAVE!' : 'POST!';
  const titleColor = kick.outcome === 'goal' ? shooter.color : kick.outcome === 'save' ? '#F1F5F9' : '#FF5A5A';
  const sub =
    kick.outcome === 'goal'
      ? `"${kick.punchWord}"`
      : kick.outcome === 'save'
        ? `${lastSurname(keeper)} DIVES`
        : 'CLANG! OFF THE UPRIGHT';
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 730, height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: fade, transform: `scale(${0.4 + 0.6 * pop})`}}>
      <div style={{position: 'relative', fontFamily: FONT_BANGERS, fontSize: 250, lineHeight: 0.95}}>
        <span style={{position: 'absolute', left: 10, top: 12, color: '#000000'}}>{title}</span>
        <span style={{position: 'relative', color: titleColor, WebkitTextStroke: '10px #05070F', paintOrder: 'stroke fill'} as React.CSSProperties}>{title}</span>
      </div>
      <div style={{fontFamily: FONT_ANTON, fontSize: 60, letterSpacing: 4, color: kick.outcome === 'goal' ? shooter.color : '#E2E8F0', textShadow: 'none', marginTop: 4}}>{sub}</div>
    </div>
  );
};

// ---------- intro + outro cards ----------
export const IntroCard: React.FC<{frame: number; fps: number; battle: BattleManifest}> = ({frame, fps, battle}) => {
  const end = Math.round(battle.intro.end * battle.fps);
  if (frame > end + 2) return null;
  const fade = interpolate(frame, [end - 18, end], [1, 0], clampX);
  const s = spring({frame, fps, config: {damping: 11, stiffness: 140}});
  const sub = interpolate(frame, [18, 40], [0, 1], clampX);
  const f1 = battle.fighters.fighter1;
  const f2 = battle.fighters.fighter2;
  return (
    <AbsoluteFill style={{opacity: fade, background: 'rgba(2,4,10,0.55)', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
      <div style={{fontFamily: FONT_BANGERS, fontSize: 250, lineHeight: 0.88, color: '#FFFFFF', textAlign: 'center', transform: `scale(${0.5 + 0.5 * s})`, WebkitTextStroke: '12px #05070F', paintOrder: 'stroke fill'} as React.CSSProperties}>
        <div>THE SPOT</div>
        <div>KICK</div>
      </div>
      <div style={{opacity: sub, marginTop: 36, fontFamily: FONT_ANTON, fontSize: 56, letterSpacing: 6}}>
        <span style={{color: f1.color}}>MESSI</span> <span style={{color: '#FFFFFF'}}>VS</span> <span style={{color: f2.color}}>RONALDO</span>
      </div>
      <div style={{opacity: sub, marginTop: 14, fontFamily: FONT_ANTON, fontSize: 30, letterSpacing: 6, color: '#94A3B8'}}>PENALTY SHOOTOUT</div>
    </AbsoluteFill>
  );
};

export const ReadyBanner: React.FC<{frame: number; kicksCount: number; firstStrikeF: number}> = ({frame, kicksCount, firstStrikeF}) => {
  const op = interpolate(frame, [firstStrikeF - 40, firstStrikeF - 22, firstStrikeF - 4, firstStrikeF + 2], [0, 1, 1, 0], clampX);
  if (op <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', opacity: op}}>
      <div style={{fontFamily: FONT_BANGERS, fontSize: 150, color: '#FFFFFF', WebkitTextStroke: '8px #05070F', paintOrder: 'stroke fill'} as React.CSSProperties}>ON THE SPOT</div>
      <div style={{fontFamily: FONT_ANTON, fontSize: 40, letterSpacing: 8, color: '#CBD5E1'}}>{kicksCount} KICKS · NO BACKING OUT</div>
    </div>
  );
};

export const OutroCard: React.FC<{frame: number; fps: number; outroF: number; battle: BattleManifest; kicks: Kick[]}> = ({frame, fps, outroF, battle, kicks}) => {
  if (frame < outroF) return null;
  const local = frame - outroF;
  const bg = interpolate(local, [0, 20], [0, 0.9], clampX);
  const title = spring({frame: local - 4, fps, config: {damping: 10, stiffness: 160}});
  const score = spring({frame: local - 26, fps, config: {damping: 9, stiffness: 150}});
  const tag = interpolate(local, [46, 62], [0, 1], clampX);
  const f1 = battle.fighters.fighter1;
  const f2 = battle.fighters.fighter2;
  const g1 = countsAt(kicks, Infinity, 'fighter1').goals;
  const g2 = countsAt(kicks, Infinity, 'fighter2').goals;
  return (
    <AbsoluteFill style={{background: `rgba(2,4,10,${bg})`, alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
      <div style={{fontFamily: FONT_BANGERS, fontSize: 200, color: '#FFFFFF', WebkitTextStroke: '10px #05070F', paintOrder: 'stroke fill', transform: `scale(${0.6 + 0.4 * title})`, opacity: title} as React.CSSProperties}>FULL TIME</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 36, marginTop: 30, transform: `scale(${0.7 + 0.3 * score})`, opacity: score, fontFamily: FONT_BANGERS, lineHeight: 0.9}}>
        <span style={{fontSize: 210, color: f1.color}}>{g1}</span>
        <span style={{fontSize: 110, color: '#FFFFFF'}}>–</span>
        <span style={{fontSize: 210, color: f2.color}}>{g2}</span>
      </div>
      <div style={{marginTop: 18, fontFamily: FONT_ANTON, fontSize: 40, letterSpacing: 6, color: '#E2E8F0', opacity: score}}>
        <span style={{color: f1.color}}>{f1.name}</span> &nbsp;vs&nbsp; <span style={{color: f2.color}}>{f2.name}</span>
      </div>
      <div style={{marginTop: 46, fontFamily: FONT_BANGERS, fontSize: 120, color: '#FFFFFF', opacity: tag, WebkitTextStroke: '8px #05070F', paintOrder: 'stroke fill'} as React.CSSProperties}>WHO WON?</div>
      <div style={{marginTop: 14, fontFamily: FONT_ANTON, fontSize: 52, letterSpacing: 6, color: '#F5C542', opacity: tag}}>{battle.hashtag}</div>
    </AbsoluteFill>
  );
};
