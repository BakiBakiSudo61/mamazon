import kit from './kit.module.css';

export function GameHeader({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <div className={kit.gameHead}>
      <div className={kit.gameIcon} aria-hidden="true">{icon}</div>
      <div>
        <h2 className={kit.gameTitle}>{title}</h2>
        {desc && <p className={kit.gameDesc}>{desc}</p>}
      </div>
    </div>
  );
}
