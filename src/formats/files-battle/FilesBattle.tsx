import React from 'react';
import {AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFonts} from '../../fonts';
import type {BattleManifest, CaptionLine, Fighter} from '../../types';
import battleManifest from '../../../public/battle.json' with {type: 'json'};

const battle = battleManifest as BattleManifest;
loadFonts();

const W = 1080;
const H = 1920;
const UI = 'Anton, Impact, sans-serif';
const FUN = 'Bangers, Impact, sans-serif';
const MONO = 'monospace';
const INK = '#07090C';
const RED = '#D91E1E';

const K = battle.fighters.fighter1;
const J = battle.fighters.fighter2;
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
const pad = (n: number, l = 2) => String(Math.floor(n)).padStart(l, '0');

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

const CARDS = [
  {label: 'EXHIBIT A', head: 'ADMITTED THE AFFAIR', sub: 'CNN · NOV 8'},
  {label: 'EXHIBIT B', head: 'RESIGNED, THEN REINSTATED', sub: '11 DAYS APART'},
  {label: 'EXHIBIT C', head: 'KHAN\'S BOARD OF DIRECTORS', sub: 'NONE. EVER.'},
  {label: 'EXHIBIT D', head: 'SUSPECTED ASSET', sub: 'DOJ: NO CONCLUSION'},
  {label: 'EXHIBIT E', head: '"MERKIT BASTARD"', sub: 'CHAGATAI ON JOCHI'},
  {label: 'EXHIBIT F', head: 'TOMB: NEVER FOUND', sub: 'STILL MISSING'},
  {label: 'EXHIBIT G', head: 'EMPIRE SPLIT IN FOUR', sub: 'FOUR KHANATES'},
  {label: 'EXHIBIT H', head: 'STATUE + DUST', sub: 'CURRENT STATUS'},
];
const BOARD = {x: 30, y: 810, w: 1020, h: 560};
const CW = 230;
const CH = 205;
const cardPos = (i: number) => ({x: 58 + (i % 4) * 245, y: 846 + Math.floor(i / 4) * 255});
const landAt = (i: number) => (EV[i] ? EV[i].t + 0.25 : 1e9);
const ROT = [-3, 2, -2, 3, 2, -3, 3, -2];

const poll = (t: number) => {
  let p = 0.5;
  for (const e of EV) {
    const dt = t - e.t;
    if (dt > 0) p += (e.dir > 0 ? 0.075 : 0.085) * e.dir * (1 - Math.exp(-dt * 5));
  }
  return Math.max(0.12, Math.min(0.88, p));
};

const noise = (frame: number, n: number, w: number, h: number, op: number, col = '#fff') => {
  const out: React.ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const x = (k * 173 + frame * 311) % w;
    const y = (k * 131 + frame * 197) % h;
    out.push(<rect key={k} x={x} y={y} width={30 + ((k * 37 + frame * 13) % 160)} height={2 + (k % 4)} fill={col} fillOpacity={op * (0.4 + ((k * 7 + frame) % 6) / 8)} />);
  }
  return out;
};

const Stamp: React.FC<{text: string; color: string; size?: number; rot?: number; style?: React.CSSProperties}> = ({text, color, size = 90, rot = -8, style}) => (
  <div style={{display: 'inline-block', border: `${Math.round(size / 9)}px solid ${color}`, borderRadius: 12, padding: `0 ${size / 4}px`, fontFamily: FUN, fontSize: size, lineHeight: 1.15, color, letterSpacing: 4, transform: `rotate(${rot}deg)`, opacity: 0.92, ...style}}>
    {text}
  </div>
);

const Outline: React.FC<{text: string; size: number; color: string; stroke?: number; font?: string}> = ({text, size, color, stroke = 10, font = FUN}) => (
  <div style={{fontFamily: font, fontSize: size, lineHeight: 1, textAlign: 'center', color, WebkitTextStroke: `${stroke}px #000`, paintOrder: 'stroke fill', letterSpacing: 2, whiteSpace: 'nowrap'}}>{text}</div>
);

