import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFonts} from '../../fonts';
import type {BattleManifest, CaptionLine, Fighter} from '../../types';
import battleManifest from '../../../public/battle.json' with {type: 'json'};

const battle = battleManifest as BattleManifest;
loadFonts();

const W = 1080;
const H = 1920;
const UI = 'Anton, Impact, sans-serif';
const FUN = 'Bangers, Impact, sans-serif';
const INK = '#07090C';

const K = battle.fighters.fighter1; // Khan, left, arrows
const J = battle.fighters.fighter2; // Jensen, right, GPUs
const fighterOf = (s: string): Fighter => (s === 'fighter1' ? K : J);
const lastName = (f: Fighter) => f.name.split(' ')[1] || f.name;

const c01 = (v: number) => Math.max(0, Math.min(1, v));
const eo = (v: number) => 1 - Math.pow(1 - c01(v), 3);
const eob = (v: number) => {
  const x = c01(v);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const smooth = (v: number) => {
  const x = c01(v);
  return x * x * (3 - 2 * x);
};
const rgb = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const mix = (a: string, b: string, p: number) => {
  const x = rgb(a);
  const y = rgb(b);
  return `rgb(${Math.round(lerp(x[0], y[0], p))},${Math.round(lerp(x[1], y[1], p))},${Math.round(lerp(x[2], y[2], p))})`;
};

type Tok = {text: string; start: number; end: number};
type Line = CaptionLine & {toks: Tok[]; idx: number};
const lines: Line[] = battle.captions
  .filter((c) => c.speaker === 'fighter1' || c.speaker === 'fighter2')
  .map((c, idx) => {
    const toks: Tok[] = [];
    let prefix = '';
    c.words.forEach((w) => {
      if (/^["“”']+$/.test(w.text)) {
        prefix += w.text;
        return;
      }
      toks.push({text: prefix + w.text, start: w.start, end: w.end});
      prefix = '';
    });
    return {...c, toks, idx};
  });

const firstStart = lines[0].start;
const lastEnd = lines[lines.length - 1].end;
const outroStart = Math.max(battle.outro.start, lastEnd + 0.2);
const stageIn = firstStart - 3.0;
const beats = battle.audio.beats;
const mouthStr = battle.audio.mouth || '';

const kickAt = (t: number) => {
  let b = -1;
  for (let i = 0; i < beats.length; i++) {
    if (beats[i] <= t) b = beats[i];
    else break;
  }
  return b < 0 ? 0 : Math.exp(-(t - b) * 8);
};

const SWITCHES: {t: number; speaker: 'fighter1' | 'fighter2'; round: number}[] = [];
lines.forEach((l, i) => {
  if (i === 0 || lines[i - 1].speaker !== l.speaker) {
    SWITCHES.push({t: i === 0 ? stageIn : l.start, speaker: l.speaker as 'fighter1' | 'fighter2', round: SWITCHES.length + 1});
  }
});
const switchAt = (t: number) => {
  let cur = SWITCHES[0];
  for (const s of SWITCHES) if (t >= s.t) cur = s;
  return cur;
};

const EV = lines
  .filter((l) => l.punchline)
  .map((l, i) => ({t: l.end - 0.15, speaker: l.speaker as 'fighter1' | 'fighter2', dir: l.speaker === 'fighter1' ? 1 : -1, i}));
const WORDS_K = ['CONQUERED!', 'KNEEL!', 'HORDE MODE', 'RIDERS OUT'];
const WORDS_J = ['BACKORDERED!', 'SOLD OUT!', 'CUDA CORES!', 'BUY MORE!'];

const frontier = (t: number) => {
  let f = 0.5;
  for (const e of EV) {
    const dt = t - e.t;
    if (dt > 0) f += (e.dir > 0 ? 0.075 : 0.085) * e.dir * (1 - Math.exp(-dt * 5));
  }
  return Math.max(0.12, Math.min(0.88, f + 0.004 * Math.sin(t * 2.3)));
};

// ---------- hex map ----------
const HS = 64; // hex radius
const HW = Math.sqrt(3) * HS;
const COLS = Math.ceil(W / HW) + 1;
const ROWS = Math.ceil(H / (HS * 1.5)) + 1;
const hexPts = (r: number) =>
  [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
    })
    .join(' ');
const HEX_FULL = hexPts(HS - 3);
const HEX_BIG = (r: number) => hexPts(r);
type Tile = {cx: number; cy: number; th: number; r: number; c: number};
const TILES: Tile[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const cx = c * HW + (r % 2 ? HW / 2 : 0);
    const cy = r * HS * 1.5;
    TILES.push({cx, cy, r, c, th: cx / W + 0.05 * Math.sin(r * 1.7 + c * 0.9) + 0.035 * Math.sin(r * 0.55 + 1)});
  }
}
const K_FILL = '#4B2B12';
const K_EDGE = '#E0A526';
const J_FILL = '#0C2A10';
const J_EDGE = '#76B900';

