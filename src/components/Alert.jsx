import React from "react";
import Icon from "./Icon";

/**
 * Standardized Alert & Feedback Banner Component
 *
 * Provides clear, accessible status messages:
 * - Types: info, success, warning, error
 * - Features: icon indicator, title, body content, dismiss button
 * - Accessibility: appropriate ARIA roles and contrast
 */
function Alert({
  type = "info",
  title = null,
  children,
  message,
  onClose,
  dismissible = false,
  className = "",
  style = {},
}) {
  const iconMap = {
    info: "info",
    success: "checkCircle",
    warning: "alertTriangle",
    error: "alertCircle",
  };

  const roleMap = {
    error: "alert",
    warning: "alert",
    success: "status",
    info: "status",
  };

  const selectedIcon = iconMap[type] || "info";
  const role = roleMap[type] || "status";

  return (
    <div
      className={`alert alert-${type} ${className}`.trim()}
      role={role}
      aria-live={type === "error" ? "assertive" : "polite"}
      style={style}
    >
      <div className="alert-content-wrapper">
        <span className="alert-icon" aria-hidden="true">
          <Icon name={selectedIcon} size={18} />
        </span>
        <div className="alert-body">
          {title && <strong className="alert-title">{title}</strong>}
          <div className="alert-message">{children || message}</div>
        </div>
      </div>

      {(dismissible || onClose) && (
        <button
          type="button"
          className="alert-close-btn"
          onClick={onClose}
          aria-label="Dismiss alert"
          title="Dismiss"
        >
          <Icon name="x" size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default Alert;
