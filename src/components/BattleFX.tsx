import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {ExtrudedText} from './ExtrudedText';

// Pi-5 rule: no blur / drop-shadow / filters. Everything is shapes, gradients and transforms.

export interface FighterCard {
  name: string;
  badge: string;
  color: string;
  img: string;
  emblem?: string;
}

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const W = 1080;
const H = 1920;
const ASPECT = 760 / 600;

// deterministic pseudo-random
const rnd = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const bolt = (x1: number, y1: number, x2: number, y2: number, seg: number, amp: number, seed: number) => {
  const pts: string[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const nx = -(y2 - y1);
    const ny = x2 - x1;
    const len = Math.hypot(nx, ny) || 1;
    const off = i === 0 || i === seg ? 0 : (rnd(seed + i) - 0.5) * 2 * amp;
    pts.push((x1 + (x2 - x1) * t + (nx / len) * off).toFixed(1) + ',' + (y1 + (y2 - y1) * t + (ny / len) * off).toFixed(1));
  }
  return pts.join(' ');
};

/* ---------- Split-screen face-off used by intro + outro ---------- */
const SplitPanels: React.FC<{
  f1: FighterCard; f2: FighterCard; local: number; exitAt?: number; frame: number; fps: number; showNames: boolean;
}> = ({f1, f2, local, exitAt, frame, fps, showNames}) => {
  const in1 = spring({frame: local * fps, fps, config: {damping: 14, stiffness: 120}});
  const in2 = spring({frame: (local - 0.18) * fps, fps, config: {damping: 14, stiffness: 120}});
  const out = exitAt !== undefined ? interpolate(local, [exitAt, exitAt + 0.4], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)}) : 0;
  const x1 = (1 - in1) * -W - out * W;
  const x2 = (1 - in2) * W + out * W;
  const drift = local * 14; // slow Ken-Burns push
  const name1 = spring({frame: (local - 0.75) * fps, fps, config: {damping: 11}});
  const name2 = spring({frame: (local - 0.95) * fps, fps, config: {damping: 11}});
  const portraitW = 640;
  return (
    <>
      {/* Fighter 1: top wedge */}
      <div style={{position: 'absolute', inset: 0, transform: 'translateX(' + x1 + 'px)', clipPath: 'polygon(0 0, 100% 0, 100% 44%, 0 57%)'}}>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(135deg, ' + f1.color + ' 0%, #120509 70%)'}} />
        <Stripes color="#000" opacity={0.18} frame={frame} dir={1} />
        <img src={f1.img} style={{position: 'absolute', width: portraitW, height: portraitW * ASPECT, left: -40 - drift, top: 150, transform: 'scale(' + (1 + local * 0.02) + ')'}} />
        {showNames && (
          <div style={{position: 'absolute', right: 50, top: 300, textAlign: 'right', transform: 'translateX(' + (1 - name1) * 500 + 'px)'}}>
            <div style={{fontFamily: 'Anton, sans-serif', fontSize: 34, color: '#fff', letterSpacing: 6, opacity: 0.9}}>{f1.badge}</div>
            {f1.name.split(' ').map((w, i) => (
              <ExtrudedText key={i} fontFamily="Bangers, sans-serif" fontSize={118} color="#FFFFFF" stroke={5} offset={8} style={{display: 'block', textAlign: 'right'}}>{w}</ExtrudedText>
            ))}
          </div>
        )}
      </div>
      {/* Fighter 2: bottom wedge */}
      <div style={{position: 'absolute', inset: 0, transform: 'translateX(' + x2 + 'px)', clipPath: 'polygon(0 57%, 100% 44%, 100% 100%, 0 100%)'}}>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(315deg, ' + f2.color + ' 0%, #050912 70%)'}} />
        <Stripes color="#000" opacity={0.18} frame={frame} dir={-1} />
        <img src={f2.img} style={{position: 'absolute', width: portraitW, height: portraitW * ASPECT, right: -40 - drift, top: 1055, transform: 'scale(' + (1 + local * 0.02) + ')'}} />
        {showNames && (
          <div style={{position: 'absolute', left: 50, top: 1250, textAlign: 'left', transform: 'translateX(' + (name2 - 1) * 500 + 'px)'}}>
            <div style={{fontFamily: 'Anton, sans-serif', fontSize: 34, color: '#fff', letterSpacing: 6, opacity: 0.9}}>{f2.badge}</div>
            {f2.name.split(' ').map((w, i) => (
              <ExtrudedText key={i} fontFamily="Bangers, sans-serif" fontSize={118} color="#FFFFFF" stroke={5} offset={8} style={{display: 'block'}}>{w}</ExtrudedText>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const Stripes: React.FC<{color: string; opacity: number; frame: number; dir: number}> = ({color, opacity, frame, dir}) => (
  <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
    {Array.from({length: 22}).map((_, i) => {
      const x = ((i * 110 + frame * 6 * dir) % 2420) - 600;
      return <polygon key={i} points={x + ',0 ' + (x + 40) + ',0 ' + (x - 560) + ',' + H + ' ' + (x - 600) + ',' + H} fill={color} opacity={opacity} />;
    })}
  </svg>
);

/* Jagged lightning divider across the diagonal split */
const Divider: React.FC<{local: number; frame: number; startAt: number}> = ({local, frame, startAt}) => {
  const p = interpolate(local, [startAt, startAt + 0.18], [0, 1], clamp);
  if (p <= 0) return null;
  const y1 = H * 0.57;
  const y2 = H * 0.44;
  const seed = Math.floor(frame / 2);
  const main = bolt(0, y1, W * p, y1 + (y2 - y1) * p, 16, 26, seed);
  const alt = bolt(0, y1, W * p, y1 + (y2 - y1) * p, 12, 40, seed + 50);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <polyline points={alt} fill="none" stroke="#FFFFFF" strokeWidth={6} opacity={0.35} strokeLinejoin="bevel" />
      <polyline points={main} fill="none" stroke="#000" strokeWidth={26} strokeLinejoin="bevel" />
      <polyline points={main} fill="none" stroke="#FFF7AE" strokeWidth={12} strokeLinejoin="bevel" />
    </svg>
  );
};

const VsStamp: React.FC<{local: number; fps: number; at: number}> = ({local, fps, at}) => {
  const s = spring({frame: (local - at) * fps, fps, config: {damping: 9, stiffness: 180}});
  if (local < at) return null;
  const scale = interpolate(s, [0, 1], [3.2, 1]);
  const rot = interpolate(s, [0, 1], [-35, -8]);
  return (
    <div style={{position: 'absolute', left: '50%', top: H * 0.505, transform: 'translate(-50%, -50%) scale(' + scale + ') rotate(' + rot + 'deg)', opacity: Math.min(1, s * 2)}}>
      <svg width={420} height={420} style={{position: 'absolute', left: -60, top: -110}} viewBox="-210 -210 420 420">
        <polygon points={Array.from({length: 24}).map((_, i) => {
          const r = i % 2 === 0 ? 205 : 130;
          const a = (i / 24) * Math.PI * 2;
          return (Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1);
        }).join(' ')} fill="#FFD166" stroke="#000" strokeWidth={10} />
      </svg>
      <ExtrudedText fontFamily="Bangers, sans-serif" fontSize={210} color="#E11D48" stroke={7} offset={12}>VS</ExtrudedText>
    </div>
  );
};

const Flash: React.FC<{local: number; at: number; dur?: number; max?: number}> = ({local, at, dur = 0.22, max = 0.85}) => {
  const o = interpolate(local, [at, at + 0.02, at + dur], [0, max, 0], clamp);
  return o > 0 ? <div style={{position: 'absolute', inset: 0, background: '#FFFFFF', opacity: o}} /> : null;
};

/* ---------------- INTRO ---------------- */
export const EpicIntro: React.FC<{time: number; end: number; f1: FighterCard; f2: FighterCard; title: string; hashtag: string}> = ({time, end, f1, f2, title, hashtag}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (time >= end) return null;
  const titleIn = spring({frame: (time - 1.45) * fps, fps, config: {damping: 12}});
  const exitAt = end - 0.42;
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 60, overflow: 'hidden'}}>
      <SplitPanels f1={f1} f2={f2} local={time} exitAt={exitAt} frame={frame} fps={fps} showNames />
      {time < exitAt && <Divider local={time} frame={frame} startAt={0.42} />}
      {time < exitAt && <VsStamp local={time} fps={fps} at={0.62} />}
      {time < exitAt && time > 1.45 && (
        <div style={{position: 'absolute', top: 60, width: '100%', textAlign: 'center', transform: 'translateY(' + (1 - titleIn) * -260 + 'px)'}}>
          <div style={{display: 'inline-block', background: '#000', padding: '8px 30px', transform: 'skewX(-10deg)', border: '4px solid #FFD166'}}>
            <span style={{fontFamily: 'Anton, sans-serif', fontSize: 40, color: '#FFD166', letterSpacing: 8}}>{hashtag} • {title}</span>
          </div>
        </div>
      )}
      <Flash local={time} at={0.62} />
      <Flash local={time} at={exitAt} dur={0.3} max={0.6} />
    </div>
  );
};

/* ---------------- ROUND / SPEAKER TRANSITION ---------------- */
export const RoundCard: React.FC<{time: number; at: number; round: number; name: string; color: string; fromLeft: boolean}> = ({time, at, round, name, color, fromLeft}) => {
  const t0 = at - 0.3;
  const t1 = at + 0.55;
  if (time < t0 || time > t1) return null;
  const p = interpolate(time, [t0, t1], [0, 1], clamp);
  // ease: fast in, hang in middle, fast out
  const e = p < 0.35 ? Easing.out(Easing.cubic)(p / 0.35) * 0.5 : p < 0.7 ? 0.5 : 0.5 + Easing.in(Easing.cubic)((p - 0.7) / 0.3) * 0.5;
  const dir = fromLeft ? 1 : -1;
  const x = interpolate(e, [0, 1], [-1700, 1700]) * dir;
  const textS = interpolate(p, [0.25, 0.4], [1.6, 1], clamp);
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 70, pointerEvents: 'none', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: '50%', top: '50%', width: 1500, height: 520, marginLeft: -750, marginTop: -260, transform: 'translateX(' + x + 'px) rotate(-12deg)'}}>
        <div style={{position: 'absolute', inset: 0, background: '#000', transform: 'translate(' + (-26 * dir) + 'px, 18px)'}} />
        <div style={{position: 'absolute', inset: 0, background: color, borderTop: '10px solid #fff', borderBottom: '10px solid #fff'}} />
        <svg width={1500} height={520} style={{position: 'absolute', inset: 0}}>
          {Array.from({length: 18}).map((_, i) => (
            <rect key={i} x={i * 90} y={0} width={18} height={520} fill="#000" opacity={0.12} transform={'skewX(-20)'} />
          ))}
        </svg>
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'scale(' + textS + ')'}}>
          <div style={{fontFamily: 'Anton, sans-serif', fontSize: 52, letterSpacing: 18, color: '#000'}}>ROUND {round}</div>
          <ExtrudedText fontFamily="Bangers, sans-serif" fontSize={150} color="#FFFFFF" stroke={6} offset={10}>{name}</ExtrudedText>
        </div>
      </div>
    </div>
  );
};

