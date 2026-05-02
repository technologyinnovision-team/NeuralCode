import './Download.css'

const DOWNLOAD_URL = 'https://github.com/technologyinnovision-team/technologyinnovision-team.github.io/releases/download/v1.0.4/NeuralCode-win-1.0.4.exe'

const requirements = [
  { label: 'OS', value: 'Windows 10 or Windows 11 (64-bit)' },
  { label: 'RAM', value: '8 GB minimum, 16 GB recommended' },
  { label: 'Storage', value: '500 MB free disk space' },
  { label: 'CPU', value: 'x64 processor, 2+ cores' },
  { label: 'Internet', value: 'Required for AI features' },
]

const changelog = [
  { version: 'v1.0.4', date: 'May 2025', notes: ['Initial public release', 'Agent, Plan, Debug, and Ask modes', 'File Explorer with full workspace indexing', 'Integrated PowerShell terminal', 'Code diff review with Accept/Undo All', 'Multi-language support'] },
]

export default function Download() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">Download</p>
          <h1>Get NeuralCode for Windows</h1>
          <p>The latest version of NeuralCode is ready for Windows 10 and 11. Free to download.</p>
          <div className="glow-line" />
        </div>
      </section>

      <section className="download-main">
        <div className="container">
          <div className="download-card">
            <div className="download-card__glow" />
            <div className="download-card__info">
              <div className="download-card__header">
                <img
                  src="https://neuralcore.technologyinnovision.com/logo.svg"
                  alt="NeuralCode"
                  className="download-card__logo"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <div>
                  <h2 className="download-card__name">NeuralCode</h2>
                  <p className="download-card__version">Version 1.0.4 — Latest Release</p>
                </div>
              </div>
              <p className="download-card__desc">
                AI-powered coding assistant with autonomous agents, workspace exploration, integrated terminal, and multi-language code generation.
              </p>
              <div className="download-card__badges">
                <span className="badge badge-purple">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.799"/>
                  </svg>
                  Windows Only
                </span>
                <span className="badge badge-cyan">64-bit</span>
                <span className="badge" style={{ background: 'rgba(5,150,105,0.12)', color: '#34d399', border: '1px solid rgba(5,150,105,0.25)' }}>Free</span>
              </div>
            </div>
            <div className="download-card__action">
              <a href={DOWNLOAD_URL} className="download-btn">
                <div className="download-btn__icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
                <div className="download-btn__text">
                  <span className="download-btn__label">Download NeuralCode</span>
                  <span className="download-btn__sub">v1.0.4 · Windows 10/11</span>
                </div>
              </a>
              <p className="download-card__tos">
                By downloading, you agree to our{' '}
                <a href="/terms-of-service">Terms of Service</a> and{' '}
                <a href="/privacy-policy">Privacy Policy</a>.
              </p>
            </div>
          </div>

          <div className="download-cols">
            <div className="download-section">
              <h3 className="download-section__title">System Requirements</h3>
              <div className="requirements-table">
                {requirements.map((r, i) => (
                  <div key={i} className="requirements-row">
                    <span className="requirements-row__label">{r.label}</span>
                    <span className="requirements-row__value">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="download-section">
              <h3 className="download-section__title">Release Notes</h3>
              {changelog.map((c, i) => (
                <div key={i} className="changelog-item">
                  <div className="changelog-item__header">
                    <span className="changelog-item__version">{c.version}</span>
                    <span className="changelog-item__date">{c.date}</span>
                  </div>
                  <ul className="changelog-item__list">
                    {c.notes.map((n, j) => (
                      <li key={j}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="install-steps">
            <h3>Installation Instructions</h3>
            <div className="install-steps__grid">
              {[
                { step: '1', text: 'Click the Download button above to get the installer.' },
                { step: '2', text: 'Run the downloaded .exe file and follow the installation wizard.' },
                { step: '3', text: 'Launch NeuralCode from your desktop or Start menu.' },
                { step: '4', text: 'Open or create a workspace folder and start building with AI.' },
              ].map((s, i) => (
                <div key={i} className="install-step">
                  <div className="install-step__num">{s.step}</div>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
