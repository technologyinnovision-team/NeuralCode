export default function SecurityPolicy() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">Legal</p>
          <h1>Security Policy</h1>
          <p>Last updated: May 1, 2025</p>
        </div>
      </section>

      <div className="legal-content">
        <p>
          Technology Innovision takes the security of NeuralCode and the data of our users seriously. This Security Policy describes our approach to security, how we protect user data, and how to report vulnerabilities responsibly.
        </p>

        <h2>1. Our Security Commitment</h2>
        <p>We are committed to:</p>
        <ul>
          <li>Maintaining the confidentiality, integrity, and availability of your data</li>
          <li>Proactively identifying and addressing security vulnerabilities</li>
          <li>Transparently communicating about security incidents that affect users</li>
          <li>Continuously improving our security posture</li>
        </ul>

        <h2>2. Infrastructure Security</h2>

        <h3>2.1 Encryption</h3>
        <ul>
          <li>All data transmitted between NeuralCode and our servers is encrypted using TLS 1.2 or higher</li>
          <li>Sensitive data at rest is encrypted using AES-256</li>
          <li>Encryption keys are managed with strict access controls and rotation policies</li>
        </ul>

        <h3>2.2 Access Controls</h3>
        <ul>
          <li>Principle of least privilege applied to all internal systems</li>
          <li>Multi-factor authentication required for all internal administrative access</li>
          <li>Regular access reviews and revocation of unnecessary permissions</li>
          <li>Audit logging for all privileged operations</li>
        </ul>

        <h3>2.3 Network Security</h3>
        <ul>
          <li>Firewall and intrusion detection systems protecting backend infrastructure</li>
          <li>DDoS protection measures in place</li>
          <li>Segmented network architecture to limit blast radius of any breach</li>
        </ul>

        <h2>3. Application Security</h2>
        <ul>
          <li>Security-focused code review process for all changes</li>
          <li>Regular static analysis and dependency vulnerability scanning</li>
          <li>Input validation and output encoding throughout the application</li>
          <li>Secure software development lifecycle (SDLC) practices</li>
          <li>Dependency updates monitored for known CVEs</li>
        </ul>

        <h2>4. AI Model Security</h2>
        <p>NeuralCode's AI features are subject to additional security considerations:</p>
        <ul>
          <li>Prompts are not persistently stored for training without user consent</li>
          <li>Guardrails in place to prevent generation of harmful content</li>
          <li>AI model providers are vetted for security and privacy compliance</li>
          <li>Ongoing monitoring for prompt injection and adversarial input attempts</li>
        </ul>

        <h2>5. Responsible Disclosure (Bug Bounty)</h2>
        <p>
          We welcome reports from security researchers. If you discover a security vulnerability in NeuralCode or our infrastructure, please disclose it responsibly by following these guidelines:
        </p>

        <h3>5.1 How to Report</h3>
        <ul>
          <li>Email: <a href="mailto:security@technologyinnovision.com">security@technologyinnovision.com</a></li>
          <li>Include a clear description of the vulnerability and steps to reproduce</li>
          <li>Provide any proof-of-concept code if applicable</li>
          <li>Avoid accessing, modifying, or deleting user data during research</li>
        </ul>

        <h3>5.2 Our Commitments to Researchers</h3>
        <ul>
          <li>We will acknowledge receipt of your report within 48 hours</li>
          <li>We will provide regular updates on our investigation</li>
          <li>We will not pursue legal action against good-faith security researchers</li>
          <li>We will credit researchers in our acknowledgments (unless they prefer anonymity)</li>
        </ul>

        <h3>5.3 Scope</h3>
        <p>In-scope targets include NeuralCode application and code.technologyinnovision.com. Out-of-scope includes third-party services and social engineering attacks.</p>

        <h2>6. Incident Response</h2>
        <p>In the event of a security incident, we will:</p>
        <ul>
          <li>Contain and investigate the incident promptly</li>
          <li>Notify affected users within 72 hours of confirmed data exposure</li>
          <li>Conduct a post-incident review and publish learnings where appropriate</li>
          <li>Cooperate with law enforcement as required</li>
        </ul>

        <h2>7. Third-Party Audits</h2>
        <p>
          We conduct periodic third-party security assessments and penetration tests. Results are used to drive remediation and continuous improvement of our security posture.
        </p>

        <h2>8. User Responsibilities</h2>
        <p>Users of NeuralCode are expected to:</p>
        <ul>
          <li>Keep their NeuralCode installation up to date</li>
          <li>Use strong, unique credentials for any associated accounts</li>
          <li>Report suspected security issues promptly</li>
          <li>Not share account credentials with unauthorized individuals</li>
        </ul>

        <h2>9. Contact</h2>
        <p>For security concerns, contact us at <a href="mailto:security@technologyinnovision.com">security@technologyinnovision.com</a>. For general inquiries, visit <a href="https://technologyinnovision.com">technologyinnovision.com</a>.</p>
      </div>
    </main>
  )
}
