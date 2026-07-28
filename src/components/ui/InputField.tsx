import { useState } from "react";
import { MaterialIcon } from "./MaterialIcon";

interface InputFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  icon?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  rightIcon?: string;
  onRightIconClick?: () => void;
}

function getBorderColor(focused: boolean, error?: string) {
  if (focused) return "border-primary";
  if (error) return "border-error";
  return "border-outline-variant";
}

export function InputField({ label, type = "text", placeholder, icon, value, onChange, error, rightIcon, onRightIconClick }: Readonly<InputFieldProps>) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={label} className="label-bold text-on-surface-variant uppercase tracking-wider">{label}</label>
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-surface-container-high border transition-all duration-200 ${getBorderColor(focused, error)}`}
      >
        {icon && <MaterialIcon name={icon} className={`w-5 h-5 ${focused ? "text-primary" : "text-on-surface-variant"}`} />}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent text-on-surface font-body placeholder:text-on-surface-variant/50 focus:outline-none"
        />
        {rightIcon && (
          <button type="button" onClick={onRightIconClick} className="text-on-surface-variant hover:text-primary transition-colors">
            <MaterialIcon name={rightIcon} className="w-5 h-5" />
          </button>
        )}
      </div>
      {error && (
        <span className="label-sm text-error flex items-center gap-1">
          <MaterialIcon name="error" className="w-3.5 h-3.5" />
          {error}
        </span>
      )}
    </div>
  );
}