const MapLayer: React.FC<{t: number; frame: number; kick: number; spk: 'fighter1' | 'fighter2'}> = ({t, frame, kick, spk}) => {
  const f = frontier(t);
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      {TILES.map((tl, i) => {
        const m = smooth((f - tl.th + 0.03) / 0.06); // 1 = Khan
        const flipping = m > 0.02 && m < 0.98;
        const sx = flipping ? Math.max(0.06, Math.abs(1 - 2 * m)) : 1;
        const isK = m >= 0.5;
        const front = flipping;
        const fill = isK ? K_FILL : J_FILL;
        const edge = front ? '#FFFFFF' : isK ? K_EDGE : J_EDGE;
        const boost = (isK ? spk === 'fighter1' : spk === 'fighter2') ? 0.28 + 0.4 * kick : 0.18;
        const wob = Math.sin(frame * 0.05 + i) * 0.04;
        return (
          <g key={i} transform={`translate(${tl.cx} ${tl.cy}) scale(${sx} 1)`}>
            <polygon points={HEX_FULL} fill={fill} stroke={edge} strokeWidth={front ? 5 : 3} strokeOpacity={front ? 0.95 : boost + wob} />
            {sx > 0.5 && !front ? (
              isK ? (
                <path d="M-14 8 L0 -10 L14 8 M-14 20 L0 2 L14 20" fill="none" stroke={K_EDGE} strokeOpacity={0.16} strokeWidth={4} strokeLinecap="round" />
              ) : (
                <g fill="none" stroke={J_EDGE} strokeOpacity={0.2} strokeWidth={3}>
                  <rect x={-12} y={-12} width={24} height={24} rx={3} />
                  <path d="M-20 -6h8M-20 6h8M12 -6h8M12 6h8M-6 -20v8M6 -20v8M-6 12v8M6 12v8" />
                </g>
              )
            ) : null}
          </g>
        );
      })}
      {/* frontier ember line */}
      <polyline
        points={TILES.filter((tl) => tl.c === 3)
          .map((tl) => `${f * W + Math.sin(tl.r * 1.3 + frame * 0.1) * 6},${tl.cy}`)
          .join(' ')}
        fill="none"
        stroke="#fff"
        strokeOpacity={0.08 + 0.2 * kick}
        strokeWidth={6}
      />
    </svg>
  );
};

