import { ColyseusSDK } from '@colyseus/sdk';
import { parseNickname, ROOM_TYPE } from '@game/shared';
import { getServerEndpoint } from './serverAvailability';
import { MultiplayerSession } from './MultiplayerSession';

export async function connectMultiplayer(
  rawNickname: string,
  roomId?: string,
): Promise<MultiplayerSession> {
  const nickname = parseNickname(rawNickname);
  if (!nickname) throw new Error('Nieprawidłowy nick.');
  const endpoint = getServerEndpoint();
  const client = new ColyseusSDK(endpoint, {
    fetchFn: (url, init) =>
      fetch(url, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(10000),
      }),
  });
  const room = roomId
    ? await client.joinById(roomId, { nickname })
    : await client.create(ROOM_TYPE, { nickname });
  room.reconnection.enabled = false; // Reconnection and seat reservations belong to stage 8.
  let disposed = false;
  const session = new MultiplayerSession(
    room.roomId,
    room.sessionId,
    (type, command) => room.send(type, command),
    () => {
      if (disposed) return;
      disposed = true;
      unbindSnapshot();
      unbindLobby();
      room.onLeave.remove(onLeave);
      room.onError.remove(onError);
      if (room.connection.isOpen) {
        void room.leave().catch(() => {
          /* Connection can close while leaving. */
        });
      }
    },
    (type, message) => room.send(type, message),
  );
  let ready = false;
  let resolveReady: () => void;
  let rejectReady: (error: Error) => void;
  const firstSnapshot = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const fail = (message: string) => {
    session.close();
    if (!ready) rejectReady(new Error(message));
  };
  const onLeave = () => fail('Połączenie z sesją zostało zakończone.');
  const onError = () => fail('Wystąpił błąd połączenia z sesją.');
  room.onLeave(onLeave);
  room.onError(onError);
  const unbindSnapshot = room.onMessage('snapshot', (message: unknown) => {
    if (session.receive(message, performance.now()) && !ready) {
      ready = true;
      resolveReady();
    }
  });
  const unbindLobby = room.onMessage('lobby', (message: unknown) => {
    session.receiveLobby(message);
  });
  const timeout = window.setTimeout(
    () => fail('Serwer nie przesłał stanu gry.'),
    5000,
  );
  try {
    await firstSnapshot;
    return session;
  } catch (error) {
    session.close();
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
