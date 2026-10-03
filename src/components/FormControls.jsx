import React from "react";
import Icon from "./Icon";

/**
 * Standardized Form Controls Component Suite
 *
 * Implements accessible form field patterns:
 * - FormGroup: Label, required star, helper text, error message
 * - Input: Standard text, number, date input with prefix/suffix support
 * - SearchInput: Integrated magnifying glass icon and clear button
 * - Select: Styled dropdown with standard arrow
 * - Textarea: Multi-line text field with consistent styling
 */

export function FormGroup({
  label,
  id,
  required = false,
  error = null,
  hint = null,
  children,
  className = "",
  style = {},
}) {
  return (
    <div className={`form-field ${error ? "has-error" : ""} ${className}`.trim()} style={style}>
      {label && (
        <label htmlFor={id} className="form-label">
          {label}
          {required && <span className="required-indicator" aria-hidden="true">*</span>}
        </label>
      )}

      {children}

      {hint && !error && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
      {error && (
        <p className="form-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  id,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  error = false,
  className = "",
  autoComplete,
  min,
  max,
  step,
  ...rest
}) {
  return (
    <input
      id={id}
      name={name || id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      autoComplete={autoComplete}
      min={min}
      max={max}
      step={step}
      aria-invalid={error ? "true" : undefined}
      className={`form-input ${error ? "input-error" : ""} ${className}`.trim()}
      {...rest}
    />
  );
}

export function SearchInput({
  id = "search",
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  className = "",
  ariaLabel = "Search records",
  disabled = false,
  ...rest
}) {
  return (
    <div className={`search-input-wrapper ${className}`.trim()}>
      <span className="search-input-icon" aria-hidden="true">
        <Icon name="search" size={16} />
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        className="form-input search-input-field"
        {...rest}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="search-clear-btn"
          aria-label="Clear search"
          title="Clear search"
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}

export function Select({
  id,
  name,
  value,
  onChange,
  children,
  disabled = false,
  required = false,
  error = false,
  className = "",
  ...rest
}) {
  return (
    <select
      id={id}
      name={name || id}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      aria-invalid={error ? "true" : undefined}
      className={`form-select ${error ? "select-error" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({
  id,
  name,
  value,
  onChange,
  rows = 3,
  placeholder,
  disabled = false,
  required = false,
  error = false,
  className = "",
  ...rest
}) {
  return (
    <textarea
      id={id}
      name={name || id}
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      aria-invalid={error ? "true" : undefined}
      className={`form-textarea ${error ? "textarea-error" : ""} ${className}`.trim()}
      {...rest}
    />
  );
}

const FormControls = {
  FormGroup,
  Input,
  SearchInput,
  Select,
  Textarea,
};
export default FormControls;
