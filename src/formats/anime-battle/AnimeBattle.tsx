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

const accentA = f1.color;
const accentB = f2.color;
const bgDark = '#0a0a0f';
const bgPanel = '#11111a';
const white = '#ffffff';
const red = '#ff2d2d';
const yellow = '#ffdd00';
const cyan = '#00ffff';

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

const speakerAt = (time: number): 'fighter1' | 'fighter2' | 'none' => {
  const line = battle.captions.find((c) => time >= c.start && time < c.end);
  if (line && (line.speaker === 'fighter1' || line.speaker === 'fighter2')) return line.speaker;
  return 'none';
};

const currentLine = (time: number) => battle.captions.find((c) => time >= c.start && time < c.end);

const mouthStr = battle.audio.mouth || '';

const roundTransitions = battle.captions
  .filter(c => c.speaker === 'fighter1' || c.speaker === 'fighter2')
  .reduce((acc: {time: number; speaker: 'fighter1' | 'fighter2'}[], c, i, arr) => {
    if (i === 0 || arr[i - 1].speaker !== c.speaker) {
      acc.push({time: c.start, speaker: c.speaker as 'fighter1' | 'fighter2'});
    }
    return acc;
  }, []);

const punchlineImpacts = battle.captions
  .filter(c => c.punchline && c.words.length > 0)
  .map(c => c.words[c.words.length - 1].start);

const getPunchIntensity = (time: number): number => {
  let max = 0;
  for (const t of punchlineImpacts) {
    const dt = time - t;
    if (dt >= 0 && dt < 0.6) max = Math.max(max, 1 - dt / 0.6);
  }
  return max;
};

const speedLineCount = 24;
const speedLines = Array.from({length: speedLineCount}, (_, i) => ({
  angle: (i / speedLineCount) * Math.PI * 2,
  offset: ((i * 137) % 1000),
  length: 0.3 + ((i * 53) % 70) / 100,
  thickness: 1 + ((i * 29) % 3),
  color: i % 2 === 0 ? accentA : accentB,
}));

const panelShake = (time: number, intensity: number) => {
  const shakeX = Math.sin(time * 47) * 15 * intensity;
  const shakeY = Math.cos(time * 53) * 10 * intensity;
  return {x: shakeX, y: shakeY};
};

