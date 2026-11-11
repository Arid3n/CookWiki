import { useCallback, useEffect, useRef, useState } from 'react';
import { interpretSearch } from '../gemini/interpretSearch';
import { MissingKeyError } from '../gemini/client';
import { hasStructure, wordCount } from './searchSummary';
import { SearchFilters } from './types';

export const SMART_SEARCH_DEBOUNCE_MS = 600;

/**
 * Debounced Gemini interpretation of a library query (3+ words). Plain-text
 * filtering is the caller's baseline; `filters` is non-null only once an
 * interpretation for the current query has arrived. Stale or unmounted
 * responses are dropped; any error other than a missing key is silent.
 */
export function useSmartSearch(query: string, knownTags: string[]) {
  const [result, setResult] = useState<{ query: string; filters: SearchFilters } | null>(null);
  const [keyMissing, setKeyMissing] = useState(false);
  const tagsRef = useRef(knownTags);
  tagsRef.current = knownTags;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const trimmed = query.trim();
  useEffect(() => {
    setResult(null); // a changed query invalidates the previous interpretation
    if (wordCount(trimmed) < 3) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const filters = await interpretSearch(trimmed, tagsRef.current, controller.signal);
        if (!current || !mounted.current) return;
        setKeyMissing(false);
        if (hasStructure(filters)) setResult({ query: trimmed, filters });
      } catch (e) {
        if (current && mounted.current && e instanceof MissingKeyError) setKeyMissing(true);
      }
    }, SMART_SEARCH_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const dismiss = useCallback(() => setResult(null), []);
  return {
    filters: result && result.query === trimmed ? result.filters : null,
    keyMissing: keyMissing && wordCount(trimmed) >= 3,
    dismiss,
  };
}
