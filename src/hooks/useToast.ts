import { useState, useCallback, useRef, useEffect } from 'react';

export function useToast(duration = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((msg: string) => {
    clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { message, show };
}
