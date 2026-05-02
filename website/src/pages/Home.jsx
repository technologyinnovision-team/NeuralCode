import { Link } from 'react-router-dom'
import './Home.css'

import screenshot1 from '../assets/image_1777660483638.png'
import screenshot2 from '../assets/image_1777660703867.png'
import screenshot3 from '../assets/image_1777660730941.png'
import screenshot4 from '../assets/image_1777660746479.png'
import screenshot5 from '../assets/image_1777660758977.png'

const DOWNLOAD_URL = 'https://github.com/technologyinnovision-team/technologyinnovision-team.github.io/releases/download/v1.0.4/NeuralCode-win-1.0.4.exe'

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: 'Autonomous Agents',
    desc: 'AI agents that understand your codebase, execute tasks, and iterate autonomously — no hand-holding required.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    title: 'Multi-Language Support',
    desc: 'From Python and JavaScript to C++, Rust, and Go — NeuralCode handles every major language with precision.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    title: 'Smart File Explorer',
    desc: 'Navigate, read, and modify any file in your workspace. NeuralCode keeps full context of your entire project.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
    ),
    title: 'Integrated Terminal',
    desc: 'Run commands, scripts, and tests directly from within NeuralCode. Full shell access inside your workspace.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
    title: 'Plan & Debug Modes',
    desc: 'Switch between Agent, Plan, Debug, and Ask modes. Let AI structure complex features before writing a single line.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    title: 'Workspace Search',
    desc: 'Find any symbol, function, or text across your entire codebase in milliseconds with semantic search.',
  },
]

const steps = [
  { num: '01', title: 'Download & Install', desc: 'Get NeuralCode for Windows in seconds. No complicated setup — just install and open.' },
  { num: '02', title: 'Open Your Project', desc: 'Open any folder or start fresh. NeuralCode indexes your workspace automatically.' },
  { num: '03', title: 'Talk to Your Agent', desc: 'Describe what you want to build, fix, or refactor. NeuralCode handles the rest.' },
]

export default function Home() {
  return (
    <main className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero__bg-glow" />
        <div className="hero__grid-overlay" />
        <div className="container">
          <div className="hero__content">
            <div className="badge badge-purple hero__badge">
              <span className="hero__badge-dot" />
              Now Available — v1.0.4 for Windows
            </div>
            <h1 className="hero__title">
              <span className="hero__code-word">Code</span> Smarter with<br />
              <span className="gradient-text">AI-Powered Agents</span>
            </h1>
            <p className="hero__desc">
              NeuralCode is an intelligent coding assistant that reads your files, runs your commands, and ships features — powered by cutting-edge AI agents built by Technology Innovision.
            </p>
            <div className="hero__actions">
              <a href={DOWNLOAD_URL} className="btn-primary hero__download">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download for Windows
              </a>
              <Link to="/features" className="btn-secondary">
                Explore Features
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
            <div className="hero__meta">
              <span className="hero__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                Version 1.0.4
              </span>
              <span className="hero__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.799"/>
                </svg>
                Windows 10/11
              </span>
              <span className="hero__meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Secure & Private
              </span>
            </div>
          </div>

          <div className="hero__screenshot-wrap">
            <div className="hero__screenshot-glow" />
            <div className="hero__screenshot-frame">
              <div className="hero__screenshot-bar">
                <span /><span /><span />
              </div>
              <img src={screenshot1} alt="NeuralCode interface" className="hero__screenshot" />
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="section-features">
        <div className="container">
          <div className="section-header">
            <p className="section-label">Capabilities</p>
            <h2>Everything you need to ship faster</h2>
            <div className="glow-line" />
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-card__icon">{f.icon}</div>
                <h3 className="feature-card__title">{f.title}</h3>
                <p className="feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshot showcase */}
      <section className="section-showcase">
        <div className="container">
          <div className="section-header">
            <p className="section-label">In Action</p>
            <h2>See NeuralCode at work</h2>
            <div className="glow-line" />
          </div>
          <div className="showcase-grid">
            <div className="showcase-item showcase-item--large">
              <div className="showcase-frame">
                <img src={screenshot2} alt="NeuralCode code generation" />
              </div>
              <div className="showcase-caption">
                <h4>AI Code Generation</h4>
                <p>Ask NeuralCode to create files, functions, or entire features. Review diffs before accepting.</p>
              </div>
            </div>
            <div className="showcase-item">
              <div className="showcase-frame">
                <img src={screenshot4} alt="NeuralCode tool history" />
              </div>
              <div className="showcase-caption">
                <h4>Tool History</h4>
                <p>See every action the AI agent took — full transparency on file reads and writes.</p>
              </div>
            </div>
            <div className="showcase-item">
              <div className="showcase-frame">
                <img src={screenshot5} alt="NeuralCode file explorer" />
              </div>
              <div className="showcase-caption">
                <h4>File Explorer</h4>
                <p>Full workspace visibility. Navigate your project structure at a glance.</p>
              </div>
            </div>
            <div className="showcase-item">
              <div className="showcase-frame">
                <img src={screenshot3} alt="NeuralCode pending changes" />
              </div>
              <div className="showcase-caption">
                <h4>Pending Changes Review</h4>
                <p>Accept or undo AI changes with one click. Always in control.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-how">
        <div className="container">
          <div className="section-header">
            <p className="section-label">Get Started</p>
            <h2>Up and running in minutes</h2>
            <div className="glow-line" />
          </div>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-card__num">{s.num}</div>
                <h3 className="step-card__title">{s.title}</h3>
                <p className="step-card__desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-cta">
        <div className="container">
          <div className="cta-box">
            <div className="cta-box__glow" />
            <div className="badge badge-cyan cta-box__badge">Free to Download</div>
            <h2 className="cta-box__title">
              Start coding with AI today
            </h2>
            <p className="cta-box__desc">
              NeuralCode v1.0.4 is available now for Windows. Download and experience the future of software development.
            </p>
            <a href={DOWNLOAD_URL} className="btn-primary cta-box__btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download NeuralCode v1.0.4
            </a>
            <p className="cta-box__note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.799"/>
              </svg>
              Windows 10 &amp; 11 — 64-bit
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