/* ---------------- PUNCHLINE STAMP ---------------- */
export const PunchStamp: React.FC<{time: number; at: number; word: string; color: string; seed: number}> = ({time, at, word, color, seed}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = time - at;
  if (local < 0 || local > 0.65) return null;
  const s = spring({frame: local * fps, fps, config: {damping: 8, stiffness: 220}});
  const scale = interpolate(s, [0, 1], [2.6, 1]);
  const fade = interpolate(local, [0.42, 0.65], [1, 0], clamp);
  const rot = (rnd(seed) - 0.5) * 18 - 6;
  const burst = interpolate(local, [0, 0.25], [0.4, 1.15], clamp);
  const fontSize = word.length > 9 ? 120 : word.length > 6 ? 150 : 190;
  const cy = 1310;
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 55, pointerEvents: 'none', opacity: fade}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <g transform={'translate(540 ' + cy + ') scale(' + burst + ') rotate(' + seed * 17 + ')'}>
          <polygon points={Array.from({length: 32}).map((_, i) => {
            const r = i % 2 === 0 ? 275 : 155 + rnd(seed + i) * 45;
            const a = (i / 32) * Math.PI * 2;
            return (Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1);
          }).join(' ')} fill={color} opacity={0.85} stroke="#000" strokeWidth={10} />
          {/* halftone dots */}
          {Array.from({length: 40}).map((_, i) => {
            const a = rnd(seed + i * 3) * Math.PI * 2;
            const r = 80 + rnd(seed + i * 7) * 165;
            return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={6 + rnd(i) * 10} fill="#000" opacity={0.35} />;
          })}
        </g>
        {local < 0.35 && [0, 1, 2, 3].map((k) => {
          const a = (k / 4) * Math.PI * 2 + seed;
          return <polyline key={k} points={bolt(540 + Math.cos(a) * 120, cy + Math.sin(a) * 120, 540 + Math.cos(a) * 560, cy + Math.sin(a) * 560, 9, 30, frame + k * 31)} fill="none" stroke="#FFFFFF" strokeWidth={7} />;
        })}
      </svg>
      <div style={{position: 'absolute', left: '50%', top: cy, transform: 'translate(-50%, -50%) scale(' + scale + ') rotate(' + rot + 'deg)'}}>
        <ExtrudedText fontFamily="Bangers, sans-serif" fontSize={fontSize} color="#FFFFFF" stroke={8} offset={12}>{word}</ExtrudedText>
      </div>
    </div>
  );
};

