import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <div className="footer__brand-row">
              <img
                src="https://neuralcore.technologyinnovision.com/logo.svg"
                alt="NeuralCode"
                className="footer__logo"
                onError={e => { e.target.style.display = 'none' }}
              />
              <span className="footer__name">Neural<span style={{color:'#6366f1'}}>Code</span></span>
            </div>
            <p className="footer__tagline">
              AI-powered coding assistant built by Technology Innovision. Write, debug, and ship code faster with intelligent agents.
            </p>
            <div className="footer__company">
              A product of{' '}
              <a href="https://technologyinnovision.com" target="_blank" rel="noopener noreferrer">
                Technology Innovision
              </a>
            </div>
          </div>

          <div className="footer__col">
            <h4>Product</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/features">Features</Link></li>
              <li><Link to="/download">Download</Link></li>
              <li><Link to="/about">About</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/acceptable-use">Acceptable Use</Link></li>
              <li><Link to="/data-processing">Data Processing</Link></li>
              <li><Link to="/security">Security Policy</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4>Support</h4>
            <ul>
              <li><a href="mailto:support@technologyinnovision.com">Contact Support</a></li>
              <li><a href="https://technologyinnovision.com" target="_blank" rel="noopener noreferrer">Technology Innovision</a></li>
              <li><Link to="/download">Download v1.0.4</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="footer__bottom-left">
            <span className="footer__windows-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.799"/>
              </svg>
              Windows Only
            </span>
          </div>
          <p className="footer__copyright">
            &copy; {year} Technology Innovision. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
