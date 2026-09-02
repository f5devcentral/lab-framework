"use client"
import { useEffect, useRef, useState } from "react";

function readStoredValue<T>(key: string, fallback: T): T {
    try {
        const value = localStorage.getItem(key)
        if (value) {
            return JSON.parse(value) as T
        }
    } catch {
        // Fall through to fallback below.
    }

    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
}

function persistStoredValue<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Custom hook to manage state synchronized with localStorage.
 *
 * @template T - The type of the value to be stored in localStorage.
 * @param {string} key - The key under which the value is stored in localStorage.
 * @param {T} defaultValue - The default value to be used if there is no value in localStorage.
 * @returns {[T, (valueOrFn: T | ((val: T) => T)) => void]} - Returns a stateful value and a function to update it.
 *
 * @example
 * const [value, setValue] = useLocalStorage<string>('myKey', 'default');
 * setValue('newValue');
 */
const useLocalStorage = <T>(key: string, defaultValue: T): [T, (valueOrFn: T | ((val: T) => T)) => void] => {
    const defaultValueRef = useRef(defaultValue);
    const [localStorageValue, setLocalStorageValue] = useState<T>(defaultValue)

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        setLocalStorageValue(readStoredValue(key, defaultValueRef.current));
    }, [key]);

    // this method update our localStorage and our state
    const setLocalStorageStateValue = (valueOrFn: T | ((val: T) => T)) => {
        setLocalStorageValue((prevValue) => {
            const newValue = typeof valueOrFn === "function"
                ? (valueOrFn as (val: T) => T)(prevValue)
                : valueOrFn;

            if (typeof window !== "undefined") {
                persistStoredValue(key, newValue);
            }

            return newValue;
        });
    }
    return [localStorageValue, setLocalStorageStateValue]
}

export default useLocalStorage;
