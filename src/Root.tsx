import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Composition} from 'remotion';
import {RapBattle} from './RapBattle';
import {SpotKick} from './formats/spot-kick/SpotKick';
import battleManifest from '../public/battle.json' with {type: 'json'};
import type {BattleManifest} from './types';

const battle = battleManifest as BattleManifest;

export const Root: React.FC = () => {
  return (
    <>
    <Composition
      id="RapBattlePro"
      component={RapBattle}
      // Duration is driven by the manifest, never hardcoded: the trimmed
      // audio is the single source of truth for video length.
      durationInFrames={battle.audio.durationInFrames}
      fps={battle.fps}
      width={battle.width}
      height={battle.height}
      defaultProps={{}}
    />
    <Composition
      id="SpotKickPro"
      component={SpotKick}
      durationInFrames={battle.audio.durationInFrames}
      fps={battle.fps}
      width={battle.width}
      height={battle.height}
      defaultProps={{}}
    />
  </>
  );
};
