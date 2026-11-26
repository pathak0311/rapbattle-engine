import React from 'react';
import {useCurrentFrame} from 'remotion';

interface KineticLyricsProps {
  battle: {
    captions: Array<{
      id: number;
      speaker: 'fighter1' | 'fighter2' | 'both' | 'host' | 'none';
      start: number;
      end: number;
      text: string;
      words: Array<{text: string; start: number; end: number}>;
      punchline: boolean;
    }>;
    fighters: {
      fighter1: {name: string; color: string};
      fighter2: {name: string; color: string};
    };
    intro: {end: number};
    outro: {start: number};
  };
}

export const KineticLyrics: React.FC<KineticLyricsProps> = ({battle}) => {
  const frame = useCurrentFrame();
  const fps = 30;
  const time = frame / fps;

  const currentCaption = battle.captions.find(c => time >= c.start && time < c.end);
  if (!currentCaption || currentCaption.speaker === 'host' || currentCaption.speaker === 'none') {
    return null;
  }

  const fighterColor = currentCaption.speaker === 'fighter1'
    ? battle.fighters.fighter1.color
    : currentCaption.speaker === 'fighter2'
    ? battle.fighters.fighter2.color
    : '#FFD166';

  const words = currentCaption.words;
  if (!words || words.length === 0) return null;

  // Group words into chunks of 3-5 for display
  const chunkSize = Math.max(3, Math.min(5, Math.ceil(words.length / 3)));
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize));
  }

  // Determine which chunk is currently active
  let activeChunkIndex = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkStart = chunk[0]?.start ?? currentCaption.start;
    const chunkEnd = chunk[chunk.length - 1]?.end ?? currentCaption.end;
    if (time >= chunkStart && time < chunkEnd) {
      activeChunkIndex = i;
      break;
    }
  }

  const activeChunk = chunks[activeChunkIndex];

  const isPunchline = currentCaption.punchline && activeChunkIndex === chunks.length - 1;
  const flashActive = isPunchline && Math.floor(time * 30) % 2 === 0; // 2-frame white flash

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '380px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '960px',
        zIndex: 50,
        pointerEvents: 'none',
        opacity: flashActive ? 0 : 1,
      }}
    >
      {/* White flash on punchlines */}
      {flashActive && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#fff',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: '20px',
          rowGap: '10px',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        {activeChunk.map((word, wi) => {
          const isActiveWord = time >= word.start && time < word.end;
          const scale = isActiveWord ? 1.16 : 1;
          const color = isActiveWord ? fighterColor : '#fff';
          // Clean the word text - trim whitespace and punctuation artifacts
          const cleanText = word.text.trim().replace(/^\s+|\s+$/g, '');

          return (
            <span
              key={`${currentCaption.id}-${activeChunkIndex}-${wi}`}
              style={{
                display: 'inline-block',
                fontFamily: 'Bangers, sans-serif',
                fontSize: '76px',
                fontWeight: 400,
                color,
                lineHeight: 1.1,
                WebkitTextStroke: '3px #000',
                paintOrder: 'stroke fill',
                transform: `scale(${scale})`,
                transformOrigin: 'center',
                transition: 'transform 0.03s ease-out, color 0.03s ease-out',
                whiteSpace: 'nowrap',
              }}
            >
              {cleanText}
            </span>
          );
        })}
      </div>
    </div>
  );
};