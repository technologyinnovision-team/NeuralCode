export default function DataProcessing() {
  return (
    <main>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">Legal</p>
          <h1>Data Processing Agreement</h1>
          <p>Last updated: May 1, 2025</p>
        </div>
      </section>

      <div className="legal-content">
        <p>
          This Data Processing Agreement ("DPA") supplements our <a href="/privacy-policy">Privacy Policy</a> and applies to the processing of personal data by Technology Innovision on behalf of users of NeuralCode. This DPA is incorporated into and forms part of our Terms of Service.
        </p>

        <h2>1. Definitions</h2>
        <ul>
          <li><strong>Data Controller:</strong> The user or organization that determines the purposes and means of processing personal data.</li>
          <li><strong>Data Processor:</strong> Technology Innovision, acting on behalf of the Data Controller.</li>
          <li><strong>Personal Data:</strong> Any information relating to an identified or identifiable natural person.</li>
          <li><strong>Processing:</strong> Any operation performed on personal data, including collection, storage, use, and deletion.</li>
          <li><strong>Sub-processor:</strong> A third-party engaged by Technology Innovision to process personal data.</li>
        </ul>

        <h2>2. Scope and Purpose of Processing</h2>
        <p>Technology Innovision processes personal data to:</p>
        <ul>
          <li>Provide and maintain the NeuralCode service</li>
          <li>Process AI inference requests submitted through the software</li>
          <li>Collect anonymized product telemetry and analytics</li>
          <li>Provide customer support</li>
          <li>Send service-related communications</li>
        </ul>

        <h2>3. Types of Personal Data Processed</h2>
        <p>Depending on usage, we may process the following categories of personal data:</p>
        <ul>
          <li>Account identifiers (name, email address)</li>
          <li>Usage data (features accessed, session duration, interaction patterns)</li>
          <li>Technical data (IP address, device identifiers, OS version)</li>
          <li>Content data (prompts and code submitted for AI processing — not stored unless consented to)</li>
          <li>Support communications</li>
        </ul>

        <h2>4. Data Processing Principles</h2>
        <p>Technology Innovision commits to processing personal data in accordance with the following principles:</p>
        <ul>
          <li><strong>Lawfulness and Transparency:</strong> Processing only for stated purposes with a lawful basis.</li>
          <li><strong>Purpose Limitation:</strong> Data collected for one purpose is not used for incompatible purposes.</li>
          <li><strong>Data Minimization:</strong> We collect only data necessary for specified purposes.</li>
          <li><strong>Accuracy:</strong> We take reasonable steps to ensure data accuracy.</li>
          <li><strong>Storage Limitation:</strong> Data is retained only as long as necessary.</li>
          <li><strong>Security:</strong> Appropriate technical and organizational measures protect data.</li>
        </ul>

        <h2>5. Sub-processors</h2>
        <p>We may engage sub-processors to assist in delivering the service. Current categories of sub-processors include:</p>
        <ul>
          <li>AI model providers (for inference processing)</li>
          <li>Cloud infrastructure providers (for hosting and data storage)</li>
          <li>Analytics services (for anonymized product telemetry)</li>
          <li>Customer support platforms</li>
        </ul>
        <p>We require all sub-processors to maintain equivalent data protection standards. Contact us for a current list of sub-processors.</p>

        <h2>6. International Data Transfers</h2>
        <p>
          If personal data is transferred outside the European Economic Area (EEA) or other applicable jurisdictions, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses (SCCs) or adequacy decisions.
        </p>

        <h2>7. Data Subject Rights</h2>
        <p>We support Data Controllers in fulfilling data subject rights requests, including rights to:</p>
        <ul>
          <li>Access and portability of personal data</li>
          <li>Correction of inaccurate data</li>
          <li>Deletion ("right to be forgotten")</li>
          <li>Restriction and objection to processing</li>
          <li>Withdrawal of consent</li>
        </ul>
        <p>To submit a request, email <a href="mailto:privacy@technologyinnovision.com">privacy@technologyinnovision.com</a>.</p>

        <h2>8. Security Measures</h2>
        <p>We implement technical and organizational security measures including:</p>
        <ul>
          <li>Encryption of data in transit (TLS 1.2+) and at rest</li>
          <li>Access controls and role-based permissions</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Incident response procedures</li>
          <li>Employee data protection training</li>
        </ul>

        <h2>9. Data Breach Notification</h2>
        <p>
          In the event of a personal data breach that is likely to result in a risk to the rights and freedoms of individuals, we will notify affected users without undue delay and, where required by law, notify the relevant supervisory authority within 72 hours of becoming aware of the breach.
        </p>

        <h2>10. Contact</h2>
        <p>For data processing inquiries, contact our Data Protection team at <a href="mailto:privacy@technologyinnovision.com">privacy@technologyinnovision.com</a>.</p>
      </div>
    </main>
  )
}
