/**
 * Client-side vaccine scheduler for guest mode
 * Mirrors the backend RuleBasedScheduler logic
 */

import { ISOXAZOLINE_MEDS, MEDICATION_CATALOG } from './medicalConstants';

// Vaccine rules (same as backend vaccine_rules.json)
const VACCINE_RULES = [
  {
    id: 'core_dap',
    name: 'Distemper, Hepatitis, Parvovirus, Parainfluenza (DHPP)',
    type: 'core',
    vaccine_type: 'mlv',
    description: 'Protects against four deadly viral diseases: Distemper (affects nervous system), Adenovirus/Hepatitis (causes liver and respiratory illness), Parvovirus (severe gastrointestinal disease with high mortality in puppies), and Parainfluenza (respiratory virus contributing to kennel cough).',
    side_effects: {
      common: [
        'Soreness, swelling, or redness at injection site',
        'Lethargy and decreased appetite (24-48 hours)',
        'Low-grade fever',
        'Small bump at injection site (may last up to 14 days)',
      ],
      seek_vet_if: [
        'Facial swelling, hives, or severe itchiness',
        'Vomiting or diarrhea',
        'Difficulty breathing or collapse',
        'Symptoms lasting more than 48 hours',
      ],
    },
    min_start_age_weeks: 6,
    rules: [
      {
        condition: 'age_weeks <= 16',
        doses: 3,
        interval_days: 28,
        min_interval: 14,
        max_interval: 28,
        initial_booster_days: 365,
        subsequent_booster_days: 1095,
      },
      {
        condition: 'age_weeks > 16',
        doses: 2,
        interval_days: 28,
        min_interval: 14,
        max_interval: 28,
        initial_booster_days: 365,
        subsequent_booster_days: 1095,
      },
    ],
  },
  {
    id: 'core_lepto',
    name: 'Leptospirosis',
    type: 'core_conditional',
    vaccine_type: 'killed',
    description: 'Prevents a bacterial infection spread through contaminated water and wildlife urine. Can cause kidney and liver failure, and is transmissible to humans (zoonotic).',
    side_effects: {
      common: [
        'Mild redness or swelling at injection site (1-2 days)',
        'Fatigue and low-grade fever',
        'Temporary loss of appetite (1-2 days)',
        'Note: Small dogs (<10 lbs) may have higher reaction risk',
      ],
      seek_vet_if: [
        'Swelling of face, muzzle, or legs',
        'Hives, vomiting, or diarrhea',
        'Shortness of breath or collapse',
      ],
    },
    min_start_age_weeks: 12,
    rules: [
      {
        condition: 'all_ages',
        doses: 2,
        interval_days: 28,
        min_interval: 14,
        max_interval: 28,
        initial_booster_days: 365,
        subsequent_booster_days: 365,
      },
    ],
  },
  {
    id: 'core_rabies',
    name: 'Rabies',
    type: 'core',
    vaccine_type: 'killed',
    description: 'Legally required vaccine that protects against the fatal rabies virus, which attacks the nervous system. Essential for public health as rabies is transmissible to humans through bites.',
    side_effects: {
      common: [
        'Mild fever and loss of appetite (24-36 hours)',
        'Soreness and mild swelling at injection site',
        'Small, painless lump at injection site (may last 1-2 weeks)',
        'Mild lethargy',
      ],
      seek_vet_if: [
        'Facial swelling, hives, or difficulty breathing',
        'Vomiting or diarrhea',
        'Injection site swelling that is hot, painful, or growing',
        'Collapse or pale gums (anaphylaxis - emergency)',
      ],
    },
    min_start_age_weeks: 12,
    rules: [
      {
        condition: 'all_ages',
        doses: 1,
        interval_days: 0,
        min_interval: 0,
        max_interval: 0,
        initial_booster_days: 365,
        subsequent_booster_days: 1095,
      },
    ],
  },
  {
    id: 'noncore_lyme',
    name: 'Lyme (Borrelia)',
    type: 'noncore',
    vaccine_type: 'killed',
    description: 'Protects against Lyme disease transmitted by ticks. Important for dogs in wooded or grassy areas where deer ticks are common. Prevents joint pain, fever, and kidney problems.',
    side_effects: {
      common: [
        'Tenderness and slight swelling at injection site',
        'Tiredness for 1-2 days',
        'Mild fever for about 24 hours',
        'Note: Small breeds may have higher reaction risk',
      ],
      seek_vet_if: [
        'Facial swelling, hives, or severe itching',
        'Vomiting, diarrhea, or difficulty breathing',
      ],
    },
    min_start_age_weeks: 12,
    rules: [
      {
        condition: 'all_ages',
        doses: 2,
        interval_days: 28,
        min_interval: 14,
        max_interval: 28,
        initial_booster_days: 365,
        subsequent_booster_days: 365,
      },
    ],
  },
  {
    id: 'noncore_bord_in',
    name: 'Bordetella (Intranasal/Oral)',
    type: 'noncore',
    vaccine_type: 'mlv',
    description: 'Prevents kennel cough, a highly contagious respiratory infection. Essential for dogs that visit groomers, boarding facilities, dog parks, or training classes.',
    side_effects: {
      common: [
        'Sneezing, coughing, and runny nose (normal response)',
        'Mild lethargy (1-2 days)',
      ],
      seek_vet_if: [
        'Facial swelling or hives',
        'Vomiting, difficulty breathing, or diarrhea',
        'Cold-like symptoms lasting more than a few days',
      ],
    },
    min_start_age_weeks: 8,
    rules: [
      {
        condition: 'all_ages',
        doses: 1,
        interval_days: 0,
        min_interval: 0,
        max_interval: 0,
        initial_booster_days: 365,
        subsequent_booster_days: 365,
      },
    ],
  },
  {
    id: 'noncore_flu',
    name: 'Canine Influenza (H3N8/H3N2)',
    type: 'noncore',
    vaccine_type: 'killed',
    description: 'Protects against highly contagious dog flu strains that cause coughing, fever, and respiratory illness. Recommended for dogs in social settings or multi-dog households.',
    side_effects: {
      common: [
        'Sleepiness and soreness at injection site',
        'Mild lethargy (1-2 days)',
      ],
      seek_vet_if: [
        'Vomiting, diarrhea, or hives',
        'Facial swelling or difficulty breathing',
        'Severe lethargy or collapse',
      ],
    },
    min_start_age_weeks: 8,
    rules: [
      {
        condition: 'all_ages',
        doses: 2,
        interval_days: 28,
        min_interval: 14,
        max_interval: 28,
        initial_booster_days: 365,
        subsequent_booster_days: 365,
      },
    ],
  },
];

