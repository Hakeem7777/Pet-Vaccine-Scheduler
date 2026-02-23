# Canine Vaccine Scheduling & Safety Guidelines — Professional Reference

> **Document Purpose**: This document describes every vaccination scheduling rule, contraindication, and medical warning implemented in the Vaccine Scheduler application. It is intended for review by a licensed veterinarian to validate the accuracy and completeness of the rules applied.
>
> **Disclaimer**: This application generates vaccination schedules for educational and planning purposes only. It does not constitute veterinary medical advice. All vaccination decisions should be made in consultation with a licensed veterinarian.

---

## 1. Guideline Sources

The scheduling and safety rules in this application are based on the following published guidelines:

- **AAHA 2024** — American Animal Hospital Association Canine Vaccination Guidelines
- **WSAVA 2024** — World Small Animal Veterinary Association Vaccination Guidelines
- **FDA Animal Drug Safety Communication, 2018** — Isoxazoline class seizure/ataxia warning
- **EPA Adverse Event Reports** — Seresto collar adverse event data
- **Zoetis Prescribing Information** — Oclacitinib (Apoquel) immunosuppressive labeling

---

## 2. Vaccines Covered

### 2.1 Core Vaccines

#### DHPP — Distemper, Adenovirus (Hepatitis), Parvovirus, Parainfluenza

| Property | Value |
|---|---|
| **Vaccine ID** | core_dap |
| **Classification** | Core (recommended for all dogs) |
| **Vaccine Type** | Modified-Live Virus (MLV) |
| **Minimum Start Age** | 6 weeks |

**Diseases Prevented**:
- **Canine Distemper Virus (CDV)** — Multisystemic viral disease affecting the respiratory, gastrointestinal, and central nervous systems. High mortality in unvaccinated puppies.
- **Canine Adenovirus Type 2 / Infectious Canine Hepatitis (CAV-2/CAV-1)** — Causes hepatitis, respiratory illness, and anterior uveitis. CAV-2 provides cross-protection against CAV-1.
- **Canine Parvovirus (CPV-2)** — Severe hemorrhagic gastroenteritis with high mortality in puppies. Highly environmentally stable.
- **Canine Parainfluenza Virus (CPIV)** — Contributor to canine infectious respiratory disease complex (kennel cough).

**Common Post-Vaccination Reactions** (expected, self-limiting):
- Injection site soreness, swelling, or erythema
- Lethargy and decreased appetite (24-48 hours)
- Low-grade fever
- Small firm nodule at injection site (may persist up to 14 days)

**Adverse Reactions Requiring Veterinary Attention**:
- Facial/periorbital edema, urticaria, or severe pruritus
- Vomiting or diarrhea
- Dyspnea or cardiovascular collapse
- Any symptoms persisting beyond 48 hours

---

#### Rabies

| Property | Value |
|---|---|
| **Vaccine ID** | core_rabies |
| **Classification** | Core (legally mandated in most jurisdictions) |
| **Vaccine Type** | Killed / Inactivated |
| **Minimum Start Age** | 12 weeks |

**Disease Prevented**:
- **Rabies Virus** — Fatal neurotropic Lyssavirus. Zoonotic, transmissible to humans via bite wound. Legally required vaccination in most jurisdictions.

**Common Post-Vaccination Reactions**:
- Mild fever and transient anorexia (24-36 hours)
- Injection site soreness and mild swelling
- Small, painless nodule at injection site (may persist 1-2 weeks)
- Mild lethargy

**Adverse Reactions Requiring Veterinary Attention**:
- Facial edema, urticaria, or dyspnea
- Vomiting or diarrhea
- Injection site swelling that is painful, warm, or enlarging
- Cardiovascular collapse or pale mucous membranes (anaphylaxis — emergency)

---

#### Leptospirosis

| Property | Value |
|---|---|
| **Vaccine ID** | core_lepto |
| **Classification** | Core conditional (recommended based on exposure risk) |
| **Vaccine Type** | Killed / Inactivated |
| **Minimum Start Age** | 12 weeks |

**Disease Prevented**:
- **Leptospira spp.** — Spirochetal bacterial infection transmitted via contaminated water and wildlife urine. Causes acute renal failure and hepatic insufficiency. Zoonotic — transmissible to humans.

