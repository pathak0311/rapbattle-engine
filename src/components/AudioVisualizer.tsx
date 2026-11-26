import React from 'react';
import {useCurrentFrame} from 'remotion';

type Active = 'fighter1' | 'fighter2' | 'both' | 'none';

interface AudioVisualizerProps {
  bassLevel: number;
  freqData: number[];
  activeFighter: Active;
  f1Color: string;
  f2Color: string;
  f1Name: string;
  f2Name: string;
  f1Badge?: string;
  f2Badge?: string;
  time: number;
  /** [closed, half, open] mouth frames; mic drawn at the mouth */
  f1Mouths: string[];
  f2Mouths: string[];
  /** 0 closed, 1 half, 2 open for the active rapper this frame */
  mouthLevel: number;
  /** 0..1 punchline impact envelope */
  punch: number;
  /** beat phase 0..1 */
  beatPhase: number;
  f1Emblem?: string;
  f2Emblem?: string;
}

// Layout: ring centred above the lyric zone, ~40% larger than v1
const RADIUS = 300;
const RING_CY = -110; // relative to frame centre (960)
const ASPECT = 760 / 600; // fighter SVG viewBox height/width

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  bassLevel, freqData, activeFighter, f1Color, f2Color, f1Name, f2Name,
  f1Badge = '', f2Badge = '', time, f1Mouths, f2Mouths, mouthLevel, punch, beatPhase,
  f1Emblem, f2Emblem,
}) => {
  const frame = useCurrentFrame();
  const barCount = 64;
  const lvl = Math.max(0, Math.min(2, mouthLevel));

  const f1Img = activeFighter === 'fighter1' || activeFighter === 'both' ? f1Mouths[lvl] : f1Mouths[0];
  const f2Img = activeFighter === 'fighter2' || activeFighter === 'both' ? f2Mouths[lvl] : f2Mouths[0];

  const inInstrumental = activeFighter === 'none';
  const activeColor = activeFighter === 'fighter1' ? f1Color : activeFighter === 'fighter2' ? f2Color : '#FFD166';
  const activePortrait = activeFighter === 'fighter2' ? f2Img : activeFighter === 'fighter1' ? f1Img : (Math.floor(time * 2) % 2 === 0 ? f1Img : f2Img);
  const activeName = activeFighter === 'fighter1' ? f1Name : activeFighter === 'fighter2' ? f2Name : f1Name + ' vs ' + f2Name;
  const activeBadge = activeFighter === 'fighter1' ? f1Badge : activeFighter === 'fighter2' ? f2Badge : 'TITAN CLASH';
  const activeEmblem = activeFighter === 'fighter1' ? f1Emblem : activeFighter === 'fighter2' ? f2Emblem : undefined;

  // Opponent reacts in the corner while the other one raps
  const opponent: 'fighter1' | 'fighter2' | null = activeFighter === 'fighter1' ? 'fighter2' : activeFighter === 'fighter2' ? 'fighter1' : null;
  const oppImg = opponent === 'fighter1' ? f1Mouths[0] : opponent === 'fighter2' ? f2Mouths[0] : '';
  const oppColor = opponent === 'fighter1' ? f1Color : f2Color;
  const oppName = opponent === 'fighter1' ? f1Name : f2Name;
  const oppOnLeft = opponent === 'fighter1';
  const bob = Math.sin(beatPhase * Math.PI * 2) * 6;
  const flinch = punch * 1;
  const oppRot = (oppOnLeft ? -1 : 1) * (4 * Math.sin(time * 1.7) + flinch * 14);
  const oppScale = 1 - flinch * 0.12;
  const oppShakeX = Math.sin(frame * 2.3) * 10 * flinch;

  const ringScale = 1 + bassLevel * 0.1 + punch * 0.08;
  const talkScale = 1 + (lvl === 2 ? 0.012 : 0);

  const hud = (img: string, name: string, badge: string, color: string, isActive: boolean, dim: boolean, right: boolean) => (
    <div style={{display: 'flex', flexDirection: right ? 'row-reverse' : 'row', alignItems: 'center', gap: '14px', padding: '10px 20px',
      background: '#090D16EE', border: '3px solid ' + (isActive ? color : '#334155'), borderRadius: '20px',
      opacity: dim ? 0.55 : 1, transform: 'scale(' + (isActive ? 1.05 : 0.96) + ')'}}>
      <img src={img} alt={name} style={{width: '64px', height: '64px', borderRadius: '50%', border: '3px solid ' + color, objectFit: 'cover'}} />
      <div style={{textAlign: right ? 'right' : 'left'}}>
        <div style={{fontFamily: 'Anton, sans-serif', fontSize: '26px', color, letterSpacing: '2px', lineHeight: 1.1}}>{name}</div>
        <div style={{fontFamily: 'Anton, sans-serif', fontSize: '16px', color: '#CBD5E1', letterSpacing: '1.5px'}}>{badge}</div>
      </div>
    </div>
  );

  return (
    <div style={{position: 'absolute', top: 0, left: 0, width: '1080px', height: '1920px', pointerEvents: 'none', zIndex: 10}}>
      {/* Top HUD */}
      <div style={{position: 'absolute', top: '54px', left: '48px', right: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 25}}>
        {hud(f1Img, f1Name, f1Badge, f1Color, activeFighter === 'fighter1' || activeFighter === 'both', activeFighter === 'fighter2', false)}
        {hud(f2Img, f2Name, f2Badge, f2Color, activeFighter === 'fighter2' || activeFighter === 'both', activeFighter === 'fighter1', true)}
      </div>

      {/* Ring + big portrait */}
      <svg width="1080" height="1920" style={{position: 'absolute', top: 0, left: 0}} viewBox="-540 -960 1080 1920">
        <defs>
          <clipPath id="portraitMask"><circle cx="0" cy="0" r={RADIUS - 14} /></clipPath>
          <clipPath id="oppMask"><circle cx="0" cy="0" r={112} /></clipPath>
        </defs>
        <g transform={'translate(0 ' + RING_CY + ')'}>
          {Array.from({length: barCount}).map((_, i) => {
            const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
            const magnitude = freqData[Math.min(i, freqData.length - 1)] || 0;
            const outer = RADIUS + 16 + magnitude * 120;
            return (
              <line key={'bar' + i} x1={Math.cos(angle) * RADIUS} y1={Math.sin(angle) * RADIUS}
                x2={Math.cos(angle) * outer} y2={Math.sin(angle) * outer}
                stroke={activeColor} strokeWidth={9} strokeLinecap="round"
                style={{transformOrigin: '0px 0px', transform: 'scale(' + ringScale + ')'}} />
            );
          })}
          {punch > 0.05 && (
            <circle cx={0} cy={0} r={RADIUS * (1.1 + (1 - punch) * 0.9)} stroke="#FFFFFF" strokeWidth={10 * punch} fill="none" opacity={punch} />
          )}
          <g style={{transformOrigin: '0px 0px', transform: 'scale(' + ringScale * talkScale + ')'}}>
            <circle cx={0} cy={0} r={RADIUS - 4} fill="#05070D" stroke={activeColor} strokeWidth={8} opacity={0.55 + bassLevel * 0.45} />
            {/* fighter art is 600x760: fill circle width, crop top/bottom equally */}
            <image href={activePortrait} x={-(RADIUS - 14)} y={-(RADIUS - 14) * ASPECT} width={2 * (RADIUS - 14)} height={2 * (RADIUS - 14) * ASPECT}
              clipPath="url(#portraitMask)" />
            <circle cx={0} cy={0} r={RADIUS - 14} fill="none" stroke={activeColor} strokeWidth={3} opacity={0.35} />
            {activeEmblem && <image href={activeEmblem} x={RADIUS - 120} y={RADIUS - 120} width={100} height={100} />}
            {inInstrumental && (
              <g transform={'translate(0, ' + (RADIUS + 60) + ')'}>
                <rect x={-140} y={-25} width={280} height={50} rx={25} fill={activeColor} opacity={0.95} />
                <text x={0} y={8} textAnchor="middle" dominantBaseline="middle" fontFamily="Anton, sans-serif" fontSize={24} fill="#000" letterSpacing="3">BEAT DROP</text>
              </g>
            )}
          </g>

          {/* Opponent reaction bubble */}
          {opponent && (
            <g transform={'translate(' + ((oppOnLeft ? -1 : 1) * 345 + oppShakeX) + ' ' + (RADIUS + 100 + bob) + ') rotate(' + oppRot + ') scale(' + oppScale + ')'}>
              <circle cx={0} cy={0} r={122} fill="#05070D" stroke={oppColor} strokeWidth={6} opacity={0.9} />
              <image href={oppImg} x={-112} y={-112 * ASPECT} width={224} height={224 * ASPECT} clipPath="url(#oppMask)" opacity={0.6} />
              <circle cx={0} cy={0} r={112} fill="#05070D" opacity={0.25 + 0.2 * (1 - flinch)} />
              <rect x={-116} y={102} width={232} height={36} rx={18} fill={oppColor} opacity={0.9} />
              <text x={0} y={127} textAnchor="middle" fontFamily="Anton, sans-serif" fontSize={20} fill="#000" letterSpacing="2">{oppName.split(' ').slice(-1)[0]} IS LISTENING</text>
            </g>
          )}
        </g>
      </svg>

      {/* Active speaker banner */}
      {!inInstrumental && (
        <div style={{position: 'absolute', top: '190px', left: '50%', transform: 'translateX(-50%) rotate(-2deg)', zIndex: 20}}>
          <div style={{display: 'inline-block', padding: '10px 36px', background: activeColor, borderRadius: '50px', border: '3px solid #000', whiteSpace: 'nowrap'}}>
            <span style={{fontFamily: 'Anton, sans-serif', fontSize: '30px', color: '#000', letterSpacing: '4px', textTransform: 'uppercase'}}>
              {activeName.toUpperCase()} • {activeBadge}
            </span>
          </div>
        </div>
      )}

      {/* Bottom sub-bass strip */}
      <svg width="1080" height="200" style={{position: 'absolute', bottom: '60px', left: 0}} viewBox="0 0 1080 200">
        <defs>
          <linearGradient id="subBassFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={activeColor} stopOpacity={0.85} />
            <stop offset="100%" stopColor={activeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        {Array.from({length: 32}).map((_, i) => {
          const h = 10 + (freqData[Math.min(i, freqData.length - 1)] || 0) * 80;
          return (
            <g key={'sub' + i} transform={'translate(' + (50 + i * 30) + ', 100)'}>
              <rect x={0} y={-h} width={18} height={h} fill="url(#subBassFade)" rx={3} />
              <rect x={0} y={0} width={18} height={h} fill="url(#subBassFade)" rx={3} transform="scale(1, -1)" opacity={0.4} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

