import React from 'react';
import {interpolate} from 'remotion';
import {ExtrudedText} from './ExtrudedText';

interface IntroOutroProps {
  time: number;
  duration: number;
  title: string;
  f1Name: string;
  f2Name: string;
  f1Badge?: string;
  f2Badge?: string;
  f1Color: string;
  f2Color: string;
  phase: 'intro' | 'outro' | 'none';
  f1Portrait: string;
  f2Portrait: string;
  f1Emblem?: string;
  f2Emblem?: string;
}

export const IntroOutro: React.FC<IntroOutroProps> = ({
  time,
  duration,
  title,
  f1Name,
  f2Name,
  f1Badge = 'AI CHIP KING',
  f2Badge = 'MAGA MOGUL',
  f1Color,
  f2Color,
  phase,
  f1Portrait,
  f2Portrait,
  f1Emblem,
  f2Emblem,
}) => {
  if (phase === 'none') return null;

  const isIntro = phase === 'intro';
  const phaseStart = isIntro ? 0 : duration - 3.5;
  const phaseEnd = isIntro ? 3.5 : duration;
  const phaseProgress = (time - phaseStart) / (phaseEnd - phaseStart);
  const clampedProgress = Math.max(0, Math.min(1, phaseProgress));

  const slamIn = interpolate(clampedProgress, [0, 0.3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const fadeOut = interpolate(clampedProgress, [0.7, 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const titleScale = 1 + slamIn * 0.3;
  const vsScale = 1 + slamIn * 0.4;

  if (isIntro) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
          pointerEvents: 'none',
          opacity: fadeOut,
        }}
      >
        {/* Title */}
        <div
          style={{
            position: 'absolute',
            top: '140px',
            left: '50%',
            transform: `translateX(-50%) scale(${titleScale}) rotate(-3deg)`,
            textAlign: 'center',
            width: '92%',
            padding: '0 32px',
          }}
        >
          <ExtrudedText
            fontFamily="Bangers, sans-serif"
            fontSize={106}
            color="#FFD166"
            stroke={4}
            offset={7}
            style={{display: 'block', textAlign: 'center'}}
          >
            {title.toUpperCase()}
          </ExtrudedText>
        </div>

        {/* VS + SVG Emblems */}
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${vsScale})`,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: '48px',
          }}
        >
          {f1Emblem && (
            <img src={f1Emblem} alt="" style={{width: '100px', height: '100px'}} />
          )}
          <ExtrudedText
            fontFamily="Bangers, sans-serif"
            fontSize={170}
            color="#FFD166"
            stroke={4}
            offset={9}
          >
            VS
          </ExtrudedText>
          {f2Emblem && (
            <img src={f2Emblem} alt="" style={{width: '100px', height: '100px'}} />
          )}
        </div>

        {/* Fighter portraits and names side by side */}
        <div
          style={{
            position: 'absolute',
            top: '56%',
            left: '50%',
            transform: `translateX(-50%) scale(${titleScale})`,
            display: 'flex',
            gap: '64px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Fighter 1 */}
          <div style={{textAlign: 'center'}}>
            <img
              src={f1Portrait}
              alt={f1Name}
              style={{
                width: '170px',
                height: '170px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: `5px solid ${f1Color}`,
                marginBottom: '12px',
                boxShadow: 'none',
              }}
            />
            <span
              style={{
                fontFamily: 'Anton, sans-serif',
                fontSize: '26px',
                fontWeight: 400,
                letterSpacing: '2px',
                color: f1Color,
                display: 'block',
                marginBottom: '4px',
              }}
            >
              {f1Badge}
            </span>
            <ExtrudedText
              fontFamily="Bangers, sans-serif"
              fontSize={46}
              color={f1Color}
              stroke={4}
              offset={6}
              style={{display: 'block'}}
            >
              {f1Name}
            </ExtrudedText>
          </div>

          {/* Fighter 2 */}
          <div style={{textAlign: 'center'}}>
            <img
              src={f2Portrait}
              alt={f2Name}
              style={{
                width: '170px',
                height: '170px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: `5px solid ${f2Color}`,
                marginBottom: '12px',
                boxShadow: 'none',
              }}
            />
            <span
              style={{
                fontFamily: 'Anton, sans-serif',
                fontSize: '26px',
                fontWeight: 400,
                letterSpacing: '2px',
                color: f2Color,
                display: 'block',
                marginBottom: '4px',
              }}
            >
              {f2Badge}
            </span>
            <ExtrudedText
              fontFamily="Bangers, sans-serif"
              fontSize={46}
              color={f2Color}
              stroke={4}
              offset={6}
              style={{display: 'block'}}
            >
              {f2Name}
            </ExtrudedText>
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
          pointerEvents: 'none',
          opacity: fadeOut,
        }}
      >
        {/* WHO WON? - Massive center text */}
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '50%',
            transform: `translateX(-50%) scale(${titleScale})`,
            textAlign: 'center',
            width: '90%',
            padding: '0 48px',
          }}
        >
          <ExtrudedText
            fontFamily="Bangers, sans-serif"
            fontSize={118}
            color="#FFD166"
            stroke={4}
            offset={7}
            style={{display: 'block', textAlign: 'center'}}
          >
            WHO WON?
          </ExtrudedText>
        </div>

        {/* Fighter portraits side by side at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '200px',
            left: '50%',
            transform: `translateX(-50%) scale(${titleScale})`,
            display: 'flex',
            gap: '80px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={f1Portrait}
            alt={f1Name}
            style={{
              width: '170px',
              height: '170px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `5px solid ${f1Color}`,
            }}
          />
          <img
            src={f2Portrait}
            alt={f2Name}
            style={{
              width: '170px',
              height: '170px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `5px solid ${f2Color}`,
            }}
          />
        </div>
      </div>
    );
  }
};
