const roles = [
  { name: "Creator", icon: "✦", description: "Build a world together with AI.", status: "Create with AI", href: "/creator" },
  { name: "Player", icon: "⚔", description: "Enter a world with an AI or human DM.", status: "Play experience next", href: "#journey" },
  { name: "Dungeon Master", icon: "◈", description: "Guide a human or AI player through an adventure.", status: "Planned next", href: "#journey" }
];
export default function Home() {
  return <main className="shell">
    <header className="top"><div className="logo">✦ RPG <span>STUDIO</span></div><div className="tag">A world is only the beginning</div></header>
    <section className="hero">
      <p className="eyebrow">CREATE · SHARE · PLAY</p>
      <h1>Every world has <em>more than one story.</em></h1>
      <p className="lead">Build adventures with AI, publish them to the Marketplace, and return as a Player or Dungeon Master. One world. Many adventures.</p>
    </section>
    <section className="roles" aria-label="Choose a role">{roles.map(role =>
      <a className="role" key={role.name} href={role.href} aria-label={role.name}>
        <span className="role-icon" aria-hidden="true">{role.icon}</span>
        <h2>{role.name}</h2><p>{role.description}</p><small>{role.status}</small>
      </a>)}</section>
    <section className="market" id="journey"><div><p className="eyebrow">THE SHARED ADVENTURE MARKETPLACE</p><h2>Make a world once. Adventure in it again and again.</h2><p>Creator → Marketplace → Player or DM. The Marketplace is the bridge between creating a world and playing in it. Publish your world, then discover it again in the Marketplace.</p></div><div className="world-card"><a href="/marketplace" className="market-link">Explore Marketplace →</a><div className="world-icon">◎</div><strong>One versioned world</strong><p>↙ Human Player · AI DM</p><p>↘ Human DM · AI Player</p><small>Separate playthroughs · shared adventure definition</small></div></section>
    <footer>RPG Studio. Create the world. Save it to the Marketplace. Choose your role. Let the adventures unfold.</footer>
  </main>;
}
