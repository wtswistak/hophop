import { useCallback, useState, useSyncExternalStore } from 'react';
import { getLevel } from '@game/core';
import { LocalGame } from './LocalGame';
import { MultiplayerStatus } from '../network/MultiplayerStatus';
import type { MultiplayerSession } from '../network/MultiplayerSession';

import { GameMenu } from './GameMenu';
import { GameLoader } from './GameLoader';

function MultiplayerGame({
  session,
  menuOpen,
}: {
  session: MultiplayerSession;
  menuOpen: boolean;
}) {
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
          playing={lobby.phase === 'playing' && !menuOpen}
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
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <GameMenu
        open={menuOpen}
        onOpen={() => setMenuOpen(true)}
        onClose={() => setMenuOpen(false)}
        onBack={onBack}
        session={session}
      />
      {session ? (
        <MultiplayerGame session={session} menuOpen={menuOpen} />
      ) : (
        <LocalGame paused={menuOpen} />
      )}
    </>
  );
}
