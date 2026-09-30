import { isPublicLobbyList } from '@game/shared';
import type { PublicLobby } from '@game/shared';
import { getServerEndpoint } from './serverAvailability';

export async function listLobbies(signal: AbortSignal): Promise<PublicLobby[]> {
  const response = await fetch(`${getServerEndpoint()}/lobbies`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Nie udało się pobrać lobby.');
  const data: unknown = await response.json();
  if (!isPublicLobbyList(data)) throw new Error('Nieprawidłowa lista lobby.');
  return data;
}
