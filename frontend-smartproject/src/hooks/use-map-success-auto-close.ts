import { useCallback, useEffect, useRef, useState } from "react";

/** Delay before the dialog closes after a successful map (ms). */
export const MAP_SUCCESS_AUTO_CLOSE_MS = 2000;

/**
 * After a successful "Save mapping", show a brief success state then close the dialog.
 * Clears timers when the dialog is closed manually or on unmount.
 */
export function useMapSuccessAutoClose() {
  const [mapSuccess, setMapSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const beginSuccessAndScheduleClose = useCallback(
    (onClose: () => void) => {
      setMapSuccess(true);
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setMapSuccess(false);
        onClose();
      }, MAP_SUCCESS_AUTO_CLOSE_MS);
    },
    [clearTimer]
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean, setOpen: (open: boolean) => void) => {
      if (!open) {
        clearTimer();
        setMapSuccess(false);
      }
      setOpen(open);
    },
    [clearTimer]
  );

  return { mapSuccess, beginSuccessAndScheduleClose, handleDialogOpenChange };
}
