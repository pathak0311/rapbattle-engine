import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFonts} from '../../fonts';
import battleManifest from '../../../public/battle.json' with {type: 'json'};
import type {BattleManifest} from '../../types';
import {activeKickIndex, buildKicks} from './timeline';
import {Pitch} from './Pitch';
import {CaptionBox, FighterCard, IntroCard, KickLabel, KickPills, OutroCard, ReadyBanner, ScoreBoard, Stinger} from './Hud';

const battle = battleManifest as BattleManifest;
loadFonts();

// One penalty kick per caption bar; strike = bar start, goal = punchline bar.
const KICKS = buildKicks(battle);

export const SpotKick: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const idx = activeKickIndex(KICKS, frame);
  const kick = idx >= 0 ? KICKS[idx] : null;
  const outroF = Math.round(battle.outro.start * fps);
  const firstStrikeF = KICKS.length ? KICKS[0].strikeF : 0;

  // Beat grid (same tempo as the track) drives light pulses and a light camera kick
  const beatPeriod = 60 / battle.audio.bpm;
  const beatPhase = (t % beatPeriod) / beatPeriod;
  const beatKick = Math.exp(-beatPhase * 6);

  // Post hits shake the camera; goals get a small punch
  const sinceImpact = kick ? frame - kick.impactF : 999;
  const decay = sinceImpact >= 0 && sinceImpact < 24 ? 1 - sinceImpact / 24 : 0;
  const shakeX = kick && kick.outcome === 'post' ? Math.sin(frame * 2.7) * 16 * decay : 0;
  const shakeY = kick && kick.outcome === 'post' ? Math.cos(frame * 3.1) * 10 * decay : 0;
  const goalPunch = kick && kick.outcome === 'goal' && sinceImpact >= 0 && sinceImpact < 10 ? (1 - sinceImpact / 10) * 0.02 : 0;
  const camScale = 1 + 0.012 * beatKick + goalPunch;

  // Flash on impact: gold-white for goals, faint for saves
  const flash = kick
    ? kick.outcome === 'goal'
      ? interpolate(sinceImpact, [0, 3, 16], [0, 0.5, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
      : kick.outcome === 'save'
        ? interpolate(sinceImpact, [0, 2, 12], [0, 0.22, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
        : 0
    : 0;

  const f1 = battle.fighters.fighter1;
  const f2 = battle.fighters.fighter2;
  const shooterColor = kick ? (kick.speaker === 'fighter1' ? f1.color : f2.color) : '#FFFFFF';
  const speaking = kick ? t <= kick.line.end + 0.2 : false;
  const level = speaking ? Number(battle.audio.mouth?.[frame] ?? '0') : 0;
  const pop = kick ? Math.min(1, Math.max(0, (frame - kick.strikeF) / 10)) : 0;

  return (
    <AbsoluteFill style={{backgroundColor: '#02040A', overflow: 'hidden'}}>
      <Audio src={staticFile(battle.audio.src)} />
      <AbsoluteFill style={{transform: `translate(${shakeX}px, ${shakeY}px) scale(${camScale})`, transformOrigin: '50% 40%'}}>
        <Pitch frame={frame} fps={fps} kicks={KICKS} activeIdx={idx} f1Color={f1.color} f2Color={f2.color} beatKick={beatKick} />
        <ScoreBoard frame={frame} fps={fps} kicks={KICKS} battle={battle} />
        {kick && <KickLabel kick={kick} frame={frame} />}
        <ReadyBanner frame={frame} kicksCount={KICKS.length} firstStrikeF={firstStrikeF} />
        <FighterCard fighter={f1} cx={270} active={!!kick && kick.speaker === 'fighter1'} pop={pop} speaking={speaking && !!kick && kick.speaker === 'fighter1'} level={level} />
        <FighterCard fighter={f2} cx={810} active={!!kick && kick.speaker === 'fighter2'} pop={pop} speaking={speaking && !!kick && kick.speaker === 'fighter2'} level={level} />
        {kick && <CaptionBox frame={frame} fps={fps} kick={kick} color={shooterColor} />}
        <KickPills frame={frame} kicks={KICKS} activeIdx={idx} f1Color={f1.color} f2Color={f2.color} />
        {kick && <Stinger frame={frame} fps={fps} kick={kick} battle={battle} />}
        <AbsoluteFill style={{background: '#FFFFFF', opacity: flash}} />
      </AbsoluteFill>
      <IntroCard frame={frame} fps={fps} battle={battle} />
      <OutroCard frame={frame} fps={fps} outroF={outroF} battle={battle} kicks={KICKS} />
    </AbsoluteFill>
  );
};
