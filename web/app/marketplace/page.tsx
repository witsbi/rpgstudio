import Link from "next/link";
import { listWorlds } from "../../lib/studio";
import Launch from "./launch";
import DmLaunch from "./dm-launch";
import Illustrate from "./illustrate";
export const dynamic = "force-dynamic";
export default function Marketplace() {
  const worlds = listWorlds();
  return <main className="shell"><header className="top"><Link className="logo" href="/">✦ RPG <span>STUDIO</span></Link><Link href="/creator">Create a world →</Link></header><section className="hero compact"><p className="eyebrow">MARKETPLACE</p><h1>Worlds waiting for <em>stories.</em></h1><p className="lead">Created once. Ready for independent adventures.</p></section><div className="locations">{worlds.length === 0 ? <div className="location"><h2>No published worlds yet</h2><p>Start in Creator to build the first one.</p><Link href="/creator">Create a world →</Link></div> : worlds.map(world => <article className="location" key={world.id}><p className="eyebrow">PUBLISHED WORLD</p><h2>{world.title}</h2><p>{world.locations.length} locations · version {world.version}</p><p>{world.locations.find(l => l.id === world.startLocationId)?.description}</p><Launch adventureId={world.id} version={world.version} /><DmLaunch adventureId={world.id} version={world.version} /><Illustrate id={world.id} version={world.version} locationId={world.startLocationId} /></article>)}</div></main>;
}
