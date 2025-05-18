
"use client";

import { useState, useEffect, Dispatch, SetStateAction, useCallback } from 'react';

type SetValue<T> = Dispatch<SetStateAction<T>>;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const readValue = useCallback((): T => {
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
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue: SetValue<T> = useCallback(
    (value) => {
      if (typeof window === 'undefined') {
        console.warn(
          `Tried setting localStorage key "${key}" even though environment is not a client`
        );
        return;
      }

      try {
        setStoredValue((prevStoredValue) => {
          const newValue = value instanceof Function ? value(prevStoredValue) : value;
          window.localStorage.setItem(key, JSON.stringify(newValue));
          window.dispatchEvent(new Event("local-storage")); // Notify other hooks on the same page
          return newValue;
        });
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  useEffect(() => {
    // This effect ensures that the state is updated if readValue changes
    // (e.g. if key or initialValue props were to change, though they are typically stable)
    // It also correctly initializes the value on first client-side render if readValue() differs from initial server state.
    setStoredValue(readValue());
  }, [readValue]);

  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue());
    };

    // Listen to 'storage' event for changes in other tabs/windows
    window.addEventListener("storage", handleStorageChange);
    // Listen to custom 'local-storage' event for changes in the same tab by other instances of the hook
    window.addEventListener("local-storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage", handleStorageChange);
    };
  }, [readValue]); // Effect depends on the memoized readValue

  return [storedValue, setValue];
}

export default useLocalStorage;
