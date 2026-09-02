import { TEAM_COLORS } from "./teamColors";

interface TeamColorPickerProps {
  label: string;
  selectedColor: string | null;
  onSelect: (hex: string) => void;
  excludeColor?: string | null;
  excludeMisto?: boolean;
}

const MIXED_COLOR = "#a855f7";

function getTextColor(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#111827" : "#f8fafc";
}

function isDarkColor(hex: string): boolean {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance <= 0.2;
}

export function TeamColorPicker({ label, selectedColor, onSelect, excludeColor, excludeMisto = false }: Readonly<TeamColorPickerProps>) {
  const isMixedSelected = selectedColor === MIXED_COLOR;

  return (
    <div className="space-y-3">
      {label && <p className="font-mono text-label-bold text-on-surface-variant uppercase tracking-widest text-center">{label}</p>}
      <div className="grid grid-cols-5 gap-3">
        {TEAM_COLORS.map((color) => {
          const isExcluded = excludeColor != null && color.hex === excludeColor;
          const isSelected = selectedColor === color.hex;

          const getButtonClassName = (excluded: boolean, selected: boolean) => {
            if (excluded) return "opacity-25 cursor-not-allowed";
            if (selected) return "bg-surface-container-highest scale-105";
            return "active:scale-95";
          };

          const getBorderClassName = (selected: boolean, hex: string) => {
            if (selected) return "border-on-surface shadow-lg";
            if (isDarkColor(hex)) return "border-white/40";
            return "border-transparent";
          };

          return (
            <button
              key={color.hex}
              type="button"
              disabled={isExcluded}
              onClick={() => onSelect(color.hex)}
              className={`flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all ${getButtonClassName(isExcluded, isSelected)}`}
            >
              <div
                className={`w-full aspect-square rounded-lg border-2 transition-all ${getBorderClassName(isSelected, color.hex)}`}
                style={{ backgroundColor: color.hex }}
              >
                {isSelected && (
                  <span
                    className="w-full h-full flex items-center justify-center font-mono text-sm font-bold"
                    style={{ color: getTextColor(color.hex) }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <span className="font-mono text-[9px] text-on-surface-variant leading-none text-center truncate w-full">{color.name}</span>
            </button>
          );
        })}
        {/* Misto / Sem colete */}
        <button
          type="button"
          disabled={excludeMisto}
          onClick={() => onSelect(MIXED_COLOR)}
          className={`flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all ${
            excludeMisto ? "opacity-25 cursor-not-allowed" : isMixedSelected ? "bg-surface-container-highest scale-105" : "active:scale-95"
          }`}
        >
          <div
            className={`w-full aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
              isMixedSelected ? "border-on-surface shadow-lg" : "border-outline-variant border-dashed"
            }`}
            style={{ background: "linear-gradient(135deg, #ef4444 25%, #3b82f6 25%, #3b82f6 50%, #22c55e 50%, #22c55e 75%, #eab308 75%)" }}
          >
            <span className="font-mono text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">M</span>
          </div>
          <span className="font-mono text-[9px] text-on-surface-variant leading-none text-center truncate w-full">Misto</span>
        </button>
      </div>
    </div>
  );
}
