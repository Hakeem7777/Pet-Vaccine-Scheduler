"""
Condition-specific vaccine contraindication rules.

Provides medical condition and medication data, plus evaluation logic
that produces condition-specific warnings for the vaccine scheduler.

Sources: AAHA 2024, WSAVA 2024, FDA Safety Alert 2018, EPA Reports.
"""

# === CONDITION DEFINITIONS ===

MEDICAL_CONDITIONS = {
    'epilepsy': {
        'label': 'Epilepsy / Seizure Disorder',
        'description': 'Dog has been diagnosed with epilepsy or has a history of seizures.',
    },
    'autoimmune': {
        'label': 'Autoimmune Disease (IMHA/ITP/Lupus/Pemphigus)',
        'description': 'Dog has been diagnosed with an immune-mediated disease.',
    },
    'cancer': {
        'label': 'Cancer / On Chemotherapy',
        'description': 'Dog has been diagnosed with cancer or is currently receiving chemotherapy.',
    },
}

VALID_CONDITIONS = set(MEDICAL_CONDITIONS.keys())

# === MEDICATION CATALOG ===

MEDICATION_CATALOG = {
    'anti_seizure': {
        'label': 'Anti-Seizure Medications',
        'condition': 'epilepsy',
        'options': [
            {'id': 'keppra', 'label': 'Keppra (Levetiracetam)'},
            {'id': 'phenobarbital', 'label': 'Phenobarbital'},
            {'id': 'potassium_bromide', 'label': 'Potassium Bromide (KBr)'},
            {'id': 'zonisamide', 'label': 'Zonisamide'},
        ],
    },
    'flea_tick': {
        'label': 'Flea & Tick Prevention',
        'condition': 'epilepsy',
        'options': [
            {'id': 'nexgard', 'label': 'NexGard', 'drug_class': 'isoxazoline'},
            {'id': 'bravecto', 'label': 'Bravecto', 'drug_class': 'isoxazoline'},
            {'id': 'simparica', 'label': 'Simparica', 'drug_class': 'isoxazoline'},
            {'id': 'credelio', 'label': 'Credelio', 'drug_class': 'isoxazoline'},
            {'id': 'frontline', 'label': 'Frontline (Fipronil)', 'drug_class': 'topical'},
            {'id': 'seresto', 'label': 'Seresto Collar', 'drug_class': 'collar'},
            {'id': 'revolution', 'label': 'Revolution (Selamectin)', 'drug_class': 'topical'},
            {'id': 'comfortis', 'label': 'Comfortis (Spinosad)', 'drug_class': 'oral_non_isox'},
        ],
    },
    'heartworm': {
        'label': 'Heartworm Prevention',
        'condition': 'epilepsy',
        'options': [
            {'id': 'heartgard', 'label': 'Heartgard (Ivermectin)'},
            {'id': 'interceptor', 'label': 'Interceptor (Milbemycin)'},
            {'id': 'proheart', 'label': 'ProHeart (Moxidectin injection)'},
        ],
    },
    'immunosuppressive': {
        'label': 'Immunosuppressive Medications',
        'condition': 'autoimmune',
        'options': [
            {'id': 'prednisone', 'label': 'Prednisone / Prednisolone'},
            {'id': 'dexamethasone', 'label': 'Dexamethasone'},
            {'id': 'cyclosporine', 'label': 'Cyclosporine (Atopica)'},
            {'id': 'azathioprine', 'label': 'Azathioprine (Imuran)'},
            {'id': 'mycophenolate', 'label': 'Mycophenolate (CellCept)'},
            {'id': 'apoquel', 'label': 'Oclacitinib (Apoquel)'},
        ],
    },
    'chemo_agents': {
        'label': 'Chemotherapy Agents',
        'condition': 'cancer',
        'options': [
            {'id': 'cyclophosphamide', 'label': 'Cyclophosphamide'},
            {'id': 'doxorubicin', 'label': 'Doxorubicin'},
            {'id': 'vincristine', 'label': 'Vincristine'},
            {'id': 'carboplatin', 'label': 'Carboplatin'},
            {'id': 'lomustine', 'label': 'Lomustine (CCNU)'},
            {'id': 'chlorambucil', 'label': 'Chlorambucil'},
        ],
    },
    'chemo_supportive': {
        'label': 'Supportive / Protocol Medications',
        'condition': 'cancer',
        'options': [
            {'id': 'prednisone_chemo', 'label': 'Prednisone (part of CHOP protocol)'},
        ],
    },
}