/* ---------------- FILM LOOK: grain, scanlines, vignette, letterbox ---------------- */
export const FilmLook: React.FC<{beatKick: number}> = ({beatKick}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 90, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,' + (0.55 - beatKick * 0.12) + ') 100%)'}} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        {Array.from({length: 48}).map((_, i) => (
          <rect key={i} x={0} y={(i * 40 + (frame * 3) % 40)} width={W} height={2} fill="#000" opacity={0.12} />
        ))}
        {Array.from({length: 26}).map((_, i) => (
          <circle key={'d' + i} cx={rnd(frame * 1.3 + i) * W} cy={rnd(frame * 2.1 + i * 5) * H} r={1 + rnd(frame + i * 9) * 2.4} fill="#FFFFFF" opacity={0.22} />
        ))}
        {rnd(Math.floor(frame / 3)) > 0.82 && (
          <rect x={rnd(frame) * W} y={0} width={2} height={H} fill="#FFFFFF" opacity={0.12} />
        )}
      </svg>
    </div>
  );
};

/* ---------------- OUTRO ---------------- */
export const EpicOutro: React.FC<{time: number; start: number; end: number; f1: FighterCard; f2: FighterCard; hashtag: string}> = ({time, start, end, f1, f2, hashtag}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (time < start) return null;
  const local = time - start;
  const q = spring({frame: (local - 0.75) * fps, fps, config: {damping: 9, stiffness: 160}});
  const qScale = interpolate(q, [0, 1], [3, 1]);
  const sub = spring({frame: (local - 1.3) * fps, fps, config: {damping: 12}});
  const fadeOut = interpolate(time, [end - 0.6, end], [1, 0], clamp);
  const pulse = 1 + Math.sin(local * 7) * 0.025;
  return (
    <div style={{position: 'absolute', inset: 0, zIndex: 60, overflow: 'hidden', opacity: fadeOut, background: '#000'}}>
      <SplitPanels f1={f1} f2={f2} local={local} frame={frame} fps={fps} showNames={false} />
      <Divider local={local} frame={frame} startAt={0.35} />
      {local > 0.75 && (
        <div style={{position: 'absolute', left: '50%', top: H * 0.5, transform: 'translate(-50%, -50%) scale(' + qScale * pulse + ') rotate(-6deg)'}}>
          <div style={{background: '#000', padding: '6px 40px 18px', border: '8px solid #FFD166', transform: 'skewX(-8deg)'}}>
            <ExtrudedText fontFamily="Bangers, sans-serif" fontSize={170} color="#FFD166" stroke={6} offset={10}>WHO WON?</ExtrudedText>
          </div>
        </div>
      )}
      {local > 1.3 && (
        <div style={{position: 'absolute', width: '100%', top: H * 0.5 + 135, textAlign: 'center', transform: 'translateY(' + (1 - sub) * 200 + 'px)', opacity: sub}}>
          <span style={{fontFamily: 'Anton, sans-serif', fontSize: 44, color: '#FFFFFF', letterSpacing: 12, background: '#000', padding: '6px 22px'}}>YOU DECIDE {hashtag}</span>
        </div>
      )}
      <Flash local={local} at={0.75} max={0.7} />
    </div>
  );
};

