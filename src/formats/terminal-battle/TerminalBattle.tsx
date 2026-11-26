import React from 'react';
import {Audio, AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, interpolate, spring} from 'remotion';
import {loadFonts} from '../../fonts';
import type {BattleManifest} from '../../types';

import battleManifest from '../../../public/battle.json' with {type: 'json'};
const battle = battleManifest as BattleManifest;

loadFonts();

const fps = battle.fps;
const durationInFrames = battle.audio.durationInFrames;
const totalDuration = battle.audio.duration;
const bpm = battle.audio.bpm;
const beats = battle.audio.beats;
const energy = battle.audio.energy;

const f1 = battle.fighters.fighter1;
const f2 = battle.fighters.fighter2;

const fg = '#cdd6f4';
const bg = '#1e1e2e';
const bgPanel = '#181825';
const border = '#313244';
const accentA = f1.color;
const accentB = f2.color;
const comment = '#6c7086';
const keyword = '#cba6f7';
const string = '#a6e3a1';
const number = '#fab387';
const fn = '#89b4fa';
const cursorColor = '#f5e0dc';

const mono = "'JetBrains Mono', 'Fira Code', monospace";

type Speaker = 'fighter1' | 'fighter2' | 'none';

const speakerAt = (time: number): Speaker => {
  const line = battle.captions.find((c) => time >= c.start && time < c.end);
  if (line && (line.speaker === 'fighter1' || line.speaker === 'fighter2')) return line.speaker;
  return 'none';
};

const currentLine = (time: number) => battle.captions.find((c) => time >= c.start && time < c.end);
const prevLine = (time: number) => [...battle.captions].reverse().find((c) => time >= c.end && time - c.end < 1.0);

const getBassLevel = (time: number): number => {
  for (let i = 1; i < energy.length; i++) {
    if (time < energy[i].t) {
      const p = (time - energy[i - 1].t) / (energy[i].t - energy[i - 1].t);
      return energy[i - 1].v + p * (energy[i].v - energy[i - 1].v);
    }
  }
  return energy[energy.length - 1]?.v || 0;
};

const getBeatPhase = (time: number): number => {
  const interval = 60 / bpm;
  return (time % interval) / interval;
};

const mouthStr = battle.audio.mouth || '';

const highlightCode = (code: string): string => {
  return code
    .replace(/\b(git|commit|push|pull|merge|branch|const|let|var|function|return|if|else|while|for|class|extends|export|default|import|from|new|throw|try|catch|typeof|instanceof|async|await)\b/g, `<span style="color:${keyword}">$1</span>`)
    .replace(/\b(console|log|map|forEach|filter|reduce|find|includes|push|pop|shift|unshift|slice|splice|join|split|replace|match|test)\b/g, `<span style="color:${fn}">$1</span>`)
    .replace(/(".*?"|'.*?'|`.*?`)/g, `<span style="color:${string}">$1</span>`)
    .replace(/\b(\d+\.?\d*)\b/g, `<span style="color:${number}">$1</span>`)
    .replace(/(\/\/.*$)/gm, `<span style="color:${comment}">$1</span>`)
    .replace(/\b(Error|throw|catch|failed|FAIL)\b/g, `<span style="color:${accentB};font-weight:bold">$1</span>`)
    .replace(/\b(success|passed|approved|merged|OK)\b/g, `<span style="color:${accentA};font-weight:bold">$1</span>`);
};

const generateFakeLines = (speaker: 'fighter1' | 'fighter2', count: number): string[] => {
  const templates = {
    fighter1: [
      'git commit -m "To code, or not to code: that is the query"',
      'console.log("Whether \'tis nobler in the stack to suffer")',
      'const slings = arrows.of(outrageousFortune);',
      'return this.takeArmsAgainst(seaOfTroubles);',
      'export default class Hamlet extends Tragedy {}',
      'git commit -m "Brevity is the soul of wit, verbosity is bloat"',
      'function insult(target) { return "Thou art a " + adjectives[Math.floor(Math.random()*adjectives.length)]; }',
      'const fool = new Villain({ tongue: "poison", wit: 0 });',
      "throw new Error('A plague o\\' both your houses!');",
      'git commit -m "All the world\'s a stage, this terminal my Globe"',
      'const exit = (code) => { console.log("The rest is silence"); process.exit(code); };',
      'mergeRequest.approve(); // "Good night, sweet prince"',
    ],
    fighter2: [
      'git commit -m "Lose yourself in the moment, own it"',
      'if (this.opportunity.comesOnce) { this.loseIt(); }',
      'const knees = weak; const palms = sweaty; const mom = spaghetti;',
      'while (this.mic.inHand) { this.snapBackToReality(); }',
      'export default class SlimShady extends RapGod {}',
      'git commit -m "No apologies, I am whatever you say I am"',
      'if (!this.care) { return "I am whatever you say I am"; }',
      'this.lyrics.map(bar => bar.toUpperCase()).forEach(scream);',
      'process.exit(0); // NO MERCY',
      'git commit -m "Till I collapse, I\'m spitting these bars"',
      'while (this.breathing) { this.rapping = true; }',
    ],
  };
  const arr = templates[speaker];
  return Array.from({length: count}, (_, i) => arr[i % arr.length]);
};