**Common Post-Vaccination Reactions**:
- Mild erythema or swelling at injection site (1-2 days)
- Fatigue and low-grade fever
- Temporary anorexia (1-2 days)
- Note: Dogs under 10 lbs (4.5 kg) may have elevated adverse reaction risk

**Adverse Reactions Requiring Veterinary Attention**:
- Facial/periorbital edema or edema of extremities
- Urticaria, vomiting, or diarrhea
- Dyspnea or cardiovascular collapse

**Special Note**: Leptospirosis vaccine has the highest documented adverse reaction rate among standard canine vaccines. Particular caution in patients with neurological conditions (see Section 5.1).

---

### 2.2 Non-Core Vaccines

#### Lyme Disease (Borrelia burgdorferi)

| Property | Value |
|---|---|
| **Vaccine ID** | noncore_lyme |
| **Classification** | Non-core (lifestyle-dependent) |
| **Vaccine Type** | Killed / Inactivated |
| **Minimum Start Age** | 12 weeks |

**Disease Prevented**:
- **Borrelia burgdorferi** — Tick-transmitted spirochetal infection causing polyarthritis, fever, and potentially Lyme nephropathy. Endemic in regions with Ixodes scapularis / Ixodes pacificus populations.

**Recommended For**: Dogs in tick-endemic areas, wooded/grassy environments, areas with known Ixodes tick populations.

**Common Post-Vaccination Reactions**:
- Injection site tenderness and mild swelling
- Fatigue for 1-2 days
- Low-grade fever for approximately 24 hours
- Note: Small breeds may have elevated reaction risk

**Adverse Reactions Requiring Veterinary Attention**:
- Facial edema, urticaria, or severe pruritus
- Vomiting, diarrhea, or dyspnea

---

#### Bordetella bronchiseptica — Intranasal/Oral

| Property | Value |
|---|---|
| **Vaccine ID** | noncore_bord_in |
| **Classification** | Non-core (lifestyle-dependent) |
| **Vaccine Type** | Modified-Live Virus (MLV) |
| **Route** | Intranasal or oral |
| **Minimum Start Age** | 8 weeks |

**Disease Prevented**:
- **Bordetella bronchiseptica** — Primary bacterial pathogen in canine infectious respiratory disease complex (CIRDC / "kennel cough"). Highly contagious in communal environments.

**Recommended For**: Dogs attending boarding facilities, daycare, grooming, dog parks, or training classes.

**Common Post-Vaccination Reactions**:
- Sneezing, coughing, and nasal discharge (expected mucosal immune response)
- Mild lethargy (1-2 days)

**Adverse Reactions Requiring Veterinary Attention**:
- Facial edema or urticaria
- Vomiting, dyspnea, or diarrhea
- Upper respiratory signs persisting beyond several days

---

#### Bordetella bronchiseptica — Injectable (Parenteral)

| Property | Value |
|---|---|
| **Vaccine ID** | noncore_bord_inj |
| **Classification** | Non-core (lifestyle-dependent) |
| **Vaccine Type** | Killed / Inactivated |
| **Route** | Subcutaneous injection |
| **Minimum Start Age** | 8 weeks |

**Disease Prevented**:
- **Bordetella bronchiseptica** — Same pathogen as intranasal formulation. Parenteral route selected when intranasal administration is not feasible.

**Recommended For**: Same indications as intranasal Bordetella.

**Common Post-Vaccination Reactions**:
- Injection site nodule, tenderness, or stiffness
- Lethargy and mild fever (1-2 days)
- Decreased appetite

**Adverse Reactions Requiring Veterinary Attention**:
- Facial edema, urticaria, or vomiting
- Dyspnea or diarrhea
- Symptoms persisting beyond 48 hours

---

#### Canine Influenza (CIV H3N8 / H3N2)

| Property | Value |
|---|---|
| **Vaccine ID** | noncore_flu |
| **Classification** | Non-core (lifestyle-dependent) |
| **Vaccine Type** | Killed / Inactivated |
| **Minimum Start Age** | 8 weeks |

