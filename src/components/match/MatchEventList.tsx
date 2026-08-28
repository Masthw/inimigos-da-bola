import React, { ReactNode } from "react";
import { MaterialIcon } from "../ui/MaterialIcon";

interface MatchEventListProps {
  iconColor: string;
  label: string;
  children: ReactNode;
}

export function MatchEventList({ iconColor, label, children }: MatchEventListProps) {
  return (
    <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: iconColor }} />
        <p className="font-mono text-label-bold uppercase tracking-widest" style={{ color: iconColor }}>
          {label}
        </p>
      </div>
      {children}
    </div>
  );
}

interface MatchEventListItemProps {
  icon: string;
  iconClassName: string;
  name: string;
  secondary?: string;
  style?: React.CSSProperties;
}

export function MatchEventListItem({ icon, iconClassName, name, secondary, style }: MatchEventListItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 bg-surface-variant/50 rounded-lg">
      <span className={iconClassName} style={style}>
        <MaterialIcon name={icon} className="w-4 h-4" />
      </span>
      <span className="font-mono text-label-sm text-on-surface flex-1">{name}</span>
      {secondary && <span className="font-mono text-[10px] text-on-surface-variant">{secondary}</span>}
    </div>
  );
}

export function MatchEventEmpty({ text }: { text: string }) {
  return <p className="font-mono text-label-sm text-on-surface-variant py-2">{text}</p>;
}
