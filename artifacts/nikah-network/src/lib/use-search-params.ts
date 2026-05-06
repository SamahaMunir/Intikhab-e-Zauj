import { useMemo } from 'react';

export function useSearchParams() {
  return useMemo(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    return Object.fromEntries(params);
  }, []);
}
