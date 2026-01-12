import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';

function PrivacyPage() {
  return (
    <div className="app-layout">
      <motion.div
        className="legal-page"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="legal-content">
          <Link to="/" className="legal-back-link">
            Back to Home
          </Link>

          <h1>Privacy Policy</h1>
          <p className="legal-effective-date">Effective Date: January 7, 2026</p>

          <p>
            Your privacy matters to us. This Privacy Policy explains how PetVaxCalendar.com
            collects, uses, and protects your information.
          </p>

          <h2>Information We Collect</h2>
          <p>We may collect:</p>
          <ul>
            <li>Email address</li>
            <li>Pet information (name, age, vaccination history)</li>
            <li>Usage data (pages visited, actions taken)</li>
            <li>IP address and device/browser data</li>
            <li>Cookies (for analytics and functionality)</li>
          </ul>
          <p>We do not collect human medical records or sensitive personal identifiers.</p>

          <h2>How We Use Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Generate vaccination schedules</li>
            <li>Send emails and reminders (if enabled)</li>
            <li>Improve the Service</li>
            <li>Provide customer support</li>
            <li>Ensure platform security</li>
          </ul>

          <h2>AI Use Disclosure</h2>
          <p>
            Artificial intelligence may be used to generate explanatory text, but AI does not
            make medical decisions or determine vaccination schedules.
          </p>

          <h2>Third-Party Services</h2>
          <p>We may share limited data with trusted providers such as:</p>
          <ul>
            <li>Hosting and database providers</li>
            <li>Email delivery services</li>
            <li>Analytics tools</li>
            <li>Payment processors</li>
          </ul>
          <p>These providers are contractually obligated to protect your data.</p>

          <h2>Data Retention</h2>
          <p>
            We retain personal information only as long as necessary to provide the Service
            or as required by law.
          </p>

          <h2>Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Request access to your data</li>
            <li>Request correction or deletion</li>
            <li>Opt out of emails</li>
            <li>Control cookies via browser settings</li>
          </ul>
          <p>Requests can be made by contacting us.</p>

          <h2>Security</h2>
          <p>
            We use reasonable administrative, technical, and physical safeguards to protect
            your information. No system is 100% secure.
          </p>

          <h2>Children's Privacy</h2>
          <p>
            The Service is not directed to children under 13. We do not knowingly collect
            information from children.
          </p>

          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Continued use of the Service
            constitutes acceptance of changes.
          </p>

          <h2>Contact</h2>
          <p>
            Email: <a href="mailto:privacy@petvaxcalendar.com">privacy@petvaxcalendar.com</a>
          </p>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
}

export default PrivacyPage;
