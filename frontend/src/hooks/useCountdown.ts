import { useEffect, useState } from 'react';
import { countdownLabel } from '../utils/time';

export function useCountdown(expiresAt: string) {
  const [label, setLabel] = useState(() => countdownLabel(expiresAt));

  useEffect(() => {
    function tick() {
      setLabel(countdownLabel(expiresAt));
    }
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return label;
}