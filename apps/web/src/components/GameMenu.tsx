import { useEffect, useRef } from 'react';
import type { MultiplayerSession } from '../network/MultiplayerSession';

export function GameMenu({
  open,
  onOpen,
  onClose,
  onBack,
  session,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onBack: () => void;
  session: MultiplayerSession | undefined;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  return (
    <>
      <button
        className="game-menu-toggle"
        aria-label="Otwórz menu gry"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onOpen}
      >
        <span aria-hidden="true">☰</span>
      </button>
      <dialog
        ref={dialog}
        className="game-menu"
        aria-labelledby="game-menu-title"
        onCancel={onClose}
        onClose={onClose}
      >
        <h2 id="game-menu-title">Menu gry</h2>
        <button onClick={onClose}>Wróć do gry</button>
        <button onClick={onBack}>Wróć do menu</button>
        <p>
          Ruch: ← → / A D<br />
          Skok: spacja / ↑ / W
        </p>
        {session && (
          <>
            <p>
              Kod lobby: <strong>{session.roomId}</strong>
            </p>
            <p>Gra online trwa podczas otwarcia menu.</p>
          </>
        )}
      </dialog>
    </>
  );
}
