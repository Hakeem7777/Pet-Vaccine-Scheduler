import { useEffect, useCallback } from 'react';
import { TourProvider, useTour } from '@reactour/tour';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useTourStore from '../../store/useTourStore';
import TourTooltip from './TourTooltip';
import { DASHBOARD_TOUR_STEPS, DOG_DETAIL_TOUR_STEPS } from './TourSteps';
import './GuidedTour.css';

// Tour controller component - syncs our store with reactour
function TourController() {
  const { setIsOpen, setCurrentStep } = useTour();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const {
    isRunning,
    startTour,
    hasUserSeenTour,
  } = useTourStore();

  // When our store says to start, open reactour
  useEffect(() => {
    if (isRunning) {
      setCurrentStep(0);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isRunning, setIsOpen, setCurrentStep]);

  // Auto-start tour for new authenticated users on first login
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    if (hasUserSeenTour(user.id)) return;
    if (isRunning) return;
    if (location.pathname !== '/') return;

    // Delay start to let page render
    const timer = setTimeout(() => {
      startTour('dashboard');
    }, 1500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user?.id, hasUserSeenTour, isRunning, location.pathname, startTour]);

  return null;
}

// Custom Content Component for reactour
function CustomContentComponent(props) {
  const { currentStep, setCurrentStep, setIsOpen } = props;
  const { steps } = useTour();
  const { stopTour, markTourSeen } = useTourStore();
  const { user } = useAuth();

  // Get content from the current step - @reactour passes the step's content directly
  // but we need to access it from steps array to ensure we have it
  const stepContent = steps[currentStep]?.content;

  // Handle closing the tour (called by tooltip buttons)
  const handleClose = useCallback(() => {
    // Mark as seen if user is logged in
    if (user?.id) {
      markTourSeen(user.id);
    }
    // Stop the tour in our store
    stopTour();
    // Close reactour
    setIsOpen(false);
  }, [user?.id, markTourSeen, stopTour, setIsOpen]);

  return (
    <TourTooltip
      content={stepContent}
      currentStep={currentStep}
      totalSteps={steps.length}
      setCurrentStep={setCurrentStep}
      onClose={handleClose}
    />
  );
}

// Main GuidedTour component
function GuidedTour() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { currentTour } = useTourStore();

  // Determine which steps to use based on current route
  const getSteps = useCallback(() => {
    const isDashboard = location.pathname === '/';
    const isDogDetail = location.pathname.startsWith('/dogs/');

    if (isDashboard || currentTour === 'dashboard') {
      return DASHBOARD_TOUR_STEPS;
    }
    if (isDogDetail || currentTour === 'dogDetail') {
      return DOG_DETAIL_TOUR_STEPS;
    }
    return DASHBOARD_TOUR_STEPS;
  }, [location.pathname, currentTour]);

  const steps = getSteps();

  // Don't render for non-authenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <TourProvider
      steps={steps}
      styles={{
        popover: (base) => ({
          ...base,
          padding: 0,
          background: 'transparent',
          boxShadow: 'none',
          borderRadius: '16px',
        }),
        maskArea: (base) => ({
          ...base,
          rx: 8,
        }),
        maskWrapper: (base) => ({
          ...base,
          color: 'rgba(51, 63, 72, 0.75)',
        }),
        badge: () => ({
          display: 'none',
        }),
        controls: () => ({
          display: 'none',
        }),
        close: () => ({
          display: 'none',
        }),
      }}
      padding={{
        mask: 8,
        popover: [12, 8],
      }}
      position="bottom"
      ContentComponent={CustomContentComponent}
      onClickMask={() => {
        // Don't close on mask click - user must use buttons
      }}
      disableInteraction={false}
      disableFocusLock={true}
      scrollSmooth
    >
      <TourController />
    </TourProvider>
  );
}

export default GuidedTour;
