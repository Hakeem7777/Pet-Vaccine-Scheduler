/**
 * Medical conditions, medication catalog, and helper functions.
 * Mirrors backend core/contraindications.py data constants.
 *
 * Sources: AAHA 2024, WSAVA 2024, FDA Safety Alert 2018, EPA Reports.
 */

export const MEDICAL_CONDITIONS = [
  {
    id: 'epilepsy',
    label: 'Epilepsy / Seizure Disorder',
    description: 'Diagnosed with epilepsy or has a history of seizures.',
    icon: '\u26A1',
  },
  {
    id: 'autoimmune',
    label: 'Autoimmune Disease',
    description: 'IMHA, ITP, Lupus, Pemphigus, or other immune-mediated disease.',
    icon: '\uD83D\uDEE1\uFE0F',
  },
  {
    id: 'cancer',
    label: 'Cancer / Chemotherapy',
    description: 'Diagnosed with cancer or currently receiving chemotherapy.',
    icon: '\uD83C\uDFE5',
  },
];

export const MEDICATION_CATALOG = {
  anti_seizure: {
    label: 'Anti-Seizure Medications',
    condition: 'epilepsy',
    options: [
      { id: 'keppra', label: 'Keppra (Levetiracetam)' },
      { id: 'phenobarbital', label: 'Phenobarbital' },
      { id: 'potassium_bromide', label: 'Potassium Bromide (KBr)' },
      { id: 'zonisamide', label: 'Zonisamide' },
    ],
  },
  flea_tick: {
    label: 'Flea & Tick Prevention',
    condition: 'epilepsy',
    options: [
      { id: 'nexgard', label: 'NexGard', drugClass: 'isoxazoline' },
      { id: 'bravecto', label: 'Bravecto', drugClass: 'isoxazoline' },
      { id: 'simparica', label: 'Simparica', drugClass: 'isoxazoline' },
      { id: 'credelio', label: 'Credelio', drugClass: 'isoxazoline' },
      { id: 'frontline', label: 'Frontline (Fipronil)', drugClass: 'topical' },
      { id: 'seresto', label: 'Seresto Collar', drugClass: 'collar' },
      { id: 'revolution', label: 'Revolution (Selamectin)', drugClass: 'topical' },
      { id: 'comfortis', label: 'Comfortis (Spinosad)', drugClass: 'oral_non_isox' },
    ],
  },
  heartworm: {
    label: 'Heartworm Prevention',
    condition: 'epilepsy',
    options: [
      { id: 'heartgard', label: 'Heartgard (Ivermectin)' },
      { id: 'interceptor', label: 'Interceptor (Milbemycin)' },
      { id: 'proheart', label: 'ProHeart (Moxidectin injection)' },
    ],
  },
  immunosuppressive: {
    label: 'Immunosuppressive Medications',
    condition: 'autoimmune',
    options: [
      { id: 'prednisone', label: 'Prednisone / Prednisolone' },
      { id: 'dexamethasone', label: 'Dexamethasone' },
      { id: 'cyclosporine', label: 'Cyclosporine (Atopica)' },
      { id: 'azathioprine', label: 'Azathioprine (Imuran)' },
      { id: 'mycophenolate', label: 'Mycophenolate (CellCept)' },
      { id: 'apoquel', label: 'Oclacitinib (Apoquel)' },
    ],
  },
  chemo_agents: {
    label: 'Chemotherapy Agents',
    condition: 'cancer',
    options: [
      { id: 'cyclophosphamide', label: 'Cyclophosphamide' },
      { id: 'doxorubicin', label: 'Doxorubicin' },
      { id: 'vincristine', label: 'Vincristine' },
      { id: 'carboplatin', label: 'Carboplatin' },
      { id: 'lomustine', label: 'Lomustine (CCNU)' },
      { id: 'chlorambucil', label: 'Chlorambucil' },
    ],
  },
  chemo_supportive: {
    label: 'Supportive / Protocol Medications',
    condition: 'cancer',
    options: [
      { id: 'prednisone_chemo', label: 'Prednisone (part of CHOP protocol)' },
    ],
  },
};

export const ISOXAZOLINE_MEDS = new Set(['nexgard', 'bravecto', 'simparica', 'credelio']);

/**
 * Get medication categories relevant to the selected conditions.
 * @param {string[]} conditions - List of condition IDs
 * @returns {Array<{key: string, label: string, condition: string, options: Array}>}
 */
export function getMedicationCategoriesForConditions(conditions) {
  if (!conditions || conditions.length === 0) return [];
  return Object.entries(MEDICATION_CATALOG)
    .filter(([, cat]) => conditions.includes(cat.condition))
    .map(([key, cat]) => ({ key, ...cat }));
}
