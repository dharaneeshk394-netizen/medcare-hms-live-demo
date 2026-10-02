import React from "react";

/**
 * Standardized Card & Container Component System
 *
 * Implements single-elevation depth surfaces for dashboards,
 * data tables, filter bars, and detail sections.
 */
export function Card({
  children,
  className = "",
  padding = "normal", // "none", "sm", "normal", "lg"
  interactive = false,
  onClick,
  style = {},
  ...rest
}) {
  const paddingClass = {
    none: "card-padding-none",
    sm: "card-padding-sm",
    normal: "card-padding-normal",
    lg: "card-padding-lg",
  }[padding] || "card-padding-normal";

  const interactiveClass = interactive ? "card-interactive" : "";

  return (
    <div
      className={`ui-card ${paddingClass} ${interactiveClass} ${className}`.trim()}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  title,
  subtitle,
  action,
  className = "",
  style = {},
}) {
  return (
    <div className={`card-header ${className}`.trim()} style={style}>
      <div>
        {title && <h3 className="card-title">{title}</h3>}
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="card-header-action">{action}</div>}
    </div>
  );
}

export function CardContent({ children, className = "", style = {} }) {
  return (
    <div className={`card-content ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", style = {} }) {
  return (
    <div className={`card-footer ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export default Card;
