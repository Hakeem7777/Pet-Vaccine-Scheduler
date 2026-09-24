import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import './PinterestLandingPage.css';

export default function PinterestLandingPage() {
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);

        const attribution = {
            utm_source: params.get('utm_source') || 'pinterest',
            utm_medium: params.get('utm_medium') || 'organic',
            utm_campaign:
                params.get('utm_campaign') || 'free_dog_vaccine_schedule',
            utm_content: params.get('utm_content') || '',
        };

        localStorage.setItem(
            'pvc_marketing_attribution',
            JSON.stringify(attribution)
        );

        if (window.gtag) {
            window.gtag('event', 'pinterest_landing_view', {
                campaign: attribution.utm_campaign,
                content: attribution.utm_content,
            });
        }
    }, [location.search]);

    const trackCTA = (locationName) => {
        if (window.gtag) {
            window.gtag('event', 'pinterest_start_schedule', {
                button_location: locationName,
                campaign: 'free_dog_vaccine_schedule',
            });
        }
    };

    const signupUrl =
        '/signup?utm_source=pinterest&utm_medium=organic&utm_campaign=free_dog_vaccine_schedule';

    return (
        <div className="pinterest-landing">

            {/* HEADER */}
            <header className="pinterest-header">
                <Link to="/" className="pinterest-logo-link">
                    <img
                        src="/logoBanner.png"
                        alt="PetVaxCalendar"
                        className="pinterest-logo"
                    />
                </Link>

                <Link
                    to="/login"
                    className="pinterest-login-link"
                >
                    Log in
                </Link>
            </header>

            {/* HERO */}
            <section className="pinterest-hero">
                <div className="pinterest-container pinterest-hero-grid">

                    <div className="pinterest-hero-content">

                        <span className="pinterest-badge">
                            FREE DOG VACCINE SCHEDULE
                        </span>

                        <h1>
                            Never Miss Your Dog&apos;s Next Vaccine
                        </h1>

                        <p className="pinterest-subheadline">
                            Create a personalized dog vaccination schedule,
                            track upcoming booster dates, and keep important
                            vaccine information organized in one place.
                        </p>

                        <div className="pinterest-benefits">
                            <div>✓ Personalized vaccine schedule</div>
                            <div>✓ Track upcoming booster dates</div>
                            <div>✓ Organize vaccination records</div>
                            <div>✓ Built specifically for dog owners</div>
                        </div>

                        <Link
                            to={signupUrl}
                            className="pinterest-primary-btn"
                            onClick={() => trackCTA('hero')}
                        >
                            Create My Free Schedule
                        </Link>

                        <p className="pinterest-no-card">
                            Free · No credit card required
                        </p>

                    </div>

                    <div className="pinterest-hero-image">
                        <Link
                            to={signupUrl}
                            onClick={() => trackCTA('hero_image')}
                        >
                            <picture>
                                <source
                                    type="image/webp"
                                    srcSet="
                                        /Images/landing_page/puppy-vaccine-reminder-480w.webp 480w,
                                        /Images/landing_page/puppy-vaccine-reminder-768w.webp 768w,
                                        /Images/landing_page/puppy-vaccine-reminder-1024w.webp 1024w,
                                        /Images/landing_page/puppy-vaccine-reminder-1440w.webp 1440w
                                    "
                                    sizes="(max-width: 900px) 90vw, 45vw"
                                />

                                <img
                                    src="/Images/landing_page/puppy-vaccine-reminder-1440w.jpg"
                                    alt="PetVaxCalendar dog vaccine schedule and reminder"
                                    loading="eager"
                                    fetchPriority="high"
                                    width="1440"
                                    height="960"
                                />
                            </picture>
                        </Link>
                    </div>

                </div>
            </section>

            {/* PROBLEM */}
            <section className="pinterest-problem">
                <div className="pinterest-container pinterest-narrow">

                    <span className="pinterest-section-label">
                        DOG VACCINE TRACKING MADE SIMPLE
                    </span>

                    <h2>
                        Trying to Remember Every Vaccine Date Gets Complicated
                    </h2>

                    <p>
                        Between puppy vaccines, boosters, rabies vaccinations,
                        and veterinary appointments, important dates can be
                        easy to lose track of.
                    </p>

                    <div className="pinterest-problem-grid">

                        <div className="pinterest-card">
                            <div className="pinterest-icon">📅</div>
                            <h3>Too Many Dates</h3>
                            <p>
                                Keep important vaccination dates together
                                instead of relying on memory.
                            </p>
                        </div>

                        <div className="pinterest-card">
                            <div className="pinterest-icon">💉</div>
                            <h3>Multiple Boosters</h3>
                            <p>
                                Follow upcoming vaccine and booster dates more
                                easily.
                            </p>
                        </div>

                        <div className="pinterest-card">
                            <div className="pinterest-icon">📄</div>
                            <h3>Scattered Records</h3>
                            <p>
                                Keep vaccination information easier to find
                                when you need it.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="pinterest-how">
                <div className="pinterest-container">

                    <div className="pinterest-heading">
                        <span className="pinterest-section-label">
                            HOW IT WORKS
                        </span>

                        <h2>
                            Get Started in Minutes
                        </h2>
                    </div>

                    <div className="pinterest-steps">

                        <div className="pinterest-step">
                            <span>1</span>
                            <h3>Add Your Dog</h3>
                            <p>
                                Enter your dog&apos;s basic information and
                                vaccination details.
                            </p>
                        </div>

                        <div className="pinterest-step">
                            <span>2</span>
                            <h3>See the Schedule</h3>
                            <p>
                                Organize recommended vaccine and booster dates
                                in one place.
                            </p>
                        </div>

                        <div className="pinterest-step">
                            <span>3</span>
                            <h3>Stay Organized</h3>
                            <p>
                                Keep track of upcoming dates, records, and
                                important vaccination information.
                            </p>
                        </div>

                    </div>

                    <div className="pinterest-center-cta">
                        <Link
                            to={signupUrl}
                            className="pinterest-primary-btn"
                            onClick={() => trackCTA('how_it_works')}
                        >
                            Check My Dog&apos;s Vaccine Schedule
                        </Link>

                        <p>Free · No credit card required</p>
                    </div>

                </div>
            </section>

            {/* PRODUCT BENEFITS */}
            <section className="pinterest-features">
                <div className="pinterest-container pinterest-narrow">

                    <span className="pinterest-section-label">
                        PETVAXCALENDAR
                    </span>

                    <h2>
                        Everything You Need to Keep Vaccines Organized
                    </h2>

                    <div className="pinterest-feature-list">

                        <div>
                            <strong>✓ Vaccine schedule tracking</strong>
                            <p>
                                View your dog&apos;s important vaccination
                                dates in one place.
                            </p>
                        </div>

                        <div>
                            <strong>✓ Vaccination reminders</strong>
                            <p>
                                Stay aware of upcoming vaccines and boosters.
                            </p>
                        </div>

                        <div>
                            <strong>✓ Digital vaccine records</strong>
                            <p>
                                Keep important vaccination information easier
                                to access.
                            </p>
                        </div>

                        <div>
                            <strong>✓ Printable reports</strong>
                            <p>
                                Access useful vaccination information when you
                                need it.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* TRUST */}
            <section className="pinterest-trust">
                <div className="pinterest-container pinterest-narrow">

                    <h2>
                        Designed to Help Dog Owners Stay Organized
                    </h2>

                    <p>
                        PetVaxCalendar helps you organize your dog&apos;s
                        vaccination schedule and records. Vaccine needs can
                        vary based on your dog&apos;s age, health, lifestyle,
                        location, and veterinarian&apos;s recommendations.
                    </p>

                    <p className="pinterest-disclaimer">
                        PetVaxCalendar is an organizational tool and does not
                        replace veterinary advice. Always consult your
                        veterinarian regarding your dog&apos;s vaccination
                        needs.
                    </p>

                </div>
            </section>

            {/* FINAL CTA */}
            <section className="pinterest-final-cta">
                <div className="pinterest-container pinterest-narrow">

                    <h2>
                        Know What&apos;s Next for Your Dog
                    </h2>

                    <p>
                        Create your free PetVaxCalendar account and start
                        organizing your dog&apos;s vaccine schedule today.
                    </p>

                    <Link
                        to={signupUrl}
                        className="pinterest-primary-btn pinterest-white-btn"
                        onClick={() => trackCTA('final')}
                    >
                        Create My Free Schedule
                    </Link>

                    <span>
                        Free · No credit card required
                    </span>

                </div>
            </section>

            <Footer />

        </div>
    );
}
