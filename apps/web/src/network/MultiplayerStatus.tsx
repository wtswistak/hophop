import { useSyncExternalStore } from 'react';
import type { MultiplayerSession } from './MultiplayerSession';

export function MultiplayerStatus({
  session,
}: {
  session: MultiplayerSession;
}) {
  const status = useSyncExternalStore(session.subscribe, session.getStatus);
  return (
    <div className="session-status">
      <label>
        Kod sesji{' '}
        <input
          aria-label="Kod bieżącej sesji"
          value={session.roomId}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      {status.connected ? (
        <p role="status">
          Gracze: {status.playerCount}/2
          {status.playerCount === 1 ? ' · Czekasz na drugiego gracza' : ''}
        </p>
      ) : (
        <p role="alert">
          Połączenie zostało zakończone. Wróć do menu i połącz się ponownie.
        </p>
      )}
    </div>
  );
}