// ---------- surveillance feeds ----------
const Feed: React.FC<{f: Fighter; side: 0 | 1; a: number; mouth: number; frame: number; t: number; swT: number; pAge: number}> = ({f, side, a, mouth, frame, t, swT, pAge}) => {
  const w = 500;
  const h = 620;
  const imgH = Math.round((w * 760) / 600);
  const src = f.mouthSvgs ? f.mouthSvgs[a > 0.7 ? mouth : 0] : f.svg || '';
  const r = lerp(170, 92, eo((t - swT) / 0.5));
  const lock = c01((t - swT - 0.4) / 0.2);
  const pop = pAge >= 0 && pAge < 0.5 ? 1 + 0.035 * Math.exp(-pAge * 8) : 1;
  const cam = side === 0 ? 'CAM 1 · THE STEPPE' : 'CAM 2 · SANTA CLARA';
  const ss = Math.floor(t);
  return (
    <div style={{position: 'absolute', left: side === 0 ? 30 : 550, top: 140, width: w, height: h, border: `6px solid ${a > 0.6 ? f.color : '#2C333D'}`, overflow: 'hidden', background: '#05080C', boxSizing: 'border-box', transform: `scale(${pop})`}}>
      <Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: 30, width: w, height: imgH, filter: `grayscale(${1 - a}) brightness(${0.5 + 0.5 * a}) contrast(1.08)`}} />
      <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.30) 0px, rgba(0,0,0,0.30) 2px, transparent 2px, transparent 5px)'}} />
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
        {noise(frame, 46, w, h, 0.2 * (1 - a))}
        <g stroke="#fff" strokeOpacity={0.55} strokeWidth={4} fill="none">
          <path d="M16 56 V16 H56 M444 16 H484 V56 M16 564 V604 H56 M444 604 H484 V564" />
        </g>
        <g transform={`translate(250 290)`} opacity={a}>
          <g transform={`rotate(${frame * 0.8})`} stroke={f.color} strokeWidth={5} fill="none">
            <circle r={r} strokeDasharray="26 14" />
          </g>
          <g stroke={f.color} strokeWidth={4} opacity={0.4 + 0.6 * lock}>
            <path d={`M${-r - 30} 0 H${-r + 24} M${r - 24} 0 H${r + 30} M0 ${-r - 30} V${-r + 24} M0 ${r - 24} V${r + 30}`} />
            <circle r={8} fill="none" />
          </g>
          {lock >= 1 ? <text x={0} y={-r - 44} textAnchor="middle" fontFamily={UI} fontSize={30} fill={f.color} letterSpacing={6}>TARGET LOCKED</text> : null}
        </g>
      </svg>
      <div style={{position: 'absolute', left: 14, top: 12, display: 'flex', alignItems: 'center', gap: 10, fontFamily: UI, fontSize: 26, color: '#fff', letterSpacing: 2}}>
        <div style={{width: 18, height: 18, borderRadius: 9, background: RED, opacity: Math.floor(frame / 15) % 2 ? 1 : 0.25}} />
        {`REC  ${cam}`}
      </div>
      <div style={{position: 'absolute', right: 14, bottom: 76, fontFamily: MONO, fontSize: 24, color: '#fff', opacity: 0.85}}>{`00:${pad((ss / 60) % 60)}:${pad(ss % 60)}:${pad(frame % 30)}`}</div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 62, background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontFamily: UI, fontSize: 36, color: INK, letterSpacing: 2}}>
        <div>{`${side === 0 ? 'SUBJECT A' : 'SUBJECT B'} · ${f.name}`}</div>
      </div>
    </div>
  );
};