/**
 * Evaluate health screening answers against a vaccine to produce warnings.
 * Mirrors backend _evaluate_health_warnings logic.
 */
function evaluateHealthWarnings(vaccine, healthContext) {
  if (!healthContext) return { warning: null, contraindicated: false };

  const warnings = [];
  let contraindicated = false;
  const isMlv = vaccine.vaccine_type === 'mlv';

  // Q5: Immunosuppressive meds (strongest)
  if (healthContext.health_immunosuppressive_meds === 'yes') {
    if (isMlv) {
      contraindicated = true;
      warnings.push(
        'CONTRAINDICATED: Do not administer modified-live vaccines to immunosuppressed patients. Wait 2+ weeks after stopping therapy. (WSAVA 2024 Guidelines)'
      );
    } else {
      warnings.push(
        'Caution: Patient on immunosuppressive therapy. Consult veterinarian before administering. (WSAVA 2024 Guidelines)'
      );
    }
  }

  // Q6: Pregnant/breeding
  if (healthContext.health_pregnant_breeding === 'yes') {
    if (isMlv) {
      contraindicated = true;
      warnings.push(
        'CONTRAINDICATED: Modified-live vaccines are contraindicated during pregnancy \u2014 risk of fetal harm. (WSAVA 2024 Guidelines; Veterinary Information Network)'
      );
    } else {
      warnings.push(
        'Caution: Patient is pregnant/breeding. Consult veterinarian before administering. (WSAVA 2024 Guidelines)'
      );
    }
  }

  // Q4: Immune-related condition
  if (healthContext.health_immune_condition === 'yes') {
    warnings.push(
      'WARNING: Immune-mediated condition detected. Revaccination not recommended \u2014 use titer testing to assess immunity. (AAHA 2024 Guidelines; WSAVA 2024 Guidelines)'
    );
  }

  // Q1: Prior vaccine reaction
  if (healthContext.health_vaccine_reaction === 'yes') {
    warnings.push(
      'History of vaccine reaction \u2014 consult vet before administering. Titer testing recommended for core vaccines. (AAHA 2024 Guidelines)'
    );
  }

  // Q2 + Q3: General advisory
  if (healthContext.health_prescription_meds === 'yes') {
    warnings.push(
      'Note: Currently on prescription medications \u2014 consult vet regarding vaccine timing.'
    );
  }

  if (healthContext.health_chronic_condition === 'yes') {
    warnings.push(
      'Note: Diagnosed with a long-term medical condition \u2014 consult vet regarding vaccine safety.'
    );
  }

  // Condition-specific checks (epilepsy, autoimmune, cancer)
  const conditionResults = evaluateConditionWarnings(
    vaccine.id, vaccine.vaccine_type, healthContext
  );
  for (const result of conditionResults) {
    warnings.push(result.text);
    if (result.contraindicated) contraindicated = true;
  }

  return {
    warning: warnings.length > 0 ? warnings.join(' | ') : null,
    contraindicated,
  };
}

