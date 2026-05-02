import './About.css'

const DOWNLOAD_URL = 'https://github.com/technologyinnovision-team/technologyinnovision-team.github.io/releases/download/v1.0.4/NeuralCode-win-1.0.4.exe'

const values = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Privacy First',
    desc: 'Your code stays yours. We never train on your private codebase without explicit permission.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    title: 'Speed Obsessed',
    desc: 'Every interaction is optimized for minimal latency. We believe fast tools make better engineers.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
    title: 'Transparent AI',
    desc: 'You always see what the AI is doing — every file read, write, and command is visible in the tool history.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Developer Focused',
    desc: 'Built by engineers, for engineers. Every design decision prioritizes the developer workflow.',
  },
]

export default function About() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">About</p>
          <h1>Built by Technology Innovision</h1>
          <p>NeuralCode is our vision for the future of software development — where AI works alongside every developer.</p>
          <div className="glow-line" />
        </div>
      </section>

      <section className="about-story">
        <div className="container">
          <div className="about-story__grid">
            <div className="about-story__text">
              <h2>Our Mission</h2>
              <p>
                At Technology Innovision, we believe that every developer — regardless of experience level — should have access to a world-class AI engineering partner.
              </p>
              <p>
                NeuralCode was born from a simple observation: current AI tools help with autocomplete. But developers need more than suggestions — they need an AI that can understand a full codebase, plan complex tasks, execute them step by step, and learn from the results.
              </p>
              <p>
                That's why we built NeuralCode with a true agent runtime at its core. It's not a language model wrapper — it's a purpose-built coding environment where AI is a first-class citizen alongside your own capabilities.
              </p>
            </div>
            <div className="about-story__card">
              <div className="about-story__card-inner">
                <img
                  src="https://neuralcore.technologyinnovision.com/logo.svg"
                  alt="NeuralCode"
                  className="about-story__logo"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <h3>NeuralCode</h3>
                <p>by Technology Innovision</p>
                <div className="about-story__divider" />
                <div className="about-story__stats">
                  <div className="about-stat">
                    <span className="about-stat__value">v1.0.4</span>
                    <span className="about-stat__label">Latest Release</span>
                  </div>
                  <div className="about-stat">
                    <span className="about-stat__value">Windows</span>
                    <span className="about-stat__label">Platform</span>
                  </div>
                  <div className="about-stat">
                    <span className="about-stat__value">AI Agents</span>
                    <span className="about-stat__label">Powered By</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="about-values">
        <div className="container">
          <div className="section-header">
            <p className="section-label">Our Values</p>
            <h2>What we stand for</h2>
            <div className="glow-line" />
          </div>
          <div className="values-grid">
            {values.map((v, i) => (
              <div key={i} className="value-card">
                <div className="value-card__icon">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-company">
        <div className="container">
          <div className="about-company__box">
            <div className="about-company__text">
              <h2>Technology Innovision</h2>
              <p>
                Technology Innovision is a software company focused on building intelligent developer tools. We're passionate about applying cutting-edge AI research to real-world engineering problems — making developers more productive, more capable, and more creative.
              </p>
              <p>
                NeuralCode is our flagship product, available for Windows with more platforms planned for the future.
              </p>
              <div className="about-company__links">
                <a href="https://technologyinnovision.com" target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  Visit Technology Innovision
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 0 1 0h3"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
                <a href={DOWNLOAD_URL} className="btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download NeuralCode
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
