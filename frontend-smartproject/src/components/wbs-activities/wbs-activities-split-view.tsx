import { cn } from "@/lib/utils";
import { useSplitPane } from "./use-split-pane";
import { MAX_LEFT_PX, MIN_LEFT_PX } from "./constants";

interface WbsActivitiesSplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}

export function WbsActivitiesSplitView({ left, right, className }: WbsActivitiesSplitViewProps) {
  const { containerRef, leftPercent, onMouseDown, resetSplit } = useSplitPane();

  return (
    <div
      ref={containerRef}
      className={cn("flex min-h-0 w-full flex-1 overflow-hidden", className)}
    >
      <div
        className="flex min-h-0 flex-col overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-white)]"
        style={{
          flex: `0 0 clamp(${MIN_LEFT_PX}px, ${leftPercent}%, ${MAX_LEFT_PX}px)`,
          width: `clamp(${MIN_LEFT_PX}px, ${leftPercent}%, ${MAX_LEFT_PX}px)`,
          maxWidth: MAX_LEFT_PX,
          minWidth: MIN_LEFT_PX,
        }}
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        className="wa-divider w-1 shrink-0 cursor-col-resize bg-[var(--bg-warm-gray)] transition-colors hover:bg-[rgba(212,144,61,0.3)]"
        onMouseDown={onMouseDown}
        onDoubleClick={resetSplit}
        title="Drag to resize · double-click to reset"
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-cream)]">
        {right}
      </div>
    </div>
  );
}
