import React from 'react';
import {Composition} from 'remotion';
import {FilesBattle} from './FilesBattle';
import battleManifest from '../../../public/battle.json' with {type: 'json'};
import type {BattleManifest} from '../../types';

const battle = battleManifest as BattleManifest;

export const Root: React.FC = () => (
  <Composition
    id="FilesBattle"
    component={FilesBattle}
    durationInFrames={battle.audio.durationInFrames}
    fps={battle.fps}
    width={battle.width}
    height={battle.height}
    defaultProps={{}}
  />
);
