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
const vhsBg = '#0d0d0d';
const vhsText = '#e0e0e0';
const vhsRed = '#ff0033';
const vhsCyan = '#00ffff';
const vhsYellow = '#ffff00';
const vhsGreen = '#00ff33';
const vhsStatic = 'rgba(255,255,255,0.03)';

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

// VHS noise seed based on frame
const noiseSeed = (frame: number) => {
  let x = frame * 1664525 + 1013904223;
  x = (x ^ (x >> 13)) * 0x5bd1e995;
  x = (x ^ (x >> 15)) * 0x5bd1e995;
  return (x >>> 0) / 0xffffffff;
};

const scanlineOffset = (frame: number) => (frame * 2) % 4;

export const VHSBattle: React.FC = () => {
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

  // VHS tracking errors
  const trackingError = Math.sin(time * 7) * 3 * (0.1 + bassLevel * 0.3);
  const vhsJitter = (noiseSeed(frame) - 0.5) * 2 * (0.5 + punchIntensity * 2);
  const colorBleed = Math.sin(time * 11) * 1.5 * (0.2 + bassLevel * 0.3);

  const typedProgress = line ? Math.min(1, (time - line.start) / Math.max(0.1, line.end - line.start)) : 0;
  const displayText = line ? line.text.slice(0, Math.floor(line.text.length * typedProgress)) : '';

  // Simulated VHS timer
  const tapeTime = Math.floor(time * 100) / 100;
  const tapeCounter = `${Math.floor(tapeTime / 60).toString().padStart(2, '0')}:${Math.floor(tapeTime % 60).toString().padStart(2, '0')}.${Math.floor((tapeTime % 1) * 100).toString().padStart(2, '0')}`;

  return (
    <>
      <Audio src={staticFile(battle.audio.src)} />
      <AbsoluteFill
        style={{
          background: vhsBg,
          transform: `translate(${trackingError + vhsJitter}px, ${vhsJitter}px) skewX(${colorBleed}deg)`,
          overflow: 'hidden',
          fontFamily: "'VT323', 'Courier New', monospace",
        }}
      >
        {/* VHS STATIC OVERLAY */}
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            opacity: 0.02 + bassLevel * 0.03 + punchIntensity * 0.05,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 1080 1920' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />

        {/* SCANLINES */}
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            opacity: 0.15,
            backgroundImage: 'repeating-linear-gradient(180deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
            backgroundSize: '100% 4px',
            transform: `translateY(${scanlineOffset(frame)}px)`,
          }}
        />

        {/* RGB SHIFT ON PUNCHLINES */}
        {punchIntensity > 0.3 && (
          <>
            <AbsoluteFill
              style={{
                pointerEvents: 'none', opacity: punchIntensity * 0.15,
                background: accentA, mixBlendMode: 'screen',
                transform: `translate(${punchIntensity * 8}px, 0)`,
              }}
            />
            <AbsoluteFill
              style={{
                pointerEvents: 'none', opacity: punchIntensity * 0.15,
                background: accentB, mixBlendMode: 'screen',
                transform: `translate(${-punchIntensity * 8}px, 0)`,
              }}
            />
          </>
        )}

        {/* INTRO: VHS TITLE CARD */}
        {inIntro && (
          <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '40px'}}>
            {/* VHS Header */}
            <div style={{display: 'flex', justifyContent: 'space-between', width: '90%', maxWidth: '900px', color: vhsYellow, fontSize: '18px', fontFamily: 'monospace', letterSpacing: '0.1em'}}>
              <span>REC ●</span>
              <span>SP MODE</span>
              <span>{tapeCounter}</span>
            </div>

            <div style={{fontSize: '64px', fontWeight: '900', letterSpacing: '-0.01em', lineHeight: 1.1, textAlign: 'center', textTransform: 'uppercase', color: vhsText, textShadow: `3px 3px 0 ${vhsRed}, 6px 6px 0 ${vhsCyan}`}}>
              {f1.name.toUpperCase()}
            </div>
            <div style={{fontSize: '48px', color: vhsRed, fontWeight: '900', letterSpacing: '0.3em', textShadow: '3px 3px 0 #000'}}>
              V S
            </div>
            <div style={{fontSize: '64px', fontWeight: '900', letterSpacing: '-0.01em', lineHeight: 1.1, textAlign: 'center', textTransform: 'uppercase', color: vhsText, textShadow: `3px 3px 0 ${vhsCyan}, 6px 6px 0 ${vhsYellow}`}}>
              {f2.name.toUpperCase()}
            </div>

            <div style={{marginTop: '24px', fontSize: '20px', color: vhsGreen, letterSpacing: '0.2em', textTransform: 'uppercase'}}>
              RAP BATTLE · VHS ARCHIVE · 199X
            </div>

            <div style={{width: '600px', height: '8px', background: '#1a1a1a', border: `2px solid ${vhsText}`, marginTop: '32px', position: 'relative', boxShadow: 'inset 0 0 20px #000'}}>
              <div
                style={{
                  height: '100%', background: `linear-gradient(90deg, ${accentA}, ${accentB})`,
                  transformOrigin: 'left',
                  transform: `scaleX(${spring({frame, fps, config: {damping: 15, stiffness: 60}})})`,
                }}
              />
            </div>

            <div style={{marginTop: '16px', fontSize: '16px', color: vhsCyan, fontFamily: 'monospace'}}>
              TRACK 01 · SIDE A · PRESS PLAY ▶
            </div>
          </AbsoluteFill>
        )}

        {/* MAIN BATTLE: VHS SPLIT SCREEN */}
        {!inIntro && !inOutro && (
          <>
            {/* TOP INFO BAR */}
            <div
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '60px',
                background: 'rgba(0,0,0,0.8)', borderBottom: `2px solid ${vhsYellow}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 30px', fontFamily: 'monospace', fontSize: '16px', zIndex: 20,
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '20px', color: vhsYellow}}>
                <span style={{animation: 'blink 1s infinite'}}>● REC</span>
                <span>{tapeCounter}</span>
                <span style={{color: vhsGreen}}>AUDIO: HI-FI STEREO</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
                <span style={{color: speaker === 'fighter1' ? accentA : vhsText}}>{f1.name.toUpperCase()}</span>
                <span style={{color: vhsRed, fontSize: '24px', fontWeight: '900', textShadow: '0 0 10px #ff0033'}}>VS</span>
                <span style={{color: speaker === 'fighter2' ? accentB : vhsText}}>{f2.name.toUpperCase()}</span>
              </div>
            </div>

            {/* LEFT PANEL - Fighter 1 */}
            <div
              style={{
                position: 'absolute', top: '60px', left: 0, width: '50%', height: 'calc(100% - 140px)',
                borderRight: `3px solid ${speaker === 'fighter1' ? accentA : vhsText}`,
                background: `linear-gradient(180deg, #111 0%, ${speaker === 'fighter1' ? `${accentA}10` : '#111'} 100%)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '40px', overflow: 'hidden',
              }}
            >
              {/* Name Plate */}
              <div
                style={{
                  background: speaker === 'fighter1' ? accentA : '#222', color: '#000',
                  padding: '8px 24px', fontSize: '22px', fontWeight: '900', letterSpacing: '0.1em',
                  border: `2px solid ${vhsText}`, clipPath: 'polygon(8% 0, 100% 0, 100% 100%, 0 100%, 0 0)',
                  marginBottom: '24px', textShadow: speaker === 'fighter1' ? '2px 2px 0 #000' : 'none',
                }}
              >
                {f1.name.toUpperCase()}
              </div>

              {/* CRT Screen Effect */}
              <div style={{width: '320px', height: '320px', border: `4px solid ${vhsText}`, borderRadius: '12px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px', position: 'relative', marginBottom: '24px', boxShadow: `inset 0 0 60px #000, 0 0 30px ${speaker === 'fighter1' ? accentA : 'transparent'}`}}>
                <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.1) 50%)', backgroundSize: '100% 4px', pointerEvents: 'none', borderRadius: '8px'}}/>
                🎭
              </div>

              {/* Speech Box */}
              {speaker === 'fighter1' && line && (
                <div
                  style={{
                    maxWidth: '480px', minHeight: '100px',
                    background: '#000', color: vhsGreen, border: `2px solid ${vhsGreen}`,
                    padding: '20px 24px', fontSize: '22px', fontWeight: '600', lineHeight: 1.5,
                    fontFamily: 'monospace', textAlign: 'left',
                    boxShadow: `0 0 20px ${vhsGreen}, inset 0 0 20px ${vhsGreen}20`,
                    position: 'relative',
                    clipPath: 'polygon(0 10px, 10px 10px, 10px 0, 20px 10px, calc(100% - 10px) 10px, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                  }}
                >
                  {'>'} {displayText.toUpperCase()}
                  <div style={{position: 'absolute', bottom: '-8px', left: '20px', width: '16px', height: '16px', background: vhsGreen, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)'}}/>
                </div>
              )}

              {/* VU Meter */}
              <div style={{marginTop: '24px', display: 'flex', gap: '3px', alignItems: 'flex-end', height: '60px'}}>
                {Array.from({length: 20}, (_, i) => (
                  <div key={i} style={{width: '10px', flex: 1, background: `linear-gradient(0deg, ${vhsGreen}, ${vhsYellow}, ${vhsRed})`, height: `${15 + Math.sin(time * 15 + i * 0.5) * 10 + bassLevel * 40}px`, borderRadius: '2px 2px 0 0', opacity: 0.8 + bassLevel * 0.2}}/>
                ))}
              </div>

              {/* Stats */}
              <div style={{marginTop: '16px', color: vhsText, fontSize: '14px', fontFamily: 'monospace', display: 'flex', gap: '30px'}}>
                <span>BARS: <span style={{color: accentA, fontWeight: '900'}}>{battle.captions.filter(c => c.speaker === 'fighter1' && c.end <= time).length}</span></span>
                <span>ROUNDS: <span style={{color: accentA, fontWeight: '900'}}>{roundTransitions.filter(r => r.speaker === 'fighter1' && r.time <= time).length}</span></span>
              </div>
            </div>

            {/* RIGHT PANEL - Fighter 2 */}
            <div
              style={{
                position: 'absolute', top: '60px', right: 0, width: '50%', height: 'calc(100% - 140px)',
                borderLeft: `3px solid ${speaker === 'fighter2' ? accentB : vhsText}`,
                background: `linear-gradient(180deg, #111 0%, ${speaker === 'fighter2' ? `${accentB}10` : '#111'} 100%)`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '40px', overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: speaker === 'fighter2' ? accentB : '#222', color: '#000',
                  padding: '8px 24px', fontSize: '22px', fontWeight: '900', letterSpacing: '0.1em',
                  border: `2px solid ${vhsText}`, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 8% 100%, 0 100%)',
                  marginBottom: '24px', textShadow: speaker === 'fighter2' ? '2px 2px 0 #000' : 'none',
                }}
              >
                {f2.name.toUpperCase()}
              </div>

              <div style={{width: '320px', height: '320px', border: `4px solid ${vhsText}`, borderRadius: '12px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '100px', position: 'relative', marginBottom: '24px', boxShadow: `inset 0 0 60px #000, 0 0 30px ${speaker === 'fighter2' ? accentB : 'transparent'}`}}>
                <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.1) 50%)', backgroundSize: '100% 4px', pointerEvents: 'none', borderRadius: '8px'}}/>
                🎤
              </div>

              {speaker === 'fighter2' && line && (
                <div
                  style={{
                    maxWidth: '480px', minHeight: '100px',
                    background: '#000', color: vhsCyan, border: `2px solid ${vhsCyan}`,
                    padding: '20px 24px', fontSize: '22px', fontWeight: '600', lineHeight: 1.5,
                    fontFamily: 'monospace', textAlign: 'left',
                    boxShadow: `0 0 20px ${vhsCyan}, inset 0 0 20px ${vhsCyan}20`,
                    position: 'relative',
                    clipPath: 'polygon(10px 0, calc(100% - 10px) 0, calc(100% - 10px) 10px, 100% 10px, 100% 100%, 0 100%)',
                  }}
                >
                  {'>'} {displayText.toUpperCase()}
                  <div style={{position: 'absolute', bottom: '-8px', right: '20px', width: '16px', height: '16px', background: vhsCyan, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)'}}/>
                </div>
              )}

              <div style={{marginTop: '24px', display: 'flex', gap: '3px', alignItems: 'flex-end', height: '60px'}}>
                {Array.from({length: 20}, (_, i) => (
                  <div key={i} style={{width: '10px', flex: 1, background: `linear-gradient(0deg, ${vhsCyan}, ${vhsYellow}, ${vhsRed})`, height: `${15 + Math.sin(time * 15 + i * 0.5 + 3) * 10 + bassLevel * 40}px`, borderRadius: '2px 2px 0 0', opacity: 0.8 + bassLevel * 0.2}}/>
                ))}
              </div>

              <div style={{marginTop: '16px', color: vhsText, fontSize: '14px', fontFamily: 'monospace', display: 'flex', gap: '30px'}}>
                <span>BARS: <span style={{color: accentB, fontWeight: '900'}}>{battle.captions.filter(c => c.speaker === 'fighter2' && c.end <= time).length}</span></span>
                <span>ROUNDS: <span style={{color: accentB, fontWeight: '900'}}>{roundTransitions.filter(r => r.speaker === 'fighter2' && r.time <= time).length}</span></span>
              </div>
            </div>

            {/* BOTTOM BAR */}
            <div
              style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
                background: 'rgba(0,0,0,0.9)', borderTop: `2px solid ${vhsYellow}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 30px', fontFamily: 'monospace', fontSize: '14px', zIndex: 20,
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: '16px', color: vhsGreen}}>
                <span>TRACK: RAP_BATTLE_01</span>
                <span>SIDE: {roundNum % 2 === 1 ? 'A' : 'B'}</span>
                <span>ROUND: {roundNum}/3</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '16px', color: vhsCyan}}>
                <span>BPM: {bpm}</span>
                <span>BEAT: {beats.filter(b => b <= time).length}/{beats.length}</span>
                <span style={{color: speaker === 'fighter1' ? accentA : speaker === 'fighter2' ? accentB : vhsText}}>
                  {speaker === 'fighter1' ? '► PLAY' : speaker === 'fighter2' ? '► REC' : '■ STOP'}
                </span>
              </div>
            </div>

            {/* ROUND TRANSITION CARD */}
            {roundTransitions.map((rt, i) => {
              const dt = time - rt.time;
              if (dt < 0 || dt > 3.0) return null;
              const progress = dt / 3.0;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    zIndex: 30, pointerEvents: 'none',
                    opacity: progress < 0.15 ? progress / 0.15 : progress > 0.85 ? (1 - progress) / 0.15 : 1,
                  }}
                >
                  <div style={{
                    background: rt.speaker === 'fighter1' ? accentA : accentB, color: '#000',
                    padding: '16px 40px', fontSize: '42px', fontWeight: '900', letterSpacing: '0.15em',
                    fontFamily: 'monospace', border: `3px solid ${vhsText}`,
                    clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0 100%)',
                    textShadow: '3px 3px 0 #000',
                    transform: `scale(${1 + Math.sin(progress * Math.PI) * 0.2})`,
                  }}>
                    ROUND {i + 1}
                  </div>
                  <div style={{marginTop: '12px', fontSize: '24px', color: vhsYellow, fontWeight: '900', fontFamily: 'monospace', textShadow: '2px 2px 0 #000'}}>
                    {rt.speaker === 'fighter1' ? f1.name.toUpperCase() : f2.name.toUpperCase()}
                  </div>
                  <div style={{marginTop: '8px', fontSize: '16px', color: vhsGreen, fontFamily: 'monospace'}}>
                    TRACK {i + 1} · SIDE {i % 2 === 0 ? 'A' : 'B'}
                  </div>
                </div>
              );
            })}

            {/* BEAT FLASH */}
            <AbsoluteFill style={{pointerEvents: 'none', zIndex: 10}}>
              {beats.map((bt, i) => {
                const dt = time - bt;
                if (dt < 0 || dt > 0.5) return null;
                const intensity = (1 - dt / 0.5) * 0.3;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute', inset: 0,
                      background: speaker === 'fighter1'
                        ? `linear-gradient(90deg, transparent, ${accentA}40, transparent)`
                        : `linear-gradient(90deg, transparent, ${accentB}40, transparent)`,
                      opacity: intensity,
                      pointerEvents: 'none',
                    }}
                  />
                );
              })}
            </AbsoluteFill>

          </>
        )}

        {/* OUTRO: VHS END CARD */}
        {inOutro && (
          <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '40px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', width: '90%', maxWidth: '900px', color: vhsYellow, fontSize: '18px', fontFamily: 'monospace', letterSpacing: '0.1em'}}>
              <span>● REC</span>
              <span>SP MODE</span>
              <span>END OF TAPE</span>
            </div>

            <div style={{fontSize: '64px', fontWeight: '900', letterSpacing: '-0.01em', lineHeight: 1.1, textAlign: 'center', textTransform: 'uppercase', color: vhsText, textShadow: `3px 3px 0 ${vhsRed}, 6px 6px 0 ${vhsCyan}`}}>
              {f1.name.toUpperCase()}
            </div>
            <div style={{fontSize: '48px', color: vhsRed, fontWeight: '900', letterSpacing: '0.3em', textShadow: '3px 3px 0 #000'}}>
              V S
            </div>
            <div style={{fontSize: '64px', fontWeight: '900', letterSpacing: '-0.01em', lineHeight: 1.1, textAlign: 'center', textTransform: 'uppercase', color: vhsText, textShadow: `3px 3px 0 ${vhsCyan}, 6px 6px 0 ${vhsYellow}`}}>
              {f2.name.toUpperCase()}
            </div>

            <div style={{marginTop: '24px', fontSize: '28px', color: vhsYellow, letterSpacing: '0.15em', textTransform: 'uppercase', textShadow: '2px 2px 0 #000'}}>
              WHO WON?
            </div>
            <div style={{fontSize: '20px', color: vhsGreen, maxWidth: '800px', textAlign: 'center', fontFamily: 'monospace'}}>
              MERGE CONFLICT · BOTH LEGENDS STAND · VOTE IN COMMENTS ▼
            </div>

            <div style={{width: '600px', height: '8px', background: '#1a1a1a', border: `2px solid ${vhsText}`, marginTop: '32px', position: 'relative', boxShadow: 'inset 0 0 20px #000'}}>
              <div style={{height: '100%', background: `linear-gradient(90deg, ${accentA}, ${accentB})`, transform: 'scaleX(1)'}}/>
            </div>

            <div style={{marginTop: '24px', fontSize: '16px', color: vhsRed, fontFamily: 'monospace', animation: 'blink 1s infinite'}}>
              ■ STOP · REWIND · PLAY AGAIN
            </div>
          </AbsoluteFill>
        )}

        {/* TRACKING ERROR INDICATOR */}
        <div
          style={{
            position: 'absolute', top: '70px', right: '30px',
            width: '4px', height: '100px',
            background: `linear-gradient(180deg, ${vhsGreen}, ${vhsYellow}, ${vhsRed})`,
            opacity: 0.3 + Math.abs(trackingError) * 0.1,
            borderRadius: '2px',
          }}
        />
      </AbsoluteFill>
    </>
  );
};