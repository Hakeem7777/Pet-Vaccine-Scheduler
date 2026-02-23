import { create } from 'zustand';

const useTourStore = create((set, get) => ({
  // Tour state
  isRunning: false,
  currentStep: 0,
  currentTour: null, // 'dashboard' | 'dogDetail'
  pausedAtStep: null, // Track which step we paused at (null = not paused)

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
}));

export default useTourStore;
