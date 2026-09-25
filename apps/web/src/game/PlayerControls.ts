import type { PlayerInput } from '@game/core';

export type ControlAction = 'left' | 'right' | 'jump';

// Source IDs keep simultaneous fingers and keyboard keys independent.
export class PlayerControls {
  private readonly held = new Map<string, ControlAction>();
  private jumpQueued = false;

  press(source: string, action: ControlAction) {
    if (this.held.has(source)) return;
    if (action === 'jump') this.jumpQueued = true;
    this.held.set(source, action);
  }

  release(source: string) {
    this.held.delete(source);
  }

  reset() {
    this.held.clear();
    this.jumpQueued = false;
  }

  read(): PlayerInput {
    const actions = new Set(this.held.values());
    const direction =
      actions.has('left') === actions.has('right')
        ? 0
        : actions.has('left')
          ? -1
          : 1;
    const input: PlayerInput = { direction, jump: this.jumpQueued };
    this.jumpQueued = false;
    return input;
  }
}

const KEY_ACTIONS: Readonly<Record<string, ControlAction>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
};

export function bindKeyboard(controls: PlayerControls): () => void {
  const keyDown = (event: KeyboardEvent) => {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest(
        'input, textarea, select, button, [contenteditable="true"]',
      )
    )
      return;
    event.preventDefault();
    if (event.repeat) return;
    controls.press(`key:${event.code}`, action);
  };
  const keyUp = (event: KeyboardEvent) => {
    controls.release(`key:${event.code}`);
  };
  const reset = () => controls.reset();
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  return () => {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('blur', reset);
    document.removeEventListener('visibilitychange', reset);
    reset();
  };
}
