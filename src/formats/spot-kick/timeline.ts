import type {BattleManifest, CaptionLine} from '../../types';

// SPOT KICK: every caption bar is one penalty kick. Timing comes entirely
// from the manifest (caption.start = strike frame, punchline = goal).

export type Side = 'fighter1' | 'fighter2';
export type Outcome = 'goal' | 'save' | 'post';

export interface Pt {
  x: number;
  y: number;
}

// Layout in the 1080x1920 canvas
export const SPOT: Pt = {x: 540, y: 1000};
export const GOAL = {left: 300, right: 780, top: 460, bottom: 700};

export const FLIGHT_SEC = 0.5; // strike -> goal mouth
export const RESET_SEC = 0.9; // ball returns to the spot this long before the next strike
export const POST_BOUNCE_FRAMES = 18;

export interface Kick {
  n: number; // 1-based kick number
  speaker: Side; // shooter (the fighter rapping this bar)
  keeper: Side; // opposing fighter in goal
  line: CaptionLine;
  outcome: Outcome;
  aim: -1 | 1; // -1 = keeper's left / screen left, +1 = right
  strikeF: number;
  impactF: number;
  nextF: number; // next strike frame (Infinity for the last kick)
  resetF: number; // frame the ball starts returning to the spot
  target: Pt; // where the ball ends up (goal / save / post)
  reboundTarget: Pt; // post rebound landing spot
  punchWord: string;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export const buildKicks = (battle: BattleManifest): Kick[] => {
  const fps = battle.fps;
  const reset = Math.round(RESET_SEC * fps);
  const flight = Math.round(FLIGHT_SEC * fps);
  return battle.captions.map((line, i) => {
    const speaker = line.speaker as Side;
    const keeper: Side = speaker === 'fighter1' ? 'fighter2' : 'fighter1';
    // Punchline bars are goals; plain bars alternate save / post.
    const outcome: Outcome = line.punchline ? 'goal' : i % 2 === 0 ? 'save' : 'post';
    const aim: -1 | 1 = i % 2 === 0 ? -1 : 1;
    const strikeF = Math.round(line.start * fps);
    const impactF = strikeF + flight;
    const next = battle.captions[i + 1];
    const nextF = next ? Math.round(next.start * fps) : Infinity;
    const last = line.words[line.words.length - 1];
    const target: Pt =
      outcome === 'goal'
        ? {x: 540 + aim * 190, y: 590}
        : outcome === 'save'
          ? {x: 540 + aim * 120, y: 600}
          : {x: 540 + aim * 228, y: 560}; // hits the upright
    const reboundTarget: Pt = {x: 540 + aim * 330, y: 960};
    return {
      n: i + 1,
      speaker,
      keeper,
      line,
      outcome,
      aim,
      strikeF,
      impactF,
      nextF,
      resetF: nextF - reset,
      target,
      reboundTarget,
      punchWord: last ? last.text.replace(/[^A-Za-z0-9']/g, '').toUpperCase() : '',
    };
  });
};

// Index of the latest kick whose strike has happened (-1 before the first kick)
export const activeKickIndex = (kicks: Kick[], f: number): number => {
  let idx = -1;
  for (let i = 0; i < kicks.length; i++) {
    if (kicks[i].strikeF <= f) idx = i;
    else break;
  }
  return idx;
};

export interface BallPose {
  x: number;
  y: number;
  scale: number;
  inFlight: boolean;
}

export const ballAt = (k: Kick, f: number, fps: number): BallPose => {
  if (f < k.impactF) {
    const p = clamp01((f - k.strikeF) / (k.impactF - k.strikeF));
    return {
      x: lerp(SPOT.x, k.target.x, p),
      y: lerp(SPOT.y, k.target.y, p) - 90 * Math.sin(Math.PI * p),
      scale: lerp(1, 0.55, p),
      inFlight: true,
    };
  }
  let pose: BallPose;
  if (k.outcome === 'post' && f < k.impactF + POST_BOUNCE_FRAMES) {
    const s = clamp01((f - k.impactF) / POST_BOUNCE_FRAMES);
    pose = {
      x: lerp(k.target.x, k.reboundTarget.x, s),
      y: lerp(k.target.y, k.reboundTarget.y, s * s),
      scale: lerp(0.55, 0.75, s),
      inFlight: false,
    };
  } else {
    const r = k.outcome === 'post' ? k.reboundTarget : k.target;
    pose = {x: r.x, y: r.y, scale: k.outcome === 'post' ? 0.75 : 0.55, inFlight: false};
  }
  if (f >= k.resetF) {
    const s = clamp01((f - k.resetF) / (k.nextF - k.resetF));
    return {x: lerp(pose.x, SPOT.x, s), y: lerp(pose.y, SPOT.y, s), scale: lerp(pose.scale, 1, s), inFlight: false};
  }
  return pose;
};
