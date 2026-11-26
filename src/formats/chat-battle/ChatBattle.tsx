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
const INK = '#06080D';

const f1 = battle.fighters.fighter1;
const f2 = battle.fighters.fighter2;
const fighterOf = (s: string): Fighter => (s === 'fighter1' ? f1 : f2);
const firstName = (f: Fighter) => f.name.split(' ')[0];

const c01 = (v: number) => Math.max(0, Math.min(1, v));
const eo = (v: number) => 1 - Math.pow(1 - c01(v), 3);
const eob = (v: number) => {
  const x = c01(v);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

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
const beats = battle.audio.beats;
const mouthStr = battle.audio.mouth || '';
const stageIn = firstStart - 3.0;

const kickAt = (t: number) => {
  let b = -1;
  for (let i = 0; i < beats.length; i++) {
    if (beats[i] <= t) b = beats[i];
    else break;
  }
  return b < 0 ? 0 : Math.exp(-(t - b) * 8);
};

// Speaker runs -> switch times (first run starts when stage fades in)
const SWITCHES: {t: number; speaker: 'fighter1' | 'fighter2'; round: number}[] = [];
lines.forEach((l, i) => {
  if (i === 0 || lines[i - 1].speaker !== l.speaker) {
    SWITCHES.push({
      t: i === 0 ? stageIn : l.start,
      speaker: l.speaker as 'fighter1' | 'fighter2',
      round: SWITCHES.length + 1,
    });
  }
});
const switchAt = (t: number) => {
  let cur = SWITCHES[0];
  for (const s of SWITCHES) if (t >= s.t) cur = s;
  return cur;
};

// Punchline events drive the vibe meter, shake and stickers
const EV = lines
  .filter((l) => l.punchline)
  .map((l, i) => ({t: l.end - 0.15, s: l.speaker === 'fighter1' ? 1 : -1, speaker: l.speaker as 'fighter1' | 'fighter2', i}));
const STICKERS = ['RATIO!', 'BARS!', 'OOOOH', 'CAPPED!', 'COOKED', 'SHOTS FIRED', 'TOUCH GRASS', 'SEND IT'];

const vibe = (t: number) => {
  let p = 0.5;
  for (const e of EV) {
    const dt = t - e.t;
    if (dt > 0) p += 0.085 * e.s * (1 - Math.exp(-dt * 7));
  }
  return Math.max(0.12, Math.min(0.88, p + 0.006 * Math.sin(t * 3.1)));
};

// ---------- tiny building blocks ----------
const Pop: React.FC<{text: string; size: number; color: string; ext?: number; stroke?: number; font?: string; style?: React.CSSProperties}> = ({
  text,
  size,
  color,
  ext = 8,
  stroke = 6,
  font = FUN,
  style,
}) => {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    textAlign: 'center',
    fontFamily: font,
    fontSize: size,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    letterSpacing: 2,
  };
  const layers = [];
  for (let i = ext; i >= 1; i -= 2) {
    layers.push(
      <div key={i} style={{...base, color: '#000', transform: `translate(${i}px, ${i}px)`, WebkitTextStroke: `${stroke}px #000`}}>
        {text}
      </div>,
    );
  }
  return (
    <div style={{position: 'relative', width: '100%', height: size, ...style}}>
      {layers}
      <div style={{...base, color, WebkitTextStroke: `${stroke}px #000`, paintOrder: 'stroke fill'}}>{text}</div>
    </div>
  );
};

const Rays: React.FC<{cx: number; cy: number; color: string; op: number; frame: number}> = ({cx, cy, color, op, frame}) => {
  const n = 14;
  const rot = frame * 0.004;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const a2 = a + 0.1;
    pts.push(
      <polygon
        key={i}
        points={`${cx},${cy} ${cx + Math.cos(a) * 1800},${cy + Math.sin(a) * 1800} ${cx + Math.cos(a2) * 1800},${cy + Math.sin(a2) * 1800}`}
        fill={color}
        fillOpacity={op}
      />,
    );
  }
  return <>{pts}</>;
};