export const AnimeBattle: React.FC = () => {
  const frame = useCurrentFrame();
  const time = frame / fps;
  const speaker = speakerAt(time);
  const line = currentLine(time);
  const bassLevel = getBassLevel(time);
  const beatPhase = getBeatPhase(time);
  const mouthLevel = Number(mouthStr[frame] || '0');
  const punchIntensity = getPunchIntensity(time);
  const beatKick = Math.exp(-beatPhase * 6);

  const currentRound = roundTransitions
    .slice()
    .reverse()
    .find(r => time >= r.time);
  const roundNum = roundTransitions.filter(r => r.time <= time).length;

  const inIntro = time < battle.intro.end;
  const inOutro = time >= battle.outro.start;

  const shake = panelShake(time, bassLevel * 0.5 + punchIntensity * 0.5);
  const camScale = 1 + beatKick * 0.02 + punchIntensity * 0.03;
  const flashWhite = punchIntensity > 0.4 ? (punchIntensity - 0.4) / 0.6 : 0;

  const typedProgress = line ? Math.min(1, (time - line.start) / Math.max(0.1, line.end - line.start)) : 0;
  const displayText = line ? line.text.slice(0, Math.floor(line.text.length * typedProgress)) : '';

  return (
    <>
      <Audio src={staticFile(battle.audio.src)} />
      <AbsoluteFill
        style={{
          background: bgDark,
          transform: `translate(${shake.x}px, ${shake.y}px) scale(${camScale})`,
          overflow: 'hidden',
        }}
      >
        {/* BACKGROUND: Speed Lines */}
        <AbsoluteFill style={{opacity: 0.15 + bassLevel * 0.3 + punchIntensity * 0.5, pointerEvents: 'none'}}>
          {speedLines.map((sl, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: '2px',
                height: `${sl.length * 1200}px`,
                background: sl.color,
                transformOrigin: 'center top',
                transform: `translate(-50%, -50%) rotate(${sl.angle}rad) translateY(${-sl.offset - time * 300}px)`,
                opacity: 0.6 + bassLevel * 0.4,
              }}
            />
          ))}
        </AbsoluteFill>

        {/* BACKGROUND: Halftone Dots */}
        <AbsoluteFill style={{opacity: 0.08, pointerEvents: 'none', backgroundImage: `radial-gradient(circle at 20% 30%, ${accentA} 1px, transparent 2px), radial-gradient(circle at 80% 70%, ${accentB} 1px, transparent 2px)`, backgroundSize: '40px 40px'}} />

        {/* INTRO: Title Card */}
        {inIntro && (
          <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '40px'}}>
            <div style={{fontSize: '88px', fontWeight: '900', letterSpacing: '-0.02em', lineHeight: 1.05, textAlign: 'center', textTransform: 'uppercase'}}>
              <span style={{color: accentA, textShadow: `0 0 30px ${accentA}, 0 0 60px ${accentA}`}}>{f1.name.toUpperCase()}</span>
              <br/>
              <span style={{color: red, fontSize: '48px', margin: '0 20px', textShadow: `0 0 20px ${red}`}}>VS</span>
              <br/>
              <span style={{color: accentB, textShadow: `0 0 30px ${accentB}, 0 0 60px ${accentB}`}}>{f2.name.toUpperCase()}</span>
            </div>
            <div style={{fontSize: '28px', color: white, letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: '0 0 20px #fff'}}>
              RAP BATTLE · MANGA EDITION
            </div>
            <div style={{width: '500px', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden', marginTop: '20px', boxShadow: `0 0 20px ${accentA}`}}>
              <div
                style={{
                  height: '100%', background: `linear-gradient(90deg, ${accentA}, ${accentB})`,
                  borderRadius: '3px', transformOrigin: 'left',
                  transform: `scaleX(${spring({frame, fps, config: {damping: 20, stiffness: 80}})})`,
                }}
              />
            </div>
          </AbsoluteFill>
        )}

        {/* MAIN BATTLE: Split Screen Panels */}
        {!inIntro && !inOutro && (
          <>
            {/* LEFT PANEL - Fighter 1 */}
            <div
              style={{
                position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
                borderRight: `4px solid ${speaker === 'fighter1' ? accentA : '#333'}`,
                background: `linear-gradient(180deg, ${bgPanel} 0%, ${speaker === 'fighter1' ? `${accentA}15` : bgPanel} 100%)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '60px 40px', overflow: 'hidden',
                transform: speaker === 'fighter1' ? 'scale(1.02)' : 'scale(1)',
                transition: 'transform 0.15s',
              }}
            >
              {/* Fighter Name Badge */}
              <div
                style={{
                  position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)',
                  padding: '8px 24px', background: accentA, color: '#000',
                  fontSize: '20px', fontWeight: '900', letterSpacing: '0.15em',
                  borderRadius: '4px', boxShadow: `0 0 30px ${accentA}`,
                  clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)',
                }}
              >
                {f1.name.toUpperCase()}
              </div>

              {/* Avatar Area */}
              <div style={{width: '280px', height: '280px', borderRadius: '50%', border: `6px solid ${accentA}`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px', marginBottom: '30px', boxShadow: `0 0 60px ${accentA}, inset 0 0 60px ${accentA}40`, transform: `scale(${1 + bassLevel * 0.15})`}}>
                🎭
              </div>

              {/* Speech Bubble */}
              {speaker === 'fighter1' && line && (
                <div
                  style={{
                    maxWidth: '500px', minHeight: '120px',
                    background: white, color: '#000', padding: '24px 32px',
                    borderRadius: '24px', fontSize: '28px', fontWeight: '600', lineHeight: 1.4,
                    textAlign: 'center', position: 'relative',
                    boxShadow: `0 0 40px ${accentA}, 0 20px 60px #0008`,
                    clipPath: 'polygon(0 15%, 15% 15%, 18% 0, 21% 15%, 100% 15%, 100% 100%, 0 100%)',
                    animation: 'bubblePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {displayText.toUpperCase()}
                </div>
              )}

              {/* Stats */}
              <div style={{marginTop: '40px', display: 'flex', gap: '60px', color: white, fontSize: '18px'}}>
                <div style={{textAlign: 'center'}}><div style={{fontSize: '36px', fontWeight: '900', color: accentA}}>{battle.captions.filter(c => c.speaker === 'fighter1' && c.end <= time).length}</div><div>BARS</div></div>
                <div style={{textAlign: 'center'}}><div style={{fontSize: '36px', fontWeight: '900', color: accentA}}>{roundTransitions.filter(r => r.speaker === 'fighter1' && r.time <= time).length}</div><div>ROUNDS</div></div>
              </div>

              {/* VU Meter */}
              <div style={{position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px'}}>
                {Array.from({length: 16}, (_, i) => (
                  <div key={i} style={{width: '6px', height: `${20 + Math.sin(time * 10 + i) * 15 + bassLevel * 60}px`, background: `linear-gradient(180deg, ${accentA}, ${yellow})`, borderRadius: '3px'}}/>
                ))}
              </div>
            </div>

            {/* RIGHT PANEL - Fighter 2 */}
            <div
              style={{
                position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
                borderLeft: `4px solid ${speaker === 'fighter2' ? accentB : '#333'}`,
                background: `linear-gradient(180deg, ${bgPanel} 0%, ${speaker === 'fighter2' ? `${accentB}15` : bgPanel} 100%)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '60px 40px', overflow: 'hidden',
                transform: speaker === 'fighter2' ? 'scale(1.02)' : 'scale(1)',
                transition: 'transform 0.15s',
              }}
            >
              <div
                style={{
                  position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)',
                  padding: '8px 24px', background: accentB, color: '#000',
                  fontSize: '20px', fontWeight: '900', letterSpacing: '0.15em',
                  borderRadius: '4px', boxShadow: `0 0 30px ${accentB}`,
                  clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)',
                }}
              >
                {f2.name.toUpperCase()}
              </div>

              <div style={{width: '280px', height: '280px', borderRadius: '50%', border: `6px solid ${accentB}`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px', marginBottom: '30px', boxShadow: `0 0 60px ${accentB}, inset 0 0 60px ${accentB}40`, transform: `scale(${1 + bassLevel * 0.15})`}}>
                🎤
              </div>

              {speaker === 'fighter2' && line && (
                <div
                  style={{
                    maxWidth: '500px', minHeight: '120px',
                    background: white, color: '#000', padding: '24px 32px',
                    borderRadius: '24px', fontSize: '28px', fontWeight: '600', lineHeight: 1.4,
                    textAlign: 'center', position: 'relative',
                    boxShadow: `0 0 40px ${accentB}, 0 20px 60px #0008`,
                    clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%, 0 15%, 82% 15%, 85% 0, 82% 15%)',
                    animation: 'bubblePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {displayText.toUpperCase()}
                </div>
              )}

              <div style={{marginTop: '40px', display: 'flex', gap: '60px', color: white, fontSize: '18px'}}>
                <div style={{textAlign: 'center'}}><div style={{fontSize: '36px', fontWeight: '900', color: accentB}}>{battle.captions.filter(c => c.speaker === 'fighter2' && c.end <= time).length}</div><div>BARS</div></div>
                <div style={{textAlign: 'center'}}><div style={{fontSize: '36px', fontWeight: '900', color: accentB}}>{roundTransitions.filter(r => r.speaker === 'fighter2' && r.time <= time).length}</div><div>ROUNDS</div></div>
              </div>

              <div style={{position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px'}}>
                {Array.from({length: 16}, (_, i) => (
                  <div key={i} style={{width: '6px', height: `${20 + Math.sin(time * 10 + i + 3) * 15 + bassLevel * 60}px`, background: `linear-gradient(180deg, ${accentB}, ${red})`, borderRadius: '3px'}}/>
                ))}
              </div>
            </div>

            {/* CENTER DIVIDER: VS */}
            <div
              style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: '8px', height: '100%', background: `repeating-linear-gradient(180deg, ${red}, ${red} 20px, transparent 20px, transparent 40px)`,
                zIndex: 10, opacity: 0.6 + punchIntensity * 0.4,
              }}
            />
            <div
              style={{
                position: 'absolute', top: '50%', left: '50%',
                fontSize: '72px', fontWeight: '900', color: red, letterSpacing: '0.2em',
                textShadow: `0 0 40px ${red}, 0 0 80px ${red}`, zIndex: 11,
                transform: `translate(-50%, -50%) scale(${1 + punchIntensity * 0.5})`,
              }}
            >
              VS
            </div>

            {/* ROUND CARD */}
            {roundTransitions.map((rt, i) => {
              const dt = time - rt.time;
              if (dt < 0 || dt > 2.5) return null;
              const progress = dt / 2.5;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute', top: '50%', left: '50%',
                    zIndex: 20, pointerEvents: 'none',
                    opacity: progress < 0.2 ? progress * 5 : progress > 0.8 ? (1 - progress) * 5 : 1,
                    transform: `translate(-50%, -50%) scale(${1 + Math.sin(progress * Math.PI) * 0.3})`,
                  }}
                >
                  <div style={{background: rt.speaker === 'fighter1' ? accentA : accentB, color: '#000', padding: '16px 48px', fontSize: '48px', fontWeight: '900', letterSpacing: '0.1em', borderRadius: '8px', clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)', boxShadow: `0 0 60px ${rt.speaker === 'fighter1' ? accentA : accentB}`}}>
                    ROUND {i + 1}
                  </div>
                  <div style={{marginTop: '12px', fontSize: '28px', color: white, fontWeight: '600', textShadow: '0 0 20px #fff'}}>
                    {rt.speaker === 'fighter1' ? f1.name.toUpperCase() : f2.name.toUpperCase()}
                  </div>
                </div>
              );
            })}

            {/* IMPACT FLASH */}
            {punchlineImpacts.map((pt, i) => {
              const dt = time - pt;
              if (dt < 0 || dt > 0.4) return null;
              const intensity = 1 - dt / 0.4;
              return (
                <AbsoluteFill
                  key={i}
                  style={{
                    background: `radial-gradient(circle at center, ${speaker === 'fighter1' ? accentA : accentB} 0%, transparent 70%)`,
                    opacity: intensity * 0.8,
                    pointerEvents: 'none',
                    zIndex: 15,
                  }}
                />
              );
            })}

            {/* WHITE FLASH ON PUNCHLINE */}
            {flashWhite > 0 && (
              <AbsoluteFill style={{background: white, opacity: flashWhite * 0.6, pointerEvents: 'none', zIndex: 30}}/>
            )}

            {/* BEAT PULSE RINGS */}
            <AbsoluteFill style={{pointerEvents: 'none', zIndex: 5}}>
              {beats.map((bt, i) => {
                const dt = time - bt;
                if (dt < 0 || dt > 1.0) return null;
                const radius = dt * 800;
                const opacity = (1 - dt) * 0.4;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute', top: '50%', left: '50%',
                      width: `${radius}px`, height: `${radius}px`,
                      border: `2px solid ${speaker === 'fighter1' ? accentA : accentB}`,
                      borderRadius: '50%', transform: 'translate(-50%, -50%)',
                      opacity, pointerEvents: 'none',
                    }}
                  />
                );
              })}
            </AbsoluteFill>

            {/* SCANLINES OVERLAY */}
            <AbsoluteFill style={{pointerEvents: 'none', opacity: 0.06, backgroundImage: 'repeating-linear-gradient(180deg, transparent, transparent 2px, #000 2px, #000 4px)', backgroundSize: '100% 4px'}} />
          </>
        )}

        {/* OUTRO */}
        {inOutro && (
          <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bgDark, gap: '32px', padding: '40px'}}>
            <div style={{fontSize: '88px', fontWeight: '900', letterSpacing: '-0.02em', lineHeight: 1.05, textAlign: 'center', textTransform: 'uppercase'}}>
              <span style={{color: accentA, textShadow: `0 0 30px ${accentA}`}}>{f1.name.toUpperCase()}</span>
              <br/>
              <span style={{color: red, fontSize: '48px', margin: '0 20px', textShadow: `0 0 20px ${red}`}}>VS</span>
              <br/>
              <span style={{color: accentB, textShadow: `0 0 30px ${accentB}`}}>{f2.name.toUpperCase()}</span>
            </div>
            <div style={{fontSize: '32px', color: yellow, letterSpacing: '0.15em', textTransform: 'uppercase', textShadow: `0 0 30px ${yellow}`}}>
              WHO WON?
            </div>
            <div style={{fontSize: '24px', color: white, maxWidth: '800px', textAlign: 'center'}}>
              MERGE CONFLICT · BOTH LEGENDS STAND · DECIDE IN COMMENTS
            </div>
            <div style={{width: '500px', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden', marginTop: '20px'}}>
              <div style={{height: '100%', background: `linear-gradient(90deg, ${accentA}, ${accentB})`, borderRadius: '3px', transform: 'scaleX(1)'}}/>
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    </>
  );
};