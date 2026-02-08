import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const TOUR_STORAGE_KEY = 'vaccine_scheduler_tour';

const useTourStore = create(
  persist(
    (set, get) => ({
      // Tour state
      isRunning: false,
      currentStep: 0,
      currentTour: null, // 'dashboard' | 'dogDetail'
      pausedAtStep: null, // Track which step we paused at (null = not paused)

      // User preferences (keyed by user ID in the persisted object)
      seenTourUsers: {}, // { [userId]: true }

      // Actions
      startTour: (tourName = 'dashboard') => {
        set({
          isRunning: true,
          currentStep: 0,
          currentTour: tourName,
        });
      },

      stopTour: () => {
        set({
          isRunning: false,
          currentStep: 0,
          currentTour: null,
        });
      },

      setCurrentStep: (step) => {
        set({ currentStep: step });
      },

      nextStep: () => {
        set((state) => ({
          currentStep: state.currentStep + 1,
        }));
      },

      prevStep: () => {
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1),
        }));
      },

      // Pause tour (used when opening modals during tour)
      pauseTour: () => {
        const currentStep = get().currentStep;
        set({
          isRunning: false,
          pausedAtStep: currentStep,
        });
      },

      // Resume tour at next step after pause
      resumeTour: () => {
        const pausedStep = get().pausedAtStep;
        if (pausedStep !== null) {
          set({
            isRunning: true,
            currentStep: pausedStep + 1,
            pausedAtStep: null,
          });
        }
      },

      // Clear paused state without resuming
      clearPausedState: () => {
        set({ pausedAtStep: null });
      },

      // Mark tour as seen for a specific user
      markTourSeen: (userId) => {
        if (!userId) return;
        set((state) => ({
          seenTourUsers: {
            ...state.seenTourUsers,
            [userId]: true,
          },
        }));
      },

      // Check if user has seen the tour
      hasUserSeenTour: (userId) => {
        if (!userId) return true; // Guests don't get tour
        return !!get().seenTourUsers[userId];
      },

      // Complete tour and mark as seen
      completeTour: (userId) => {
        const { markTourSeen, stopTour } = get();
        markTourSeen(userId);
        stopTour();
      },

      // Reset tour for a user (for testing or manual restart)
      resetTourForUser: (userId) => {
        if (!userId) return;
        set((state) => {
          const newSeenUsers = { ...state.seenTourUsers };
          delete newSeenUsers[userId];
          return { seenTourUsers: newSeenUsers };
        });
      },
    }),
    {
      name: TOUR_STORAGE_KEY,
      partialize: (state) => ({
        seenTourUsers: state.seenTourUsers,
      }),
    }
  )
);

export default useTourStore;