const Backdrop: React.FC<{frame: number; a1: number; a2: number; kick: number}> = ({frame, a1, a2, kick}) => (
  <AbsoluteFill style={{background: INK}}>
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <pattern
          id="dots"
          width="54"
          height="54"
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${(frame * 0.6) % 54} ${(frame * 0.35) % 54})`}
        >
          <circle cx="27" cy="27" r="2.4" fill="#ffffff" fillOpacity="0.07" />
        </pattern>
      </defs>
      <polygon points={`0,0 700,0 420,${H} 0,${H}`} fill={f1.color} fillOpacity={0.05 + 0.12 * a1} />
      <polygon points={`${W},0 ${W},${H} 600,${H} 880,0`} fill={f2.color} fillOpacity={0.05 + 0.12 * a2} />
      <Rays cx={285} cy={620} color={f1.color} op={0.11 * a1 * (0.7 + 0.5 * kick)} frame={frame} />
      <Rays cx={795} cy={620} color={f2.color} op={0.11 * a2 * (0.7 + 0.5 * kick)} frame={-frame} />
      <rect width={W} height={H} fill="url(#dots)" />
    </svg>
  </AbsoluteFill>
);

// ---------- fighter windows ----------
const Card: React.FC<{f: Fighter; side: 0 | 1; a: number; mouth: number; kick: number; pAge: number; frame: number}> = ({
  f,
  side,
  a,
  mouth,
  kick,
  pAge,
  frame,
}) => {
  const w = 470;
  const titleH = 54;
  const imgH = Math.round((w * 760) / 600);
  const cx = side === 0 ? 285 : 795;
  const pop = pAge >= 0 && pAge < 0.6 ? 0.07 * Math.exp(-pAge * 7) : 0;
  const scale = 0.88 + 0.12 * a + pop + 0.02 * kick * a;
  const ty = lerp(14, -26, a) + Math.sin(frame * 0.35) * 3 * a;
  const rot = (side === 0 ? -1 : 1) * 1.6 * a;
  const src = f.mouthSvgs ? f.mouthSvgs[a > 0.7 ? mouth : 0] : f.svg || '';
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - w / 2,
        top: 250,
        width: w,
        height: titleH + imgH,
        transformOrigin: '50% 100%',
        transform: `translateY(${ty}px) scale(${scale}) rotate(${rot}deg)`,
        border: `6px solid ${f.color}`,
        borderRadius: 34,
        overflow: 'hidden',
        background: `linear-gradient(165deg, ${f.color}44 0%, #0A0D14 72%)`,
      }}
    >
      <div style={{height: titleH, background: f.color, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 9}}>
        {[0.9, 0.55, 0.3].map((o, i) => (
          <div key={i} style={{width: 14, height: 14, borderRadius: 7, background: INK, opacity: o}} />
        ))}
        <div style={{flex: 1, textAlign: 'center', fontFamily: UI, fontSize: 28, color: INK, letterSpacing: 2}}>{f.badge}</div>
        {f.emblemSvg ? <Img src={staticFile(f.emblemSvg)} style={{width: 38, height: 38}} /> : null}
      </div>
      <Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: titleH, width: w, height: imgH}} />
      <div style={{position: 'absolute', inset: 0, background: INK, opacity: 0.58 * (1 - a)}} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '34px 18px 12px',
          background: `linear-gradient(0deg, ${INK}EE 40%, transparent)`,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <div style={{fontFamily: UI, fontSize: 46, color: '#fff', letterSpacing: 1}}>{f.name}</div>
        <div style={{fontFamily: UI, fontSize: 24, color: f.color, letterSpacing: 2}}>
          {a > 0.6 ? 'SPEAKING' + '.'.repeat(1 + (Math.floor(frame / 6) % 3)) : 'LISTENING'}
        </div>
      </div>
    </div>
  );
};

// ---------- chat ----------
const SLOT_Y = [1565, 1385, 1230, 1105];
const SLOT_S = [1, 0.92, 0.84, 0.78];
const SLOT_O = [1, 0.62, 0.3, 0];