// ---------- projectiles ----------
const Volley: React.FC<{t: number}> = ({t}) => {
  const out: React.ReactNode[] = [];
  EV.forEach((e) => {
    const dt = t - e.t;
    if (dt < -0.05 || dt > 1.6) return;
    const fEnd = frontier(e.t + 0.9);
    const isK = e.speaker === 'fighter1';
    const n = isK ? 16 : 12;
    for (let i = 0; i < n; i++) {
      const delay = i * 0.028;
      const u = (dt - delay) / 0.55;
      if (u < 0 || u > 1.5) continue;
      const uu = c01(u);
      const yt = 260 + ((i * 97) % 640);
      const xt = fEnd * W + ((i % 5) - 2) * 30 + (isK ? -24 : 24);
      if (isK) {
        const x0 = 150 + (i % 4) * 26;
        const y0 = 1180 + (i % 3) * 20;
        const arc = 520;
        const x = lerp(x0, xt, uu);
        const y = lerp(y0, yt, uu) - arc * 4 * uu * (1 - uu);
        const dx = xt - x0;
        const dy = yt - y0 - arc * 4 * (1 - 2 * uu);
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        const op = u > 1 ? Math.max(0, 1 - (u - 1) * 2) : 1;
        out.push(
          <g key={`${e.i}-${i}`} transform={`translate(${x} ${y}) rotate(${ang})`} opacity={op}>
            <line x1={-62} y1={0} x2={0} y2={0} stroke="#F4E4B5" strokeWidth={6} strokeLinecap="round" />
            <polygon points="12,0 -8,-11 -8,11" fill="#FFFFFF" stroke={INK} strokeWidth={2} />
            <path d="M-62 0 l-12 -10 M-62 0 l-12 10 M-50 0 l-12 -10 M-50 0 l-12 10" stroke={K_EDGE} strokeWidth={5} strokeLinecap="round" />
          </g>,
        );
      } else {
        const y0 = 1130 + (i % 3) * 18;
        const x0 = W - 170 - (i % 4) * 22;
        const arc = 380;
        const x = lerp(x0, xt, uu);
        const y = lerp(y0, yt, uu) - arc * 4 * uu * (1 - uu);
        const op = u > 1 ? Math.max(0, 1 - (u - 1) * 2) : 1;
        const tail = 130;
        out.push(
          <g key={`${e.i}-${i}`} opacity={op}>
            <line x1={x + tail} y1={y + (arc * 4 * (1 - 2 * uu) * 0.0)} x2={x} y2={y} stroke={J_EDGE} strokeWidth={8} strokeLinecap="square" />
            <rect x={x - 14} y={y - 14} width={28} height={28} fill="#E8FFB0" stroke={INK} strokeWidth={4} />
            <rect x={x + 30} y={y - 4} width={14} height={8} fill="#E8FFB0" opacity={0.7} />
            <rect x={x + 70} y={y - 4} width={10} height={8} fill="#E8FFB0" opacity={0.5} />
          </g>,
        );
      }
    }
    // impact rings
    const imp = dt - 0.6;
    if (imp > 0 && imp < 0.7) {
      const col = isK ? K_EDGE : J_EDGE;
      for (let r = 0; r < 3; r++) {
        const q = c01((imp - r * 0.08) / 0.45);
        if (q <= 0 || q >= 1) continue;
        out.push(
          <g key={`ring-${e.i}-${r}`} transform={`translate(${fEnd * W} 620)`} opacity={1 - q}>
            <polygon points={HEX_BIG(60 + q * 520)} fill="none" stroke={col} strokeWidth={14 - r * 3} />
          </g>,
        );
      }
    }
  });
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
      {out}
    </svg>
  );
};