**Diseases Prevented**:
- **Canine Influenza Virus H3N8** — Equine-origin influenza adapted to dogs.
- **Canine Influenza Virus H3N2** — Avian-origin influenza adapted to dogs. Both strains cause coughing, fever, nasal discharge, and respiratory illness. Highly contagious in communal settings.

**Recommended For**: Dogs in social environments, multi-dog households, boarding, or areas with known CIV outbreaks.

**Common Post-Vaccination Reactions**:
- Drowsiness and injection site soreness
- Mild lethargy (1-2 days)

**Adverse Reactions Requiring Veterinary Attention**:
- Vomiting, diarrhea, or urticaria
- Facial edema or dyspnea
- Severe lethargy or cardiovascular collapse

---

## 3. Scheduling Rules

### 3.1 Age Classifications

| Classification | Age Range |
|---|---|
| Puppy | 0 – 16 weeks |
| Adolescent | 16 weeks – 1 year |
| Adult | 1 year – 7 years |
| Senior | 7+ years |

### 3.2 Initial Series Dosing

| Vaccine | Age at Presentation | Initial Series Doses | Dose Interval | Min Interval |
|---|---|---|---|---|
| DHPP | ≤ 16 weeks | 3 doses | 28 days | 14 days |
| DHPP | > 16 weeks | 2 doses | 28 days | 14 days |
| Rabies | All ages | 1 dose | N/A | N/A |
| Leptospirosis | All ages (≥ 12 wks) | 2 doses | 28 days | 14 days |
| Lyme | All ages (≥ 12 wks) | 2 doses | 28 days | 14 days |
| Bordetella (IN/Oral) | All ages (≥ 8 wks) | 1 dose | N/A | N/A |
| Bordetella (Injectable) | All ages (≥ 8 wks) | 2 doses | 28 days | 14 days |
| Canine Influenza | All ages (≥ 8 wks) | 2 doses | 28 days | 14 days |

### 3.3 Booster Schedules

| Vaccine | First Booster | Subsequent Boosters |
|---|---|---|
| DHPP | 1 year after series completion | Every 3 years |
| Rabies | 1 year after initial dose | Every 3 years |
| Leptospirosis | 1 year after series completion | Annually |
| Lyme | 1 year after series completion | Annually |
| Bordetella (IN/Oral) | 1 year after initial dose | Annually |
| Bordetella (Injectable) | 1 year after series completion | Annually |
| Canine Influenza | 1 year after series completion | Annually |

### 3.4 DHPP 16-Week Rule (AAHA/WSAVA 2024)

The final dose of the DHPP initial puppy series must be administered at or after 16 weeks of age. This ensures that passively acquired maternal antibodies (MDA) have declined sufficiently to allow active immunization. If the calculated schedule places the final dose before 16 weeks, the system automatically defers it to the 16-week mark.

**Rationale**: Maternally derived antibodies can neutralize vaccine antigen before the puppy's own immune system mounts a response. By 16 weeks, MDA titers have typically waned below the interference threshold in the majority of puppies.

### 3.5 Non-Core Vaccine Recommendation Logic

Non-core vaccines are recommended based on the dog's living environment and lifestyle factors:

| Environment Factor | Vaccines Recommended |
|---|---|
| Daycare / boarding attendance | Bordetella, Canine Influenza |
| Dog park visits | Bordetella, Canine Influenza |
| Travel / shows / competitions | Bordetella, Canine Influenza |
| Tick-endemic area exposure | Lyme Disease |

---

## 4. Health Screening Questions

The system evaluates six health screening questions. Each answer of "yes" triggers specific warnings or contraindications on the generated schedule. Questions are evaluated in priority order (highest first):

### Q5: Immunosuppressive Medications (Highest Priority)

**Question**: Is the patient currently receiving immunosuppressive therapy?

| Vaccine Type | Result | Action |
|---|---|---|
| MLV (DHPP, Bordetella IN) | **CONTRAINDICATED** | Do not administer. MLV vaccines may cause vaccine-induced disease in immunosuppressed patients. Wait ≥ 2 weeks after discontinuation of therapy. |
| Killed (Rabies, Lepto, Lyme, Flu, Bordetella Inj) | Caution | Consult veterinarian before administering. Killed vaccines may have reduced efficacy. |