/**
 * Evaluate condition-specific warnings for a vaccine.
 * Mirrors backend core/contraindications.py logic.
 */
function evaluateConditionWarnings(vaccineId, vaccineType, healthContext) {
  const conditions = healthContext.medical_conditions || [];
  const medications = healthContext.medications || {};
  const results = [];

  if (conditions.includes('epilepsy')) {
    results.push(...evaluateEpilepsy(vaccineId, vaccineType, medications));
  }
  if (conditions.includes('autoimmune')) {
    results.push(...evaluateAutoimmune(vaccineId, vaccineType, medications));
  }
  if (conditions.includes('cancer')) {
    results.push(...evaluateCancer(vaccineId, vaccineType, medications));
  }

  return results;
}

function evaluateEpilepsy(vaccineId, vaccineType, medications) {
  const results = [];

  if (vaccineId === 'core_dap') {
    results.push({
      text: 'EPILEPSY CAUTION: For epileptic dogs, request recombinant CDV component instead of modified-live. Administer separately from other vaccines. Space all vaccines 3-4 weeks apart. Consider titer testing before revaccination. (AAHA 2024)',
      contraindicated: false,
    });
  } else if (vaccineId === 'core_rabies') {
    results.push({
      text: 'EPILEPSY CAUTION: Use 3-year rabies schedule where legally permitted. Administer separately from all other vaccines. Monitor for seizure activity for 30 days post-vaccination. (AAHA 2024; WSAVA 2024)',
      contraindicated: false,
    });
  } else if (vaccineId === 'core_lepto') {
    results.push({
      text: 'EPILEPSY WARNING: Leptospirosis vaccine has the highest adverse reaction rate among canine vaccines. Neurological adverse events including seizures have been reported. AVOID unless dog has genuine high exposure risk (wildlife contact, standing water). If administered, give separately and monitor closely for 48-72 hours. (AAHA 2024)',
      contraindicated: false,
    });
  } else if (vaccineId.startsWith('noncore_')) {
    results.push({
      text: 'EPILEPSY NOTE: For epileptic dogs, non-core vaccines should only be administered if there is genuine exposure risk. Space 3-4 weeks apart from other vaccines. Never combine multiple vaccines in one visit. (AAHA 2024; WSAVA 2024)',
      contraindicated: false,
    });
  }

  // Flea/tick medication warnings
  const fleaTickMeds = medications.flea_tick || [];
  const isoxUsed = fleaTickMeds.filter((m) => ISOXAZOLINE_MEDS.has(m));
  if (isoxUsed.length > 0) {
    const isoxLabels = isoxUsed.map((medId) => {
      const opt = MEDICATION_CATALOG.flea_tick.options.find((o) => o.id === medId);
      return opt ? opt.label : medId;
    });
    results.push({
      text: `FDA SEIZURE WARNING: Isoxazoline flea/tick products (${isoxLabels.join(', ')}) have an FDA warning for seizures, tremors, and ataxia in dogs. These should be AVOIDED in dogs with epilepsy or seizure history. Safer alternatives include Frontline (fipronil), Revolution (selamectin), or Comfortis (spinosad). (FDA Animal Drug Safety Communication, 2018)`,
      contraindicated: false,
    });
  }

  if (fleaTickMeds.includes('seresto')) {
    results.push({
      text: 'CAUTION: Seresto collar has reported neurological adverse events including convulsions and ataxia. Use with caution in epileptic dogs and monitor closely. (EPA Adverse Event Reports)',
      contraindicated: false,
    });
  }

  return results;
}

