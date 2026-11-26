import React from 'react';
import {Composition} from 'remotion';
import {ConquestBattle} from './ConquestBattle';
import battleManifest from '../../../public/battle.json' with {type: 'json'};
import type {BattleManifest} from '../../types';

const battle = battleManifest as BattleManifest;

export const Root: React.FC = () => (
  <Composition
    id="ConquestBattle"
    component={ConquestBattle}
    durationInFrames={battle.audio.durationInFrames}
    fps={battle.fps}
    width={battle.width}
    height={battle.height}
    defaultProps={{}}
  />
);