const Badge: React.FC<{t: number}> = ({t}) => {
  const e = EV.find((x) => t >= x.t + 0.45 && t < x.t + 1.5);
  if (!e) return null;
  const f = fighterOf(e.speaker);
  const dt = t - (e.t + 0.45);
  const sc = dt < 0.25 ? lerp(2.4, 1, eob(dt / 0.25)) : dt > 0.8 ? lerp(1, 0.01, c01((dt - 0.8) / 0.25)) : 1;
  const text = (e.speaker === 'fighter1' ? WORDS_K : WORDS_J)[Math.floor(e.i / 2) % 4];
  const cx = Math.max(300, Math.min(780, frontier(e.t + 0.9) * W));
  return (
    <div style={{position: 'absolute', left: cx - 330, top: 260, width: 660, height: 660, transform: `scale(${sc}) rotate(${e.dir * -5}deg)`}}>
      <svg width={660} height={660} viewBox="-330 -330 660 660" style={{position: 'absolute', left: 0, top: 0}}>
        <polygon points={HEX_BIG(300)} fill={INK} stroke={f.color} strokeWidth={16} />
        <polygon points={HEX_BIG(262)} fill={f.color} stroke={INK} strokeWidth={8} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 660,
          height: 660,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: FUN,
          fontSize: text.length > 9 ? 112 : 150,
          lineHeight: 0.95,
          color: '#fff',
          WebkitTextStroke: '8px #000',
          paintOrder: 'stroke fill',
          letterSpacing: 2,
          padding: '0 80px',
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ---------- portraits ----------
const Portrait: React.FC<{f: Fighter; side: 0 | 1; a: number; mouth: number; kick: number; frame: number; pAge: number}> = ({f, side, a, mouth, kick, frame, pAge}) => {
  const w = 640;
  const h = Math.round((w * 760) / 600);
  const pop = pAge >= 0 && pAge < 0.6 ? 0.08 * Math.exp(-pAge * 7) : 0;
  const sc = 0.86 + 0.14 * a + pop + 0.02 * kick * a;
  const ty = lerp(30, -24, a) + Math.sin(frame * 0.33) * 4 * a;
  const src = f.mouthSvgs ? f.mouthSvgs[a > 0.7 ? mouth : 0] : f.svg || '';
  return (
    <div
      style={{
        position: 'absolute',
        left: side === 0 ? -80 : W - w + 80,
        top: 1160,
        width: w,
        height: h,
        transformOrigin: '50% 100%',
        transform: `translateY(${ty}px) scale(${sc}) rotate(${(side === 0 ? 1 : -1) * 1.5 * a}deg)`,
      }}
    >
      <Img src={staticFile(src)} style={{width: w, height: h, filter: `brightness(${0.42 + 0.58 * a})`}} />
    </div>
  );
};

// ---------- decree banner ----------
const TORN = (() => {
  const top: string[] = [];
  const bot: string[] = [];
  for (let i = 0; i <= 24; i++) {
    top.push(`${(i / 24) * 100}% ${i % 2 ? 0 : 5}%`);
    bot.push(`${100 - (i / 24) * 100}% ${i % 2 ? 100 : 95}%`);
  }
  return `polygon(${top.join(',')},${bot.join(',')})`;
})();

const Banner: React.FC<{t: number}> = ({t}) => {
  let line: Line | null = null;
  for (const l of lines) if (t >= l.start - 0.15) line = l;
  if (!line) return null;
  const isK = line.speaker === 'fighter1';
  const f = fighterOf(line.speaker);
  const inP = eob((t - (line.start - 0.15)) / 0.28);
  const body = (
    <div style={{padding: isK ? '46px 54px 50px' : '42px 52px 46px', fontFamily: UI, fontSize: 62, lineHeight: 1.17, letterSpacing: 1}}>
      {line.toks.map((w, i) => {
        const spoken = t >= w.start - 0.02;
        const active = t >= w.start - 0.02 && t < w.end + 0.1;
        const s = active ? 1 + 0.08 * Math.max(0, 1 - (t - w.start) / 0.2) : 1;
        const col = isK ? (active ? '#B3261E' : '#2A1608') : active ? '#FFFFFF' : J_EDGE;
        return (
          <span key={i} style={{display: 'inline-block', marginRight: 16, opacity: spoken ? 1 : 0.28, color: col, transform: `scale(${s})`, transformOrigin: '50% 80%'}}>
            {w.text}
          </span>
        );
      })}
    </div>
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        top: 905,
        width: 1000,
        transform: `translateX(${(isK ? -1 : 1) * lerp(260, 0, inP)}px) rotate(${isK ? -1.4 : 1.4}deg)`,
        opacity: c01(inP * 2),
      }}
    >
      {isK ? (
        <div style={{position: 'relative'}}>
          <div style={{position: 'absolute', inset: 0, background: '#5A3416', clipPath: TORN, transform: 'translate(8px,10px)'}} />
          <div style={{position: 'relative', background: '#EBD6A6', clipPath: TORN}}>
            <div style={{position: 'absolute', left: 54, top: 12, fontFamily: UI, fontSize: 26, letterSpacing: 6, color: '#8A5A20'}}>DECREE OF THE GREAT KHAN</div>
            {body}
          </div>
        </div>
      ) : (
        <div style={{position: 'relative', background: '#050805', border: `6px solid ${J_EDGE}`, borderRadius: 10}}>
          <div style={{position: 'absolute', left: 52, top: 10, fontFamily: 'monospace', fontSize: 26, letterSpacing: 3, color: J_EDGE}}>{'>_ HUANG@DGX ~ $ sudo conquer --world'}</div>
          <div style={{position: 'absolute', right: 14, top: 10, width: 14, height: 14, background: J_EDGE, opacity: Math.floor(t * 4) % 2}} />
          {body}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          [isK ? 'right' : 'left']: 30,
          top: -30,
          background: f.color,
          border: `5px solid ${INK}`,
          borderRadius: 10,
          color: INK,
          fontFamily: UI,
          fontSize: 34,
          letterSpacing: 4,
          padding: '4px 22px',
        }}
      >
        {f.name}
      </div>
    </div>
  );
};