function evaluateAutoimmune(vaccineId, vaccineType, medications) {
  const results = [];
  const isMlv = vaccineType === 'mlv';
  const immunoMeds = medications.immunosuppressive || [];
  const onApoquel = immunoMeds.includes('apoquel');
  const onAnyImmunosuppressive = immunoMeds.length > 0;

  results.push({
    text: 'AUTOIMMUNE ALERT: Dogs with autoimmune disease should AVOID vaccination during active disease flares. Titer testing is strongly recommended over revaccination for core vaccines (CDV, CPV, CAV). (AAHA 2024; WSAVA 2024)',
    contraindicated: false,
  });

  if (isMlv && onAnyImmunosuppressive) {
    results.push({
      text: 'CONTRAINDICATED: Modified-live vaccines (MLV) are contraindicated while on immunosuppressive medications. MLV vaccines can cause disease in immunosuppressed patients. Wait at least 2-4 weeks after stopping immunosuppressive therapy before vaccinating. (WSAVA 2024)',
      contraindicated: true,
    });
  }

  if (onApoquel) {
    results.push({
      text: 'APOQUEL CONTRAINDICATION: Avoid ALL vaccines during Oclacitinib (Apoquel) treatment and for 28 days after discontinuation. Apoquel suppresses immune response, increasing risk of vaccine-induced disease from MLV vaccines and making killed vaccines ineffective. (Zoetis prescribing information; WSAVA 2024)',
      contraindicated: true,
    });
  }

  return results;
}

function evaluateCancer(vaccineId, vaccineType, medications) {
  const results = [];
  const isMlv = vaccineType === 'mlv';
  const chemoMeds = medications.chemo_agents || [];
  const onChemo = chemoMeds.length > 0;

  if (isMlv) {
    results.push({
      text: 'CONTRAINDICATED: Modified-live vaccines are contraindicated during cancer treatment. MLV vaccines can cause disease in immunocompromised patients. Titer testing is recommended to assess existing immunity. (WSAVA 2024; AAHA 2024)',
      contraindicated: true,
    });
  } else {
    results.push({
      text: 'CANCER/CHEMO NOTE: Killed vaccines are likely ineffective during active chemotherapy due to suppressed immune response. Wait minimum 2 weeks (ideally 4-8 weeks) after completing chemotherapy before vaccinating. Titer testing is preferred over revaccination. (WSAVA 2024; AAHA 2024)',
      contraindicated: false,
    });
  }

  if (onChemo) {
    results.push({
      text: 'ACTIVE CHEMOTHERAPY: Patient is currently on chemotherapy agents. Vaccination should be deferred until treatment is complete. If possible, vaccinate at least 14 days BEFORE starting chemotherapy. (AAHA 2024)',
      contraindicated: true,
    });
  }

  return results;
}

/**
 * Add days to a date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add weeks to a date
 */
function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Calculate age in weeks
 */
function getAgeWeeks(birthDate, referenceDate) {
  const birth = parseDate(birthDate);
  const ref = referenceDate || new Date();
  return (ref - birth) / (1000 * 60 * 60 * 24 * 7);
}

/**
 * Find the active rule for a vaccine based on dog's age
 */
function findActiveRule(vaccine, currentAgeWeeks) {
  for (const rule of vaccine.rules) {
    if (rule.condition === 'all_ages') {
      return rule;
    } else if (rule.condition.includes('<=')) {
      const limit = parseInt(rule.condition.split('<=')[1].trim(), 10);
      if (currentAgeWeeks <= limit) {
        return rule;
      }
    } else if (rule.condition.includes('>')) {
      const limit = parseInt(rule.condition.split('>')[1].trim(), 10);
      if (currentAgeWeeks > limit) {
        return rule;
      }
    }
  }
  return null;
}

/**
 * Calculate vaccine schedule for a guest dog
 * @param {Object} dog - The dog object with birth_date and environment flags
 * @param {Array} selectedNoncore - Array of noncore vaccine IDs to include
 * @param {Array} vaccinations - Array of vaccination records
 * @returns {Object} - Schedule with overdue, upcoming, and future arrays
 */
