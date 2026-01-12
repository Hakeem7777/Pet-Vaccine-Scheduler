import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      className="footer"
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="footer-container">
        
        <div className="footer-content">
          <nav className="footer-nav">
            <Link to="/terms" className="footer-link">
              Terms of Service
            </Link>
            <span className="footer-separator">|</span>
            <Link to="/privacy" className="footer-link">
              Privacy Policy
            </Link>
          </nav>
          <div className="footer-resources">
            <a
              href="/AAHA-Canine-Vaccination-Guidelines.pdf"
              className="footer-link"
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              AAHA Vaccination Guidelines (PDF)
            </a>
          </div>
          <p className="footer-copyright">
            &copy; {currentYear} PetVaxCalendar
          </p>
        </div>
      </div>
    </motion.footer>
  );
}

export default Footer;