// ---------- HUD ----------
const Hud: React.FC<{t: number; kick: number}> = ({t, kick}) => {
  const f = frontier(t);
  const km = ((f / 0.5) * 24).toFixed(1);
  const ef = (((1 - f) / 0.5) * 4).toFixed(1);
  return (
    <>
      <div style={{position: 'absolute', left: 36, right: 36, top: 36, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, background: `${INK}DD`, border: `4px solid ${K_EDGE}`, borderRadius: 14, padding: '8px 18px 8px 10px'}}>
          <Img src={staticFile(K.emblemSvg || '')} style={{width: 62, height: 62}} />
          <div>
            <div style={{fontFamily: UI, fontSize: 40, color: K_EDGE, letterSpacing: 2}}>{K.name}</div>
            <div style={{fontFamily: UI, fontSize: 26, color: '#fff', letterSpacing: 3}}>{`EMPIRE ${km}M KM²`}</div>
          </div>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 14, background: `${INK}DD`, border: `4px solid ${J_EDGE}`, borderRadius: 14, padding: '8px 10px 8px 18px', flexDirection: 'row-reverse'}}>
          <Img src={staticFile(J.emblemSvg || '')} style={{width: 62, height: 62}} />
          <div style={{textAlign: 'right'}}>
            <div style={{fontFamily: UI, fontSize: 40, color: J_EDGE, letterSpacing: 2}}>{J.name}</div>
            <div style={{fontFamily: UI, fontSize: 26, color: '#fff', letterSpacing: 3}}>{`COMPUTE ${ef} EFLOPS`}</div>
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, width: W, top: 150, textAlign: 'center', fontFamily: UI, fontSize: 24, letterSpacing: 8, color: '#fff', opacity: 0.7}}>
        BATTLE FOR THE WORLD'S COMPUTE
      </div>
      <div style={{position: 'absolute', left: 36, right: 36, top: 190, height: 16, background: INK, border: '3px solid #ffffff55', borderRadius: 8, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${f * 100}%`, background: K_EDGE}} />
        <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: `${(1 - f) * 100}%`, background: J_EDGE}} />
        <div style={{position: 'absolute', left: `${f * 100}%`, top: -4, width: 6, height: 24, background: '#fff', opacity: 0.8 + 0.2 * kick}} />
      </div>
    </>
  );
};

// ---------- transitions ----------
const Warp: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const sw = SWITCHES.slice(1).find((s) => t >= s.t - 0.5 && t < s.t + 0.6);
  if (!sw) return null;
  const f = fighterOf(sw.speaker);
  const toJ = sw.speaker === 'fighter2';
  const n = 16;
  const sh = H / n;
  const strips = [];
  for (let i = 0; i < n; i++) {
    const d = i * 0.022;
    const pin = eo((t - (sw.t - 0.5) - d) / 0.22);
    const pout = eo((t - (sw.t + 0.08) - d) / 0.22);
    const dir = i % 2 ? 1 : -1;
    const x = pout > 0 ? lerp(0, dir * -W, pout) : lerp(dir * W, 0, pin);
    strips.push(<div key={i} style={{position: 'absolute', left: x, top: i * sh, width: W, height: sh + 1, background: i % 2 ? f.color : mix(f.color, '#000000', 0.45)}} />);
  }
  const yr = Math.round(toJ ? lerp(1206, 2026, eo((t - (sw.t - 0.4)) / 0.5)) : lerp(2026, 1206, eo((t - (sw.t - 0.4)) / 0.5)));
  const show = t > sw.t - 0.28 && t < sw.t + 0.12;
  const rr = [];
  for (let r = 0; r < 3; r++) {
    const q = c01((t - (sw.t - 0.4) - r * 0.1) / 0.6);
    if (q <= 0 || q >= 1) continue;
    rr.push(
      <g key={r} transform={`translate(${W / 2} ${H / 2})`} opacity={1 - q}>
        <polygon points={HEX_BIG(80 + q * 900)} fill="none" stroke="#fff" strokeWidth={12} />
      </g>,
    );
  }
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden'}}>
      {strips}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>{rr}</svg>
      {show ? (
        <div style={{position: 'absolute', left: 0, top: 640, width: W, textAlign: 'center'}}>
          <div style={{fontFamily: FUN, fontSize: 380, lineHeight: 1, color: '#fff', WebkitTextStroke: '12px #000', paintOrder: 'stroke fill'}}>{yr}</div>
          <div style={{fontFamily: FUN, fontSize: 96, color: INK, letterSpacing: 4}}>{`ROUND ${sw.round}  ·  ${lastName(f).toUpperCase()}'S TURN`}</div>
        </div>
      ) : null}
    </div>
  );
};

