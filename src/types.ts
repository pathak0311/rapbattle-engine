export type SpeakerId = 'fighter1' | 'fighter2' | 'host' | 'both';

export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

export interface CaptionChunk {
  start: number;
  end: number;
  words: WordTiming[];
}

export interface CaptionLine {
  id: number;
  speaker: SpeakerId;
  start: number;
  end: number;
  text: string;
  words: WordTiming[];
  chunks: CaptionChunk[];
  punchline: boolean;
}

export interface Fighter {
  id: 'fighter1' | 'fighter2';
  name: string;
  badge: string;
  color: string;
  portrait?: string;
  svg?: string;
  talkSvg?: string;
  emblemSvg?: string;
  /** [closed, half, open] lip-sync frames */
  mouthSvgs?: string[];
}

export interface EnergyPoint {
  t: number;
  v: number;
}

export interface BattleManifest {
  schemaVersion: 1;
  slug: string;
  title: string;
  hashtag: string;
  fps: number;
  width: number;
  height: number;
  audio: {
    src: 'audio/battle.mp3';
    duration: number;
    durationInFrames: number;
    bpm: number;
    beats: number[];
    energy: EnergyPoint[];
    /** per-frame mouth level string: 0 closed, 1 half, 2 open */
    mouth?: string;
  };
  intro: {
    start: number;
    end: number;
  };
  outro: {
    start: number;
    end: number;
  };
  fighters: {
    fighter1: Fighter;
    fighter2: Fighter;
  };
  captions: CaptionLine[];
}
