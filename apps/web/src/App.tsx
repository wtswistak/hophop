import { lazy, Suspense, useState } from 'react';

const GameCanvas = lazy(() =>
  import('./game/GameCanvas').then((module) => ({
    default: module.GameCanvas,
  })),
);

export function App() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <main className={isOpen ? 'playing' : undefined}>
      {!isOpen && <h1>Gra platformowa</h1>}
      {isOpen ? (
        <>
          <header className="game-header">
            <button onClick={() => setIsOpen(false)}>Wróć do menu</button>
            <p>Ruch: ← → / A D · Skok: spacja / ↑ / W</p>
          </header>
          <Suspense fallback={<p role="status">Wczytywanie sceny…</p>}>
            <GameCanvas />
          </Suspense>
        </>
      ) : (
        <>
          <p>Skacz, odkrywaj i dotrzyj do mety.</p>
          <button onClick={() => setIsOpen(true)}>Zagraj lokalnie</button>
        </>
      )}
    </main>
  );
}