const Outline: React.FC<{text: string; size: number; color: string; stroke?: number; font?: string}> = ({text, size, color, stroke = 10, font = FUN}) => (
  <div style={{fontFamily: font, fontSize: size, lineHeight: 1, textAlign: 'center', color, WebkitTextStroke: `${stroke}px #000`, paintOrder: 'stroke fill', letterSpacing: 2, whiteSpace: 'nowrap'}}>{text}</div>
);

const Intro: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  if (t >= firstStart) return null;
  const fadeStart = stageIn + 0.1;
  const cover = t < fadeStart ? 1 : 1 - eo((t - fadeStart) / 0.6);
  const out: React.ReactNode[] = [];
  // A: war drums + typed line
  if (t < 3.4) {
    const rings = [];
    for (let r = 0; r < 4; r++) {
      const q = ((t - r * 0.45) % 1.8) / 1.8;
      if (t - r * 0.45 < 0) continue;
      rings.push(
        <g key={r} transform={`translate(${W / 2} 700)`} opacity={(1 - q) * 0.7}>
          <polygon points={HEX_BIG(40 + q * 700)} fill="none" stroke={K_EDGE} strokeWidth={8} />
        </g>,
      );
    }
    const msg = '800 YEARS APART.';
    const msg2 = 'ONE WAR FOR THE WORLD\'S COMPUTE.';
    const n1 = Math.floor(t * 20);
    const n2 = Math.floor((t - 0.9) * 22);
    out.push(
      <div key="a" style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: t < 3.0 ? 1 : 1 - eo((t - 3.0) / 0.4)}}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>{rings}</svg>
        <div style={{position: 'absolute', left: 0, top: 640, width: W, textAlign: 'center', fontFamily: UI, fontSize: 84, color: '#fff', letterSpacing: 6}}>{msg.slice(0, Math.max(0, n1))}</div>
        <div style={{position: 'absolute', left: 60, top: 800, width: W - 120, textAlign: 'center', fontFamily: UI, fontSize: 52, color: J_EDGE, letterSpacing: 5, lineHeight: 1.3}}>{msg2.slice(0, Math.max(0, n2))}</div>
      </div>,
    );
  }
  // B: year warp
  if (t >= 1.7 && t < 3.6) {
    const q = eo((t - 1.7) / 1.4);
    const yr = Math.round(lerp(1206, 2026, q));
    const a = t < 3.3 ? 1 : 1 - eo((t - 3.3) / 0.3);
    out.push(
      <div key="b" style={{position: 'absolute', left: 0, top: 1100, width: W, opacity: a}}>
        <Outline text={String(yr)} size={330} color={mix(K_EDGE, J_EDGE, q)} stroke={12} />
        <div style={{height: 10}} />
        <div style={{textAlign: 'center', fontFamily: UI, fontSize: 40, color: '#fff', letterSpacing: 10, opacity: 0.8}}>{q < 0.5 ? 'THE STEPPE' : 'THE DATA CENTER'}</div>
      </div>,
    );
  }
  // C: commander reveals
  if (t >= 3.5 && t < stageIn + 0.3) {
    const half = (stageIn - 3.5) / 2;
    const seg = t < 3.5 + half ? 0 : 1;
    const s0 = seg === 0 ? 3.5 : 3.5 + half;
    const f = seg === 0 ? K : J;
    const p = eob((t - s0) / 0.3);
    const w = 640;
    const h = Math.round((w * 760) / 600);
    const dir = seg === 0 ? -1 : 1;
    const tag = seg === 0 ? ['GREAT KHAN', 'UNITED THE STEPPE · RODE EVERYWHERE'] : ['LEATHER JACKET CEO', 'SELLS THE SHOVELS · SHIPS THE CHIPS'];
    const col = seg === 0 ? K_EDGE : J_EDGE;
    const mo = f.mouthSvgs ? f.mouthSvgs[t - s0 > 0.3 ? (Math.floor(frame / 5) % 2 ? 2 : 1) : 0] : f.svg || '';
    out.push(
      <div key="c" style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <g transform={`translate(${W / 2} 800) rotate(${frame * 0.05})`} opacity={0.9}>
            <polygon points={HEX_BIG(520)} fill={col} fillOpacity={0.14} stroke={col} strokeWidth={10} />
            <polygon points={HEX_BIG(400)} fill="none" stroke={col} strokeWidth={5} strokeOpacity={0.6} />
          </g>
        </svg>
        <div style={{position: 'absolute', left: (W - w) / 2 + dir * lerp(1000, 0, p), top: 250, width: w, height: h}}>
          <Img src={staticFile(mo)} style={{width: w, height: h}} />
        </div>
        <div style={{position: 'absolute', left: 0, top: 1090, width: W, opacity: p, transform: `translateY(${lerp(60, 0, p)}px)`}}>
          <Outline text={f.name} size={130} color="#fff" stroke={10} font={UI} />
          <div style={{height: 22}} />
          <div style={{textAlign: 'center', fontFamily: UI, fontSize: 46, color: col, letterSpacing: 8}}>{tag[0]}</div>
          <div style={{textAlign: 'center', fontFamily: UI, fontSize: 34, color: '#fff', letterSpacing: 4, marginTop: 10, opacity: 0.85}}>{tag[1]}</div>
        </div>
      </div>,
    );
  }
  // D: round 1 + hex countdown
  if (t >= stageIn) {
    const dR = eob((t - stageIn) / 0.3);
    out.push(
      <div key="d" style={{position: 'absolute', left: 0, top: 985, width: W, opacity: dR, transform: `scale(${lerp(2, 1, dR)})`}}>
        <Outline text="ROUND 1" size={150} color="#fff" stroke={10} />
        <div style={{height: 14}} />
        <div style={{textAlign: 'center', fontFamily: UI, fontSize: 48, color: fighterOf(lines[0].speaker).color, letterSpacing: 8}}>{`${lastName(fighterOf(lines[0].speaker)).toUpperCase()} MARCHES FIRST`}</div>
      </div>,
    );
    const cd = firstStart - 2.7;
    if (t >= cd) {
      const n = 3 - Math.floor((t - cd) / 0.9);
      const lp = c01(((t - cd) % 0.9) / 0.9);
      if (n >= 1) {
        out.push(
          <div key="cd" style={{position: 'absolute', left: W / 2 - 300, top: 330, width: 600, height: 600, opacity: 1 - lp * 0.85, transform: `scale(${lerp(2.2, 0.85, eo(lp * 1.6))}) rotate(${(n - 2) * 8}deg)`}}>
            <svg width={600} height={600} viewBox="-300 -300 600 600" style={{position: 'absolute', left: 0, top: 0}}>
              <polygon points={HEX_BIG(280)} fill={INK} stroke="#FFE14D" strokeWidth={18} />
            </svg>
            <div style={{position: 'absolute', left: 0, top: 70, width: 600}}>
              <Outline text={String(n)} size={420} color="#FFE14D" stroke={12} />
            </div>
          </div>,
        );
      }
    }
  }
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>
      <div style={{position: 'absolute', inset: 0, background: INK, opacity: cover}} />
      {out}
    </div>
  );
};

