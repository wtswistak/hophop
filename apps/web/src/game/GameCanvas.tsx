import { useEffect, useRef, useState } from 'react';
import { createGame } from './createGame';
import { bindKeyboard, PlayerControls } from './PlayerControls';
import type { ControlAction } from './PlayerControls';

const buttons: { action: ControlAction; label: string; text: string }[] = [
  { action: 'left', label: 'Idź w lewo', text: '←' },
  { action: 'right', label: 'Idź w prawo', text: '→' },
  { action: 'jump', label: 'Skocz', text: 'Skok' },
];

export function GameCanvas() {
  const container = useRef<HTMLDivElement>(null);
  const [controls] = useState(() => new PlayerControls());
  useEffect(() => {
    const parent = container.current;
    if (!parent) return;
    parent.focus();
    const unbind = bindKeyboard(controls);
    // Defer boot so React StrictMode can cancel its trial effect before allocating WebGL.
    let game: ReturnType<typeof createGame> | undefined;
    const boot = requestAnimationFrame(() => {
      game = createGame(parent, controls);
    });
    return () => {
      unbind();
      cancelAnimationFrame(boot);
      game?.destroy(true);
    };
  }, [controls]);
  return (
    <section className="game-shell" aria-label="Gra lokalna">
      <div
        className="game-container"
        ref={container}
        tabIndex={-1}
        aria-label="Scena gry"
      />
      <div className="touch-controls" role="group" aria-label="Sterowanie">
        {buttons.map(({ action, label, text }) => (
          <button
            key={action}
            type="button"
            className={`control control-${action}`}
            aria-label={label}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              controls.press(`pointer:${event.pointerId}`, action);
            }}
            onPointerUp={(event) => {
              controls.release(`pointer:${event.pointerId}`);
            }}
            onPointerCancel={(event) => {
              controls.release(`pointer:${event.pointerId}`);
            }}
            onLostPointerCapture={(event) => {
              controls.release(`pointer:${event.pointerId}`);
            }}
            onKeyDown={(event) => {
              if (event.code !== 'Enter' && event.code !== 'Space') return;
              event.preventDefault();
              controls.press(`button:${action}:${event.code}`, action);
            }}
            onKeyUp={(event) => {
              controls.release(`button:${action}:${event.code}`);
            }}
            onBlur={() => {
              controls.release(`button:${action}:Enter`);
              controls.release(`button:${action}:Space`);
            }}
            onContextMenu={(event) => event.preventDefault()}
          >
            {text}
          </button>
        ))}
      </div>
    </section>
  );
}
