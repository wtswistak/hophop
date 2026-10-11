import goldExplorer from '../game/assets/explorer-gold.png';
import blueExplorer from '../game/assets/explorer-blue.png';

export function HomeMenu({
  onLocal,
  onMultiplayer,
}: {
  onLocal: () => void;
  onMultiplayer: () => void;
}) {
  return (
    <section className="menu-panel home-menu" aria-labelledby="home-title">
      <p className="menu-eyebrow">Przygoda w kanionie</p>
      <h1 id="home-title">Gra platformowa</h1>
      <p className="menu-intro">Skacz, odkrywaj i dotrzyj do mety.</p>
      <div className="menu-explorers" aria-hidden="true">
        <img src={goldExplorer} alt="" width={128} height={128} />
        <img src={blueExplorer} alt="" width={128} height={128} />
      </div>
      <div className="menu-actions">
        <button onClick={onLocal}>Zagraj samemu</button>
        <button className="button-secondary" onClick={onMultiplayer}>
          Multiplayer
        </button>
      </div>
    </section>
  );
}
