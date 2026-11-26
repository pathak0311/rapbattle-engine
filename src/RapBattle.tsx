import React from 'react';
import {Audio, AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile} from 'remotion';
import {ReactiveStage} from './components/ReactiveStage';
import {AudioVisualizer} from './components/AudioVisualizer';
import {KineticLyrics} from './components/KineticLyrics';
import {EpicIntro, EpicOutro, RoundCard, PunchStamp, FilmLook} from './components/BattleFX';
import {loadFonts} from './fonts';
import type {BattleManifest, Fighter} from './types';

import battleManifest from '../public/battle.json' with {type: 'json'};
const battle = battleManifest as BattleManifest;

loadFonts();

type Spk = 'fighter1' | 'fighter2' | 'both' | 'host' | 'none';
const speakerAt = (captions: BattleManifest['captions'], time: number): Spk => {
  const line = captions.find((c) => time >= c.start && time < c.end);
  if (line) return line.speaker;
  const prev = [...captions].reverse().find((c) => time >= c.end && time - c.end < 0.9);
  if (prev) return prev.speaker;
  return 'none';
};

// Punchline impacts land on the last word of each punchline bar
const IMPACTS: number[] = battle.captions
  .filter((c) => c.punchline && c.words.length > 0)
  .map((c) => c.words[c.words.length - 1].start);

// Speaker runs -> ROUND cards at each switch
const ROUNDS: {at: number; speaker: 'fighter1' | 'fighter2'}[] = [];
battle.captions.forEach((c, i) => {
  if ((c.speaker === 'fighter1' || c.speaker === 'fighter2') && (i === 0 || battle.captions[i - 1].speaker !== c.speaker)) {
    ROUNDS.push({at: c.start, speaker: c.speaker});
  }
});