const allFakeLines = [
  ...generateFakeLines('fighter1', 12).map((text, i) => ({speaker: 'fighter1' as const, text, idx: i})),
  ...generateFakeLines('fighter2', 11).map((text, i) => ({speaker: 'fighter2' as const, text, idx: i})),
];

export const TerminalBattle: React.FC = () => {
  const frame = useCurrentFrame();
  const time = frame / fps;
  const speaker = speakerAt(time);
  const line = currentLine(time);
  const bassLevel = getBassLevel(time);
  const beatPhase = getBeatPhase(time);
  const mouthLevel = Number(mouthStr[frame] || '0');

  const beatKick = Math.exp(-beatPhase * 6);
  const camScale = 1 + beatKick * 0.015;
  const shakeX = Math.sin(frame * 2.7) * 8 * bassLevel;
  const shakeY = Math.cos(frame * 3.3) * 5 * bassLevel;

  const introEnd = battle.intro.end;
  const outroStart = battle.outro.start;
  const inIntro = time < introEnd;
  const inOutro = time >= outroStart;

  const typedProgress = line ? Math.min(1, (time - line.start) / Math.max(0.1, line.end - line.start)) : 0;
  const typedChars = line ? Math.floor(line.text.length * typedProgress) : 0;
  const displayText = line ? line.text.slice(0, typedChars) : '';

  const outputLines = battle.captions
    .filter(c => c.end <= time && (c.speaker === 'fighter1' || c.speaker === 'fighter2'))
    .slice(-15);

  const commitHistory = allFakeLines
    .filter((_, i) => i < Math.floor(time * 0.3) + 1)
    .slice(-8);

  const roundNum = battle.captions
    .filter(c => c.start <= time && (c.speaker === 'fighter1' || c.speaker === 'fighter2'))
    .reduce((acc, c, i, arr) => {
      if (i === 0) return 1;
      if (arr[i - 1].speaker !== c.speaker) return acc + 1;
      return acc;
    }, 1);

  const barsF1 = battle.captions.filter(c => c.speaker === 'fighter1' && c.end <= time).length;
  const barsF2 = battle.captions.filter(c => c.speaker === 'fighter2' && c.end <= time).length;
  const commitsF1 = Math.floor(barsF1 * 1.2);
  const commitsF2 = Math.floor(barsF2 * 1.2);

  return (
    <>
      <Audio src={staticFile(battle.audio.src)} />
      <AbsoluteFill
        style={{
          background: bg,
          transform: `translate(${shakeX}px, ${shakeY}px) scale(${camScale})`,
          fontFamily: mono,
          color: fg,
          overflow: 'hidden',
        }}
      >
        {/* INTRO SCREEN */}
        {inIntro && (
          <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px', padding: '40px'}}>
            <div style={{fontSize: '72px', fontWeight: '900', letterSpacing: '-0.02em', lineHeight: 1.1, textAlign: 'center'}}>
              <span style={{color: accentA}}>{f1.name.toUpperCase()}</span>{' '}
              <span style={{color: comment}}>VS</span>{' '}
              <span style={{color: accentB}}>{f2.name.toUpperCase()}</span>
            </div>
            <div style={{fontSize: '24px', color: comment, maxWidth: '800px', textAlign: 'center'}}>
              TERMINAL BATTLE · GIT COMMIT RAP BATTLE · COMPILING VERSES...
            </div>
            <div style={{width: '400px', height: '4px', background: border, borderRadius: '2px', overflow: 'hidden', marginTop: '32px'}}>
              <div
                style={{
                  height: '100%',
                  background: `linear-gradient(90deg, ${accentA}, ${accentB})`,
                  borderRadius: '2px',
                  transformOrigin: 'left',
                  transform: `scaleX(${spring({frame, fps, config: {damping: 30, stiffness: 100}})})`,
                }}
              />
            </div>
          </AbsoluteFill>
        )}

        {/* MAIN TERMINAL */}
        {!inIntro && !inOutro && (
          <>
            {/* VS PANEL - Top */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '40px',
                padding: '0 40px',
                zIndex: 10,
              }}
            >
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'}}>
                <div
                  style={{
                    width: '70px', height: '70px', borderRadius: '50%',
                    border: `3px solid ${border}`, background: bgPanel,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', overflow: 'hidden',
                    transform: speaker === 'fighter1' ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.2s',
                  }}
                >
                  🎭
                </div>
                <div style={{fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: accentA}}>
                  {f1.name.toUpperCase()}
                </div>
                <div style={{display: 'flex', gap: '16px', fontSize: '10px', color: comment}}>
                  <div>BARS: <span style={{color: fg, fontWeight: '600'}}>{barsF1}</span></div>
                  <div>COMMITS: <span style={{color: fg, fontWeight: '600'}}>{commitsF1}</span></div>
                </div>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'}}>
                <div style={{fontSize: '20px', fontWeight: '900', color: comment, letterSpacing: '0.1em'}}>VS</div>
                <div style={{fontSize: '12px', color: fg}}>ROUND {roundNum} / 3</div>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'}}>
                <div
                  style={{
                    width: '70px', height: '70px', borderRadius: '50%',
                    border: `3px solid ${border}`, background: bgPanel,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', overflow: 'hidden',
                    transform: speaker === 'fighter2' ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.2s',
                  }}
                >
                  🎤
                </div>
                <div style={{fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: accentB}}>
                  {f2.name.toUpperCase()}
                </div>
                <div style={{display: 'flex', gap: '16px', fontSize: '10px', color: comment}}>
                  <div>BARS: <span style={{color: fg, fontWeight: '600'}}>{barsF2}</span></div>
                  <div>COMMITS: <span style={{color: fg, fontWeight: '600'}}>{commitsF2}</span></div>
                </div>
              </div>
            </div>

            {/* TERMINAL WINDOW */}
            <div
              style={{
                position: 'absolute',
                top: '110px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '1000px',
                height: '700px',
                background: bgPanel,
                border: `1px solid ${border}`,
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div
                style={{
                  height: '36px', background: '#1e1e2e', borderBottom: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px',
                }}
              >
                <div style={{display: 'flex', gap: '6px'}}>
                  <div style={{width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57'}}/>
                  <div style={{width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e'}}/>
                  <div style={{width: '12px', height: '12px', borderRadius: '50%', background: '#28ca42'}}/>
                </div>
                <div style={{flex: 1, textAlign: 'center', fontSize: '11px', color: comment}}>rap-battle.sh — main branch</div>
                <div style={{display: 'flex', gap: '4px'}}>
                  <button style={{padding: '4px 12px', background: 'transparent', border: 'none', color: fg, fontFamily: mono, fontSize: '10px', borderRadius: '4px 4px 0 0'}}>shakespeare</button>
                  <button style={{padding: '4px 12px', background: 'transparent', border: 'none', color: comment, fontFamily: mono, fontSize: '10px', borderRadius: '4px 4px 0 0'}}>eminem</button>
                  <button style={{padding: '4px 12px', background: 'transparent', border: 'none', color: comment, fontFamily: mono, fontSize: '10px', borderRadius: '4px 4px 0 0'}}>diff</button>
                  <button style={{padding: '4px 12px', background: 'transparent', border: 'none', color: comment, fontFamily: mono, fontSize: '10px', borderRadius: '4px 4px 0 0'}}>git log</button>
                </div>
              </div>

              {/* Body */}
              <div style={{flex: 1, display: 'flex', overflow: 'hidden'}}>
                {/* Sidebar - Commit History */}
                <div style={{width: '260px', background: '#1e1e2e', borderRight: `1px solid ${border}`, padding: '12px', overflowY: 'auto'}}>
                  <div style={{fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: comment, marginBottom: '8px'}}>RECENT COMMITS</div>
                  {commitHistory.slice().reverse().map((commit, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 10px', background: bgPanel, borderRadius: '6px', marginBottom: '6px',
                        borderLeft: `3px solid ${commit.speaker === 'fighter1' ? accentA : accentB}`,
                      }}
                    >
                      <div style={{fontSize: '9px', color: comment, marginBottom: '2px'}}>
                        {commit.speaker === 'fighter1' ? 'sha' : 'emn'}{commit.idx.toString(16).padStart(4, '0')}
                      </div>
                      <div style={{fontSize: '11px', color: fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {commit.text.substring(0, 35)}{commit.text.length > 35 ? '…' : ''}
                      </div>
                      <div style={{fontSize: '9px', color: commit.speaker === 'fighter1' ? accentA : accentB, marginTop: '2px'}}>
                        {commit.speaker === 'fighter1' ? 'William Shakespeare' : 'Marshall Mathers'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Pane */}
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden'}}>
                  {/* Output Area */}
                  <div style={{flex: 1, overflowY: 'auto', fontSize: '12px', lineHeight: 1.5, marginBottom: '8px'}}>
                    {outputLines.map((l, i) => (
                      <div key={i} style={{marginBottom: '4px', display: 'flex', gap: '8px'}}>
                        <span style={{color: l.speaker === 'fighter1' ? accentA : accentB, whiteSpace: 'nowrap'}}>
                          {l.speaker === 'fighter1' ? 'shakespeare@globe:~$' : 'eminem@8mile:~$'}
                        </span>
                        <span dangerouslySetInnerHTML={{__html: highlightCode(l.text)}}/>
                      </div>
                    ))}
                    {/* Current typing line */}
                    {line && (
                      <div style={{display: 'flex', gap: '8px', marginBottom: '4px'}}>
                        <span style={{color: speaker === 'fighter1' ? accentA : accentB, whiteSpace: 'nowrap'}}>
                          {speaker === 'fighter1' ? 'shakespeare@globe:~$' : 'eminem@8mile:~$'}
                        </span>
                        <span dangerouslySetInnerHTML={{__html: highlightCode(displayText)}}/>
                        <span
                          style={{
                            width: '8px', height: '20px', background: cursorColor,
                            animation: 'blink 1s infinite', display: 'inline-block', marginLeft: '2px',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Prompt Line (when not typing) */}
                  {!line && (
                    <div style={{display: 'flex', gap: '8px', alignItems: 'baseline'}}>
                      <span style={{color: accentA, whiteSpace: 'nowrap'}}>shakespeare@globe:~$</span>
                      <span className="cursor" style={{width: '8px', height: '20px', background: cursorColor, animation: 'blink 1s infinite', display: 'inline-block'}}/>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Bar */}
              <div
                style={{
                  height: '28px', background: '#1e1e2e', borderTop: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', padding: '0 12px', gap: '16px',
                  fontSize: '10px', color: comment,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <div
                    style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: speaker !== 'none' ? (speaker === 'fighter1' ? accentA : accentB) : comment,
                      animation: speaker !== 'none' ? 'pulse 1s infinite' : 'none',
                    }}
                  />
                  <span>{speaker !== 'none' ? (speaker === 'fighter1' ? 'Compiling verse...' : 'Spitting bars...') : 'Idle'}</span>
                </div>
                <div>Branch: main</div>
                <div>Lines: {outputLines.length + (line ? 1 : 0)}</div>
                <div>Beat: {beats.filter(b => b <= time).length}/{beats.length}</div>
              </div>
            </div>

            {/* Beat Flash Overlay */}
            <AbsoluteFill
              style={{
                background: `radial-gradient(circle at center, ${speaker === 'fighter1' ? `${accentA}30` : `${accentB}30`} 0%, transparent 70%)`,
                opacity: beatKick * 0.5,
                pointerEvents: 'none',
              }}
            />
          </>
        )}

        {/* OUTRO SCREEN */}
        {inOutro && (
          <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, gap: '32px', padding: '40px'}}>
            <div style={{fontSize: '72px', fontWeight: '900', letterSpacing: '-0.02em', lineHeight: 1.1, textAlign: 'center'}}>
              <span style={{color: accentA}}>{f1.name.toUpperCase()}</span>{' '}
              <span style={{color: comment}}>VS</span>{' '}
              <span style={{color: accentB}}>{f2.name.toUpperCase()}</span>
            </div>
            <div style={{fontSize: '24px', color: comment, maxWidth: '800px', textAlign: 'center'}}>
              PUSH TO ORIGIN? · MERGE CONFLICT DETECTED · WHO WON?
            </div>
            <div style={{width: '400px', height: '4px', background: border, borderRadius: '2px', overflow: 'hidden'}}>
              <div style={{height: '100%', background: `linear-gradient(90deg, ${accentA}, ${accentB})`, borderRadius: '2px', transform: 'scaleX(1)'}}/>
            </div>
          </AbsoluteFill>
        )}

      </AbsoluteFill>
    </>
  );
};