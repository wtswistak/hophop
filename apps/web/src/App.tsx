import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { MultiplayerStatus } from './network/MultiplayerStatus';
import type { MultiplayerSession } from './network/MultiplayerSession';

const GameCanvas = lazy(() =>
  import('./game/GameCanvas').then((module) => ({
    default: module.GameCanvas,
  })),
);
type GameMode =
  { kind: 'local' } | { kind: 'multiplayer'; session: MultiplayerSession };

export function App() {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [roomId, setRoomId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const activeSession = useRef<MultiplayerSession | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeSession.current?.close();
    };
  }, []);

  const connect = async (id?: string) => {
    if (connecting) return;
    setConnecting(true);
    setError('');
    try {
      const { connectMultiplayer } =
        await import('./network/connectMultiplayer');
      const session = await connectMultiplayer(id);
      if (!mounted.current) {
        session.close();
        return;
      }
      activeSession.current = session;
      setMode({ kind: 'multiplayer', session });
    } catch {
      if (mounted.current)
        setError(
          'Nie udało się połączyć. Sprawdź kod sesji i połączenie. Pokój może być pełny lub niedostępny.',
        );
    } finally {
      if (mounted.current) setConnecting(false);
    }
  };

  const backToMenu = () => {
    activeSession.current?.close();
    activeSession.current = null;
    setMode(null);
  };

  return (
    <main className={mode ? 'playing' : undefined}>
      {!mode && <h1>Gra platformowa</h1>}
      {mode ? (
        <>
          <header className="game-header">
            <button onClick={backToMenu}>Wróć do menu</button>
            <p>Ruch: ← → / A D · Skok: spacja / ↑ / W</p>
          </header>
          {mode.kind === 'multiplayer' && (
            <MultiplayerStatus session={mode.session} />
          )}
          <Suspense fallback={<p role="status">Wczytywanie sceny…</p>}>
            {mode.kind === 'multiplayer' ? (
              <GameCanvas session={mode.session} />
            ) : (
              <GameCanvas />
            )}
          </Suspense>
        </>
      ) : (
        <>
          <p>Skacz, odkrywaj i dotrzyj do mety.</p>
          <div className="menu-actions">
            <button
              disabled={connecting}
              onClick={() => {
                setError('');
                setMode({ kind: 'local' });
              }}
            >
              Zagraj lokalnie
            </button>
            <button
              disabled={connecting}
              onClick={() => {
                void connect();
              }}
            >
              Utwórz sesję multiplayer
            </button>
          </div>
          <form
            className="join-session"
            onSubmit={(event) => {
              event.preventDefault();
              void connect(roomId.trim());
            }}
          >
            <label htmlFor="room-id">Kod sesji od drugiego gracza</label>
            <input
              id="room-id"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              required
              maxLength={64}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={connecting}
            />
            <button disabled={connecting || !roomId.trim()}>
              Dołącz do sesji
            </button>
          </form>
          {connecting && <p role="status">Łączenie z serwerem…</p>}
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </main>
  );
}
