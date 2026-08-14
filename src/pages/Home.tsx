import { Link } from "react-router-dom";
import { HeroScene } from "../components/viewport/HeroScene";
import { SET_TEMPLATES } from "../engine/templates";
import { SIZE_CHART } from "../engine/sizes";

export function Home() {
  return (
    <div className="home">
      <nav className="home-nav">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden>
            <path
              d="M32 8 L56 22 L56 42 L32 56 L8 42 L8 22 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
          <span className="brand-name">DICEMASTER</span>
        </div>
        <Link to="/workshop" className="btn btn-gold">
          Enter the workshop
        </Link>
      </nav>

      <section className="hero">
        <div>
          <p className="kicker">Tabletop · Resin masters · 3D print</p>
          <h1>
            Forge dice
            <br />
            worthy of <em>legend</em>
          </h1>
          <p className="lede">
            Design custom polyhedral dice in the browser — fonts, crests, chonk D20s, mini travel
            sets — then export STL masters for your own printer. Inspired by the craft of
            DiceMaker, built for the web.
          </p>
          <div className="hero-actions">
            <Link to="/workshop?template=standard-polyhedral" className="btn btn-gold">
              Start with a standard set
            </Link>
            <Link to="/workshop?template=chonk-d20" className="btn">
              Forge a chonk D20
            </Link>
          </div>
          <div className="stat-row">
            <div>
              <strong>10</strong>
              Polyhedral shapes
            </div>
            <div>
              <strong>4</strong>
              Size formats
            </div>
            <div>
              <strong>STL</strong>
              Ready for the vat
            </div>
          </div>
        </div>
        <div className="hero-stage">
          <HeroScene />
        </div>
      </section>

      <section className="section">
        <h2>Choose your kit</h2>
        <p className="section-lead">
          Mini for the road, standard for the table, chonk for the nat-20 slam, giant for the
          trophy shelf.
        </p>
        <div className="card-grid">
          {SET_TEMPLATES.map((t) => (
            <Link key={t.id} to={`/workshop?template=${t.id}`} className="card">
              <span className="tag">{t.format}</span>
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <span className="btn btn-small">Forge this set</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Size runes</h2>
        <p className="section-lead">
          Characteristic size is the longest millimetre span of the die — what you would measure
          with calipers.
        </p>
        <div className="card-grid">
          {(["mini", "standard", "chonk", "giant"] as const).map((fmt) => (
            <article key={fmt} className="card">
              <span className="tag">{fmt}</span>
              <h3>{fmt === "chonk" ? "Chonk" : fmt[0].toUpperCase() + fmt.slice(1)}</h3>
              <p>
                D6 {SIZE_CHART[fmt].d6}mm · D20 {SIZE_CHART[fmt].d20}mm · D12 {SIZE_CHART[fmt].d12}
                mm
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>The rite of making</h2>
        <div className="feature-grid">
          <article className="feature">
            <h3>Typefaces & numerals</h3>
            <p>
              Load a TTF, pick a tavern gothic, a sci-fi HUD, or an arcade cabinet face, then nudge
              scale, rotation, and offset on every face.
            </p>
          </article>
          <article className="feature">
            <h3>Crests on blank ground</h3>
            <p>
              Replace a nat 20 with a dragon, or park a clan mark in a corner where no number
              belongs. SVG and PNG both take.
            </p>
          </article>
          <article className="feature">
            <h3>Masters, not toys</h3>
            <p>
              CSG engraving writes true cavities into the mesh. Export one STL or a whole set as a
              zip for Chitubox, Lychee, or PrusaSlicer.
            </p>
          </article>
        </div>
      </section>

      <footer className="home-foot">
        DiceMaster is a browser forge for tabletop dice masters. Bundled fonts are SIL Open Font
        License. Vault symbols are by Lorc, Delapouite and contributors at{" "}
        <a href="https://game-icons.net">game-icons.net</a> (CC BY 3.0). Craft responsibly; may
        your twenties be natural.
      </footer>
    </div>
  );
}
