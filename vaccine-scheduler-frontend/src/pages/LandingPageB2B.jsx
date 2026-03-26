import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Footer from '../components/layout/Footer';
import './LandingPageB2B.css';

const CLOUDFLARE_ACCOUNT_ID = import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_VIDEO_ID = import.meta.env.VITE_CLOUDFLARE_B2B_VIDEO_ID;

gsap.registerPlugin(ScrollTrigger);

export default function LandingPageB2B() {
    const container = useRef();
    const [openFaq, setOpenFaq] = useState(null);
    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const b2bFAQs = [
        { q: "1. Does PetVaxCalendar integrate with our practice management software?", a: "PetVaxCalendar is designed to complement existing practice systems. It does not require full system replacement and can operate alongside your current reminder workflows." },
        { q: "2. How does client onboarding work?", a: "Clinics provide clients with a QR code or custom link. Pet owners create accounts and receive structured vaccine timelines and automated reminders." },
        { q: "3. Does this replace our current reminder system?", a: "No. PetVaxCalendar enhances vaccine-specific compliance and booster tracking. It can function as a supplemental compliance tool." },
        { q: "4. Is client data secure?", a: "Yes. We use secure storage practices and prioritize responsible data handling. PetVaxCalendar does not sell client information." },
        { q: "5. How does this improve compliance rates?", a: "Structured vaccine timelines and automated reminders reduce missed boosters and increase long-term preventive care adherence." },
        { q: "6. What is the implementation timeline?", a: "Most clinics can begin using PetVaxCalendar within days. Setup is simple and does not require complex technical integration." }
    ];

    useGSAP(() => {
        let mm = gsap.matchMedia();

        mm.add({
            isDesktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
            isMobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
            isReduced: "(prefers-reduced-motion: reduce)"
        }, (context) => {
            let { isDesktop, isReduced } = context.conditions;

            if (isReduced) {
                gsap.utils.toArray('.anim-fade').forEach((el) => {
                    gsap.from(el, { opacity: 0, duration: 1, scrollTrigger: el });
                });
                return;
            }

            // Hero Section: Staggered Fade Up + Background Zoom
            gsap.from('.b2b-hero-bg', {
                scale: 1.1,
                duration: 3,
                ease: "power2.out"
            });

            gsap.from('.b2b-hero-text > *', {
                y: 40,
                opacity: 0,
                stagger: 0.15,
                duration: 1,
                ease: "power3.out",
                delay: 0.3
            });

            // Split Screen Problem Section (Desktop Only pinning)
            if (isDesktop) {
                // Slow fade of problem points as right side scrolls
                gsap.utils.toArray('.b2b-problem-point').forEach((point) => {
                    gsap.from(point, {
                        y: 50,
                        opacity: 0,
                        scrollTrigger: {
                            trigger: point,
                            start: "top 80%",
                            end: "bottom 60%",
                            scrub: 1
                        }
                    });
                });
            } else {
                // Mobile fallback for problem points
                gsap.from('.b2b-problem-point, .b2b-problem-left', {
                    y: 40,
                    opacity: 0,
                    stagger: 0.1,
                    scrollTrigger: {
                        trigger: ".b2b-problem-section",
                        start: "top 80%"
                    }
                });
            }

            // Card Stacking Solution Section
            if (isDesktop) {
                const cards = gsap.utils.toArray('.b2b-solution-card');

                // Set initial state
                gsap.set(cards, { y: 250, opacity: 0, scale: 0.95 });

                // Create a single timeline triggered globally for the section
                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: ".b2b-solution-section",
                        start: "top 40%",
                        end: "bottom center",
                        scrub: true
                    }
                });

                // Stagger them sequentially
                cards.forEach((card, i) => {
                    tl.to(card, {
                        y: i * 20, // keep the stacking offset
                        opacity: 1,
                        scale: 1 - ((cards.length - 1 - i) * 0.05),
                        duration: 1,
                        ease: "power2.out"
                    }, i * 0.5); // 0.5s stagger based on index
                });
            } else {
                gsap.from('.b2b-solution-card', {
                    y: 30, opacity: 0, stagger: 0.15,
                    scrollTrigger: { trigger: ".b2b-solution-section", start: "top 75%" }
                });
            }

            // How It Works Animation (Desktop Only pinning)
            if (isDesktop) {
                // Initial states for steps 2, 3, 4
                gsap.set(['.b2b-step.step-2', '.b2b-step.step-3', '.b2b-step.step-4'], { opacity: 0, y: 30 });
                gsap.set('.b2b-progress-line', { width: "0%" });

                const stepsTl = gsap.timeline({
                    scrollTrigger: {
                        trigger: ".b2b-how-it-works",
                        start: "center center",
                        end: "+=1500", // Extra scroll area to pin
                        pin: true,
                        scrub: 1
                    }
                });

                // Animate line and fade nodes sequentially
                stepsTl.to('.b2b-progress-line', { width: "25%", duration: 1, ease: "none" })
                    .to('.b2b-step.step-2', { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2")

                    .to('.b2b-progress-line', { width: "50%", duration: 1, ease: "none" })
                    .to('.b2b-step.step-3', { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2")

                    .to('.b2b-progress-line', { width: "75%", duration: 1, ease: "none" })
                    .to('.b2b-step.step-4', { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.2");
            } else {
                // Mobile simple fade
                gsap.from('.b2b-step', {
                    y: 30, opacity: 0, stagger: 0.15,
                    scrollTrigger: { trigger: ".b2b-how-it-works", start: "top 75%" }
                });
            }

            // Benefits Section
            gsap.from('.b2b-benefit-item', {
                y: 50,
                opacity: 0,
                stagger: 0.1,
                ease: "back.out(1.7)", // bounce effect
                duration: 0.8,
                scrollTrigger: {
                    trigger: ".b2b-benefits-section",
                    start: "center center",
                    toggleActions: "play none none reverse"
                }
            });

            // FAQ and General text
            gsap.utils.toArray('.anim-fade-up').forEach((el) => {
                gsap.from(el, {
                    y: 40, opacity: 0, duration: 0.8,
                    scrollTrigger: { trigger: el, start: "top 85%" }
                });
            });

        });

        return () => mm.revert();
    }, { scope: container });

    return (
        <div className="b2b-landing" ref={container}>
            {/* Header */}
            <header className="header b2b-header">
                <div className="header-brand">
                    <Link to="/" className="header-logo-link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/logoBanner.png" alt="PetVaxCalendar" className="header-logo header-logo-full" />
                        <img src="/logoIcon.png" alt="PetVaxCalendar" className="header-logo header-logo-icon" />
                        <span className="b2b-badge">For Clinics</span>
                    </Link>
                </div>
                <nav className="header-nav">
                    <Link to="/" className="header-nav-link">For Pet Owners</Link>
                    <div className="header-user">
                        <Link to="/contact" className="btn btn-primary btn-sm">Request Access</Link>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="b2b-hero-section">
                <div className="b2b-hero-bg">
                    <picture>
                        <source
                            type="image/webp"
                            srcSet="/Images/landing_page/puppy-vaccine-shot-1-480w.webp 480w, /Images/landing_page/puppy-vaccine-shot-1-768w.webp 768w"
                            sizes="100vw"
                        />
                        <img
                            src="/Images/landing_page/Puppy vaccine shot 1.png"
                            alt="Puppy receiving a vaccine shot"
                            loading="eager"
                            fetchPriority="high"
                            width="1023"
                            height="365"
                        />
                    </picture>
                </div>
                <div className="b2b-hero-content b2b-hero-text">
                    <h1>Vaccine Compliance Software for Veterinary Clinics</h1>
                    <p className="b2b-hero-sub">PetVaxCalendar helps veterinary practices improve booster compliance, reduce missed appointments, and enhance client retention with structured vaccination tracking.</p>
                    <div className="b2b-hero-actions">
                        <Link to="/contact" className="btn btn-primary btn-lg">Request Clinic Access</Link>
                        <a href="mailto:sales@petvaxcalendar.com?subject=Demo%20Request" className="btn btn-outline btn-lg" style={{ backgroundColor: 'white' }}>Schedule a Demo</a>
                    </div>
                </div>
            </section>

            {/* Demo Video Section */}
            <section className="demo-video-section anim-fade-up">
                <div className="demo-video-container">
                    <h2>See It In Action</h2>
                    <p>See how PetVaxCalendar helps clinics streamline vaccine compliance and client retention.</p>
                    <div className="demo-video-wrapper">
                        <iframe
                            src={`https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${CLOUDFLARE_VIDEO_ID}/iframe?preload=true&poster=https%3A%2F%2Fcustomer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com%2F${CLOUDFLARE_VIDEO_ID}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D0h013s%26height%3D600`}
                            loading="lazy"
                            className="demo-video"
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            </section>

            {/* Problem Section (Split Screen) */}
            <section className="b2b-problem-section">
                <div className="b2b-split-container">
                    <div className="b2b-problem-left">
                        <h2 className="section-title">Missed Boosters Hurt Compliance and Revenue</h2>
                        <p className="section-desc">Manual reminder systems are inconsistent. Generic SMS tools lack structured vaccine scheduling logic. PetVaxCalendar is purpose-built for vaccine compliance.</p>
                    </div>
                    <div className="b2b-problem-right">
                        <div className="b2b-problem-wrapper">
                            <div className="b2b-problem-point">
                                <div className="b2b-icon-box">🛡️</div>
                                <h3>Reduced patient protection</h3>
                                <p>Every missed vaccine puts animals at greater risk.</p>
                            </div>
                            <div className="b2b-problem-point">
                                <div className="b2b-icon-box">📉</div>
                                <h3>Lost appointment revenue</h3>
                                <p>Missed boosters directly impact the clinic's bottom line.</p>
                            </div>
                            <div className="b2b-problem-point">
                                <div className="b2b-icon-box">📊</div>
                                <h3>Lower compliance rates</h3>
                                <p>Without structured follow-up, client adherence drops significantly.</p>
                            </div>
                            <div className="b2b-problem-point">
                                <div className="b2b-icon-box">⏳</div>
                                <h3>Increased administrative follow-ups</h3>
                                <p>Your staff wastes time manually chasing down clients.</p>
                            </div>
                        </div>
                        <div className="section-cta anim-fade-up">
                            <a href="mailto:sales@petvaxcalendar.com" className="btn btn-primary btn-lg">Talk to Our Team</a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Solution Section (Card Stacking) */}
            <section className="b2b-solution-section">
                <div className="b2b-solution-header anim-fade-up">
                    <h2 className="section-title text-center">A Structured Vaccine Reminder System Designed for Veterinary Practices</h2>
                    <p className="section-desc text-center">Designed to complement, not replace, your existing practice management system.</p>
                </div>
                <div className="b2b-cards-container">
                    <div className="b2b-solution-card card-1">
                        <h4>Automated Generation</h4>
                        <p>✔ Automated vaccine timeline generation</p>
                    </div>
                    <div className="b2b-solution-card card-2">
                        <h4>Smart Reminders</h4>
                        <p>✔ Booster reminder workflows</p>
                    </div>
                    <div className="b2b-solution-card card-3">
                        <h4>Digital Records</h4>
                        <p>✔ Digital vaccine record storage</p>
                    </div>
                    <div className="b2b-solution-card card-4">
                        <h4>Client Tracking</h4>
                        <p>✔ Client-accessible vaccination tracking</p>
                    </div>
                </div>
                <div className="section-cta anim-fade-up">
                    <a href="mailto:sales@petvaxcalendar.com?subject=Walkthrough%20Request" className="btn btn-white btn-lg">Request a Walkthrough</a>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="b2b-how-it-works">
                <div className="container">
                    <div className="b2b-how-header anim-fade-up">
                        <h2 className="text-center">How Veterinary Clinics Use PetVaxCalendar</h2>
                        <p className="text-center b2b-subtext">Simple implementation. Minimal disruption.</p>
                    </div>
                    <div className="b2b-steps-wrapper">
                        <div className="b2b-progress-line-bg"></div>
                        <div className="b2b-progress-line"></div>
                        <div className="b2b-steps-grid">
                            <div className="b2b-step step-1">
                                <div className="step-circle">1</div>
                                <h4>Enroll</h4>
                                <p>Enroll your clinic into the platform.</p>
                            </div>
                            <div className="b2b-step step-2">
                                <div className="step-circle">2</div>
                                <h4>Connect</h4>
                                <p>Provide clients access via QR code or link in the clinic.</p>
                            </div>
                            <div className="b2b-step step-3">
                                <div className="step-circle">3</div>
                                <h4>Automate</h4>
                                <p>Clients receive structured reminders automatically.</p>
                            </div>
                            <div className="b2b-step step-4">
                                <div className="step-circle">4</div>
                                <h4>Improve</h4>
                                <p>Watch compliance and appointment follow-through increase.</p>
                            </div>
                        </div>
                    </div>
                    <div className="section-cta anim-fade-up">
                        <a href="mailto:sales@petvaxcalendar.com?subject=Clinic%20Enrollment" className="btn btn-primary btn-lg">Get Your Clinic Started</a>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="b2b-benefits-section">
                <div className="container">
                    <h2 className="text-center">Increase Compliance. Strengthen Retention.</h2>
                    <p className="text-center b2b-subtext">Prevention isn’t just good medicine, it’s good business.</p>

                    <div className="b2b-benefits-grid">
                        <div className="b2b-benefit-item">
                            <span className="b-icon">📈</span>
                            <p>Improve annual booster rates</p>
                        </div>
                        <div className="b2b-benefit-item">
                            <span className="b-icon">🔻</span>
                            <p>Reduce missed rabies renewals</p>
                        </div>
                        <div className="b2b-benefit-item">
                            <span className="b-icon">🤝</span>
                            <p>Enhance client trust</p>
                        </div>
                        <div className="b2b-benefit-item">
                            <span className="b-icon">🏥</span>
                            <p>Modernize preventive care</p>
                        </div>
                        <div className="b2b-benefit-item">
                            <span className="b-icon">⭐</span>
                            <p>Differentiate from competitors</p>
                        </div>
                    </div>
                    <div className="section-cta anim-fade-up">
                        <a href="mailto:sales@petvaxcalendar.com" className="btn btn-primary btn-lg">See How It Works for Your Practice</a>
                    </div>
                </div>
            </section>

            {/* Trust & Security */}
            <section className="b2b-trust-section anim-fade-up">
                <div className="container text-center">
                    <h2>Professional, Secure & Client-Friendly</h2>
                    <div className="trust-features">
                        <span>🔒 Secure data handling</span>
                        <span>📄 Clear privacy policies</span>
                        <span>🐾 Designed for responsible care</span>
                    </div>
                    <p className="b2b-trust-note">PetVaxCalendar supports best practices in vaccine scheduling and compliance management.</p>
                    <div className="section-cta anim-fade-up">
                        <Link to="/contact" className="btn btn-primary btn-lg">Request Clinic Access</Link>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="b2b-faq-section anim-fade-up">
                <div className="container">
                    <h2 className="text-center">Veterinary Clinic FAQ</h2>
                    <div className="b2b-faq-list">
                        {b2bFAQs.map((faq, index) => (
                            <div
                                key={index}
                                className={`faq-accordion-item ${openFaq === index ? 'active' : ''}`}
                                onClick={() => toggleFaq(index)}
                            >
                                <div className="faq-accordion-header">
                                    <h4>{faq.q}</h4>
                                    <span className="faq-icon">
                                        {openFaq === index ? (
                                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        )}
                                    </span>
                                </div>
                                <div className="faq-accordion-content">
                                    <p>{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="section-cta anim-fade-up">
                        <a href="mailto:sales@petvaxcalendar.com?subject=Question" className="btn btn-primary btn-lg">Still Have Questions? Contact Us</a>
                    </div>
                </div>
            </section>

            {/* CTA Footer */}
            <section className="b2b-cta-footer anim-fade-up">
                <h2>Improve Vaccine Compliance at Your Clinic</h2>
                <div className="b2b-hero-actions justify-center">
                    <Link to="/contact" className="btn btn-primary btn-lg">Request Clinic Access</Link>
                    <a href="mailto:sales@petvaxcalendar.com?subject=Demo%20Request" className="btn btn-outline btn-lg" style={{ borderColor: 'white', color: 'white' }}>Schedule a Demo</a>
                </div>
            </section>

            <Footer />
        </div>
    );
}
