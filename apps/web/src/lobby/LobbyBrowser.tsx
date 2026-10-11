import { useCallback, useEffect, useRef, useState } from 'react';
import { parseNickname } from '@game/shared';
import type { PublicLobby } from '@game/shared';
import { listLobbies } from '../network/listLobbies';
import {
  getServerEndpoint,
  waitForServer,
} from '../network/serverAvailability';
import type { MultiplayerSession } from '../network/MultiplayerSession';

export function LobbyBrowser({
  nickname,
  onNicknameChange,
  onBack,
  onJoin,
}: {
  nickname: string;
  onNicknameChange: (value: string) => void;
  onBack: () => void;
  onJoin: (session: MultiplayerSession) => void;
}) {
  const [lobbies, setLobbies] = useState<PublicLobby[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const lastAction = useRef<{ kind: 'browse' | 'join'; roomId?: string }>({
    kind: 'browse',
  });

  const startRequest = useCallback(() => {
    if (pending.current && !pending.current.signal.aborted) return null;
    const controller = new AbortController();
    pending.current = controller;
    setConnecting(true);
    setWaking(true);
    setError('');
    return controller;
  }, []);
  const finishRequest = useCallback((controller: AbortController) => {
    if (pending.current !== controller) return;
    pending.current = null;
    if (mounted.current) {
      setConnecting(false);
      setWaking(false);
    }
  }, []);
  const browse = useCallback(async () => {
    const controller = startRequest();
    if (!controller) return;
    lastAction.current = { kind: 'browse' };
    setLobbies([]);
    try {
      await waitForServer(getServerEndpoint(), controller.signal);
      controller.signal.throwIfAborted();
      setWaking(false);
      const result = await listLobbies(controller.signal);
      if (mounted.current && !controller.signal.aborted) setLobbies(result);
    } catch {
      if (mounted.current && !controller.signal.aborted)
        setError(
          'Nie udało się pobrać lobby. Sprawdź połączenie i spróbuj ponownie.',
        );
    } finally {
      finishRequest(controller);
    }
  }, [startRequest, finishRequest]);
  useEffect(() => {
    mounted.current = true;
    // A trial mount in StrictMode can cancel this request before it starts.
    const start = window.setTimeout(() => {
      void browse();
    }, 0);
    return () => {
      window.clearTimeout(start);
      mounted.current = false;
      pending.current?.abort();
    };
  }, [browse]);

  const connect = async (roomId?: string) => {
    const nick = parseNickname(nickname);
    if (!nick) {
      setError(
        'Nick musi mieć od 2 do 20 znaków i nie może zawierać znaków sterujących.',
      );
      return;
    }
    const controller = startRequest();
    if (!controller) return;
    lastAction.current = { kind: 'join', ...(roomId ? { roomId } : {}) };
    let serverReady = false;
    try {
      await waitForServer(getServerEndpoint(), controller.signal);
      controller.signal.throwIfAborted();
      setWaking(false);
      serverReady = true;
      const { connectMultiplayer } =
        await import('../network/connectMultiplayer');
      const session = await connectMultiplayer(nick, roomId);
      if (!mounted.current || controller.signal.aborted) {
        session.close();
        return;
      }
      onJoin(session);
    } catch {
      if (mounted.current && !controller.signal.aborted)
        setError(
          serverReady
            ? 'Nie udało się dołączyć. Lobby może być pełne lub gra już się rozpoczęła.'
            : 'Serwer nie odpowiada. Sprawdź połączenie i spróbuj ponownie.',
        );
    } finally {
      finishRequest(controller);
    }
  };
  const validNickname = Boolean(parseNickname(nickname));
  return (
    <section
      className="menu-panel lobby-browser"
      aria-labelledby="lobbies-title"
    >
      <header className="lobby-heading">
        <div>
          <p className="menu-eyebrow">Multiplayer · 2 graczy</p>
          <h1 id="lobbies-title">Wybierz lobby</h1>
        </div>
        <button
          className="button-secondary"
          disabled={connecting}
          onClick={onBack}
        >
          Wróć
        </button>
      </header>
      <p className="menu-intro">
        Wybierz lobby lub utwórz nowe. Gra ruszy, gdy obie osoby będą gotowe.
      </p>
      <div className="lobby-setup">
        <div className="nickname-field">
          <label htmlFor="lobby-nickname">Twój nick</label>
          <input
            id="lobby-nickname"
            value={nickname}
            onChange={(event) => onNicknameChange(event.target.value)}
            minLength={2}
            maxLength={20}
            autoComplete="nickname"
            aria-describedby="nickname-hint"
          />
          <span className="field-hint" id="nickname-hint">
            Od 2 do 20 znaków
          </span>
        </div>
        <button
          disabled={connecting || !validNickname}
          onClick={() => {
            void connect();
          }}
        >
          Utwórz lobby
        </button>
      </div>
      <div className="lobby-list-heading">
        <h2>Dostępne lobby</h2>
        <button
          className="button-secondary"
          disabled={connecting}
          onClick={() => {
            void browse();
          }}
        >
          Odśwież listę
        </button>
      </div>
      {lobbies.length === 0 && !connecting && !error && (
        <p className="lobby-empty">
          Brak dostępnych lobby. Utwórz pierwsze i poczekaj na drugiego gracza.
        </p>
      )}
      {lobbies.length > 0 && (
        <ul className="lobby-list">
          {lobbies.map((lobby) => (
            <li key={lobby.roomId}>
              <span className="lobby-room">
                <strong>Lobby {lobby.roomId.slice(0, 8)}</strong>
                <span>{lobby.players}/2 graczy</span>
              </span>
              <button
                disabled={connecting || !validNickname}
                onClick={() => {
                  void connect(lobby.roomId);
                }}
              >
                Dołącz
              </button>
            </li>
          ))}
        </ul>
      )}
      {connecting && (
        <p className="lobby-feedback" role="status">
          {waking
            ? 'Uruchamianie serwera… Pierwsze połączenie może potrwać do 90 sekund.'
            : 'Łączenie z serwerem…'}
        </p>
      )}
      {waking && (
        <button
          className="button-secondary"
          onClick={() => pending.current?.abort()}
        >
          Anuluj
        </button>
      )}
      {error && (
        <>
          <p className="lobby-feedback" role="alert">
            {error}
          </p>
          <button
            onClick={() => {
              if (lastAction.current.kind === 'browse') void browse();
              else void connect(lastAction.current.roomId);
            }}
          >
            Spróbuj ponownie
          </button>
        </>
      )}
    </section>
  );
}