const Bubble: React.FC<{line: Line; t: number; y: number; scale: number; opacity: number}> = ({line, t, y, scale, opacity}) => {
  const f = fighterOf(line.speaker);
  const left = line.speaker === 'fighter1';
  const done = t >= line.end;
  const tag = line.punchline && t >= line.end - 0.9;
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: left ? 44 : undefined,
        right: left ? undefined : 44,
        maxWidth: 900,
        transform: `translateY(-50%) scale(${scale})`,
        transformOrigin: left ? '0% 50%' : '100% 50%',
        opacity,
      }}
    >
      <div style={{display: 'flex', flexDirection: left ? 'row' : 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8}}>
        {f.emblemSvg ? <Img src={staticFile(f.emblemSvg)} style={{width: 40, height: 40}} /> : null}
        <div style={{fontFamily: UI, fontSize: 30, color: f.color, letterSpacing: 2}}>{firstName(f)}</div>
        <div style={{fontFamily: UI, fontSize: 22, color: '#8892A6', letterSpacing: 2}}>{done ? 'SENT' : 'TYPING'}</div>
      </div>
      <div
        style={{
          position: 'relative',
          background: '#0E131D',
          border: `5px solid ${f.color}`,
          borderRadius: 34,
          borderTopLeftRadius: left ? 8 : 34,
          borderTopRightRadius: left ? 34 : 8,
          padding: '24px 36px 26px',
          fontFamily: UI,
          fontSize: 48,
          lineHeight: 1.16,
          letterSpacing: 1,
          color: '#fff',
        }}
      >
        {line.toks.map((w, i) => {
          const vis = t >= w.start - 0.02 || done;
          const since = t - w.start;
          const active = !done && since >= 0 && t < w.end + 0.12;
          const s = active ? 1 + 0.1 * Math.max(0, 1 - since / 0.22) : 1;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: 18,
                opacity: vis ? 1 : 0,
                color: active ? f.color : '#fff',
                transform: `scale(${s})`,
                transformOrigin: '50% 80%',
              }}
            >
              {w.text}
            </span>
          );
        })}
        {tag ? (
          <div
            style={{
              position: 'absolute',
              top: -26,
              [left ? 'right' : 'left']: 24,
              background: f.color,
              color: INK,
              border: `4px solid ${INK}`,
              borderRadius: 12,
              padding: '2px 16px',
              fontFamily: FUN,
              fontSize: 34,
              letterSpacing: 2,
              transform: `rotate(${left ? 5 : -5}deg)`,
            }}
          >
            PUNCHLINE
          </div>
        ) : null}
      </div>
    </div>
  );
};

