import { levels } from '@game/core';
import { useSyncExternalStore } from 'react';
import type { MultiplayerSession } from './MultiplayerSession';
import goldExplorer from '../game/assets/explorer-gold.png';
import blueExplorer from '../game/assets/explorer-blue.png';

export function MultiplayerStatus({
  session,
}: {
  session: MultiplayerSession;
}) {
  const status = useSyncExternalStore(session.subscribe, session.getStatus);
  const own = status.lobby.players.find(
    (player) => player.sessionId === session.sessionId,
  );
  const waiting = status.lobby.phase === 'waiting';
  return (
    <section
      className={`session-status${waiting ? ' session-status--waiting menu-panel' : ''}`}
      aria-label="Lobby"
    >
      {waiting && (
        <header className="menu-heading">
          <p className="menu-eyebrow">Wspólna przygoda</p>
          <h1>Lobby</h1>
          <p className="menu-intro">
            Zaznacz gotowość, gdy chcesz rozpocząć grę.
          </p>
        </header>
      )}
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
          {!waiting && (
            <p role="status">
              {status.lobby.phase === 'loading' &&
                'Wczytywanie poziomu — czekamy na graczy…'}
              {status.lobby.phase === 'countdown' &&
                `Start za ${status.lobby.countdownSeconds}…`}
              {status.lobby.phase === 'playing' &&
                `Poziom ${levels.findIndex((level) => level.id === status.lobby.levelId) + 1}/${levels.length}`}
              {status.lobby.phase === 'transition' &&
                'Poziom ukończony! Przechodzicie dalej razem.'}
              {status.lobby.phase === 'finished' &&
                'Gratulacje! Wszystkie poziomy ukończone. Wróć do menu, aby zagrać ponownie.'}
              {status.lobby.phase === 'aborted' &&
                'Mecz zakończony: przekroczono czas wczytywania poziomu. Wróć do menu i spróbuj ponownie.'}
            </p>
          )}
          {waiting && (
            <>
              <ul className="lobby-players">
                {status.lobby.players.map((player) => (
                  <li key={player.sessionId}>
                    <img
                      src={
                        player.sessionId === session.sessionId
                          ? goldExplorer
                          : blueExplorer
                      }
                      alt=""
                      width={80}
                      height={80}
                    />
                    <div className="lobby-player-details">
                      <span className="field-hint">
                        P{player.slot}
                        {player.sessionId === session.sessionId ? ' · Ty' : ''}
                      </span>
                      <strong>{player.nickname}</strong>
                      <span
                        className={`player-readiness${player.ready ? ' player-readiness--ready' : ''}`}
                      >
                        {player.ready ? 'Gotowy' : 'Niegotowy'}
                      </span>
                    </div>
                  </li>
                ))}
                {status.playerCount < 2 && (
                  <li className="lobby-player-empty">
                    <strong>Wolne miejsce</strong>
                    <span className="field-hint">
                      Czekasz na drugiego gracza
                    </span>
                  </li>
                )}
              </ul>
              <button
                onClick={() => session.setReady(!own?.ready)}
                disabled={!own}
                aria-pressed={own?.ready ?? false}
              >
                {own?.ready ? 'Cofnij gotowość' : 'Gotowy'}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