**Reference**: WSAVA 2024 Guidelines

### Q6: Pregnant or Breeding

**Question**: Is the patient currently pregnant or being used for breeding?

| Vaccine Type | Result | Action |
|---|---|---|
| MLV (DHPP, Bordetella IN) | **CONTRAINDICATED** | Do not administer. MLV vaccines carry risk of transplacental infection and fetal harm. |
| Killed (Rabies, Lepto, Lyme, Flu, Bordetella Inj) | Caution | Consult veterinarian before administering. |

**Reference**: WSAVA 2024 Guidelines; Veterinary Information Network

### Q4: Immune-Mediated Condition

**Question**: Has the patient been diagnosed with an immune-mediated condition (e.g., IMHA, ITP, Lupus, Pemphigus)?

| Vaccine Type | Result | Action |
|---|---|---|
| All vaccines | Warning | Revaccination not recommended. Serological titer testing should be used to assess immunity for CDV, CPV, and CAV. |

**Reference**: AAHA 2024; WSAVA 2024

### Q1: Prior Vaccine Reaction

**Question**: Has the patient had a previous adverse vaccine reaction?

| Vaccine Type | Result | Action |
|---|---|---|
| All vaccines | Warning | Consult veterinarian before administering any vaccine. Serological titer testing recommended for core vaccines. |

**Reference**: AAHA 2024

### Q2: Prescription Medications

**Question**: Is the patient currently on prescription medications?

| Vaccine Type | Result | Action |
|---|---|---|
| All vaccines | Advisory note | Consult veterinarian regarding vaccine timing relative to current medications. |

### Q3: Chronic Medical Condition

**Question**: Has the patient been diagnosed with a long-term medical condition?

| Vaccine Type | Result | Action |
|---|---|---|
| All vaccines | Advisory note | Consult veterinarian regarding vaccine safety in the context of the chronic condition. |

---

## 5. Medical Conditions & Condition-Specific Contraindications

### 5.1 Epilepsy / Seizure Disorder

When a patient has a documented history of epilepsy or seizures, the following vaccine-specific and medication-specific rules apply:

#### Vaccine-Specific Rules

**DHPP (core_dap) — MLV**
- **Classification**: Caution
- **Recommendation**: Request recombinant CDV (rCDV) component in place of modified-live CDV where available. Administer separately from all other vaccines. Space all vaccinations 3-4 weeks apart. Consider serological titer testing before revaccination.
- **Reference**: AAHA 2024

**Rabies (core_rabies) — Killed**
- **Classification**: Caution
- **Recommendation**: Utilize 3-year rabies vaccine schedule where legally permitted to reduce vaccination frequency. Administer separately from all other vaccines. Monitor for seizure activity for 30 days post-vaccination.
- **Reference**: AAHA 2024; WSAVA 2024

**Leptospirosis (core_lepto) — Killed**
- **Classification**: Caution (Avoid)
- **Recommendation**: **AVOID** unless the patient has genuine high exposure risk (direct wildlife contact, access to standing water in endemic areas). Leptospirosis vaccine has the highest documented adverse reaction rate among canine vaccines. Neurological adverse events including seizures have been reported. If administered, give separately from all other vaccines and monitor closely for 48-72 hours.
- **Reference**: AAHA 2024

**Non-Core Vaccines (Lyme, Bordetella, Influenza)**
- **Classification**: Caution
- **Recommendation**: Administer only if genuine exposure risk exists. Space 3-4 weeks apart from other vaccinations. Never administer multiple vaccines in a single visit.
- **Reference**: AAHA 2024; WSAVA 2024

#### Medication Interactions — Flea & Tick Preventatives

**Isoxazoline Products (NexGard, Bravecto, Simparica, Credelio)**
- **Classification**: **CONTRAINDICATED** in epileptic patients
- **Warning**: FDA Animal Drug Safety Communication (2018) documents seizures, muscle tremors, and ataxia as adverse events associated with isoxazoline class parasiticides. These products should be **avoided** in dogs with a history of seizures or epilepsy.
- **Safer Alternatives**:
  - Fipronil (Frontline) — topical
  - Selamectin (Revolution) — topical
  - Spinosad (Comfortis) — oral, non-isoxazoline mechanism
