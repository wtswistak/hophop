import { useCallback, useSyncExternalStore } from 'react';
import { getLevel } from '@game/core';
import { LocalGame } from './LocalGame';
import { MultiplayerStatus } from '../network/MultiplayerStatus';
import type { MultiplayerSession } from '../network/MultiplayerSession';

import { GameLoader } from './GameLoader';

function MultiplayerGame({ session }: { session: MultiplayerSession }) {
  const { lobby } = useSyncExternalStore(session.subscribe, session.getStatus);
  const ready = useCallback(
    () => session.loaded(lobby.stageId),
    [session, lobby.stageId],
  );
  return (
    <>
      <MultiplayerStatus session={session} />
      {['loading', 'countdown', 'playing', 'transition'].includes(
        lobby.phase,
      ) && (
        <GameLoader
          key={lobby.stageId}
          session={session}
          level={getLevel(lobby.levelId)!}
          playing={lobby.phase === 'playing'}
          onReady={ready}
        />
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
      {session ? <MultiplayerGame session={session} /> : <LocalGame />}
    </>
  );
}
