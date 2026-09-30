export function HomeMenu({
  onLocal,
  onMultiplayer,
}: {
  onLocal: () => void;
  onMultiplayer: () => void;
}) {
  return (
    <>
      <p>Skacz, odkrywaj i dotrzyj do mety.</p>
      <div className="menu-actions">
        <button onClick={onLocal}>Zagraj samemu</button>
        <button onClick={onMultiplayer}>Multiplayer</button>
      </div>
    </>
  );
}
