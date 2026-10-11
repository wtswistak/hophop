import { useEffect, useRef, useState } from 'react';
import { HomeMenu } from './components/HomeMenu';
import { GameScreen } from './components/GameScreen';
import { LobbyBrowser } from './lobby/LobbyBrowser';
import type { MultiplayerSession } from './network/MultiplayerSession';

type Screen = 'home' | 'lobbies' | 'local' | { session: MultiplayerSession };

export function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [nickname, setNickname] = useState('');
  const activeSession = useRef<MultiplayerSession | null>(null);
  useEffect(
    () => () => {
      activeSession.current?.close();
    },
    [],
  );

  const backToMenu = () => {
    activeSession.current?.close();
    activeSession.current = null;
    setScreen(typeof screen === 'object' ? 'lobbies' : 'home');
  };
  return (
    <main
      className={
        screen === 'local' || typeof screen === 'object'
          ? 'playing'
          : 'menu-screen'
      }
    >
      {screen === 'home' && (
        <HomeMenu
          onLocal={() => setScreen('local')}
          onMultiplayer={() => setScreen('lobbies')}
        />
      )}
      {screen === 'lobbies' && (
        <LobbyBrowser
          nickname={nickname}
          onNicknameChange={setNickname}
          onBack={() => setScreen('home')}
          onJoin={(session) => {
            activeSession.current = session;
            setScreen({ session });
          }}
        />
      )}
      {screen === 'local' && <GameScreen onBack={backToMenu} />}
      {typeof screen === 'object' && (
        <GameScreen session={screen.session} onBack={backToMenu} />
      )}
    </main>
  );
}
