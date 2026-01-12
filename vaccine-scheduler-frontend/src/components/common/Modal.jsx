import { useEffect } from 'react';

function Modal({ isOpen, onClose, title, children, hideHeader = false }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${hideHeader ? 'modal-content--no-header' : ''}`} onClick={(e) => e.stopPropagation()}>
        {!hideHeader && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>
        )}
        {hideHeader && (
          <button className="modal-close modal-close--floating" onClick={onClose}>
            &times;
          </button>
        )}
        <div className={`modal-body ${hideHeader ? 'modal-body--no-padding' : ''}`}>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
