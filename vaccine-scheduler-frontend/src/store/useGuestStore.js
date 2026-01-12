import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const GUEST_DOG_KEY = 'vaccine_scheduler_guest';

// Helper functions (same as useDogStore)
function calculateAgeWeeks(birthDate) {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  const diffTime = Math.abs(now - birth);
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks;
}

function calculateAgeClassification(birthDate) {
  const weeks = calculateAgeWeeks(birthDate);
  if (weeks < 16) return 'puppy';
  if (weeks < 52) return 'junior';
  if (weeks < 364) return 'adult';
  return 'senior';
}

function getSexDisplay(sex) {
  const sexMap = {
    M: 'Male',
    F: 'Female',
    MN: 'Male (Neutered)',
    FS: 'Female (Spayed)',
  };
  return sexMap[sex] || sex;
}

const useGuestStore = create(
  persist(
    (set, get) => ({
      guestDog: null,
      vaccinations: [],
      hasUsedGuestMode: false,

      // Check if guest has a dog
      hasGuestDog: () => !!get().guestDog,

      // Add guest dog (only one allowed)
      addGuestDog: (formData) => {
        const guestDog = {
          id: 'guest-dog',
          ...formData,
          age_weeks: calculateAgeWeeks(formData.birth_date),
          age_classification: calculateAgeClassification(formData.birth_date),
          vaccination_count: 0,
          sex_display: getSexDisplay(formData.sex),
          created_at: new Date().toISOString(),
        };

        set({
          guestDog,
          hasUsedGuestMode: true,
        });

        return guestDog;
      },

      // Update guest dog
      updateGuestDog: (formData) => {
        const current = get().guestDog;
        if (!current) return null;

        const updatedDog = {
          ...current,
          ...formData,
          age_weeks: calculateAgeWeeks(formData.birth_date || current.birth_date),
          age_classification: calculateAgeClassification(formData.birth_date || current.birth_date),
          sex_display: getSexDisplay(formData.sex || current.sex),
        };

        set({ guestDog: updatedDog });
        return updatedDog;
      },

      // Delete guest dog
      deleteGuestDog: () => {
        set({
          guestDog: null,
          vaccinations: [],
        });
      },

      // Add vaccination record
      addVaccination: (vaccination) => {
        const newVax = {
          id: `vax-${Date.now()}`,
          ...vaccination,
          date_added: new Date().toISOString(),
        };

        set((state) => ({
          vaccinations: [...state.vaccinations, newVax],
          guestDog: state.guestDog
            ? { ...state.guestDog, vaccination_count: state.vaccinations.length + 1 }
            : null,
        }));

        return newVax;
      },

      // Delete vaccination record
      deleteVaccination: (vaccinationId) => {
        set((state) => ({
          vaccinations: state.vaccinations.filter((v) => v.id !== vaccinationId),
          guestDog: state.guestDog
            ? { ...state.guestDog, vaccination_count: Math.max(0, state.vaccinations.length - 1) }
            : null,
        }));
      },

      // Get vaccinations for the guest dog
      getVaccinations: () => get().vaccinations,

      // Clear all guest data (used when user logs in)
      clearGuestData: () => {
        set({
          guestDog: null,
          vaccinations: [],
        });
      },

      // Check if user has already used their free trial
      canUseGuestMode: () => !get().hasUsedGuestMode || !get().guestDog,
    }),
    {
      name: GUEST_DOG_KEY,
      partialize: (state) => ({
        guestDog: state.guestDog,
        vaccinations: state.vaccinations,
        hasUsedGuestMode: state.hasUsedGuestMode,
      }),
    }
  )
);

export default useGuestStore;