// ---------- corkboard ----------
const Board: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const cards: React.ReactNode[] = [];
  const strings: React.ReactNode[] = [];
  const pairs: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]];
  pairs.forEach(([a, b], k) => {
    const p = c01((t - Math.max(landAt(a), landAt(b)) - 0.1) / 0.35);
    if (p <= 0) return;
    const pa = cardPos(a);
    const pb = cardPos(b);
    const x1 = pa.x + CW / 2;
    const y1 = pa.y + 14;
    const x2 = pb.x + CW / 2;
    const y2 = pb.y + 14;
    const sag = Math.abs(y2 - y1) > 100 ? 0 : 46;
    strings.push(
      <path key={k} d={`M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.max(y1, y2) + sag} ${x2} ${y2}`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} fill="none" stroke="#D32F2F" strokeWidth={5} strokeLinecap="round" />,
    );
  });
  for (let i = 0; i < 8; i++) {
    const pos = cardPos(i);
    const f = i < 4 ? K : J;
    const q = (t - landAt(i)) / 0.3;
    if (q < 0) {
      cards.push(
        <div key={i} style={{position: 'absolute', left: pos.x, top: pos.y, width: CW, height: CH, border: '4px dashed #6B4423', opacity: 0.55, boxSizing: 'border-box', textAlign: 'center'}}>
          <div style={{fontFamily: UI, fontSize: 26, color: '#4a2d14', letterSpacing: 3, marginTop: 14}}>{CARDS[i].label}</div>
          <div style={{fontFamily: FUN, fontSize: 90, color: '#4a2d14', lineHeight: 1.1}}>?</div>
        </div>,
      );
      continue;
    }
    const sc = lerp(2.3, 1, eob(q));
    const ty = lerp(-170, 0, eo(q));
    const rot = lerp(ROT[i] * 5, ROT[i], eo(q));
    cards.push(
      <div key={i} style={{position: 'absolute', left: pos.x, top: pos.y, width: CW, height: CH, transform: `translateY(${ty}px) scale(${sc}) rotate(${rot}deg)`, background: '#F3EBD8', border: '3px solid #2a1f12', boxSizing: 'border-box', padding: '22px 14px 10px'}}>
        <div style={{position: 'absolute', left: CW / 2 - 55, top: -14, width: 110, height: 28, background: f.color, opacity: 0.9, transform: 'rotate(-2deg)'}} />
        <div style={{fontFamily: UI, fontSize: 22, color: '#8a7a5a', letterSpacing: 3}}>{CARDS[i].label}</div>
        <div style={{fontFamily: UI, fontSize: 36, color: '#1b130a', lineHeight: 1.04, marginTop: 6, minHeight: 78}}>{CARDS[i].head}</div>
        <div style={{fontFamily: MONO, fontSize: 19, color: '#6b5a3a', marginTop: 8, fontWeight: 700}}>{CARDS[i].sub}</div>
        {f.emblemSvg ? <Img src={staticFile(f.emblemSvg)} style={{position: 'absolute', right: 10, bottom: 8, width: 38, height: 38}} /> : null}
      </div>,
    );
  }
  return (
    <div style={{position: 'absolute', left: BOARD.x, top: BOARD.y, width: BOARD.w, height: BOARD.h}}>
      <svg width={BOARD.w} height={BOARD.h} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <pattern id="cork" width="64" height="64" patternUnits="userSpaceOnUse">
            <rect width="64" height="64" fill="#B47C45" />
            {[[8, 10, 4], [30, 22, 3], [52, 8, 5], [18, 44, 5], [44, 50, 3], [58, 34, 4], [4, 58, 3]].map(([x, y, r], k) => (
              <circle key={k} cx={x} cy={y} r={r} fill="#8A5A2B" fillOpacity={0.5} />
            ))}
            {[[22, 6, 3], [40, 36, 4], [10, 30, 2], [56, 58, 3]].map(([x, y, r], k) => (
              <circle key={k} cx={x} cy={y} r={r} fill="#D9A56B" fillOpacity={0.5} />
            ))}
          </pattern>
        </defs>
        <rect x={0} y={0} width={BOARD.w} height={BOARD.h} fill="url(#cork)" stroke="#5A3A1E" strokeWidth={16} />
      </svg>
      <div style={{position: 'absolute', inset: 0, left: -BOARD.x, top: -BOARD.y}}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>{strings}</svg>
        {cards}
        {EV.map((e, i) => {
          const q = (t - landAt(i)) / 0.3;
          if (q < 0) return null;
          const pos = cardPos(i);
          return <div key={`pin${i}`} style={{position: 'absolute', left: pos.x + CW / 2 - 11, top: pos.y + 3, width: 22, height: 22, borderRadius: 11, background: '#E5232E', border: '3px solid #5b0d12', opacity: c01(q * 3)}} />;
        })}
      </div>
    </div>
  );
};

