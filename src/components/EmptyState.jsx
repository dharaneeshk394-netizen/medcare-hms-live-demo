import Icon from "./Icon";

/**
 * Standardized EmptyState Component
 *
 * Provides a clean, accessible placeholder when a search, filter,
 * or collection returns zero results across all modules.
 */
function EmptyState({
  icon = "fileText",
  title = "No records found",
  message = "No matching items are available for the selected filters.",
  actionLabel,
  onAction,
  className = "",
  style = {},
}) {
  return (
    <div
      className={`empty-state ${className}`}
      style={style}
      role="status"
      aria-live="polite"
    >
      <div className="empty-state-icon" aria-hidden="true">
        <Icon name={icon} size={28} />
      </div>
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="secondary-button empty-state-action"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
