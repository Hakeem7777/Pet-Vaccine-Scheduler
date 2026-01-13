import { useEffect } from 'react';

function Modal({ isOpen, onClose, title, children, hideHeader = false, headerAction = null }) {
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
            <div className="modal-header-top">
              <h3>{title}</h3>
              <button className="modal-close" onClick={onClose}>
                &times;
              </button>
            </div>
            {headerAction && (
              <div className="modal-header-action">
                {headerAction}
              </div>
            )}
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
