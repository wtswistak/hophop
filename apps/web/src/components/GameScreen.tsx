import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { MultiplayerStatus } from '../network/MultiplayerStatus';
import type { MultiplayerSession } from '../network/MultiplayerSession';

const loadGameCanvas = () => import('../game/GameCanvas');
const GameCanvas = lazy(() =>
  loadGameCanvas().then(({ GameCanvas }) => ({ default: GameCanvas })),
);

function MultiplayerGame({ session }: { session: MultiplayerSession }) {
  const { lobby } = useSyncExternalStore(session.subscribe, session.getStatus);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    if (lobby.phase !== 'loading') return;
    let active = true;
    void loadGameCanvas()
      .then(() => {
        if (active) session.loaded();
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [lobby.phase, session]);
  return (
    <>
      <MultiplayerStatus session={session} />
      {loadFailed && (
        <p role="alert">
          Nie udało się wczytać gry. Odśwież stronę i spróbuj ponownie.
        </p>
      )}
      {lobby.phase === 'playing' && (
        <Suspense fallback={<p role="status">Wczytywanie sceny…</p>}>
          <GameCanvas session={session} />
        </Suspense>
      )}
    </>
  );
}

export function GameScreen({
  session,
  onBack,
}: {
  session?: MultiplayerSession;
  onBack: () => void;
}) {
  return (
    <>
      <header className="game-header">
        <button onClick={onBack}>Wróć do menu</button>
        <p>Ruch: ← → / A D · Skok: spacja / ↑ / W</p>
      </header>
      {session ? (
        <MultiplayerGame session={session} />
      ) : (
        <Suspense fallback={<p role="status">Wczytywanie sceny…</p>}>
          <GameCanvas />
        </Suspense>
      )}
    </>
  );
}
