import type { ButtonHTMLAttributes, ReactNode } from "react";
import { MaterialIcon } from "./MaterialIcon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "brand";
  icon?: string | ReactNode;
  fullWidth?: boolean;
}

const baseStyles = "font-mono text-label-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 py-4 px-6";

const variantStyles = {
  primary: "bg-primary text-on-primary brutal-shadow brutal-shadow-hover rounded-none",
  secondary: "bg-secondary-container text-on-secondary-container border border-secondary-container hover:bg-secondary/20",
  ghost: "bg-transparent text-on-surface-variant hover:bg-surface-variant border border-transparent",
  brand: "bg-primary-container text-primary brutal-shadow brutal-shadow-hover rounded-none",
};

export function Button({ children, variant = "primary", icon, fullWidth = false, className = "", disabled, ...props }: Readonly<ButtonProps>) {
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";
  const widthStyles = fullWidth ? "w-full" : "";

  return (
    <button
      type="button"
      className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${widthStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {typeof icon === "string" ? <MaterialIcon name={icon} className="w-5 h-5" /> : icon}
      {children}
    </button>
  );
}