// Punchline stamp word = last word of the bar, cleaned
const STAMPS = battle.captions
  .filter((c) => c.punchline && c.words.length > 0)
  .map((c) => ({
    at: c.words[c.words.length - 1].start,
    word: c.words[c.words.length - 1].text.replace(/[^A-Za-z0-9'-]/g, '').toUpperCase() + '!',
    speaker: c.speaker,
  }));

const punchAt = (time: number): number => {
  let p = 0;
  for (const t of IMPACTS) {
    const dt = time - t;
    if (dt >= 0 && dt < 0.55) p = Math.max(p, 1 - dt / 0.55);
  }
  return p;
};

const generateFreqData = (time: number): number[] => {
  const bars = 64;
  const data: number[] = [];
  const beatInterval = 60 / battle.audio.bpm;
  const phase = (time % beatInterval) / beatInterval;
  for (let i = 0; i < bars; i++) {
    const baseFreq = Math.sin(time * 8 + i * 0.5) * 0.3 + 0.4;
    const beatBoost = Math.sin(phase * Math.PI * 2) * 0.5;
    const variation = Math.sin(time * 3 + i * 0.8) * 0.2;
    data.push(Math.max(0, Math.min(1, baseFreq + beatBoost + variation)));
  }
  return data;
};

const mouthsFor = (f: Fighter): string[] => {
  const m = f.mouthSvgs && f.mouthSvgs.length === 3 ? f.mouthSvgs : [f.svg || f.portrait || '', f.talkSvg || f.svg || '', f.talkSvg || f.svg || ''];
  return m.map((p) => staticFile(p));
};

export const RapBattle: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const time = frame / fps;
  const outroEnd = battle.outro.end;

  const speaker = speakerAt(battle.captions, time);
  const inIntro = time < battle.intro.end;
  const inOutro = time >= battle.outro.start;
  const phase = inIntro ? 'intro' : inOutro ? 'outro' : 'none';

  let bassLevel = 0;
  for (let i = 1; i < battle.audio.energy.length; i++) {
    if (time < battle.audio.energy[i].t) {
      const p = (time - battle.audio.energy[i - 1].t) / (battle.audio.energy[i].t - battle.audio.energy[i - 1].t);
      bassLevel = battle.audio.energy[i - 1].v + p * (battle.audio.energy[i].v - battle.audio.energy[i - 1].v);
      break;
    }
  }
  if (bassLevel === 0 && battle.audio.energy.length > 0) bassLevel = battle.audio.energy[battle.audio.energy.length - 1].v;

  const beatInterval = 60 / battle.audio.bpm;
  const beatPhase = (time % beatInterval) / beatInterval;
  const mouthStr = battle.audio.mouth || '';
  const mouthLevel = Number(mouthStr[frame] || '0');
  const punch = phase === 'none' ? punchAt(time) : 0;

  const f1 = battle.fighters.fighter1;
  const f2 = battle.fighters.fighter2;
  const f1Mouths = mouthsFor(f1);
  const f2Mouths = mouthsFor(f2);

  const activeColor = speaker === 'fighter1' ? f1.color : speaker === 'fighter2' ? f2.color : '#FFD166';

  // Screen shake on punchline impact (deterministic per frame)
  // Beat camera: kick-zoom on every beat + slow push-in across each verse
  const beatKick = phase === 'none' ? Math.exp(-beatPhase * 6) : 0;
  const curRound = [...ROUNDS].reverse().find((r) => time >= r.at);
  const nextRound = ROUNDS.find((r) => r.at > time);
  const verseEnd = nextRound ? nextRound.at : battle.outro.start;
  const push = curRound && phase === 'none' ? Math.min(1, (time - curRound.at) / Math.max(1, verseEnd - curRound.at)) : 0;
  const camScale = 1 + beatKick * 0.018 + push * 0.05;
  const cardFor = (f: Fighter, m: string[]) => ({name: f.name, badge: f.badge, color: f.color, img: m[0], emblem: f.emblemSvg ? staticFile(f.emblemSvg) : undefined});
  const c1 = cardFor(f1, f1Mouths);
  const c2 = cardFor(f2, f2Mouths);
  const shakeX = Math.sin(frame * 2.7) * 22 * punch;
  const shakeY = Math.cos(frame * 3.3) * 14 * punch;
  const flash = punch > 0.55 ? (punch - 0.55) / 0.45 : 0;

  return (
    <>
      <Audio src={staticFile(battle.audio.src)} />
      <AbsoluteFill style={{transform: 'translate(' + shakeX + 'px, ' + shakeY + 'px) scale(' + (camScale + punch * 0.03) + ')'}}>
        <ReactiveStage activeColor={activeColor} bassLevel={bassLevel} time={time} totalDuration={outroEnd} />
        {phase === 'none' && (
          <>
            <AudioVisualizer
              bassLevel={bassLevel}
              freqData={generateFreqData(time)}
              activeFighter={speaker === 'host' ? 'none' : speaker}
              f1Color={f1.color} f2Color={f2.color}
              f1Name={f1.name} f2Name={f2.name}
              f1Badge={f1.badge} f2Badge={f2.badge}
              time={time}
              f1Mouths={f1Mouths} f2Mouths={f2Mouths}
              mouthLevel={mouthLevel}
              punch={punch}
              beatPhase={beatPhase}
              f1Emblem={f1.emblemSvg ? staticFile(f1.emblemSvg) : undefined}
              f2Emblem={f2.emblemSvg ? staticFile(f2.emblemSvg) : undefined}
            />
            <KineticLyrics battle={battle} />
          </>
        )}
        {phase === 'none' && STAMPS.map((st, k) => (
          <PunchStamp key={'st' + k} time={time} at={st.at} word={st.word} seed={k + 1}
            color={st.speaker === 'fighter2' ? f2.color : f1.color} />
        ))}
      </AbsoluteFill>
      {ROUNDS.map((r, k) => (
        <RoundCard key={'rc' + k} time={time} at={r.at} round={k + 1}
          name={(r.speaker === 'fighter1' ? f1.name : f2.name).split(' ').slice(-1)[0]}
          color={r.speaker === 'fighter1' ? f1.color : f2.color} fromLeft={r.speaker === 'fighter1'} />
      ))}
      <EpicIntro time={time} end={battle.intro.end} f1={c1} f2={c2} title={battle.title} hashtag={battle.hashtag} />
      <EpicOutro time={time} start={battle.outro.start} end={outroEnd} f1={c1} f2={c2} hashtag={battle.hashtag} />
      <FilmLook beatKick={beatKick} />
      {flash > 0 && <AbsoluteFill style={{background: '#FFFFFF', opacity: flash * 0.35, pointerEvents: 'none'}} />}
    </>
  );
};

