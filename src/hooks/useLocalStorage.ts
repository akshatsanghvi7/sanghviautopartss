
"use client";

import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';

type SetValue<T> = Dispatch<SetStateAction<T>>;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Initialize state with `initialValue` to ensure server and client match on first render.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Memoized function to read value from localStorage.
  // This will be used in useEffect on the client side.
  const readValue = useCallback((): T => {
    // Prevent build error "window is undefined" and keep logic client-side
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  // useEffect to update state from localStorage on client-side after initial hydration.
  useEffect(() => {
    // `readValue` is called here, on the client, after the component mounts.
    setStoredValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs once on mount, after initial render.

  // Memoized `setValue` function.
  // Uses functional update form of `setStoredValue` to avoid needing `storedValue` in dependencies.
  // Depends only on `key` to ensure stability.
  const setValue: SetValue<T> = useCallback(
    (value) => {
      // Prevent build error "window is undefined" and keep logic client-side
      if (typeof window === 'undefined') {
        console.warn(
          `Tried setting localStorage key "${key}" even though environment is not a client`
        );
        return;
      }

      try {
        // Allow value to be a function so we have the same API as useState
        setStoredValue((prevStoredValue) => {
          const newValue = value instanceof Function ? value(prevStoredValue) : value;
          window.localStorage.setItem(key, JSON.stringify(newValue));
          // Dispatch custom event to notify other instances of this hook on the same page
          window.dispatchEvent(new Event("local-storage"));
          return newValue;
        });
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key] // Stable dependency
  );

  // useEffect to listen for storage changes from other tabs/windows or other hook instances
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent | Event) => {
      // For 'storage' event, check if the key matches.
      // For 'local-storage' custom event, it's for the same key by design of this hook.
      if (event instanceof StorageEvent) {
        if (event.key === key) {
          setStoredValue(readValue());
        }
      } else {
        // Custom 'local-storage' event
        setStoredValue(readValue());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, [key, readValue]); // Depends on memoized `readValue` and `key`.

  return [storedValue, setValue];
}

export default useLocalStorage;