// ---------- transcript ----------
const Transcript: React.FC<{t: number}> = ({t}) => {
  let line: Line | null = null;
  for (const l of lines) if (t >= l.start - 0.1) line = l;
  const f = line ? fighterOf(line.speaker) : K;
  const isK = !line || line.speaker === 'fighter1';
  return (
    <div style={{position: 'absolute', left: 30, top: 1392, width: 1020}}>
      <div style={{height: 50, background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontFamily: UI, fontSize: 30, color: INK, letterSpacing: 4}}>
        <div>INTERCEPTED TRANSCRIPT</div>
        <div>{isK ? 'SUBJECT A · KHAN' : 'SUBJECT B · HUANG'}</div>
      </div>
      <div style={{position: 'relative', height: 250, background: '#0D1117', border: `4px solid ${f.color}`, borderTop: 'none', boxSizing: 'border-box', padding: '26px 34px', fontFamily: UI, fontSize: 56, lineHeight: 1.22, letterSpacing: 1}}>
        {line
          ? line.toks.map((w, i) => {
              const rp = c01((t - (w.start - 0.03)) / 0.14);
              const active = t >= w.start - 0.02 && t < w.end + 0.1;
              const s = active ? 1 + 0.08 * Math.max(0, 1 - (t - w.start) / 0.2) : 1;
              return (
                <span key={i} style={{position: 'relative', display: 'inline-block', marginRight: 16, color: active ? f.color : '#fff', transform: `scale(${s})`, transformOrigin: '50% 80%'}}>
                  {w.text}
                  <span style={{position: 'absolute', left: -5, right: -9, top: 6, bottom: 2, overflow: 'hidden'}}>
                    <span style={{position: 'absolute', inset: 0, background: '#000', border: '2px solid #1c222b', transform: `translateX(${rp * 112}%)`}} />
                  </span>
                </span>
              );
            })
          : <div style={{fontFamily: MONO, fontSize: 34, color: '#58607a'}}>AWAITING INTERCEPT...</div>}
        {line && line.punchline && t >= line.end - 0.5 ? (
          <div style={{position: 'absolute', right: 20, top: -34, transform: `scale(${lerp(2, 1, eob((t - (line.end - 0.5)) / 0.2))})`}}>
            <Stamp text="LEAKED" color={RED} size={64} rot={-7} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ---------- poll + ticker + chyron ----------
const Poll: React.FC<{t: number}> = ({t}) => {
  const p = poll(t);
  const pk = Math.round(p * 100);
  return (
    <div style={{position: 'absolute', left: 30, top: 1712, width: 1020}}>
      <div style={{fontFamily: UI, fontSize: 28, color: '#9AA3B5', letterSpacing: 8, marginBottom: 6}}>LIVE VIEWER POLL</div>
      <div style={{position: 'relative', height: 58, background: '#0D1117', border: '3px solid #ffffff44', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p * 100}%`, background: K.color}} />
        <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: `${(1 - p) * 100}%`, background: J.color}} />
        <div style={{position: 'absolute', left: 16, top: 0, lineHeight: '58px', fontFamily: UI, fontSize: 36, color: INK, letterSpacing: 2}}>{`KHAN ${pk}%`}</div>
        <div style={{position: 'absolute', right: 16, top: 0, lineHeight: '58px', fontFamily: UI, fontSize: 36, color: INK, letterSpacing: 2}}>{`${100 - pk}% HUANG`}</div>
      </div>
    </div>
  );
};

const HEADS = [
  "GENGHIS KHAN'S TOMB STILL NOT FOUND",
  'NVIDIA CEO RESIGNED, REINSTATED 11 DAYS LATER',
  'DOJ: NO CONCLUSION ON SUSPECTED ASSET',
  'MONGOL EMPIRE SPLIT INTO FOUR KHANATES',
  'OPEN LETTER FOR HUANG: 178K SIGNATURES',
  'RAP BEEF ESCALATES ACROSS 800 YEARS',
];
const CELL = 900;
const Ticker: React.FC<{t: number}> = ({t}) => {
  const L = HEADS.length * CELL;
  const x = -((t * 160) % L);
  return (
    <div style={{position: 'absolute', left: 0, top: 1822, width: W, height: 82, background: '#0B0F16', borderTop: `5px solid ${RED}`, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 2 * L, height: 82, transform: `translateX(${x + 170}px)`, display: 'flex'}}>
        {[...HEADS, ...HEADS].map((h, i) => (
          <div key={i} style={{width: CELL, flexShrink: 0, lineHeight: '78px', fontFamily: UI, fontSize: 38, color: '#fff', letterSpacing: 2, whiteSpace: 'nowrap'}}>
            {h}
            <span style={{color: RED, marginLeft: 36}}>◆</span>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, top: 0, width: 170, height: 82, background: RED, lineHeight: '78px', textAlign: 'center', fontFamily: UI, fontSize: 44, color: '#fff', letterSpacing: 4}}>NEWS</div>
    </div>
  );
};

const Chyron: React.FC<{frame: number}> = ({frame}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: W, height: 120, background: '#0B0F16', borderBottom: `5px solid ${RED}`}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: 190, height: 120, background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: UI, fontSize: 52, color: '#fff', letterSpacing: 4}}>
      <div style={{width: 20, height: 20, borderRadius: 10, background: '#fff', opacity: Math.floor(frame / 15) % 2 ? 1 : 0.3}} />
      LIVE
    </div>
    <div style={{position: 'absolute', left: 215, top: 10, fontFamily: UI, fontSize: 30, color: RED, letterSpacing: 6}}>BREAKING</div>
    <div style={{position: 'absolute', left: 215, top: 44, fontFamily: UI, fontSize: 56, color: '#fff', letterSpacing: 2, whiteSpace: 'nowrap'}}>THE 800-YEAR RAP BEEF</div>
    <div style={{position: 'absolute', right: 22, top: 40, fontFamily: UI, fontSize: 28, color: K.color, letterSpacing: 3}}>{battle.hashtag}</div>
  </div>
);

// ---------- channel change ----------
const BARS = ['#C0C0C0', '#C0C000', '#00C0C0', '#00C000', '#C000C0', '#C00000', '#0000C0'];
const Channel: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const sw = SWITCHES.slice(1).find((s) => t >= s.t - 0.3 && t < s.t + 0.45);
  if (!sw) return null;
  const p = (t - (sw.t - 0.3)) / 0.75;
  const f = fighterOf(sw.speaker);
  const cam = sw.speaker === 'fighter1' ? 'CAM 1 · THE STEPPE' : 'CAM 2 · SANTA CLARA';
  const roll = (frame * 180) % H;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden', opacity: p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1}}>
      {p < 0.4 ? (
        <div style={{position: 'absolute', left: 0, top: -roll + H, width: W, height: H, display: 'flex'}}>
          {BARS.map((c, i) => (
            <div key={i} style={{flex: 1, background: c}} />
          ))}
        </div>
      ) : null}
      {p < 0.4 ? <div style={{position: 'absolute', left: 0, top: -roll, width: W, height: H, display: 'flex'}}>{BARS.map((c, i) => <div key={i} style={{flex: 1, background: c}} />)}</div> : null}
      {p >= 0.4 ? <div style={{position: 'absolute', inset: 0, background: '#14181f'}} /> : null}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>{noise(frame, 140, W, H, p < 0.4 ? 0.35 : 0.7)}</svg>
      <div style={{position: 'absolute', left: 0, top: 820, width: W, textAlign: 'center'}}>
        <div style={{display: 'inline-block', background: '#000', border: `5px solid ${f.color}`, padding: '14px 40px'}}>
          <div style={{fontFamily: MONO, fontSize: 40, color: '#fff', letterSpacing: 6, fontWeight: 700}}>SWITCHING FEED</div>
          <div style={{fontFamily: UI, fontSize: 64, color: f.color, letterSpacing: 4}}>{`→ ${cam}`}</div>
          <div style={{fontFamily: UI, fontSize: 40, color: '#fff', letterSpacing: 6}}>{`ROUND ${sw.round} · ${lastName(f).toUpperCase()}`}</div>
        </div>
      </div>
    </div>
  );
};

// ---------- intro / outro ----------
const DOSSIER = ['SUBJECT A: GENGHIS KHAN', '  c.1162 · FOUNDER, MONGOL EMPIRE', 'SUBJECT B: JENSEN HUANG', '  b.1963 · CEO, NVIDIA', 'STATUS: BEEF ESCALATING'];
const Mugshot: React.FC<{f: Fighter; frame: number; talk: boolean; wanted: string; caseNo: string; sub: string}> = ({f, frame, talk, wanted, caseNo, sub}) => {
  const w = 600;
  const h = Math.round((w * 760) / 600);
  const src = f.mouthSvgs ? f.mouthSvgs[talk ? (Math.floor(frame / 5) % 2 ? 2 : 1) : 0] : f.svg || '';
  const ticks = [];
  for (let i = 0; i < 9; i++) {
    ticks.push(
      <g key={i}>
        <line x1={0} y1={70 + i * 85} x2={i % 2 ? 60 : 110} y2={70 + i * 85} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={4} />
        <text x={124} y={82 + i * 85} fontFamily={MONO} fontSize={28} fill="#fff" fillOpacity={0.55}>{`${7 - Math.floor(i / 1.5)}'${(i * 4) % 12}"`}</text>
      </g>,
    );
  }
  return (
    <div style={{position: 'absolute', left: 120, top: 200, width: 840, height: 1180, background: '#1a2230', border: `8px solid ${f.color}`, overflow: 'hidden'}}>
      <svg width={840} height={1180} style={{position: 'absolute', left: 0, top: 0}}>{ticks}</svg>
      <Img src={staticFile(src)} style={{position: 'absolute', left: 120, top: 120, width: w, height: h}} />
      <div style={{position: 'absolute', left: 150, top: 880, width: 540, background: '#F3EBD8', border: '5px solid #1b130a', padding: '14px 18px', transform: 'rotate(-2deg)', textAlign: 'center'}}>
        <div style={{fontFamily: UI, fontSize: 54, color: '#1b130a', letterSpacing: 2}}>{f.name}</div>
        <div style={{fontFamily: MONO, fontSize: 26, color: '#4a3a20', fontWeight: 700}}>{caseNo}</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, background: f.color, textAlign: 'center'}}>
        <div style={{fontFamily: UI, fontSize: 38, color: INK, letterSpacing: 8, paddingTop: 12}}>WANTED FOR</div>
        <div style={{fontFamily: UI, fontSize: 56, color: INK, letterSpacing: 3}}>{wanted}</div>
      </div>
      <div style={{position: 'absolute', right: 20, top: 24, fontFamily: MONO, fontSize: 26, color: '#fff', opacity: 0.7}}>{sub}</div>
    </div>
  );
};

const Intro: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  if (t >= firstStart) return null;
  const fadeStart = stageIn + 0.1;
  const cover = t < fadeStart ? 1 : 1 - eo((t - fadeStart) / 0.5);
  const out: React.ReactNode[] = [];
  if (t < 2.5) {
    const n = Math.floor(t * 52);
    let used = 0;
    const rows = DOSSIER.map((ln, i) => {
      const take = Math.max(0, Math.min(ln.length, n - used));
      used += ln.length + 6;
      return (
        <div key={i} style={{fontFamily: MONO, fontSize: 38, fontWeight: 700, color: ln.startsWith(' ') ? '#9AA3B5' : '#fff', marginBottom: 14, whiteSpace: 'pre'}}>
          {ln.slice(0, take)}
        </div>
      );
    });
    const stampP = eob((t - 1.1) / 0.18);
    out.push(
      <div key="a" style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: t < 2.2 ? 1 : 1 - eo((t - 2.2) / 0.3)}}>
        <div style={{position: 'absolute', left: 70, top: 360, fontFamily: UI, fontSize: 40, color: RED, letterSpacing: 8}}>CASE FILE 800-A</div>
        <div style={{position: 'absolute', left: 70, top: 430, width: W - 140}}>
          <div style={{fontFamily: UI, fontSize: 96, color: '#fff', letterSpacing: 3, lineHeight: 1.05, marginBottom: 40}}>OPERATION<br />HORSEBACK</div>
          {rows}
        </div>
        {t >= 1.1 ? (
          <div style={{position: 'absolute', left: 120, top: 1180, opacity: stampP, transform: `scale(${lerp(3, 1, stampP)})`}}>
            <Stamp text="TOP SECRET" color={RED} size={150} rot={-9} />
          </div>
        ) : null}
      </div>,
    );
  }
  if (t >= 2.4 && t < stageIn + 0.3) {
    const half = (stageIn - 2.4) / 2;
    const seg = t < 2.4 + half ? 0 : 1;
    const s0 = seg === 0 ? 2.4 : 2.4 + half;
    const f = seg === 0 ? K : J;
    const p = eob((t - s0) / 0.3);
    const dir = seg === 0 ? -1 : 1;
    out.push(
      <div key="b" style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translateX(${dir * lerp(1200, 0, p)}px) rotate(${(seg === 0 ? -1 : 1) * lerp(8, 0, p)}deg)`}}>
        <Mugshot
          f={f}
          frame={frame}
          talk={t - s0 > 0.35}
          wanted={seg === 0 ? 'UNITING THE STEPPE' : 'SELLING THE SHOVELS'}
          caseNo={seg === 0 ? 'CASE 800-A · c.1162' : 'CASE 800-B · b.1963'}
          sub={seg === 0 ? 'FILE A' : 'FILE B'}
        />
        {t - s0 > 0.5 ? (
          <div style={{position: 'absolute', left: 190, top: 300, transform: `scale(${lerp(2.6, 1, eob((t - s0 - 0.5) / 0.2))})`}}>
            <Stamp text={seg === 0 ? 'ARMED + HORSEBACK' : 'LEATHER JACKET'} color={f.color} size={72} rot={seg === 0 ? -6 : 6} />
          </div>
        ) : null}
      </div>,
    );
  }
  if (t >= stageIn) {
    const cd = firstStart - 2.7;
    const dT = eob((t - stageIn) / 0.3);
    out.push(
      <div key="d" style={{position: 'absolute', left: 0, top: 1380, width: W, textAlign: 'center', opacity: dT}}>
        <div style={{fontFamily: UI, fontSize: 56, color: RED, letterSpacing: 10}}>GOING LIVE</div>
        <div style={{fontFamily: MONO, fontSize: 40, color: '#fff', fontWeight: 700, letterSpacing: 4, marginTop: 10}}>ROUND 1 · KHAN OPENS</div>
      </div>,
    );
    if (t >= cd) {
      const n = 3 - Math.floor((t - cd) / 0.9);
      const lp = c01(((t - cd) % 0.9) / 0.9);
      if (n >= 1) {
        out.push(
          <div key="cd" style={{position: 'absolute', left: 0, top: 380, width: W, opacity: 1 - lp * 0.8, transform: `scale(${lerp(2, 0.9, eo(lp * 1.5))})`}}>
            <div style={{fontFamily: MONO, fontSize: 44, color: RED, textAlign: 'center', fontWeight: 700, letterSpacing: 10}}>T-MINUS</div>
            <Outline text={String(n)} size={480} color="#fff" stroke={12} />
          </div>,
        );
      }
    }
  }
  const crt = t >= fadeStart ? c01((t - fadeStart) / 0.3) : 0;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>
      <div style={{position: 'absolute', inset: 0, background: INK, opacity: cover}} />
      {out}
      {t >= fadeStart && t < fadeStart + 0.3 ? <div style={{position: 'absolute', left: 0, top: H / 2 - 4, width: W, height: 8, background: '#fff', opacity: 1 - crt}} /> : null}
    </div>
  );
};

const Outro: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const o = eo((t - outroStart) / 0.5);
  if (o <= 0) return null;
  const tt = t - outroStart;
  const p = poll(lastEnd + 3);
  const pk = Math.round(p * 100);
  const lead = p >= 0.5 ? K : J;
  const mk = (f: Fighter, i: number) => {
    const enter = eob((tt - 0.3 - i * 0.15) / 0.4);
    const cw = 450;
    const ih = Math.round((cw * 760) / 600);
    const src = f.mouthSvgs ? f.mouthSvgs[(Math.floor(frame / 9) + i) % 3 === 2 ? 2 : 0] : f.svg || '';
    return (
      <div key={f.id} style={{position: 'absolute', left: i === 0 ? 50 : W - 50 - cw, top: 640, width: cw, height: ih + 110, opacity: enter, transform: `translateY(${lerp(500, 0, enter)}px) rotate(${i === 0 ? -2 : 2}deg)`, background: '#1a2230', border: `7px solid ${f.color}`, overflow: 'hidden', boxSizing: 'border-box'}}>
        <Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: 0, width: cw, height: ih}} />
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 104, background: f.color, textAlign: 'center', fontFamily: UI, fontSize: 60, lineHeight: '104px', color: INK, letterSpacing: 4}}>{lastName(f).toUpperCase()}</div>
      </div>
    );
  };
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>
      <div style={{position: 'absolute', inset: 0, background: INK, opacity: o}} />
      <div style={{position: 'absolute', left: 0, top: 120, width: W, opacity: o, transform: `scale(${lerp(2.2, 1, eob(tt / 0.4))})`}}>
        <Outline text="WHO GOT ROASTED?" size={150} color="#FFE14D" stroke={11} />
      </div>
      <div style={{position: 'absolute', left: 60, top: 360, width: W - 120, textAlign: 'center', opacity: o}}>
        <div style={{fontFamily: UI, fontSize: 42, color: '#9AA3B5', letterSpacing: 4, lineHeight: 1.25}}>{`POLL CLOSED AT ${pk}% KHAN, ${100 - pk}% HUANG. ${lastName(lead).toUpperCase()} LEADS. YOU CAN OVERRULE.`}</div>
      </div>
      <div style={{position: 'absolute', left: 280, top: 500, opacity: o}}>
        <Stamp text="CASE STILL OPEN" color={RED} size={80} rot={-4} />
      </div>
      {mk(K, 0)}
      {mk(J, 1)}
      <div style={{position: 'absolute', left: 0, top: 1450, width: W, opacity: o, transform: `scale(${1 + 0.04 * Math.sin(frame * 0.25)})`}}>
        <Outline text="COMMENT KHAN OR HUANG" size={100} color="#fff" stroke={9} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 1650, width: W, textAlign: 'center', opacity: o}}>
        <div style={{fontFamily: UI, fontSize: 52, color: '#fff', letterSpacing: 4}}>FOLLOW FOR THE NEXT FILE</div>
        <div style={{fontFamily: UI, fontSize: 40, color: K.color, letterSpacing: 6, marginTop: 12}}>{battle.hashtag}</div>
      </div>
    </div>
  );
};

// ---------- main ----------
export const FilesBattle: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const kick = kickAt(t);
  const sw = switchAt(t);
  const k = eo((t - sw.t) / 0.3);
  const aK = sw.speaker === 'fighter1' ? 0.1 + 0.9 * k : 1 - 0.9 * k;
  const aJ = sw.speaker === 'fighter2' ? 0.1 + 0.9 * k : 1 - 0.9 * k;
  const line = lines.find((l) => t >= l.start && t < l.end);
  const lvl = Number(mouthStr[frame] || '0');
  const pAge = (spk: 'fighter1' | 'fighter2') => {
    const e = [...EV].reverse().find((x) => x.speaker === spk && t >= x.t);
    return e ? t - e.t : -1;
  };
  const last = [...EV].reverse().find((x) => t >= x.t + 0.25);
  const sdt = last ? t - (last.t + 0.25) : 9;
  const amp = sdt < 0.45 ? 14 * Math.exp(-sdt * 9) : 0;
  const shake = `translate(${Math.sin(sdt * 100) * amp}px, ${Math.cos(sdt * 85) * amp * 0.7}px)`;
  const stageOp = c01((t - stageIn + 0.05) / 0.3);
  return (
    <AbsoluteFill style={{background: INK, overflow: 'hidden'}}>
      <Audio src={staticFile(battle.audio.src)} />
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: stageOp, background: 'linear-gradient(180deg, #0A0D12, #10151D)'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `${shake} scale(${1 + 0.006 * kick})`}}>
          <Feed f={K} side={0} a={aK} mouth={line && line.speaker === 'fighter1' ? lvl : 0} frame={frame} t={t} swT={SWITCHES.filter((s) => s.speaker === 'fighter1' && s.t <= t).slice(-1)[0]?.t ?? stageIn} pAge={pAge('fighter1')} />
          <Feed f={J} side={1} a={aJ} mouth={line && line.speaker === 'fighter2' ? lvl : 0} frame={frame} t={t} swT={SWITCHES.filter((s) => s.speaker === 'fighter2' && s.t <= t).slice(-1)[0]?.t ?? 9999} pAge={pAge('fighter2')} />
          <Board t={t} frame={frame} />
          <Transcript t={t} />
          <Poll t={t} />
        </div>
        <Chyron frame={frame} />
        <Ticker t={t} />
      </div>
      <Channel t={t} frame={frame} />
      <Intro t={t} frame={frame} />
      <Outro t={t} frame={frame} />
    </AbsoluteFill>
  );
};
