import { TEAM_COLORS } from './teamColors'

interface TeamColorPickerProps {
  label: string
  selectedColor: string | null
  onSelect: (hex: string) => void
  excludeColor?: string | null
}

function getTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#111827' : '#f8fafc'
}

export function TeamColorPicker({ label, selectedColor, onSelect, excludeColor }: Readonly<TeamColorPickerProps>) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-label-bold text-on-surface-variant uppercase tracking-widest text-center">{label}</p>
      <div className="grid grid-cols-5 gap-3">
        {TEAM_COLORS.map((color) => {
          const isExcluded = excludeColor != null && color.hex === excludeColor
          const isSelected = selectedColor === color.hex
          return (
            <button
              key={color.hex}
              type="button"
              disabled={isExcluded}
              onClick={() => onSelect(color.hex)}
              className={`flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all ${
                isExcluded
                  ? 'opacity-25 cursor-not-allowed'
                  : isSelected
                    ? 'bg-surface-container-highest scale-105'
                    : 'active:scale-95'
              }`}
            >
              <div
                className={`w-full aspect-square rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-on-surface shadow-lg'
                    : 'border-transparent'
                }`}
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
              <span className="font-mono text-[9px] text-on-surface-variant leading-none text-center truncate w-full">
                {color.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
