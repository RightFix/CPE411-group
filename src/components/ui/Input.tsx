import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leadingIcon, id, className = "", ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="ui-field-label">
          {label}
        </label>
      )}
      <div className={`ui-input-wrap ${error ? "is-error" : ""} ${leadingIcon ? "has-icon" : ""}`.trim()}>
        {leadingIcon && <span className="ui-input-icon">{leadingIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={descId}
          className="ui-input"
          {...props}
        />
      </div>
      {error && (
        <p id={`${inputId}-err`} className="ui-field-error" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="ui-field-hint">
          {hint}
        </p>
      )}
    </div>
  );
});
