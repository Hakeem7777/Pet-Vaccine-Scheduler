import { motion } from 'framer-motion';

function TourTooltip({ content, currentStep, totalSteps, setCurrentStep, onClose }) {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  // Handle case where content might be undefined or not an object
  const title = content?.title || '';
  const description = content?.description || '';

  function handleNext() {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  }

  function handlePrev() {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleSkip() {
    onClose();
  }

  // Don't render if no content - but log for debugging
  if (!content) {
    console.warn('TourTooltip: content is undefined or null', { currentStep, totalSteps });
    return null;
  }

  return (
    <motion.div
      className="tour-tooltip"
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="tour-tooltip__header">
        <div className="tour-tooltip__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        {title && (
          <h4 className="tour-tooltip__title">{title}</h4>
        )}
      </div>

      <div className="tour-tooltip__content">
        {description}
      </div>

      <div className="tour-tooltip__footer">
        <div className="tour-tooltip__progress">
          {Array.from({ length: totalSteps }, (_, i) => (
            <span
              key={i}
              className={`tour-tooltip__progress-dot ${
                i < currentStep ? 'tour-tooltip__progress-dot--completed' : ''
              } ${i === currentStep ? 'tour-tooltip__progress-dot--active' : ''}`}
            />
          ))}
        </div>

        <div className="tour-tooltip__actions">
          {!isFirstStep && (
            <button
              className="tour-tooltip__btn tour-tooltip__btn--back"
              onClick={handlePrev}
            >
              Back
            </button>
          )}

          {!isLastStep && (
            <button
              className="tour-tooltip__btn tour-tooltip__btn--skip"
              onClick={handleSkip}
            >
              Skip
            </button>
          )}

          <button
            className={`tour-tooltip__btn ${isLastStep ? 'tour-tooltip__btn--finish' : 'tour-tooltip__btn--next'}`}
            onClick={handleNext}
          >
            {isLastStep ? 'Finish Tour' : 'Next'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default TourTooltip;