const Typing: React.FC<{f: Fighter; frame: number; y: number}> = ({f, frame, y}) => {
  const left = f.id === 'fighter1';
  return (
    <div style={{position: 'absolute', top: y, left: left ? 44 : undefined, right: left ? undefined : 44, transform: 'translateY(-50%)'}}>
      <div style={{fontFamily: UI, fontSize: 28, color: f.color, letterSpacing: 2, marginBottom: 8, textAlign: left ? 'left' : 'right'}}>
        {firstName(f)} IS TYPING
      </div>
      <div
        style={{
          display: 'flex',
          gap: 14,
          background: '#0E131D',
          border: `5px solid ${f.color}`,
          borderRadius: 34,
          padding: '28px 40px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              background: f.color,
              transform: `translateY(${-Math.abs(Math.sin(frame * 0.22 - i * 0.7)) * 16}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const ChatPanel: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  let idx = -1;
  lines.forEach((l, i) => {
    if (t >= l.start - 0.12) idx = i;
  });
  const newest = idx >= 0 ? lines[idx] : null;
  const p = newest ? eo((t - (newest.start - 0.12)) / 0.3) : 1;
  const entryY = 1640;
  const bubbles: React.ReactNode[] = [];
  for (let k = 3; k >= 0; k--) {
    const li = idx - k;
    if (li < 0) continue;
    const toY = SLOT_Y[k];
    const toS = SLOT_S[k];
    const toO = SLOT_O[k];
    const fromY = k === 0 ? entryY : SLOT_Y[k - 1];
    const fromS = k === 0 ? 0.82 : SLOT_S[k - 1];
    const fromO = k === 0 ? 0 : SLOT_O[k - 1];
    const e = k === 0 ? eob(p) : p;
    const op = k === 0 ? p : lerp(fromO, toO, p);
    if (op <= 0.01) continue;
    bubbles.push(<Bubble key={lines[li].idx} line={lines[li]} t={t} y={lerp(fromY, toY, e)} scale={lerp(fromS, toS, e)} opacity={op} />);
  }
  // typing indicator for the next speaker
  const nxt = lines.find((l) => l.start - 0.12 > t);
  const prv = idx >= 0 ? lines[idx] : null;
  const showTyping = nxt && nxt.start - t < 1.0 && (!prv || nxt.start - prv.end > 0.25) && t >= stageIn + 0.3;
  const round = switchAt(t).round;
  return (
    <>
      <div style={{position: 'absolute', left: 44, right: 44, top: 985, display: 'flex', alignItems: 'center', gap: 14}}>
        <div style={{width: 18, height: 18, borderRadius: 9, background: '#FF3B3B', opacity: 0.55 + 0.45 * Math.abs(Math.sin(frame * 0.12))}} />
        <div style={{fontFamily: UI, fontSize: 30, color: '#fff', letterSpacing: 4}}>LIVE BATTLE CHAT</div>
        <div style={{flex: 1, height: 3, background: '#ffffff22'}} />
        <div style={{fontFamily: UI, fontSize: 30, color: '#8892A6', letterSpacing: 4}}>{`ROUND ${round} / ${SWITCHES.length}`}</div>
      </div>
      {bubbles}
      {showTyping && nxt ? <Typing f={fighterOf(nxt.speaker)} frame={frame} y={SLOT_Y[0]} /> : null}
    </>
  );
};

const InputBar: React.FC<{frame: number}> = ({frame}) => (
  <div
    style={{
      position: 'absolute',
      left: 44,
      right: 44,
      top: 1768,
      height: 96,
      borderRadius: 48,
      border: '4px solid #263041',
      background: '#0B0F18',
      display: 'flex',
      alignItems: 'center',
      padding: '0 18px 0 36px',
      gap: 14,
    }}
  >
    <div style={{fontFamily: UI, fontSize: 34, color: '#6B7690', letterSpacing: 2, flex: 1}}>
      WHO'S WINNING? COMMENT {firstName(f1).toUpperCase()} OR {firstName(f2).toUpperCase()}
      <span style={{opacity: Math.floor(frame / 12) % 2 ? 1 : 0, color: '#fff'}}>|</span>
    </div>
    {[f1, f2].map((f) => (
      <div key={f.id} style={{background: f.color, color: INK, borderRadius: 30, padding: '10px 26px', fontFamily: UI, fontSize: 30, letterSpacing: 2}}>
        {firstName(f)}
      </div>
    ))}
  </div>
);

// ---------- HUD ----------
const Hud: React.FC<{t: number; frame: number; kick: number}> = ({t, frame, kick}) => {
  const p = vibe(t);
  const bx = 60;
  const bw = W - 120;
  const x = bw * p;
  const lead = Math.round(p * 100);
  return (
    <>
      <div style={{position: 'absolute', left: 60, right: 60, top: 38, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{fontFamily: UI, fontSize: 46, color: f1.color, letterSpacing: 2}}>{f1.name}</div>
        <div style={{fontFamily: FUN, fontSize: 52, color: '#fff', letterSpacing: 2}}>VS</div>
        <div style={{fontFamily: UI, fontSize: 46, color: f2.color, letterSpacing: 2}}>{f2.name}</div>
      </div>
      <div style={{position: 'absolute', left: 0, width: W, top: 104, textAlign: 'center', fontFamily: UI, fontSize: 24, color: '#8892A6', letterSpacing: 8}}>
        VIBE METER
      </div>
      <svg width={bw} height={56} style={{position: 'absolute', left: bx, top: 138}}>
        <rect x={0} y={0} width={bw} height={56} rx={14} fill="#0B0F18" />
        <polygon points={`0,0 ${x + 16},0 ${x - 16},56 0,56`} fill={f1.color} />
        <polygon points={`${bw},0 ${x + 16},0 ${x - 16},56 ${bw},56`} fill={f2.color} />
        <polygon points={`${x + 20},-6 ${x + 8},-6 ${x - 24},62 ${x - 12},62`} fill="#fff" fillOpacity={0.9 + 0.1 * kick} />
        <rect x={0} y={0} width={bw} height={56} rx={14} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={4} />
        <text x={26} y={42} fontFamily={UI} fontSize={36} fill={INK} letterSpacing={2}>{`${lead}%`}</text>
        <text x={bw - 26} y={42} fontFamily={UI} fontSize={36} fill={INK} letterSpacing={2} textAnchor="end">{`${100 - lead}%`}</text>
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: H,
          border: `${6 + Math.round(8 * kick)}px solid ${switchAt(t).speaker === 'fighter1' ? f1.color : f2.color}`,
          opacity: 0.16 + 0.3 * kick,
          boxSizing: 'border-box',
        }}
      />
    </>
  );
};

// ---------- reactions ----------
const ThumbUp: React.FC<{color: string; size: number}> = ({color, size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.3l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 7.59 6.59C7.22 6.95 7 7.45 7 8v11c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
      fill={color}
      stroke="#000"
      strokeWidth={1.1}
    />
  </svg>
);

const Reaction: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const e = EV.find((x) => t >= x.t && t < x.t + 1.25);
  if (!e) return null;
  const f = fighterOf(e.speaker);
  const dt = t - e.t;
  const sc = dt < 0.25 ? lerp(2.6, 1, eob(dt / 0.25)) : dt > 1.0 ? lerp(1, 0.01, c01((dt - 1.0) / 0.25)) : 1;
  const rot = (e.s > 0 ? -7 : 7) + Math.sin(frame * 0.5) * 1.2;
  const star = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + frame * 0.01;
    const r = i % 2 ? 250 : 360;
    star.push(`${Math.cos(a) * r},${Math.sin(a) * r}`);
  }
  const text = STICKERS[e.i % STICKERS.length];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: W / 2 - 400, top: 940 - 400, width: 800, height: 800, transform: `scale(${sc}) rotate(${rot}deg)`}}>
        <svg width={800} height={800} viewBox="-400 -400 800 800">
          <polygon points={star.join(' ')} fill={f.color} stroke="#000" strokeWidth={10} strokeLinejoin="round" />
        </svg>
        <div style={{position: 'absolute', left: 0, top: 322, width: 800}}>
          <Pop text={text} size={170} color="#fff" ext={10} stroke={9} />
        </div>
      </div>
      {[0, 1, 2].map((i) => {
        const d = c01((dt - i * 0.12) / 0.9);
        if (d <= 0 || d >= 1) return null;
        const x = (e.s > 0 ? 200 : 880) + (i - 1) * 90 + Math.sin(d * 7 + i) * 24;
        return (
          <div key={i} style={{position: 'absolute', left: x - 40, top: 1250 - d * 520, opacity: 1 - d, transform: `scale(${0.7 + 0.5 * eo(d * 3)})`}}>
            <ThumbUp color={f.color} size={80} />
          </div>
        );
      })}
    </div>
  );
};

// ---------- transitions ----------
const Wipe: React.FC<{t: number}> = ({t}) => {
  const sw = SWITCHES.slice(1).find((s) => t >= s.t - 0.4 && t < s.t + 0.4);
  if (!sw) return null;
  const f = fighterOf(sw.speaker);
  const p = c01((t - (sw.t - 0.4)) / 0.8);
  const x = interpolate(p, [0, 1], [-1900, 1900]);
  const slab: React.CSSProperties = {position: 'absolute', top: -200, height: H + 400, transform: 'skewX(-14deg)'};
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden'}}>
      <div style={{...slab, left: x - 260, width: 1500, background: INK}} />
      <div style={{...slab, left: x, width: 1500, background: f.color}} />
      <div style={{...slab, left: x + 1180, width: 90, background: '#fff'}} />
      <div style={{position: 'absolute', left: x + 750 - W / 2, top: 780, width: W}}>
        <Pop text={`ROUND ${sw.round}`} size={150} color="#fff" ext={8} stroke={8} />
        <div style={{height: 14}} />
        <Pop text={`${firstName(f).toUpperCase()}'S TURN`} size={200} color={INK} ext={0} stroke={0} />
      </div>
    </div>
  );
};

const BOOT = ['> boot arena.exe', '> loading SAM ............ OK', '> loading DARIO .......... OK', '> safety rails: DISABLED', '> hallucinations: ENABLED', '> FIGHT'];
const SPOT = [
  {f: f1, tag: 'SPECIALTY', line: 'SHIPS ON TUESDAYS. NAMES MODELS LIKE WI-FI.'},
  {f: f2, tag: 'SPECIALTY', line: 'FORTY-PAGE ESSAYS. TEACHES BOTS MANNERS.'},
];

const Intro: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const fadeStart = firstStart - 3.2;
  if (t >= firstStart) return null;
  const cover = t < fadeStart ? 1 : 1 - eo((t - fadeStart) / 0.6);
  const out: React.ReactNode[] = [];
  // Phase A: terminal boot
  if (t < 3.6) {
    const chars = Math.floor(t * 44);
    let used = 0;
    const rows = BOOT.map((ln, i) => {
      const take = Math.max(0, Math.min(ln.length, chars - used));
      used += ln.length;
      return (
        <div key={i} style={{fontFamily: 'monospace', fontSize: 38, color: ln.includes('DISABLED') || ln.includes('FIGHT') ? '#FF5A5A' : '#6CFFB0', marginBottom: 18}}>
          {ln.slice(0, take)}
          {take < ln.length && take > 0 ? <span style={{opacity: Math.floor(frame / 5) % 2}}>█</span> : null}
        </div>
      );
    });
    out.push(
      <div key="boot" style={{position: 'absolute', left: 70, top: 220, opacity: t < 1.9 ? 1 : 1 - eo((t - 1.9) / 0.3)}}>
        {rows}
      </div>,
    );
  }
  // Phase B: name slam + VS
  if (t >= 1.9 && t < 3.5) {
    const pL = eob((t - 1.9) / 0.35);
    const pR = eob((t - 2.15) / 0.35);
    const pV = eob((t - 2.6) / 0.25);
    const jit = t > 2.6 ? Math.sin(frame * 2.3) * 5 : 0;
    out.push(
      <div key="slam" style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>
        <div style={{position: 'absolute', left: lerp(-1300, 0, pL), top: 430, width: W, transform: 'rotate(-5deg)'}}>
          <Pop text={firstName(f1).toUpperCase()} size={330} color={f1.color} ext={14} stroke={10} />
        </div>
        <div style={{position: 'absolute', left: lerp(1300, 0, pR), top: 1010, width: W, transform: 'rotate(-5deg)'}}>
          <Pop text={firstName(f2).toUpperCase()} size={330} color={f2.color} ext={14} stroke={10} />
        </div>
        <div style={{position: 'absolute', left: 0, top: 790 + jit, width: W, opacity: pV, transform: `scale(${lerp(3, 1, pV)})`}}>
          <div style={{position: 'absolute', left: -8, top: 0, width: W, opacity: 0.8}}>
            <Pop text="VS" size={250} color="#FF2D55" ext={0} stroke={0} />
          </div>
          <div style={{position: 'absolute', left: 8, top: 0, width: W, opacity: 0.8}}>
            <Pop text="VS" size={250} color="#00E5FF" ext={0} stroke={0} />
          </div>
          <Pop text="VS" size={250} color="#fff" ext={10} stroke={9} />
        </div>
      </div>,
    );
  }
  // Phase C: spotlights
  if (t >= 3.5 && t < fadeStart + 0.3) {
    const seg = t < 3.5 + (fadeStart - 3.5) / 2 ? 0 : 1;
    const segStart = seg === 0 ? 3.5 : 3.5 + (fadeStart - 3.5) / 2;
    const sp = SPOT[seg];
    const p = eob((t - segStart) / 0.3);
    const dir = seg === 0 ? -1 : 1;
    const w = 640;
    const imgH = Math.round((w * 760) / 600);
    out.push(
      <div key="spot" style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <Rays cx={W / 2} cy={820} color={sp.f.color} op={0.16} frame={frame} />
        </svg>
        <div style={{position: 'absolute', left: (W - w) / 2 + dir * lerp(900, 0, p), top: 260, width: w, height: imgH}}>
          <Img src={staticFile(sp.f.mouthSvgs ? sp.f.mouthSvgs[t - segStart > 0.3 ? (Math.floor(frame / 5) % 2 ? 2 : 1) : 0] : sp.f.svg || '')} style={{width: w, height: imgH}} />
        </div>
        <div style={{position: 'absolute', left: 0, top: 1040, width: W, opacity: p, transform: `translateY(${lerp(60, 0, p)}px)`}}>
          <Pop text={sp.f.name} size={120} color="#fff" ext={8} stroke={7} font={UI} />
          <div style={{height: 24}} />
          <div style={{textAlign: 'center', fontFamily: UI, fontSize: 36, color: sp.f.color, letterSpacing: 8}}>{sp.tag}</div>
          <div style={{textAlign: 'center', fontFamily: UI, fontSize: 48, color: '#fff', letterSpacing: 2, padding: '12px 90px 0', lineHeight: 1.2}}>{sp.line}</div>
        </div>
      </div>,
    );
  }
  // Countdown
  const cdStart = firstStart - 2.7;
  if (t >= stageIn) {
    const dRound = eob((t - stageIn) / 0.3);
    out.push(
      <div key="round" style={{position: 'absolute', left: 0, top: 1060, width: W, opacity: dRound, transform: `scale(${lerp(2, 1, dRound)})`}}>
        <Pop text="ROUND 1" size={190} color="#fff" ext={10} stroke={9} />
        <div style={{height: 20}} />
        <div style={{textAlign: 'center', fontFamily: UI, fontSize: 52, color: fighterOf(lines[0].speaker).color, letterSpacing: 6}}>
          {`${firstName(fighterOf(lines[0].speaker)).toUpperCase()} STARTS`}
        </div>
      </div>,
    );
  }
  if (t >= cdStart) {
    const n = 3 - Math.floor((t - cdStart) / 0.9);
    const lp = c01(((t - cdStart) % 0.9) / 0.9);
    if (n >= 1) {
      out.push(
        <div key="cd" style={{position: 'absolute', left: 0, top: 420, width: W, opacity: 1 - lp * 0.85, transform: `scale(${lerp(2.4, 0.9, eo(lp * 1.6))}) rotate(${(n - 2) * 6}deg)`}}>
          <Pop text={String(n)} size={520} color="#FFE14D" ext={14} stroke={12} />
        </div>,
      );
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
  const p = vibe(lastEnd + 3);
  const tie = Math.abs(p - 0.5) < 0.03;
  const lead = p >= 0.5 ? f1 : f2;
  const tt = t - outroStart;
  const cardW = 440;
  const imgH = Math.round((cardW * 760) / 600);
  const cards = [f1, f2].map((f, i) => {
    const pulse = 1 + 0.035 * Math.sin(frame * 0.2 + i * Math.PI);
    const enter = eob((tt - 0.25 - i * 0.15) / 0.4);
    const m = f.mouthSvgs ? f.mouthSvgs[(Math.floor(frame / 9) + i) % 3 === 2 ? 2 : 0] : f.svg || '';
    return (
      <div
        key={f.id}
        style={{
          position: 'absolute',
          left: i === 0 ? 70 : W - 70 - cardW,
          top: 690,
          width: cardW,
          height: imgH + 100,
          border: `7px solid ${f.color}`,
          borderRadius: 36,
          overflow: 'hidden',
          background: `linear-gradient(165deg, ${f.color}55, #0A0D14 75%)`,
          transform: `translateY(${lerp(500, 0, enter)}px) scale(${pulse}) rotate(${i === 0 ? -2 : 2}deg)`,
          opacity: enter,
        }}
      >
        <Img src={staticFile(m)} style={{position: 'absolute', left: 0, top: 0, width: cardW, height: imgH}} />
        <div style={{position: 'absolute', left: 14, top: 12, width: 86, height: 86, borderRadius: 43, background: f.color, border: `5px solid ${INK}`, textAlign: 'center', fontFamily: FUN, fontSize: 70, lineHeight: '84px', color: INK}}>
          {i === 0 ? 'A' : 'B'}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 100, background: f.color, textAlign: 'center', fontFamily: UI, fontSize: 56, lineHeight: '100px', color: INK, letterSpacing: 3}}>
          {f.name}
        </div>
      </div>
    );
  });
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>
      <div style={{position: 'absolute', inset: 0, background: INK, opacity: o}} />
      <div style={{position: 'absolute', left: 0, top: 150, width: W, opacity: o, transform: `rotate(-4deg) scale(${lerp(2.2, 1, eob(tt / 0.4))})`}}>
        <Pop text="WHO WON?" size={230} color="#FFE14D" ext={14} stroke={12} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 520, width: W, textAlign: 'center', fontFamily: UI, fontSize: 44, color: '#8892A6', letterSpacing: 6, opacity: o}}>
        {tie ? 'THE VIBE METER ENDED DEAD EVEN. YOU BREAK THE TIE.' : `THE VIBE METER LEANS ${firstName(lead).toUpperCase()}. DO YOU AGREE?`}
      </div>
      {cards}
      <div style={{position: 'absolute', left: 0, top: 1420, width: W, opacity: o, transform: `scale(${1 + 0.04 * Math.sin(frame * 0.25)})`}}>
        <Pop text="COMMENT A OR B" size={150} color="#fff" ext={10} stroke={9} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 1630, width: W, textAlign: 'center', opacity: o}}>
        <div style={{fontFamily: UI, fontSize: 56, color: '#fff', letterSpacing: 4}}>FOLLOW FOR ROUND 2</div>
        <div style={{fontFamily: UI, fontSize: 42, color: f2.color, letterSpacing: 6, marginTop: 14}}>{battle.hashtag}</div>
      </div>
    </div>
  );
};