ISOXAZOLINE_MEDS = {'nexgard', 'bravecto', 'simparica', 'credelio'}


def evaluate_condition_warnings(vaccine_id, vaccine_type, health_context):
    """
    Evaluate condition-specific warnings for a vaccine.

    Args:
        vaccine_id: e.g. 'core_dap', 'core_lepto', 'core_rabies'
        vaccine_type: 'mlv' or 'killed'
        health_context: dict with 'medical_conditions' and 'medications'

    Returns:
        List of (warning_text, is_contraindicated) tuples.
    """
    conditions = health_context.get('medical_conditions', [])
    medications = health_context.get('medications', {})
    warnings = []

    if 'epilepsy' in conditions:
        warnings.extend(_evaluate_epilepsy(vaccine_id, vaccine_type, medications))

    if 'autoimmune' in conditions:
        warnings.extend(_evaluate_autoimmune(vaccine_id, vaccine_type, medications))

    if 'cancer' in conditions:
        warnings.extend(_evaluate_cancer(vaccine_id, vaccine_type, medications))

    return warnings


def _evaluate_epilepsy(vaccine_id, vaccine_type, medications):
    """Epilepsy-specific vaccine and medication rules."""
    warnings = []

    # Vaccine-specific rules
    if vaccine_id == 'core_dap':
        warnings.append((
            "EPILEPSY CAUTION: For epileptic dogs, request recombinant CDV "
            "component instead of modified-live. Administer separately from "
            "other vaccines. Space all vaccines 3-4 weeks apart. Consider "
            "titer testing before revaccination. (AAHA 2024)",
            False
        ))
    elif vaccine_id == 'core_rabies':
        warnings.append((
            "EPILEPSY CAUTION: Use 3-year rabies schedule where legally "
            "permitted. Administer separately from all other vaccines. "
            "Monitor for seizure activity for 30 days post-vaccination. "
            "(AAHA 2024; WSAVA 2024)",
            False
        ))
    elif vaccine_id == 'core_lepto':
        warnings.append((
            "EPILEPSY WARNING: Leptospirosis vaccine has the highest adverse "
            "reaction rate among canine vaccines. Neurological adverse events "
            "including seizures have been reported. AVOID unless dog has "
            "genuine high exposure risk (wildlife contact, standing water). "
            "If administered, give separately and monitor closely for 48-72 "
            "hours. (AAHA 2024)",
            False
        ))
    elif vaccine_id.startswith('noncore_'):
        warnings.append((
            "EPILEPSY NOTE: For epileptic dogs, non-core vaccines should only "
            "be administered if there is genuine exposure risk. Space 3-4 "
            "weeks apart from other vaccines. Never combine multiple vaccines "
            "in one visit. (AAHA 2024; WSAVA 2024)",
            False
        ))

    # Flea/tick medication warnings
    flea_tick_meds = medications.get('flea_tick', [])
    isox_used = [m for m in flea_tick_meds if m in ISOXAZOLINE_MEDS]
    if isox_used:
        isox_labels = []
        for med_id in isox_used:
            for opt in MEDICATION_CATALOG['flea_tick']['options']:
                if opt['id'] == med_id:
                    isox_labels.append(opt['label'])
                    break
        names = ', '.join(isox_labels)
        warnings.append((
            f"FDA SEIZURE WARNING: Isoxazoline flea/tick products ({names}) "
            "have an FDA warning for seizures, tremors, and ataxia in dogs. "
            "These should be AVOIDED in dogs with epilepsy or seizure history. "
            "Safer alternatives include Frontline (fipronil), Revolution "
            "(selamectin), or Comfortis (spinosad). "
            "(FDA Animal Drug Safety Communication, 2018)",
            False
        ))

    if 'seresto' in flea_tick_meds:
        warnings.append((
            "CAUTION: Seresto collar has reported neurological adverse events "
            "including convulsions and ataxia. Use with caution in epileptic "
            "dogs and monitor closely. (EPA Adverse Event Reports)",
            False
        ))

    return warnings


