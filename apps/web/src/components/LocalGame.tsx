import { useCallback, useEffect, useRef, useState } from 'react';
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

  const timer = useRef({ key: '', remaining: 0 });
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'transition') return;
    const key = `${phase}:${levelIndex}:${seconds}`;
    if (timer.current.key !== key) {
      timer.current = { key, remaining: phase === 'countdown' ? 1000 : 2000 };
    }
    if (paused) return;
    const startedAt = performance.now();
    const timeout = window.setTimeout(() => {
      if (phase === 'countdown') {
        if (seconds === 1) setPhase('playing');
        else setSeconds(seconds - 1);
      } else if (levelIndex === levels.length - 1) setPhase('finished');
      else {
        setLevelIndex(levelIndex + 1);
        setPhase('loading');
      }
    }, timer.current.remaining);
    return () => {
      window.clearTimeout(timeout);
      timer.current.remaining = Math.max(
        0,
        timer.current.remaining - (performance.now() - startedAt),
      );
    };
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
