import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs `fetcher(signal)` whenever `deps` change and reports:
 * { data, error, loading, isRefreshing, lastUpdated, reload }.
 *
 * Options:
 * - `enabled`: boolean (default true)
 * - `pollInterval`: number in ms (e.g. 15000 for 15s). If > 0, automatically polls in background.
 * - `pauseWhenHidden`: boolean (default true). Pauses polling when browser tab is hidden to save resources.
 */
export function useApi(
  fetcher,
  deps = [],
  { enabled = true, pollInterval = 0, pauseWhenHidden = true } = {},
) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: enabled,
    isRefreshing: false,
    lastUpdated: null,
  });

  const [tick, setTick] = useState(0);
  const isMounted = useRef(true);
  const hasLoadedRef = useRef(false);

  // Manual reload function - can be called with { silent: true } to prevent UI flashing
  const reload = useCallback((opts = {}) => {
    if (!opts.silent) {
      setState((s) => ({ ...s, isRefreshing: true }));
    }
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Main fetch effect
  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    
    // Only set loading: true on the initial fetch when no data exists yet.
    // On subsequent refetches, set isRefreshing: true so existing content doesn't flicker.
    setState((s) => ({
      ...s,
      loading: s.data === null,
      isRefreshing: s.data !== null,
      error: null,
    }));

    fetcher(controller.signal)
      .then((data) => {
        if (!isMounted.current) return;
        hasLoadedRef.current = true;
        setState({
          data,
          error: null,
          loading: false,
          isRefreshing: false,
          lastUpdated: new Date(),
        });
      })
      .catch((err) => {
        if (!isMounted.current || err?.canceled) return;
        setState((s) => ({
          ...s,
          error: err,
          loading: false,
          isRefreshing: false,
        }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled]);

  // Polling timer effect
  useEffect(() => {
    if (!enabled || !pollInterval || pollInterval <= 0) return undefined;

    const intervalId = setInterval(() => {
      if (pauseWhenHidden && typeof document !== "undefined" && document.hidden) {
        return; // Skip poll if tab is backgrounded
      }
      setTick((t) => t + 1);
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [enabled, pollInterval, pauseWhenHidden, ...deps]);

  return { ...state, reload };
}