import { Component, lazy, Suspense } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import type { GameCanvas as CanvasComponent } from '../game/GameCanvas';

const GameCanvas = lazy(() =>
  import('../game/GameCanvas').then(({ GameCanvas }) => ({
    default: GameCanvas,
  })),
);

class LoadBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <p role="alert">
        Nie udało się wczytać gry. Odśwież stronę i spróbuj ponownie.
      </p>
    ) : (
      this.props.children
    );
  }
}

export function GameLoader(props: ComponentProps<typeof CanvasComponent>) {
  return (
    <LoadBoundary>
      <Suspense fallback={<p role="status">Wczytywanie sceny…</p>}>
        <GameCanvas {...props} />
      </Suspense>
    </LoadBoundary>
  );
}
