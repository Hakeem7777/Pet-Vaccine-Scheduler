import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './LandingPageB2C.css';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPageB2C() {
    const container = useRef();
    const [openFaq, setOpenFaq] = useState(null);

    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const b2cFAQs = [
        { q: "Is PetVaxCalendar free to use?", a: "Yes. PetVaxCalendar offers a free version to track schedules and receive reminders." },
        { q: "Does it replace my veterinarian?", a: "No. We help you stay organized but do not dispense medical advice." },
        { q: "How accurate is the schedule?", a: "It's based on widely accepted veterinary guidelines, but your vet may adjust it." },
        { q: "Is my data secure?", a: "Yes. We use secure data storage practices and do not sell your information." }
    ];

    useGSAP(() => {
        // Media query for responsive and accessible animations
        let mm = gsap.matchMedia();

        mm.add({
            // Desktop, no reduced motion
            isDesktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
            // Mobile, no reduced motion
            isMobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
            // Reduced motion (any screen size)
            isReduced: "(prefers-reduced-motion: reduce)"
        }, (context) => {
            let { isDesktop, isMobile, isReduced } = context.conditions;

            if (isReduced) {
                // Simple fade-ins for reduced motion
                gsap.utils.toArray('.anim-fade').forEach((el) => {
                    gsap.from(el, {
                        opacity: 0,
                        duration: 1,
                        scrollTrigger: {
                            trigger: el,
                            start: "top 80%",
                        }
                    });
                });
                return;
            }

            // Hero Section 3D Perspective & Staggered Reveal
            gsap.from('.hero-title-line', {
                y: 50,
                opacity: 0,
                filter: isMobile ? "none" : "blur(10px)",
                duration: 1,
                stagger: 0.2,
                ease: "power3.out",
                delay: 0.2
            });

            gsap.from('.hero-mockup', {
                rotationY: isDesktop ? -15 : 0,
                rotationX: isDesktop ? 10 : 0,
                y: 100,
                opacity: 0,
                duration: 1.5,
                ease: "power3.out",
                delay: 0.5
            });

            // Problem Section Cards Staggered 3D Animation
            gsap.from('.problem-card', {
                y: isMobile ? 40 : 80,
                opacity: 0,
                rotationX: isDesktop ? -15 : 0,
                scale: 0.95,
                duration: 1,
                stagger: isMobile ? 0.1 : 0.15,
                ease: "back.out(1.2)",
                scrollTrigger: {
                    trigger: ".problem-cards-wrapper",
                    start: "top 85%",
                }
            });

            // How it Works Path Animation
            gsap.from('.timeline-path', {
                scaleY: 0,
                transformOrigin: "top center",
                ease: "none",
                scrollTrigger: {
                    trigger: ".how-it-works-section",
                    start: "top center",
                    end: "bottom center",
                    scrub: true
                }
            });

            gsap.utils.toArray('.step-item').forEach((step, i) => {
                gsap.from(step.querySelector('.step-content'), {
                    x: isDesktop ? (i % 2 === 0 ? -50 : 50) : 0,
                    y: isMobile ? 30 : 0,
                    opacity: 0,
                    duration: 0.8,
                    scrollTrigger: {
                        trigger: step,
                        start: "top 80%",
                    }
                });

                // Parallax image within step
                if (isDesktop) {
                    const img = step.querySelector('.step-img-parallax');
                    if (img) {
                        gsap.to(img, {
                            yPercent: 15,
                            ease: "none",
                            scrollTrigger: {
                                trigger: step,
                                start: "top bottom",
                                end: "bottom top",
                                scrub: true
                            }
                        });
                    }
                }
            });

            // General Fade up with blur (Desktop) or just translateY (Mobile)
            gsap.utils.toArray('.anim-fade-up').forEach((el) => {
                gsap.from(el, {
                    y: 60,
                    opacity: 0,
                    filter: isMobile ? "none" : "blur(8px)",
                    duration: 1,
                    scrollTrigger: {
                        trigger: el,
                        start: "top 85%",
                    }
                });
            });

        });

        return () => mm.revert();
    }, { scope: container });

    return (
        <div className="b2c-landing" ref={container}>
            {/* Header */}
            <header className="header b2c-header">
                <div className="header-brand">
                    <Link to="/" className="header-logo-link">
                        <img src="/logoBanner.png" alt="PetVaxCalendar" className="header-logo" />
                    </Link>
                </div>
                <nav className="header-nav">
                    <Link to="/for-clinics" className="header-nav-link">For Clinics</Link>
                    <div className="header-user">
                        <Link to="/login" className="btn btn-outline btn-sm">Log in</Link>
                        <Link to="/signup" className="btn btn-primary btn-sm">Start Free</Link>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-inner">
                <div className="hero-content">
                    <div className="hero-title-line anim-fade">
                        <h1 className="hero-main-title">Pet Vaccination Schedule & Reminder App</h1>
                    </div>
                    <div className="hero-title-line anim-fade">
                        <h1 className="hero-highlight">Never Miss a Shot Again</h1>
                    </div>
                    <div className="hero-title-line anim-fade">
                        <p className="subheadline">PetVaxCalendar helps you track your dog’s vaccination schedule, receive automatic reminders, and store digital vaccine records securely in one place.</p>
                    </div>
                    <div className="hero-title-line anim-fade">
                        <div className="hero-actions">
                            <Link to="/signup" className="btn btn-primary btn-lg">Start Free</Link>
                            <span className="no-cc">No credit card required</span>
                        </div>
                    </div>
                </div>
                <div className="hero-visual perspective-container">
                    <div className="hero-mockup">
                        <picture>
                            <source
                                type="image/webp"
                                srcSet="/Images/landing_page/puppy-vaccine-shot-1-480w.webp 480w, /Images/landing_page/puppy-vaccine-shot-1-768w.webp 768w"
                                sizes="(max-width: 991px) 80vw, 40vw"
                            />
                            <img
                                src="/Images/landing_page/Puppy vaccine shot 1.png"
                                alt="App interface main dashboard showing records"
                                loading="eager"
                                fetchPriority="high"
                                width="1023"
                                height="365"
                            />
                        </picture>
                    </div>
                </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="problem-section">
                <div className="problem-container">
                    <div className="problem-header anim-fade-up">
                        <h2>Keeping Up With Your Pet’s Vaccination Schedule Shouldn’t Be Complicated.</h2>
                        <p>Between puppy booster shots, annual rabies vaccines, and changing vet recommendations, it’s easy to lose track of what your pet needs and when.</p>
                    </div>
                    <div className="problem-cards-wrapper anim-fade">
                        <div className="problem-card">
                            <h3>Health Risks</h3>
                            <p>Missed vaccines leave your pet vulnerable to preventable diseases.</p>
                        </div>
                        <div className="problem-card">
                            <h3>Boarding Refusals</h3>
                            <p>Kennels and daycares require up-to-date documentation.</p>
                        </div>
                        <div className="problem-card">
                            <h3>Travel Complications</h3>
                            <p>Airlines and border controls strictly enforce vaccine tracking.</p>
                        </div>
                        <div className="problem-card">
                            <h3>Emergency Vet Visits</h3>
                            <p>Last-minute rushes are stressful and expensive.</p>
                        </div>
                    </div>
                    <div className="section-cta anim-fade-up">
                        <Link to="/signup" className="btn btn-white btn-lg">Protect Your Pet Today</Link>
                    </div>
                </div>
            </section>

            {/* Solution Section */}
            <section className="solution-section anim-fade-up">
                <div className="solution-content">
                    <h2>Your Complete Pet Vaccine Tracker & Reminder System</h2>
                    <p>PetVaxCalendar automatically generates a personalized puppy vaccination schedule, dog shot schedule based on your pet’s age.</p>
                    <div className="solution-list-container">
                        <ul className="solution-list">
                            <li>Track core and non-core vaccines</li>
                            <li>Receive automated vaccination reminders</li>
                            <li>Store digital rabies and booster records</li>
                            <li>Access printable vaccine reports anytime</li>
                            <li>Manage multiple pets in one account</li>
                        </ul>
                        <div className="solution-visual">
                            <picture>
                                <source
                                    type="image/webp"
                                    srcSet="/Images/landing_page/puppy-vaccine-shot-5-480w.webp 480w"
                                    sizes="(max-width: 991px) 80vw, 40vw"
                                />
                                <img
                                    src="/Images/landing_page/Puppy vaccine shot 5.png"
                                    alt="Digital vaccine records inside app"
                                    loading="lazy"
                                    width="510"
                                    height="248"
                                />
                            </picture>
                        </div>
                    </div>
                    <div className="section-cta anim-fade-up">
                        <Link to="/pricing" className="btn btn-outline-light btn-lg">See Plans &amp; Pricing</Link>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works-section">
                <div className="how-it-works-container">
                    <h2 className="anim-fade-up text-center mb-xl">How PetVaxCalendar Works</h2>
                    <div className="timeline-wrapper">
                        <div className="timeline-path"></div>

                        <div className="step-item anim-fade">
                            <div className="step-content">
                                <span className="step-number">01</span>
                                <h3>Add Your Pet</h3>
                                <p>Enter your dog’s birthdate and basic details in less than a minute.</p>
                            </div>
                            <div className="step-visual">
                                <picture>
                                    <source
                                        type="image/webp"
                                        srcSet="/Images/landing_page/puppy-vaccine-shot-2-480w.webp 480w, /Images/landing_page/puppy-vaccine-shot-2-768w.webp 768w"
                                        sizes="(max-width: 991px) 80vw, 40vw"
                                    />
                                    <img
                                        className="step-img-parallax"
                                        src="/Images/landing_page/Puppy vaccine shot 2.png"
                                        alt="Adding a pet profile"
                                        loading="lazy"
                                        width="1019"
                                        height="295"
                                    />
                                </picture>
                            </div>
                        </div>

                        <div className="step-item reverse anim-fade">
                            <div className="step-content">
                                <span className="step-number">02</span>
                                <h3>Get a Timeline</h3>
                                <p>We generate a recommended vaccine schedule aligned with standard veterinary guidelines.</p>
                            </div>
                            <div className="step-visual">
                                <picture>
                                    <source
                                        type="image/webp"
                                        srcSet="/Images/landing_page/puppy-vaccine-shot-3-480w.webp 480w, /Images/landing_page/puppy-vaccine-shot-3-768w.webp 768w, /Images/landing_page/puppy-vaccine-shot-3-1024w.webp 1024w"
                                        sizes="(max-width: 991px) 80vw, 40vw"
                                    />
                                    <img
                                        className="step-img-parallax"
                                        src="/Images/landing_page/Puppy vaccine shot 3.png"
                                        alt="Viewing timeline schedule"
                                        loading="lazy"
                                        width="1024"
                                        height="355"
                                    />
                                </picture>
                            </div>
                        </div>

                        <div className="step-item anim-fade">
                            <div className="step-content">
                                <span className="step-number">03</span>
                                <h3>Receive Smart Reminders</h3>
                                <p>Get notified before upcoming vaccines so you stay fully compliant and protected.</p>
                            </div>
                            <div className="step-visual">
                                <picture>
                                    <source
                                        type="image/webp"
                                        srcSet="/Images/landing_page/puppy-vaccine-shot-4-480w.webp 480w"
                                        sizes="(max-width: 991px) 80vw, 40vw"
                                    />
                                    <img
                                        className="step-img-parallax"
                                        src="/Images/landing_page/Puppy vaccine shot 4.png"
                                        alt="Push notification reminders"
                                        loading="lazy"
                                        width="511"
                                        height="323"
                                    />
                                </picture>
                            </div>
                        </div>
                    </div>
                    <div className="section-cta anim-fade-up">
                        <Link to="/signup" className="btn btn-primary btn-lg">Get Started Free</Link>
                    </div>
                </div>
            </section>

            {/* Benefits / For Puppies */}
            <section className="benefits-section anim-fade-up">
                <div className="benefits-container">
                    <div className="benefits-header">
                        <h2>Track Every Stage of Your Pet’s Life</h2>
                        <p>PetVaxCalendar adapts as your pet grows.</p>
                    </div>
                    <div className="benefits-grid">
                        <div className="benefit-col">
                            <div className="benefit-icon">🐶</div>
                            <h4>Puppies</h4>
                            <p>Starting their 8-week vaccination schedule</p>
                        </div>
                        <div className="benefit-col">
                            <div className="benefit-icon">🐕</div>
                            <h4>Adult Dogs</h4>
                            <p>Needing annual boosters for ongoing protection</p>
                        </div>
                        <div className="benefit-col">
                            <div className="benefit-icon">🦮</div>
                            <h4>Senior Pets</h4>
                            <p>Maintaining rabies compliance and vet guidelines</p>
                        </div>
                    </div>
                    <div className="section-cta anim-fade-up">
                        <Link to="/pricing" className="btn btn-primary btn-lg">View Pricing Options</Link>
                    </div>
                </div>
            </section>

            <section className="faq-section anim-fade-up">
                <div className="faq-container">
                    <h2>Frequently Asked Questions</h2>
                    <div className="faq-list">
                        {b2cFAQs.map((faq, index) => (
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
                        <Link to="/signup" className="btn btn-primary btn-lg">Create Your Free Account</Link>
                    </div>
                </div>
            </section>

            {/* CTA / Footer */}
            <section className="final-cta-section anim-fade-up">
                <h2>Stay Ahead of Your Pet’s Health.</h2>
                <p>Never miss another dog vaccine.</p>
                <Link to="/signup" className="btn btn-primary btn-lg">Start Tracking for Free</Link>
            </section>

            {/* Clinic CTA Section */}
            <section className="clinic-cta-section anim-fade-up">
                <div className="clinic-cta-inner">
                    <span className="clinic-cta-badge">For Veterinary Clinics</span>
                    <h2>Are You a Veterinary Professional?</h2>
                    <p>Streamline vaccine compliance, reduce missed appointments, and keep every patient on schedule with PetVaxCalendar for Clinics.</p>
                    <Link to="/for-clinics" className="btn btn-outline-light btn-lg">Learn More About Clinic Solutions</Link>
                </div>
            </section>

            <footer className="b2c-footer">
                <div className="footer-container">
                    <p className="copyright">&copy; 2026 PetVaxCalendar. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