const Outro: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const o = eo((t - outroStart) / 0.5);
  if (o <= 0) return null;
  const tt = t - outroStart;
  const f = frontier(lastEnd + 3);
  const leadJ = f < 0.5;
  const lead = leadJ ? J : K;
  const pctK = Math.round(f * 100);
  const cardW = 440;
  const h = Math.round((cardW * 760) / 600);
  const mk = (fx: Fighter, i: number, label: string, col: string) => {
    const enter = eob((tt - 0.3 - i * 0.15) / 0.4);
    const pulse = 1 + 0.03 * Math.sin(frame * 0.2 + i * Math.PI);
    const src = fx.mouthSvgs ? fx.mouthSvgs[(Math.floor(frame / 9) + i) % 3 === 2 ? 2 : 0] : fx.svg || '';
    return (
      <div key={fx.id} style={{position: 'absolute', left: i === 0 ? 60 : W - 60 - cardW, top: 720, width: cardW, height: h + 110, opacity: enter, transform: `translateY(${lerp(500, 0, enter)}px) scale(${pulse}) rotate(${i === 0 ? -2 : 2}deg)`}}>
        <svg width={cardW} height={h + 110} style={{position: 'absolute', left: 0, top: 0}}>
          <rect x={4} y={4} width={cardW - 8} height={h + 102} rx={30} fill={`${col}33`} stroke={col} strokeWidth={8} />
        </svg>
        <Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: 0, width: cardW, height: h}} />
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 104, background: col, borderRadius: '0 0 26px 26px', textAlign: 'center', fontFamily: UI, fontSize: 64, lineHeight: '104px', color: INK, letterSpacing: 4}}>{label}</div>
      </div>
    );
  };
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>
      <div style={{position: 'absolute', inset: 0, background: INK, opacity: o}} />
      <div style={{position: 'absolute', left: 0, top: 150, width: W, opacity: o, transform: `scale(${lerp(2.2, 1, eob(tt / 0.4))})`}}>
        <Outline text="WHO CONQUERS?" size={165} color="#FFE14D" stroke={12} />
      </div>
      <div style={{position: 'absolute', left: 60, top: 440, width: W - 120, textAlign: 'center', fontFamily: UI, fontSize: 44, lineHeight: 1.25, color: '#9AA3B5', letterSpacing: 4, opacity: o}}>
        {`THE MAP ENDED ${pctK}% KHAN, ${100 - pctK}% HUANG. ${lastName(lead).toUpperCase()} HOLDS THE FRONTIER. CONFIRM OR OVERTHROW.`}
      </div>
      {mk(K, 0, 'ARROWS', K_EDGE)}
      {mk(J, 1, 'GPUs', J_EDGE)}
      <div style={{position: 'absolute', left: 0, top: 1480, width: W, opacity: o, transform: `scale(${1 + 0.04 * Math.sin(frame * 0.25)})`}}>
        <Outline text="COMMENT YOUR EMPIRE" size={118} color="#fff" stroke={10} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 1660, width: W, textAlign: 'center', opacity: o}}>
        <div style={{fontFamily: UI, fontSize: 54, color: '#fff', letterSpacing: 4}}>FOLLOW FOR THE NEXT WAR</div>
        <div style={{fontFamily: UI, fontSize: 42, color: J_EDGE, letterSpacing: 6, marginTop: 12}}>{battle.hashtag}</div>
      </div>
    </div>
  );
};

