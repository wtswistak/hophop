import { useSyncExternalStore } from 'react';
import type { MultiplayerSession } from './MultiplayerSession';

export function MultiplayerStatus({
  session,
}: {
  session: MultiplayerSession;
}) {
  const status = useSyncExternalStore(session.subscribe, session.getStatus);
  const own = status.lobby.players.find(
    (player) => player.sessionId === session.sessionId,
  );
  return (
    <section className="session-status" aria-label="Lobby">
      <label>
        Kod lobby{' '}
        <input
          aria-label="Kod bieżącego lobby"
          value={session.roomId}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      {!status.connected ? (
        <p role="alert">
          Połączenie zostało zakończone. Wróć do menu i połącz się ponownie.
        </p>
      ) : (
        <>
          <p role="status">Gracze: {status.playerCount}/2</p>
          {status.lobby.phase !== 'playing' && (
            <>
              <ul className="lobby-players">
                {status.lobby.players.map((player) => (
                  <li key={player.sessionId}>
                    P{player.slot} · {player.nickname} ·{' '}
                    {player.ready ? 'Gotowy' : 'Niegotowy'}
                  </li>
                ))}
              </ul>
              {status.lobby.phase === 'waiting' && (
                <>
                  <button
                    onClick={() => session.setReady(!own?.ready)}
                    disabled={!own}
                  >
                    {own?.ready ? 'Cofnij gotowość' : 'Gotowy'}
                  </button>
                  {status.playerCount < 2 && <p>Czekasz na drugiego gracza</p>}
                </>
              )}
              {status.lobby.phase === 'loading' && (
                <p role="status">Wczytywanie gry…</p>
              )}
              {status.lobby.phase === 'countdown' && (
                <p role="status">Start za {status.lobby.countdownSeconds}…</p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
