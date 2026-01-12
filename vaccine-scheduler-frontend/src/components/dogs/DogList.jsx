import { motion, AnimatePresence } from 'framer-motion';
import DogCard from './DogCard';

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

function DogList({ dogs }) {
  if (dogs.length === 0) {
    return (
      <div className="empty-state">
        <p>No dogs registered yet.</p>
        <p>Click "Add Dog" to get started!</p>
      </div>
    );
  }

  return (
    <motion.div className="dog-list" layout>
      <AnimatePresence mode="popLayout">
        {dogs.map((dog) => (
          <motion.div
            key={dog.id}
            variants={item}
            initial="hidden"
            animate="show"
            exit="exit"
            layout
          >
            <DogCard dog={dog} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

export default DogList;
