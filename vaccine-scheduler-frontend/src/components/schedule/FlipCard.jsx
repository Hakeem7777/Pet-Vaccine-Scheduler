import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './FlipCard.css';

function FlipCard({ front, back, className = '' }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [frontHeight, setFrontHeight] = useState(0);
  const [backHeight, setBackHeight] = useState(0);

  // Measure both contents on mount and when they change
  useLayoutEffect(() => {
    const measureHeights = () => {
      if (frontRef.current) {
        setFrontHeight(frontRef.current.offsetHeight);
      }
      if (backRef.current) {
        setBackHeight(backRef.current.offsetHeight);
      }
    };

    measureHeights();

    // Re-measure after a short delay to catch any async content
    const timer = setTimeout(measureHeights, 100);
    return () => clearTimeout(timer);
  }, [front, back]);

  // Use ResizeObserver to handle dynamic size changes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (frontRef.current) {
        setFrontHeight(frontRef.current.offsetHeight);
      }
      if (backRef.current) {
        setBackHeight(backRef.current.offsetHeight);
      }
    });

    if (frontRef.current) resizeObserver.observe(frontRef.current);
    if (backRef.current) resizeObserver.observe(backRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const handleFlip = (e) => {
    // Prevent flip when clicking buttons inside the card
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  const currentHeight = isFlipped ? backHeight : frontHeight;

  return (
    <div className={`flip-card-container ${className}`} onClick={handleFlip}>
      {/* Hidden measurement divs */}
      <div className="flip-card-measure" ref={frontRef} aria-hidden="true">
        {front}
      </div>
      <div className="flip-card-measure" ref={backRef} aria-hidden="true">
        <div className="flip-card-back-content">
          {back}
          <div className="flip-card-hint">Tap to flip back</div>
        </div>
      </div>

      {/* Animated container */}
      <motion.div
        className="flip-card-animated"
        animate={{ height: currentHeight || 'auto' }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isFlipped ? (
            <motion.div
              key="front"
              className="flip-card-face"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {front}
            </motion.div>
          ) : (
            <motion.div
              key="back"
              className="flip-card-face"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flip-card-back-content">
                {back}
                <div className="flip-card-hint">Tap to flip back</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default FlipCard;