- **Reference**: FDA Animal Drug Safety Communication, September 2018

**Seresto Collar (Flumethrin / Imidacloprid)**
- **Classification**: Caution
- **Warning**: EPA adverse event reports document neurological events including convulsions and ataxia. Use with caution in epileptic patients and monitor closely.
- **Reference**: EPA Adverse Event Reports

#### Anti-Seizure Medications (Informational)

The following medications indicate active seizure management. Their presence confirms the epilepsy diagnosis:

| Medication | Drug Name |
|---|---|
| Levetiracetam | Keppra |
| Phenobarbital | Phenobarbital |
| Potassium Bromide | KBr |
| Zonisamide | Zonisamide |

---

### 5.2 Autoimmune Disease (IMHA / ITP / Lupus / Pemphigus)

When a patient has a documented autoimmune condition, the following rules apply:

#### General Rule (All Vaccines)
- **Classification**: Alert
- **Recommendation**: **AVOID** vaccination during active disease flares. Serological titer testing is strongly recommended over revaccination for core vaccines (CDV, CPV, CAV). Vaccination during immunological flares may exacerbate autoimmune responses.
- **Reference**: AAHA 2024; WSAVA 2024

#### MLV Vaccines While on Immunosuppressive Therapy
- **Classification**: **CONTRAINDICATED**
- **Affected Vaccines**: DHPP (core_dap), Bordetella Intranasal/Oral (noncore_bord_in)
- **Recommendation**: Modified-live vaccines are contraindicated in patients receiving immunosuppressive medications. MLV vaccines may cause vaccine-induced disease in immunosuppressed patients. Wait at least 2-4 weeks after discontinuation of immunosuppressive therapy before administering any MLV vaccine.
- **Reference**: WSAVA 2024

#### Oclacitinib (Apoquel) — JAK Inhibitor
- **Classification**: **CONTRAINDICATED** (ALL vaccines — both MLV and killed)
- **Recommendation**: Avoid ALL vaccinations during oclacitinib treatment and for 28 days following discontinuation. Oclacitinib inhibits Janus kinase signaling, resulting in broad immunosuppression that:
  - Increases the risk of vaccine-induced disease from MLV vaccines
  - Renders killed vaccines ineffective due to inadequate immune response
- **Reference**: Zoetis Prescribing Information; WSAVA 2024

#### Immunosuppressive Medications

| Medication | Drug Class |
|---|---|
| Prednisone / Prednisolone | Corticosteroid |
| Dexamethasone | Corticosteroid |
| Cyclosporine (Atopica) | Calcineurin inhibitor |
| Azathioprine (Imuran) | Purine antagonist |
| Mycophenolate (CellCept) | IMPDH inhibitor |
| Oclacitinib (Apoquel) | JAK inhibitor (strictest contraindication) |

---

### 5.3 Cancer / Chemotherapy

When a patient has a cancer diagnosis or is actively receiving chemotherapy, the following rules apply:

#### MLV Vaccines During Cancer Treatment
- **Classification**: **CONTRAINDICATED**
- **Affected Vaccines**: DHPP (core_dap), Bordetella Intranasal/Oral (noncore_bord_in)
- **Recommendation**: Modified-live vaccines are contraindicated during cancer treatment. MLV vaccines may cause disease in immunocompromised patients. Serological titer testing is recommended to assess existing immunity.
- **Reference**: WSAVA 2024; AAHA 2024

#### Killed Vaccines During Active Chemotherapy
- **Classification**: Caution (likely ineffective)
- **Affected Vaccines**: Rabies, Leptospirosis, Lyme, Canine Influenza, Bordetella Injectable
- **Recommendation**: Killed vaccines are likely ineffective during active chemotherapy due to suppressed bone marrow function and inadequate immune cell production. Wait a minimum of 2 weeks (ideally 4-8 weeks) after completing chemotherapy before vaccinating. Serological titer testing is preferred over revaccination.
- **Reference**: WSAVA 2024; AAHA 2024

