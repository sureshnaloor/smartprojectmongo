import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SPLIT_PERCENT } from "./constants";

export function useSplitPane(defaultPercent = DEFAULT_SPLIT_PERCENT) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState(defaultPercent);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.min(52, Math.max(28, (x / rect.width) * 100));
      setLeftPercent(pct);
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const resetSplit = useCallback(() => {
    setLeftPercent(defaultPercent);
  }, [defaultPercent]);

  return { containerRef, leftPercent, onMouseDown, resetSplit };
}
