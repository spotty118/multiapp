import { useState, useCallback, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    serializer?: (value: T) => string;
    deserializer?: (value: string) => T;
    onError?: (error: Error) => void;
  }
): [T, (value: T | ((prev: T) => T)) => void] {
  // Use a function to initialize state to avoid unnecessary storage operations
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return options?.deserializer
          ? options.deserializer(item)
          : JSON.parse(item);
      }
      return initialValue;
    } catch (error) {
      options?.onError?.(error as Error);
      return initialValue;
    }
  });

  // Memoize the setValue function
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        
        const serialized = options?.serializer
          ? options.serializer(valueToStore)
          : JSON.stringify(valueToStore);
        
        window.localStorage.setItem(key, serialized);

        // Dispatch storage event for cross-tab synchronization
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: serialized,
          storageArea: localStorage
        }));
      } catch (error) {
        options?.onError?.(error as Error);
      }
    },
    [key, storedValue, options]
  );

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = options?.deserializer
            ? options.deserializer(e.newValue)
            : JSON.parse(e.newValue);
          setStoredValue(newValue);
        } catch (error) {
          options?.onError?.(error as Error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, options]);

  return [storedValue, setValue];
}