def _evaluate_autoimmune(vaccine_id, vaccine_type, medications):
    """Autoimmune disease-specific vaccine rules."""
    warnings = []
    is_mlv = vaccine_type == 'mlv'
    immuno_meds = medications.get('immunosuppressive', [])
    on_apoquel = 'apoquel' in immuno_meds
    on_any_immunosuppressive = len(immuno_meds) > 0

    # General autoimmune warning for all vaccines
    warnings.append((
        "AUTOIMMUNE ALERT: Dogs with autoimmune disease should AVOID "
        "vaccination during active disease flares. Titer testing is strongly "
        "recommended over revaccination for core vaccines (CDV, CPV, CAV). "
        "(AAHA 2024; WSAVA 2024)",
        False
    ))

    # MLV vaccines while on immunosuppressives
    if is_mlv and on_any_immunosuppressive:
        warnings.append((
            "CONTRAINDICATED: Modified-live vaccines (MLV) are contraindicated "
            "while on immunosuppressive medications. MLV vaccines can cause "
            "disease in immunosuppressed patients. Wait at least 2-4 weeks "
            "after stopping immunosuppressive therapy before vaccinating. "
            "(WSAVA 2024)",
            True
        ))

    # Apoquel: avoid ALL vaccines during treatment + 28 days after
    if on_apoquel:
        warnings.append((
            "APOQUEL CONTRAINDICATION: Avoid ALL vaccines during Oclacitinib "
            "(Apoquel) treatment and for 28 days after discontinuation. "
            "Apoquel suppresses immune response, increasing risk of "
            "vaccine-induced disease from MLV vaccines and making killed "
            "vaccines ineffective. (Zoetis prescribing information; WSAVA 2024)",
            True
        ))

    return warnings


def _evaluate_cancer(vaccine_id, vaccine_type, medications):
    """Cancer/chemotherapy-specific vaccine rules."""
    warnings = []
    is_mlv = vaccine_type == 'mlv'
    chemo_meds = medications.get('chemo_agents', [])
    on_chemo = len(chemo_meds) > 0

    if is_mlv:
        warnings.append((
            "CONTRAINDICATED: Modified-live vaccines are contraindicated "
            "during cancer treatment. MLV vaccines can cause disease in "
            "immunocompromised patients. Titer testing is recommended to "
            "assess existing immunity. (WSAVA 2024; AAHA 2024)",
            True
        ))
    else:
        warnings.append((
            "CANCER/CHEMO NOTE: Killed vaccines are likely ineffective during "
            "active chemotherapy due to suppressed immune response. Wait "
            "minimum 2 weeks (ideally 4-8 weeks) after completing chemotherapy "
            "before vaccinating. Titer testing is preferred over revaccination. "
            "(WSAVA 2024; AAHA 2024)",
            False
        ))

    if on_chemo:
        warnings.append((
            "ACTIVE CHEMOTHERAPY: Patient is currently on chemotherapy agents. "
            "Vaccination should be deferred until treatment is complete. If "
            "possible, vaccinate at least 14 days BEFORE starting chemotherapy. "
            "(AAHA 2024)",
            True
        ))

    return warnings
