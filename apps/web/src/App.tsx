import { lazy, Suspense, useState } from 'react';

const GameCanvas = lazy(() =>
  import('./game/GameCanvas').then((module) => ({
    default: module.GameCanvas,
  })),
);

export function App() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <main>
      <h1>Gra platformowa</h1>
      {isOpen ? (
        <>
          <button onClick={() => setIsOpen(false)}>Wróć do menu</button>
          <Suspense fallback={<p role="status">Wczytywanie sceny…</p>}>
            <GameCanvas />
          </Suspense>
        </>
      ) : (
        <>
          <p>Skacz, odkrywaj i dotrzyj do mety.</p>
          <button onClick={() => setIsOpen(true)}>Otwórz scenę</button>
        </>
      )}
    </main>
  );
}