export function calculateGuestSchedule(dog, selectedNoncore = [], vaccinations = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const birthDate = parseDate(dog.birth_date);
  const currentAgeWeeks = getAgeWeeks(dog.birth_date);

  // Build history from vaccinations
  const pastHistory = {};
  vaccinations.forEach((vax) => {
    const vaxId = vax.vaccine_id;
    if (!pastHistory[vaxId]) {
      pastHistory[vaxId] = [];
    }
    pastHistory[vaxId].push(parseDate(vax.date_administered));
  });

  // Sort history dates
  Object.keys(pastHistory).forEach((key) => {
    pastHistory[key].sort((a, b) => a - b);
  });

  // Build health context from dog fields
  const healthContext = {
    health_vaccine_reaction: dog.health_vaccine_reaction || 'no',
    health_prescription_meds: dog.health_prescription_meds || 'no',
    health_chronic_condition: dog.health_chronic_condition || 'no',
    health_immune_condition: dog.health_immune_condition || 'no',
    health_immunosuppressive_meds: dog.health_immunosuppressive_meds || 'no',
    health_pregnant_breeding: dog.health_pregnant_breeding || 'no',
    medical_conditions: dog.medical_conditions || [],
    medications: dog.medications || {},
  };

  const scheduleItems = [];

  for (const vaccine of VACCINE_RULES) {
    // Skip noncore vaccines that aren't selected
    if (vaccine.type === 'noncore' && !selectedNoncore.includes(vaccine.id)) {
      continue;
    }

    // Evaluate health warnings once per vaccine
    const { warning: warningText, contraindicated: isContraindicated } = evaluateHealthWarnings(vaccine, healthContext);

    const vId = vaccine.id;
    const historyDates = pastHistory[vId] || [];
    const dosesGivenCount = historyDates.length;
    const lastDoseDate = historyDates.length > 0 ? historyDates[historyDates.length - 1] : null;

    // Determine min start date
    let minStartDate = new Date(today);
    if (vaccine.min_start_age_weeks) {
      const minAgeDate = addWeeks(birthDate, vaccine.min_start_age_weeks);
      if (minAgeDate > today) {
        minStartDate = minAgeDate;
      } else if (dosesGivenCount === 0) {
        minStartDate = minAgeDate;
      }
    }

    // Find active rule
    const activeRule = findActiveRule(vaccine, currentAgeWeeks);
    if (!activeRule) continue;

    const totalSeriesDoses = activeRule.doses;
    const intervalDays = activeRule.interval_days;
    const minInterval = activeRule.min_interval || intervalDays;
    const maxInterval = activeRule.max_interval || intervalDays;

    // Determine where to start generating
    let startTrackingDate;
    if (lastDoseDate) {
      const nextDueDate = addDays(lastDoseDate, intervalDays);
      startTrackingDate = nextDueDate > today ? nextDueDate : today;
    } else {
      startTrackingDate = minStartDate;
    }

    // Generate initial series doses
    let currentDoseNum = dosesGivenCount + 1;
    let currentDate = new Date(startTrackingDate);

    while (currentDoseNum <= totalSeriesDoses) {
      const isFinalDose = currentDoseNum === totalSeriesDoses;
      let doseDate = new Date(currentDate);
      let finalDoseNote = '';

      // AAHA guideline: Final DHPP dose for puppies must be after 16 weeks
      if (isFinalDose && vId === 'core_dap') {
        const minAge16Weeks = addWeeks(birthDate, 16);
        if (doseDate < minAge16Weeks) {
          doseDate = minAge16Weeks;
          finalDoseNote = ' Final dose scheduled after 16 weeks per AAHA/WSAVA guidelines.';
        }
      }

      const doseNote = isFinalDose
        ? (vaccine.description || 'Completes initial series.') + finalDoseNote
        : vaccine.description || `Series continues (${intervalDays} day interval).`;

      // Calculate date range
      let rangeStart, rangeEnd;
      if (currentDoseNum === 1 && !lastDoseDate) {
        rangeStart = new Date(minStartDate);
        rangeEnd = addDays(minStartDate, maxInterval);
      } else {
        const baseDate = lastDoseDate && currentDoseNum === dosesGivenCount + 1
          ? lastDoseDate
          : addDays(currentDate, -intervalDays);
        rangeStart = addDays(baseDate, minInterval);
        rangeEnd = addDays(baseDate, maxInterval);
      }

      // Adjust range for final DHPP dose
      if (isFinalDose && vId === 'core_dap') {
        const minAge16Weeks = addWeeks(birthDate, 16);
        if (rangeStart < minAge16Weeks) {
          rangeStart = minAge16Weeks;
        }
        if (rangeEnd < minAge16Weeks) {
          rangeEnd = addDays(minAge16Weeks, maxInterval);
        }
      }

      const sideEffects = vaccine.side_effects || {};
      scheduleItems.push({
        vaccine: vaccine.name,
        vaccine_id: vId,
        dose: `Initial Series: Dose ${currentDoseNum}`,
        dose_number: currentDoseNum,
        date: formatDate(doseDate),
        notes: doseNote,
        date_range_start: formatDate(rangeStart),
        date_range_end: formatDate(rangeEnd),
        description: vaccine.description,
        side_effects_common: sideEffects.common || null,
        side_effects_seek_vet: sideEffects.seek_vet_if || null,
        warning: warningText,
        contraindicated: isContraindicated,
      });

      currentDate = addDays(currentDate, intervalDays);
      currentDoseNum++;
    }

    // Booster logic
    let seriesCompleteDate = null;

    // Check generated schedule
    const thisVaxSchedule = scheduleItems.filter(
      (s) => s.vaccine === vaccine.name && s.dose.includes('Initial Series')
    );
    if (thisVaxSchedule.length > 0) {
      seriesCompleteDate = parseDate(thisVaxSchedule[thisVaxSchedule.length - 1].date);
    } else if (dosesGivenCount >= totalSeriesDoses && lastDoseDate) {
      seriesCompleteDate = lastDoseDate;
    }

    if (seriesCompleteDate) {
      const initialBoosterDue = addDays(seriesCompleteDate, activeRule.initial_booster_days);
      const boosterNote = `Booster maintains immunity. ${vaccine.description || ''}`;
      const boosterSideEffects = vaccine.side_effects || {};

      if (initialBoosterDue > today) {
        scheduleItems.push({
          vaccine: vaccine.name,
          vaccine_id: vId,
          dose: '1-Year Booster',
          dose_number: null,
          date: formatDate(initialBoosterDue),
          notes: boosterNote,
          date_range_start: formatDate(initialBoosterDue),
          date_range_end: formatDate(addDays(initialBoosterDue, 30)),
          description: vaccine.description,
          side_effects_common: boosterSideEffects.common || null,
          side_effects_seek_vet: boosterSideEffects.seek_vet_if || null,
          warning: warningText,
          contraindicated: isContraindicated,
        });
      } else {
        const dueDate = initialBoosterDue > today ? initialBoosterDue : today;
        scheduleItems.push({
          vaccine: vaccine.name,
          vaccine_id: vId,
          dose: 'Booster (Annual or 3-Year)',
          dose_number: null,
          date: formatDate(dueDate),
          notes: boosterNote,
          date_range_start: formatDate(dueDate),
          date_range_end: formatDate(addDays(dueDate, 30)),
          description: vaccine.description,
          side_effects_common: boosterSideEffects.common || null,
          side_effects_seek_vet: boosterSideEffects.seek_vet_if || null,
          warning: warningText,
          contraindicated: isContraindicated,
        });
      }
    }
  }

  // Sort by date
  scheduleItems.sort((a, b) => a.date.localeCompare(b.date));

  // Categorize into overdue, upcoming, future
  const todayStr = formatDate(today);
  const thirtyDaysFromNow = formatDate(addDays(today, 30));

  const overdue = [];
  const upcoming = [];
  const future = [];

  scheduleItems.forEach((item) => {
    // Calculate days until/overdue
    const itemDate = parseDate(item.date);
    const diffDays = Math.floor((itemDate - today) / (1000 * 60 * 60 * 24));

    if (item.date < todayStr) {
      overdue.push({
        ...item,
        days_overdue: Math.abs(diffDays),
        days_until: 0,
      });
    } else if (item.date <= thirtyDaysFromNow) {
      upcoming.push({
        ...item,
        days_until: diffDays,
        days_overdue: 0,
      });
    } else {
      future.push({
        ...item,
        days_until: diffDays,
        days_overdue: 0,
      });
    }
  });

  return {
    schedule: { overdue, upcoming, future },
    history_analysis: 'Schedule generated locally for guest mode. Sign up to save your data and get AI-powered analysis.',
    dog,
  };
}

/**
 * Get list of available vaccines for reference
 */
export function getVaccineList() {
  return VACCINE_RULES.map((v) => ({
    id: v.id,
    name: v.name,
    type: v.type,
    description: v.description,
  }));
}

/**
 * Find vaccine by ID
 */
export function findVaccineById(vaccineId) {
  return VACCINE_RULES.find((v) => v.id === vaccineId);
}

/**
 * Find vaccine by name (fuzzy match)
 */
export function findVaccineByName(name) {
  const lowerName = name.toLowerCase();
  return VACCINE_RULES.find(
    (v) =>
      v.name.toLowerCase().includes(lowerName) ||
      v.id.toLowerCase().includes(lowerName)
  );
}

export { VACCINE_RULES };
