import { useEffect, useRef } from 'react';
import { createGame } from './createGame';
export function GameCanvas() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const parent = container.current;
    if (!parent) return;
    const game = createGame(parent);
    return () => {
      game.destroy(true);
    };
  }, []);
  return (
    <div className="game-container" ref={container} aria-label="Scena gry" />
  );
}