#### Active Chemotherapy — Defer All Vaccination
- **Classification**: **CONTRAINDICATED** (all vaccines)
- **Trigger**: Patient is currently receiving any chemotherapy agent
- **Recommendation**: Defer all vaccination until treatment is complete. If cancer diagnosis is anticipated, vaccinate at least 14 days before initiating chemotherapy to allow adequate immune response.
- **Reference**: AAHA 2024

#### Chemotherapy Agents

| Medication | Drug Class |
|---|---|
| Cyclophosphamide | Alkylating agent |
| Doxorubicin | Anthracycline |
| Vincristine | Vinca alkaloid |
| Carboplatin | Platinum compound |
| Lomustine (CCNU) | Nitrosourea |
| Chlorambucil | Alkylating agent |
| Prednisone (CHOP protocol) | Corticosteroid (supportive) |

**Note on CHOP Protocol**: Cyclophosphamide + Hydroxydaunorubicin (Doxorubicin) + Oncovin (Vincristine) + Prednisone — a standard multi-agent lymphoma protocol resulting in significant immunosuppression.

---

## 6. Quick Reference — Contraindication Matrix

The table below summarizes the interaction between each medical scenario and vaccine type. **C** = Contraindicated (hard block), **W** = Warning/Caution, **N** = Advisory Note, **—** = No specific concern.

| Scenario | MLV Vaccines | Killed Vaccines |
|---|---|---|
| On immunosuppressive meds (Q5) | **C** | W |
| Pregnant / breeding (Q6) | **C** | W |
| Immune-mediated condition (Q4) | W | W |
| Prior vaccine reaction (Q1) | W | W |
| Prescription medications (Q2) | N | N |
| Chronic condition (Q3) | N | N |
| Epilepsy + standard vaccines | W | W |
| Epilepsy + Leptospirosis | — | W (Avoid) |
| Epilepsy + Isoxazoline flea/tick meds | **C** (medication) | **C** (medication) |
| Autoimmune + immunosuppressives | **C** | W |
| Autoimmune + Apoquel | **C** | **C** |
| Cancer + active chemo | **C** | **C** (defer) |
| Cancer + post-chemo (< 2 weeks) | **C** | W (ineffective) |

---

## 7. Quick Reference — Vaccine Schedule Summary

| Vaccine | Type | Core | Min Age | Puppy Doses | Adult Doses | Interval | 1st Booster | Ongoing |
|---|---|---|---|---|---|---|---|---|
| DHPP | MLV | Yes | 6 wks | 3 | 2 | 28 days | 1 year | Every 3 years |
| Rabies | Killed | Yes | 12 wks | 1 | 1 | — | 1 year | Every 3 years |
| Leptospirosis | Killed | Conditional | 12 wks | 2 | 2 | 28 days | 1 year | Annually |
| Lyme | Killed | No | 12 wks | 2 | 2 | 28 days | 1 year | Annually |
| Bordetella (IN) | MLV | No | 8 wks | 1 | 1 | — | 1 year | Annually |
| Bordetella (Inj) | Killed | No | 8 wks | 2 | 2 | 28 days | 1 year | Annually |
| Canine Influenza | Killed | No | 8 wks | 2 | 2 | 28 days | 1 year | Annually |

---

## 8. Sources & References

1. **American Animal Hospital Association (AAHA).** 2024 AAHA Canine Vaccination Guidelines. *Journal of the American Animal Hospital Association*.
2. **World Small Animal Veterinary Association (WSAVA).** 2024 Guidelines for the Vaccination of Dogs and Cats. WSAVA Vaccination Guidelines Group.
3. **U.S. Food & Drug Administration (FDA).** Animal Drug Safety Communication: FDA Alerts Pet Owners and Veterinarians About Potential for Neurologic Adverse Events Associated with Certain Flea and Tick Products. September 20, 2018.
4. **U.S. Environmental Protection Agency (EPA).** Seresto Collar Adverse Event Reports and Incident Data.
5. **Zoetis Inc.** Apoquel (oclacitinib tablet) Prescribing Information. Full U.S. Prescribing Information.
6. **Veterinary Information Network (VIN).** Pregnancy and vaccination safety references.

---

*This document was generated from the Vaccine Scheduler application's rule engine and is intended for professional veterinary review. Last updated: February 2026.*
