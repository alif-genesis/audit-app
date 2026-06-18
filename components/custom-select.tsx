"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type CustomSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  name: string;
  options: CustomSelectOption[];
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
};

export function CustomSelect({
  name,
  options,
  defaultValue = "",
  value,
  placeholder = "Pilih opsi",
  ariaLabel,
  required = false,
  disabled = false,
  onValueChange,
}: CustomSelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const currentValue = isControlled ? value : internalValue;
  const selectedOption = useMemo(
    () => options.find((option) => option.value === currentValue),
    [currentValue, options],
  );

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function choose(nextValue: string) {
    const nextOption = options.find((option) => option.value === nextValue);
    if (!nextOption || nextOption.disabled || disabled) {
      return;
    }

    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
    setIsOpen(false);

    window.setTimeout(() => {
      hiddenInputRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
      hiddenInputRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
      hiddenInputRef.current?.form?.dispatchEvent(new Event("input", { bubbles: true }));
      hiddenInputRef.current?.form?.dispatchEvent(new Event("change", { bubbles: true }));
    }, 0);
  }

  return (
    <div className={`custom-select ${disabled ? "disabled" : ""}`} ref={rootRef}>
      <input
        ref={hiddenInputRef}
        name={name}
        type="hidden"
        value={currentValue ?? ""}
        required={required}
      />
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="custom-select-trigger"
        disabled={disabled}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={selectedOption ? "" : "placeholder"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === currentValue}
              className="custom-select-option"
              disabled={option.disabled}
              key={`${name}-${option.value}`}
              role="option"
              type="button"
              onClick={() => choose(option.value)}
            >
              <span>{option.label}</span>
              {option.value === currentValue ? <Check size={16} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
