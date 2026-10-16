import { useCallback, useState, useSyncExternalStore } from 'react';
import { getLevel } from '@game/core';
import { LocalGame } from './LocalGame';
import { MultiplayerStatus } from '../network/MultiplayerStatus';
import type { MultiplayerSession } from '../network/MultiplayerSession';

import { usePageActive } from '../game/usePageActive';
import { GameMenu } from './GameMenu';
import { GameLoader } from './GameLoader';

function MultiplayerGame({
  session,
  paused,
}: {
  session: MultiplayerSession;
  paused: boolean;
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
          playing={lobby.phase === 'playing' && !paused}
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
  const pageActive = usePageActive();
  const paused = menuOpen || !pageActive;
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
        <MultiplayerGame session={session} paused={paused} />
      ) : (
        <LocalGame paused={paused} />
      )}
    </>
  );
}