// ---------- main ----------
export const ConquestBattle: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const kick = kickAt(t);
  const sw = switchAt(t);
  const k = eo((t - sw.t) / 0.35);
  const aK = sw.speaker === 'fighter1' ? 0.3 + 0.7 * k : 1 - 0.7 * k;
  const aJ = sw.speaker === 'fighter2' ? 0.3 + 0.7 * k : 1 - 0.7 * k;
  const line = lines.find((l) => t >= l.start && t < l.end);
  const lvl = Number(mouthStr[frame] || '0');
  const pAge = (spk: 'fighter1' | 'fighter2') => {
    const e = [...EV].reverse().find((x) => x.speaker === spk && t >= x.t);
    return e ? t - e.t : -1;
  };
  const last = [...EV].reverse().find((x) => t >= x.t + 0.55);
  const sdt = last ? t - (last.t + 0.55) : 9;
  const amp = sdt < 0.5 ? 18 * Math.exp(-sdt * 8) : 0;
  const shake = `translate(${Math.sin(sdt * 95) * amp}px, ${Math.cos(sdt * 80) * amp * 0.7}px)`;
  const stageOp = c01((t - stageIn + 0.05) / 0.4);
  return (
    <AbsoluteFill style={{background: INK, overflow: 'hidden'}}>
      <Audio src={staticFile(battle.audio.src)} />
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `${shake} scale(${1 + 0.01 * kick})`, opacity: stageOp}}>
        <MapLayer t={t} frame={frame} kick={kick} spk={sw.speaker} />
        <div style={{position: 'absolute', left: 0, top: 880, width: W, height: 1040, background: `linear-gradient(180deg, transparent, ${INK}CC 22%, ${INK}F2 70%)`}} />
        <Portrait f={K} side={0} a={aK} mouth={line && line.speaker === 'fighter1' ? lvl : 0} kick={kick} frame={frame} pAge={pAge('fighter1')} />
        <Portrait f={J} side={1} a={aJ} mouth={line && line.speaker === 'fighter2' ? lvl : 0} kick={kick} frame={frame} pAge={pAge('fighter2')} />
        <Volley t={t} />
        <Banner t={t} />
        <Badge t={t} />
        <Hud t={t} kick={kick} />
      </div>
      <Warp t={t} frame={frame} />
      <Intro t={t} frame={frame} />
      <Outro t={t} frame={frame} />
    </AbsoluteFill>
  );
};
