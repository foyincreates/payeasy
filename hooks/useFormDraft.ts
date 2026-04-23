"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type UseFormDraftOptions<T> = {
  key: string;
  initialValues: T;
};

export const useFormDraft = <T>({ key, initialValues }: UseFormDraftOptions<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [hasDraft, setHasDraft] = useState(false);
  
  const isInitialMount = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        // Validate JSON and check if it's not strictly equal to initial empty state
        const parsed = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) {
          setHasDraft(true);
        }
      }
    } catch (e) {
      // Corrupted JSON
      localStorage.removeItem(key);
    }
  }, [key]);

  // Save to draft on values change with debounce
  useEffect(() => {
    // Skip saving on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(values));
        // If the user started modifying the form instead of resuming,
        // the draft is overwritten, so we can hide the banner.
        setHasDraft(false);
      } catch (e) {
        // Handle storage quota exceeded or other errors silently in UI
      }
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [values, key]);

  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setValues(JSON.parse(saved));
        setHasDraft(false);
      }
    } catch (e) {
      localStorage.removeItem(key);
    }
  }, [key]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(key);
    setHasDraft(false);
  }, [key]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setHasDraft(false);
  }, [key]);

  return {
    values,
    setValues,
    hasDraft,
    loadDraft,
    discardDraft,
    clearDraft,
  };
};
