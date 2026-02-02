import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import { submitContactForm } from '../api/contact';
import './ContactPage.css';

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      await submitContactForm(formData);
      setIsSubmitted(true);
    } catch (err) {
      if (err.response?.data) {
        // Handle field-level errors
        const errorData = err.response.data;
        if (typeof errorData === 'object' && !errorData.error) {
          setErrors(errorData);
        } else {
          setErrors({ general: errorData.error || 'Failed to send message. Please try again.' });
        }
      } else {
        setErrors({ general: 'Failed to send message. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="app-layout">
        <motion.div
          className="contact-page"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="contact-header">
            <Link to="/" className="contact-back-link">
              Back to Dashboard
            </Link>
          </div>

          <div className="contact-success">
            <div className="contact-success-icon">✓</div>
            <h2>Message Sent Successfully</h2>
            <p>
              Thank you for contacting us! We have received your message and will
              respond as soon as possible. You should receive a confirmation email
              shortly.
            </p>
            <Link to="/" className="btn btn-primary">
              Return to Dashboard
            </Link>
          </div>
        </motion.div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <motion.div
        className="contact-page"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="contact-header">
          <Link to="/" className="contact-back-link">
            Back to Dashboard
          </Link>
          <h1>Contact Us</h1>
          <p className="contact-subtitle">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="contact-form">
          {errors.general && (
            <div className="error-message">{errors.general}</div>
          )}

          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              required
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject *</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="What is your message about?"
              required
            />
            {errors.subject && <span className="field-error">{errors.subject}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="message">Message *</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Please describe your question or feedback in detail..."
              required
            />
            {errors.message && <span className="field-error">{errors.message}</span>}
          </div>

          <div className="form-actions">
            <Link to="/" className="btn btn-outline">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </motion.div>
      <Footer />
    </div>
  );
}

export default ContactPage;
