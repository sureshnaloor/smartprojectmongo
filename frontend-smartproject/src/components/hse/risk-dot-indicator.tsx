import { levelFromApi, dotColorForLevel, FIVE_LEVELS } from "./constants";

interface RiskDotIndicatorProps {
  value: string;
  showLabel?: boolean;
}

export function RiskDotIndicator({ value, showLabel = true }: RiskDotIndicatorProps) {
  const level = levelFromApi(value);
  const label = FIVE_LEVELS.find((l) => l.level === level)?.label ?? value;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {FIVE_LEVELS.map((l) => (
          <span
            key={l.level}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: l.level <= level ? dotColorForLevel(level) : "var(--bg-warm-gray)",
            }}
          />
        ))}
      </div>
      {showLabel && (
        <span className="kanban-body-sm text-[var(--text-secondary)]">{label}</span>
      )}
    </div>
  );
}
