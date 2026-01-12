import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import './FAQPage.css';

const FAQ_DATA = [
  {
    id: 'core-vs-noncore',
    question: 'What is the difference between core and non-core vaccines?',
    answer: `Core vaccines are recommended for all dogs, regardless of their lifestyle or location. These protect against diseases that are:

- Highly contagious and widespread
- Cause severe illness or death
- May be transmissible to humans (zoonotic)

Core vaccines include: DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza) and Rabies.

Non-core vaccines are recommended based on your dog's specific risk factors:
- Geographic location (tick-endemic areas)
- Lifestyle (boarding, dog parks, grooming)
- Travel habits
- Exposure to other dogs or wildlife

Non-core vaccines include: Lyme, Bordetella, Canine Influenza, and Leptospirosis (though Lepto is increasingly considered core in many areas).`,
  },
  {
    id: 'disease-transmission',
    question: 'How are the diseases vaccines protect against transmitted?',
    answer: `Understanding how diseases spread helps you assess your dog's risk and the importance of vaccination:

Airborne Transmission (Respiratory Droplets):
- Distemper, Parainfluenza, and Canine Influenza spread through coughing and sneezing
- Dogs can become infected simply by being near an infected dog
- High risk in enclosed spaces with poor ventilation

Direct Contact:
- Parvovirus survives in the environment for months and spreads through contaminated feces
- Bordetella (kennel cough) spreads through nose-to-nose contact and shared water bowls
- Any dog can track these pathogens home on their paws

Contaminated Water and Environment:
- Leptospirosis bacteria thrive in standing water, puddles, and moist soil
- Wildlife (raccoons, skunks, rodents) shed the bacteria in their urine
- Dogs can become infected by drinking from or walking through contaminated water

Vector-Borne (Tick Transmission):
- Lyme disease is transmitted by deer ticks (black-legged ticks)
- Ticks must be attached for 24-48 hours to transmit the bacteria
- Common in wooded, grassy, and brushy areas

Bite Transmission:
- Rabies is transmitted through the saliva of infected animals via bites
- Any mammal can carry rabies, including wildlife like bats, raccoons, and foxes
- This is why rabies vaccination is legally required`,
  },
  {
    id: 'disease-severity',
    question: 'What diseases do vaccines protect against and why are they serious?',
    answer: `Vaccines protect against diseases that can cause severe illness, permanent damage, or death:

Distemper:
- Attacks the respiratory, gastrointestinal, and nervous systems
- Causes seizures, paralysis, and brain damage
- Often fatal; survivors may have permanent neurological damage
- No cure exists once infected

Parvovirus:
- Causes severe, bloody diarrhea and vomiting
- Rapidly leads to life-threatening dehydration
- Mortality rate of 90% in untreated puppies
- Virus survives in the environment for years

Hepatitis (Adenovirus):
- Causes liver failure, respiratory disease, and eye damage
- Can be fatal in severe cases
- Survivors may develop chronic liver or kidney problems

Rabies:
- 100% fatal once symptoms appear - there is no cure
- Attacks the central nervous system
- Transmissible to humans (public health emergency)
- This is why vaccination is legally required

Leptospirosis:
- Causes acute kidney and liver failure
- Transmissible to humans (zoonotic)
- Can be fatal without prompt treatment
- Increasingly common in urban and suburban areas

Lyme Disease:
- Causes lameness, joint swelling, and fever
- Can lead to serious kidney disease (Lyme nephritis)
- Symptoms may not appear for months after infection
- Chronic cases require long-term management

Kennel Cough (Bordetella/Parainfluenza):
- Causes persistent, honking cough lasting weeks
- Can progress to pneumonia in puppies or immunocompromised dogs
- Highly contagious in social settings

Canine Influenza:
- Causes high fever, cough, and nasal discharge
- Can progress to severe pneumonia
- Nearly 100% of exposed dogs become infected
- Outbreaks can close boarding facilities and dog parks`,
  },
  {
    id: 'side-effects',
    question: 'What are common side effects after vaccination?',
    answer: `Most dogs experience mild, temporary side effects that resolve within 24-48 hours:

Common (Normal) Side Effects:
- Mild fever and lethargy
- Decreased appetite
- Soreness or small lump at injection site
- Mild sneezing/coughing (intranasal vaccines only)

These reactions indicate your dog's immune system is responding to the vaccine - this is actually a good sign!

The side effects are typically very mild compared to the diseases vaccines prevent.`,
  },
  {
    id: 'when-to-call-vet',
    question: 'When should I contact my veterinarian after vaccination?',
    answer: `Contact your veterinarian immediately if you observe any of these signs:

Emergency Signs (Seek immediate care):
- Difficulty breathing
- Facial swelling or hives
- Collapse or extreme weakness
- Pale gums

Concerning Signs (Call your vet):
- Vomiting or diarrhea
- Injection site that is hot, painful, or growing
- Symptoms lasting more than 48 hours
- Severe lethargy

While serious reactions are rare, it's always better to err on the side of caution. Your veterinarian can provide guidance specific to your dog's situation.`,
  },
  {
    id: 'lifestyle-risk-factors',
    question: 'Which vaccines does my dog need based on their lifestyle?',
    answer: `Beyond core vaccines (DHPP and Rabies), your dog's lifestyle and environment determine which additional vaccines are recommended:

Dog Parks, Daycare, Boarding, or Grooming:
- Bordetella (kennel cough) - Often required by facilities
- Canine Influenza - Spreads rapidly in group settings
- These environments have high dog-to-dog contact and shared air space

Tick-Endemic or Wooded Areas:
- Lyme Disease - Essential if you live in or travel to areas with deer ticks
- Northeast, Upper Midwest, and Pacific Coast have highest risk
- Also consider if your dog hikes, camps, or spends time in tall grass

Wildlife Exposure, Rural Areas, or Hiking:
- Leptospirosis - Wildlife shed bacteria in their urine
- Common in areas with raccoons, skunks, deer, or rodents
- Risk increases near farms, forests, and standing water

Urban and Suburban Settings:
- Leptospirosis is increasingly common in cities (rats, puddles)
- Bordetella if your dog uses dog parks or has playdates

Multi-Dog Households:
- Bordetella and Canine Influenza spread easily between housemates
- If one dog is social, all dogs may benefit from these vaccines

Travel:
- Check regional disease prevalence at your destination
- Some areas have higher rates of Leptospirosis or Lyme
- International travel may require specific vaccinations

Stagnant Water Exposure:
- Leptospirosis bacteria thrive in puddles, ponds, and slow-moving water
- Risk is highest after flooding or heavy rain
- Dogs that swim or drink from natural water sources are at higher risk

This app automatically suggests vaccines based on your dog's profile, but discuss your specific situation with your veterinarian.`,
  },
  {
    id: 'puppy-schedule',
    question: 'Why do puppies need multiple doses of the same vaccine?',
    answer: `Puppies receive maternal antibodies from their mother's milk, which protect them in early life. However, these antibodies also interfere with vaccine response.

The challenge is that maternal antibodies:
- Decline at different rates in different puppies
- Can block vaccines from working effectively
- Typically wane between 6-16 weeks of age

Because we cannot predict exactly when maternal antibodies will decline, puppies receive a series of vaccines every 2-4 weeks until they reach 16 weeks of age. This ensures that at least one dose is given after maternal antibodies have waned.

According to AAHA/WSAVA guidelines, the final DHPP dose should be given after 16 weeks of age to ensure lasting immunity.`,
  },
  {
    id: 'booster-timing',
    question: 'How often do adult dogs need booster vaccines?',
    answer: `Booster timing varies by vaccine:

Annual Boosters:
- Bordetella (kennel cough)
- Leptospirosis
- Canine Influenza
- Lyme disease

Every 3 Years:
- DHPP (after the 1-year booster following puppy series)
- Rabies (in most jurisdictions, after initial 1-year vaccine)

Note: Some vaccines have 3-year formulations available. Your veterinarian will recommend the appropriate schedule based on your dog's health, risk factors, and local regulations.

Rabies vaccine timing is often mandated by law and may vary by state or country.`,
  },
  {
    id: 'missed-vaccine',
    question: 'What happens if my dog misses a scheduled vaccine?',
    answer: `Don't panic! Here's what to do:

For puppy series vaccines:
- If less than 6 weeks late: Continue where you left off
- If more than 6 weeks late: Your vet may recommend restarting the series

For adult boosters:
- Most vaccines have a "grace period"
- Your vet will determine if additional doses are needed
- The immune system often retains some memory

Important: Contact your veterinarian as soon as you realize a vaccine was missed. They can assess your dog's specific situation and recommend the best course of action.

Never assume your dog is fully protected if vaccines are overdue.`,
  },
  {
    id: 'vaccine-safety',
    question: 'Are vaccines safe for my dog?',
    answer: `Yes, vaccines are very safe and have been extensively tested. The benefits far outweigh the risks.

Vaccine safety facts:
- Modern vaccines undergo rigorous testing before approval
- Serious reactions are extremely rare (less than 0.5% of all vaccines)
- The diseases prevented are far more dangerous than potential side effects
- Vaccines have dramatically reduced preventable dog deaths

Small dogs (under 10 lbs) may have slightly higher reaction rates. Your veterinarian may space out vaccines or use specific protocols for small breeds.

If your dog has had a vaccine reaction in the past, inform your veterinarian. They can take precautions and monitor your dog after vaccination.`,
  },
  {
    id: 'understanding-schedule',
    question: 'How does this app calculate my dog\'s vaccine schedule?',
    answer: `This app uses veterinary guidelines (AAHA/WSAVA) to create a personalized vaccine schedule based on your dog's profile:

How the Schedule is Calculated:
- Your dog's birth date determines their age classification (puppy, adolescent, adult, or senior)
- Puppies (under 16 weeks) follow a series protocol with multiple doses
- Adult dogs follow a different protocol with fewer initial doses
- Previous vaccination history is factored in to determine what's still needed

Understanding Date Ranges:
- Each vaccine shows a "Recommended Date" and an "Acceptable Window"
- The window represents the safe range for administration
- Vaccines given within this window provide proper protection
- Too early may reduce effectiveness; too late may leave gaps in immunity

What the Categories Mean:
- Overdue (Red): Past the recommended window - schedule with your vet soon
- Upcoming (Orange): Due within the next 30 days - time to plan your vet visit
- Future (Green): Scheduled for later - no immediate action needed

Non-Core Vaccine Selection:
- Use the checkboxes to include optional vaccines based on your dog's lifestyle
- The app suggests vaccines based on your dog's environment settings
- You can add or remove non-core vaccines at any time

Why the Final Puppy DHPP Must Be After 16 Weeks:
- Maternal antibodies from mom can interfere with vaccines
- These antibodies typically wane by 16 weeks of age
- A dose after 16 weeks ensures lasting immunity once maternal protection is gone
- This follows AAHA/WSAVA guidelines for optimal protection

Important Reminder:
This schedule is a guideline based on standard protocols. Your veterinarian knows your dog's individual health history and may recommend adjustments. Always consult with your vet before making vaccination decisions.`,
  },
  {
    id: 'legal-requirements',
    question: 'Is the Rabies vaccine legally required?',
    answer: `In most jurisdictions, yes. Rabies vaccination is required by law because:

- Rabies is fatal to both dogs and humans
- There is no cure once symptoms appear
- Vaccination protects public health

Legal requirements typically include:
- First vaccine at 12-16 weeks of age
- Booster at 1 year
- Subsequent boosters every 1-3 years (varies by jurisdiction)
- Proof of vaccination for licensing

Consequences of non-compliance may include:
- Fines
- Inability to license your dog
- Quarantine if your dog bites someone
- In extreme cases, euthanasia after a bite incident

Always keep your dog's Rabies certificate up to date. Check your local laws for specific requirements.`,
  },
];

