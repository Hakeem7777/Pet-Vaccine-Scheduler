import { useEffect, useCallback } from 'react';
import { TourProvider, useTour } from '@reactour/tour';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useTourStore from '../../store/useTourStore';
import useDogStore from '../../store/useDogStore';
import TourTooltip from './TourTooltip';
import { DASHBOARD_TOUR_STEPS, DOG_DETAIL_TOUR_STEPS } from './TourSteps';
import './GuidedTour.css';

// Tour controller component - syncs our store with reactour
function TourController() {
  const { setIsOpen, setCurrentStep } = useTour();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const dogs = useDogStore((state) => state.dogs);
  const {
    isRunning,
    startTour,
    stopTour,
    hasUserSeenTour,
  } = useTourStore();

  // When our store says to start, open reactour
  // For dashboard, only open if user has at least one dog
  useEffect(() => {
    if (isRunning) {
      const isDashboard = location.pathname === '/';
      if (isDashboard && (!dogs || dogs.length === 0)) {
        stopTour();
        return;
      }
      setCurrentStep(0);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isRunning, setIsOpen, setCurrentStep, location.pathname, dogs, stopTour]);

  // Auto-start tour for authenticated users who haven't seen it yet
  // Wait until user has added at least one dog before starting
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    if (hasUserSeenTour(user.id)) return;
    if (isRunning) return;
    if (location.pathname !== '/') return;
    if (!dogs || dogs.length === 0) return; // Wait for first dog

    // Delay start to let page render
    const timer = setTimeout(() => {
      startTour('dashboard');
    }, 1500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user?.id, hasUserSeenTour, isRunning, location.pathname, startTour, dogs]);

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
  // Prioritize actual page location over stored currentTour value
  const getSteps = useCallback(() => {
    const isDogDetail = location.pathname.startsWith('/dogs/');

    // Always use dog detail steps when on a dog detail page
    if (isDogDetail) {
      return DOG_DETAIL_TOUR_STEPS;
    }
    // Use dashboard steps for dashboard or any other page
    return DASHBOARD_TOUR_STEPS;
  }, [location.pathname]);

  const steps = getSteps();

  // Don't render for non-authenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <TourProvider
      steps={steps}
      styles={{
        popover: (base, state) => {
          // Get viewport dimensions
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          // Parse the current transform to get x, y
          let x = 0, y = 0;
          if (base.transform) {
            const match = base.transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
            if (match) {
              x = parseFloat(match[1]);
              y = parseFloat(match[2]);
            }
          }

          // Constrain y to keep popover in viewport (with padding)
          const popoverHeight = 200; // approximate height
          const maxY = viewportHeight - popoverHeight - 20;
          const minY = 80; // below header
          const constrainedY = Math.max(minY, Math.min(y, maxY));

          // Constrain x as well
          const popoverWidth = 360;
          const maxX = viewportWidth - popoverWidth - 20;
          const constrainedX = Math.max(20, Math.min(x, maxX));

          return {
            ...base,
            padding: 0,
            background: 'transparent',
            boxShadow: 'none',
            borderRadius: '16px',
            transform: `translate(${constrainedX}px, ${constrainedY}px)`,
          };
        },
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
