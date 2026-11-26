import React from 'react';
import {Composition} from 'remotion';
import {TerminalBattle} from './TerminalBattle';
import battleManifest from '../../../public/battle.json' with {type: 'json'};
import type {BattleManifest} from '../../types';

const battle = battleManifest as BattleManifest;

export const Root: React.FC = () => {
  return (
    <Composition
      id="TerminalBattle"
      component={TerminalBattle}
      durationInFrames={battle.audio.durationInFrames}
      fps={battle.fps}
      width={battle.width}
      height={battle.height}
      defaultProps={{}}
    />
  );
};