function AccordionItem({ item, isOpen, onToggle }) {
  return (
    <div className={`faq-item ${isOpen ? 'faq-item--open' : ''}`}>
      <button
        className="faq-question"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{item.question}</span>
        <span className="faq-icon">{isOpen ? '-' : '+'}</span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="faq-answer-wrapper"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="faq-answer">
              {item.answer.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQPage() {
  const [openItem, setOpenItem] = useState(null);

  const handleToggle = (id) => {
    setOpenItem(openItem === id ? null : id);
  };

  return (
    <div className="app-layout">
      <div className="faq-page">
        <div className="faq-header">
          <Link to="/" className="faq-back-link">
            Back to Dashboard
          </Link>
          <h1>Frequently Asked Questions</h1>
          <p className="faq-subtitle">
            Learn about dog vaccinations, schedules, and safety information.
          </p>
        </div>

        <div className="faq-content">
          <div className="faq-disclaimer">
            <h3>Important Notice</h3>
            <p>
              Vaccine schedules are generated based on AAHA (American Animal Hospital Association)
              and WSAVA (World Small Animal Veterinary Association) guidelines. This information
              is provided for educational purposes only and does not constitute veterinary advice.
              Always consult with a licensed veterinarian for decisions about your dog's health
              and vaccination schedule.
            </p>
          </div>

          <div className="faq-list">
            {FAQ_DATA.map((item) => (
              <AccordionItem
                key={item.id}
                item={item}
                isOpen={openItem === item.id}
                onToggle={() => handleToggle(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default FAQPage;
