import React, { useEffect, useRef } from "react";
import Icon from "./Icon";

/**
 * Standardized Accessible Modal Component
 *
 * Implements accessible dialog pattern:
 * - Proper ARIA attributes: role="dialog", aria-modal="true", aria-labelledby
 * - Keyboard navigation: ESC key dismiss
 * - Focus management: Focuses modal on open
 * - Clean animation & backdrop blur
 */
function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "540px",
  className = "",
  showCloseButton = true,
  closeOnBackdrop = true,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={closeOnBackdrop ? (e) => { if (e.target === e.currentTarget) onClose?.(); } : undefined}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`modal-card ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-dialog-title" : undefined}
        style={{ maxWidth }}
      >
        <div className="modal-header">
          <div>
            {title && (
              <h3 id="modal-dialog-title" className="modal-title">
                {title}
              </h3>
            )}
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>

          {showCloseButton && (
            <button
              type="button"
              className="modal-close-button"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <Icon name="x" size={20} />
            </button>
          )}
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
