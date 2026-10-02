import React from "react";
import Icon from "./Icon";

/**
 * Standardized Commercial Button Component
 *
 * Implements Figma-ready button variants, sizes, and states:
 * - Variants: primary, secondary, outline, danger, ghost
 * - Sizes: sm (32px), md (40px), lg (48px)
 * - States: normal, hover, active, focus-visible, loading (with spinner), disabled
 * - Accessibility: WCAG AA contrast, aria-busy during loading, accessible disabled state
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  icon = null,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  className = "",
  onClick,
  title,
  ariaLabel,
  ...rest
}) {
  const variantClassMap = {
    primary: "primary-button",
    secondary: "secondary-button",
    outline: "outline-button",
    danger: "danger-button",
    "danger-solid": "danger-button-solid",
    ghost: "ghost-button",
  };

  const sizeClassMap = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
  };

  const baseVariant = variantClassMap[variant] || "primary-button";
  const sizeClass = sizeClassMap[size] || "btn-md";
  const widthClass = fullWidth ? "btn-full-width" : "";

  return (
    <button
      type={type}
      className={`btn ${baseVariant} ${sizeClass} ${widthClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      aria-label={ariaLabel || (typeof children === "string" ? undefined : title)}
      title={title}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : icon && iconPosition === "left" ? (
        <Icon name={icon} size={size === "sm" ? 14 : size === "lg" ? 18 : 16} aria-hidden="true" />
      ) : null}

      {children && <span className="btn-content">{children}</span>}

      {!loading && icon && iconPosition === "right" ? (
        <Icon name={icon} size={size === "sm" ? 14 : size === "lg" ? 18 : 16} aria-hidden="true" />
      ) : null}
    </button>
  );
}

export default Button;
