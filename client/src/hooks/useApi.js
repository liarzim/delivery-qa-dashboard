/**
 * useApi — serverless replacement.
 *
 * Instead of fetching from /api/*, reads directly from the browser contexts:
 *   /api/data/delivery  → DataContext.delivery
 *   /api/data/qa        → DataContext.qa
 *   /api/settings       → SettingsContext.settings
 *
 * All other URLs return no-op stubs so existing call-sites don't break.
 */
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';

export function useApi(url) {
  const { delivery, qa, loading: dataLoading, error: dataError } = useData();
  const { settings } = useSettings();

  if (url === '/api/data/delivery')
    return { data: delivery, loading: dataLoading, error: dataError, refetch: () => {} };

  if (url === '/api/data/qa')
    return { data: qa, loading: dataLoading, error: dataError, refetch: () => {} };

  if (url === '/api/settings')
    return { data: settings, loading: false, error: null, refetch: () => {} };

  // Catch-all for any other endpoint — return empty/idle
  return { data: null, loading: false, error: null, refetch: () => {} };
}
