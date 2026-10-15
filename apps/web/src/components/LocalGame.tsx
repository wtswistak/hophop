import { useCallback, useEffect, useState } from 'react';
import { levels } from '@game/core';

import { GameLoader } from './GameLoader';

type Phase = 'loading' | 'countdown' | 'playing' | 'transition' | 'finished';

export function LocalGame({ paused }: { paused: boolean }) {
  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [seconds, setSeconds] = useState(3);
  const ready = useCallback(() => {
    setSeconds(3);
    setPhase('countdown');
  }, []);
  const finish = useCallback(() => setPhase('transition'), []);

  useEffect(() => {
    if (paused) return;
    if (phase === 'countdown') {
      const timer = window.setTimeout(() => {
        if (seconds === 1) setPhase('playing');
        else setSeconds(seconds - 1);
      }, 1000);
      return () => window.clearTimeout(timer);
    }
    if (phase === 'transition') {
      const timer = window.setTimeout(() => {
        if (levelIndex === levels.length - 1) setPhase('finished');
        else {
          setLevelIndex(levelIndex + 1);
          setPhase('loading');
        }
      }, 2000);
      return () => window.clearTimeout(timer);
    }
  }, [phase, seconds, levelIndex, paused]);

  return (
    <>
      {phase !== 'playing' && (
        <p role="status" className="game-notice">
          {phase === 'loading' && 'Wczytywanie poziomu…'}
          {phase === 'countdown' && `Start za ${seconds}…`}
          {phase === 'transition' && 'Poziom ukończony!'}
          {phase === 'finished' &&
            'Gratulacje! Wszystkie poziomy ukończone. Wróć do menu, aby zagrać ponownie.'}
        </p>
      )}
      {phase !== 'finished' && (
        <GameLoader
          key={levelIndex}
          level={levels[levelIndex]!}
          playing={phase === 'playing' && !paused}
          onReady={ready}
          onFinish={finish}
        />
      )}
    </>
  );
}
