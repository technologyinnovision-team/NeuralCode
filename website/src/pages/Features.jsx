import './Features.css'
import screenshot6 from '../assets/image_1777660770798.png'
import screenshot7 from '../assets/image_1777660786819.png'
import screenshot8 from '../assets/image_1777660796078.png'

const DOWNLOAD_URL = 'https://github.com/technologyinnovision-team/technologyinnovision-team.github.io/archive/refs/tags/NeuralCode-win-1.0.4'

const featureBlocks = [
  {
    tag: 'AI Agents',
    title: 'Agents That Actually Do the Work',
    desc: 'NeuralCode\'s core is a powerful agent runtime that reads your files, plans multi-step tasks, writes code, runs commands, and checks its own output. It\'s not autocomplete — it\'s an engineer.',
    points: [
      'Reads and modifies any file in your workspace',
      'Runs shell commands and npm/pip scripts',
      'Plans complex features before executing',
      'Reviews its own output and iterates automatically',
    ],
    img: screenshot6,
    imgAlt: 'NeuralCode AI agent interface',
    reverse: false,
  },
  {
    tag: 'Code Intelligence',
    title: 'Understands Your Entire Codebase',
    desc: 'NeuralCode maintains full context of your project — imports, types, functions, and architecture. Every suggestion is grounded in your actual code, not generic templates.',
    points: [
      'Full project-aware context window',
      'Semantic search across all files',
      'Understands imports, interfaces, and dependencies',
      'Code diffs with accept/reject controls',
    ],
    img: screenshot7,
    imgAlt: 'NeuralCode code intelligence',
    reverse: true,
  },
  {
    tag: 'Integrated Terminal',
    title: 'Shell Access Inside Your Workspace',
    desc: 'Run any command directly inside NeuralCode. The AI can also invoke the terminal itself — running tests, installing packages, or starting servers as part of its workflow.',
    points: [
      'Full PowerShell and cmd integration on Windows',
      'AI-invoked command execution',
      'Real-time output streaming',
      'Connected to your project environment',
    ],
    img: screenshot8,
    imgAlt: 'NeuralCode terminal integration',
    reverse: false,
  },
]

const modes = [
  {
    name: 'Agent',
    color: '#7c3aed',
    desc: 'Fully autonomous mode. The AI reads, writes, and runs commands to complete your request end-to-end.',
  },
  {
    name: 'Plan',
    color: '#4f46e5',
    desc: 'Think before you act. NeuralCode lays out a structured plan for complex features before executing.',
  },
  {
    name: 'Debug',
    color: '#0891b2',
    desc: 'Root-cause analysis mode. The AI reads logs, traces errors, and proposes targeted fixes.',
  },
  {
    name: 'Ask',
    color: '#059669',
    desc: 'Conversational mode. Ask questions about your code, architecture, or best practices.',
  },
]

export default function Features() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">Features</p>
          <h1>Built for real engineering</h1>
          <p>Every feature in NeuralCode is designed for developers who ship production code — not demos.</p>
          <div className="glow-line" />
        </div>
      </section>

      {/* Feature blocks */}
      <section className="features-blocks">
        <div className="container">
          {featureBlocks.map((block, i) => (
            <div key={i} className={`feature-block ${block.reverse ? 'feature-block--reverse' : ''}`}>
              <div className="feature-block__text">
                <div className="badge badge-purple feature-block__tag">{block.tag}</div>
                <h2 className="feature-block__title">{block.title}</h2>
                <p className="feature-block__desc">{block.desc}</p>
                <ul className="feature-block__list">
                  {block.points.map((p, j) => (
                    <li key={j}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="feature-block__image">
                <div className="feature-block__frame">
                  <img src={block.img} alt={block.imgAlt} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modes */}
      <section className="features-modes">
        <div className="container">
          <div className="section-header">
            <p className="section-label">Modes</p>
            <h2>Four ways to work with AI</h2>
            <div className="glow-line" />
          </div>
          <div className="modes-grid">
            {modes.map((m, i) => (
              <div key={i} className="mode-card">
                <div className="mode-card__pill" style={{ background: m.color + '22', color: m.color, border: `1px solid ${m.color}44` }}>
                  {m.name}
                </div>
                <p className="mode-card__desc">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="features-cta">
        <div className="container">
          <div className="features-cta__box">
            <h2>Ready to try it?</h2>
            <p>Download NeuralCode for Windows and start coding with AI agents today.</p>
            <a href={DOWNLOAD_URL} className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download for Windows — v1.0.4
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
