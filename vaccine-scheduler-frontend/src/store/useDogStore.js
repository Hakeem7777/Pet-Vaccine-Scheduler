import { create } from 'zustand';
import { getDogs, createDog as apiCreateDog, deleteDog as apiDeleteDog, updateDog as apiUpdateDog } from '../api/dogs';

const useDogStore = create((set, get) => ({
  dogs: [],
  isLoading: true,
  error: null,

  // Fetch dogs from API
  fetchDogs: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getDogs();
      set({ dogs: data.results || data, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load dogs. Please try again.', isLoading: false });
    }
  },

  // Optimistically add a dog, then sync with API
  addDog: async (formData) => {
    // Create optimistic dog with temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticDog = {
      id: tempId,
      ...formData,
      age_weeks: calculateAgeWeeks(formData.birth_date),
      age_classification: calculateAgeClassification(formData.birth_date),
      vaccination_count: 0,
      sex_display: getSexDisplay(formData.sex),
      _isOptimistic: true,
    };

    // Optimistically add to state
    set((state) => ({
      dogs: [optimisticDog, ...state.dogs],
    }));

    try {
      // Create on server
      const createdDog = await apiCreateDog(formData);

      // Replace optimistic dog with real one
      set((state) => ({
        dogs: state.dogs.map((dog) =>
          dog.id === tempId ? { ...createdDog, _isOptimistic: false } : dog
        ),
      }));

      return createdDog;
    } catch (err) {
      // Remove optimistic dog on error
      set((state) => ({
        dogs: state.dogs.filter((dog) => dog.id !== tempId),
        error: 'Failed to add dog. Please try again.',
      }));
      throw err;
    }
  },

  // Update a dog
  updateDog: async (id, formData) => {
    const previousDogs = get().dogs;

    // Optimistically update
    set((state) => ({
      dogs: state.dogs.map((dog) =>
        dog.id === id ? { ...dog, ...formData, _isUpdating: true } : dog
      ),
    }));

    try {
      const updatedDog = await apiUpdateDog(id, formData);
      set((state) => ({
        dogs: state.dogs.map((dog) =>
          dog.id === id ? { ...updatedDog, _isUpdating: false } : dog
        ),
      }));
      return updatedDog;
    } catch (err) {
      // Revert on error
      set({ dogs: previousDogs, error: 'Failed to update dog.' });
      throw err;
    }
  },

  // Delete a dog
  deleteDog: async (id) => {
    const previousDogs = get().dogs;

    // Optimistically remove
    set((state) => ({
      dogs: state.dogs.filter((dog) => dog.id !== id),
    }));

    try {
      await apiDeleteDog(id);
    } catch (err) {
      // Revert on error
      set({ dogs: previousDogs, error: 'Failed to delete dog.' });
      throw err;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

// Helper functions
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

export default useDogStore;
