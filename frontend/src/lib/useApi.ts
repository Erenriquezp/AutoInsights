import { useCallback, useEffect, useState } from 'react';

export type Resource<T> =
  | { status: 'loading'; data?: undefined; error?: undefined; retry: () => void }
  | { status: 'error'; data?: undefined; error: unknown; retry: () => void }
  | { status: 'ready'; data: T; error?: undefined; retry: () => void };

/**
 * Load data for a component. `deps` restarts the request; `retry` repeats it.
 * A pass with `enabled = false` stays in "loading" without calling the API.
 */
export function useApi<T>(load: () => Promise<T>, deps: unknown[], enabled = true): Resource<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ status: 'loading' | 'error' | 'ready'; data?: T; error?: unknown }>({
    status: 'loading',
  });
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setState({ status: 'loading' });
    load().then(
      (data) => active && setState({ status: 'ready', data }),
      (error: unknown) => active && setState({ status: 'error', error }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt, enabled]);

  return { ...state, retry } as Resource<T>;
}