// ---------- main ----------
export const ChatBattle: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const kick = kickAt(t);
  const sw = switchAt(t);
  const k = eo((t - sw.t) / 0.35);
  const a1 = sw.speaker === 'fighter1' ? 0.35 + 0.65 * k : 1 - 0.65 * k;
  const a2 = sw.speaker === 'fighter2' ? 0.35 + 0.65 * k : 1 - 0.65 * k;
  const line = lines.find((l) => t >= l.start && t < l.end);
  const lvl = Number(mouthStr[frame] || '0');
  const pAgeFor = (spk: 'fighter1' | 'fighter2') => {
    const e = [...EV].reverse().find((x) => x.speaker === spk && t >= x.t);
    return e ? t - e.t : -1;
  };
  const lastEv = [...EV].reverse().find((x) => t >= x.t);
  const sdt = lastEv ? t - lastEv.t : 9;
  const amp = sdt < 0.6 ? 16 * Math.exp(-sdt * 7) : 0;
  const shake = `translate(${Math.sin(sdt * 90) * amp}px, ${Math.cos(sdt * 75) * amp * 0.6}px) rotate(${Math.sin(sdt * 60) * amp * 0.05}deg)`;
  const zoom = 1 + 0.012 * kick;
  const stageOp = c01((t - stageIn + 0.05) / 0.4);
  return (
    <AbsoluteFill style={{background: INK, overflow: 'hidden'}}>
      <Audio src={staticFile(battle.audio.src)} />
      <Backdrop frame={frame} a1={a1} a2={a2} kick={kick} />
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `${shake} scale(${zoom})`, opacity: stageOp}}>
        <Card f={f1} side={0} a={a1} mouth={line && line.speaker === 'fighter1' ? lvl : 0} kick={kick} pAge={pAgeFor('fighter1')} frame={frame} />
        <Card f={f2} side={1} a={a2} mouth={line && line.speaker === 'fighter2' ? lvl : 0} kick={kick} pAge={pAgeFor('fighter2')} frame={frame} />
        <ChatPanel t={t} frame={frame} />
        <InputBar frame={frame} />
        <Reaction t={t} frame={frame} />
      </div>
      <div style={{opacity: stageOp}}>
        <Hud t={t} frame={frame} kick={kick} />
      </div>
      <Wipe t={t} />
      <Intro t={t} frame={frame} />
      <Outro t={t} frame={frame} />
    </AbsoluteFill>
  );
};
