import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "./Icons";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  description?: string;
  prefix?: string;
}

export interface SelectProps<T extends string | number = string> {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  align?: "left" | "right";
  compact?: boolean;
  onChange: (value: T) => void;
  className?: string;
}

export function Select<T extends string | number = string>({
  label,
  value,
  options,
  placeholder = "Select an option",
  disabled = false,
  align = "left",
  compact = false,
  onChange,
  className = "",
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const listboxId = useId();

  const selected = options.find((opt) => opt.value === value) ?? null;

  useEffect(() => {
    if (!open) return;

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % options.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
      } else if (e.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
        e.preventDefault();
        onChange(options[activeIndex].value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, options, value, activeIndex, onChange]);

  const toggle = () => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        const idx = options.findIndex((o) => o.value === value);
        setActiveIndex(idx >= 0 ? idx : 0);
      }
      return next;
    });
  };

  return (
    <div ref={containerRef} className={`ui-select ${compact ? "ui-select--compact" : ""} ${className}`.trim()}>
      {label && (
        <span id={labelId} className="ui-field-label">
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-labelledby={label ? labelId : undefined}
        onClick={toggle}
        className={`ui-select-trigger ${open ? "is-open" : ""} ${!selected ? "is-placeholder" : ""}`.trim()}
      >
        <span className="ui-select-value">
          {selected ? (
            <>
              {selected.prefix && <span className="ui-select-prefix">{selected.prefix}</span>}
              <span className="ui-select-label-text">{selected.label}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDownIcon size={16} className={`ui-select-chevron ${open ? "is-open" : ""}`} />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={label ? labelId : undefined}
          className={`ui-select-popover ui-select-popover--${align}`}
        >
          <div className="ui-select-list">
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === activeIndex;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`ui-select-option ${isSelected ? "is-selected" : ""} ${isHighlighted ? "is-highlighted" : ""}`.trim()}
                >
                  <span className="ui-select-option-body">
                    <span className="ui-select-option-title">
                      {opt.prefix && <span className="ui-select-prefix">{opt.prefix}</span>}
                      <span>{opt.label}</span>
                    </span>
                    {opt.description && (
                      <span className="ui-select-option-desc">{opt.description}</span>
                    )}
                  </span>
                  {isSelected && <CheckIcon size={15} className="ui-select-check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
