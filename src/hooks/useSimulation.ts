import { useEffect, useRef } from 'react';
import { useNavikStore } from '../store/navikStore';

export function useSimulation() {
  const moveBuses       = useNavikStore((s) => s.moveBuses);
  const streamLiveEvent = useNavikStore((s) => s.streamLiveEvent);
  const recomputeKPIs   = useNavikStore((s) => s.recomputeKPIs);
  const timeoutRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Move buses every 4s
    const moveInterval = setInterval(() => {
      moveBuses();
      recomputeKPIs();
    }, 4000);

    // Stream live events at random 8-15s intervals
    function scheduleNext() {
      const delay = 8000 + Math.random() * 7000;
      timeoutRef.current = setTimeout(() => {
        streamLiveEvent();
        scheduleNext();
      }, delay);
    }
    const firstTimeout = setTimeout(scheduleNext, 5000);

    return () => {
      clearInterval(moveInterval);
      clearTimeout(firstTimeout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [moveBuses, streamLiveEvent, recomputeKPIs]);
}
