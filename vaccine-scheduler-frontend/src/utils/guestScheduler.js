/**
 * Client-side vaccine scheduler for guest mode
 * Mirrors the backend RuleBasedScheduler logic
 */

// Vaccine rules (same as backend vaccine_rules.json)
const VACCINE_RULES = [
  {
    id: 'core_dap',
    name: 'Distemper, Hepatitis, Parvovirus, Parainfluenza (DHPP)',
    type: 'core',
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

  const scheduleItems = [];

  for (const vaccine of VACCINE_RULES) {
    // Skip noncore vaccines that aren't selected
    if (vaccine.type === 'noncore' && !selectedNoncore.includes(vaccine.id)) {
      continue;
    }

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
