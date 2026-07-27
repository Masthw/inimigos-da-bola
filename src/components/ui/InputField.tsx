import { useState } from "react";

interface InputFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  icon?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function getBorderColor(focused: boolean, error?: string) {
  if (focused) return "border-primary";
  if (error) return "border-error";
  return "border-outline-variant";
}

export function InputField({ label, type = "text", placeholder, icon, value, onChange, error }: Readonly<InputFieldProps>) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={label} className="label-bold text-on-surface-variant uppercase tracking-wider">{label}</label>
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-surface-container-high border transition-all duration-200 ${getBorderColor(focused, error)}`}
      >
        {icon && <span className={`material-symbols-outlined text-[20px] ${focused ? "text-primary" : "text-on-surface-variant"}`}>{icon}</span>}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent text-on-surface font-body placeholder:text-on-surface-variant/50 focus:outline-none"
        />
      </div>
      {error && (
        <span className="label-sm text-error flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </span>
      )}
    </div>
  );
}
