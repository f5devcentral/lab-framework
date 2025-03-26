"use client"
import { useState } from "react";

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

    // Create state variable to store localStorage value in state
    const [localStorageValue, setLocalStorageValue] = useState(() => {
        try {
            const value = localStorage.getItem(key)
            if (value) {
                // If value is already present in localStorage then return it
                return JSON.parse(value)
            } else {
                // Else set default value in localStorage and then return it
                localStorage.setItem(key, JSON.stringify(defaultValue));
                return defaultValue
            }
        } catch {
            // If an error is caught during reading or parsing of an existing value, set default value in localStorage and then return it
            localStorage.setItem(key, JSON.stringify(defaultValue));
            return defaultValue
        }
    })

    // this method update our localStorage and our state
    const setLocalStorageStateValue = (valueOrFn: T | ((val: T) => T)) => {
        let newValue;
        if (typeof valueOrFn === 'function') {
            const fn = valueOrFn as (val: T) => T;
            newValue = fn(localStorageValue)
        }
        else {
            newValue = valueOrFn;
        }
        localStorage.setItem(key, JSON.stringify(newValue));
        setLocalStorageValue(newValue)
    }
    return [localStorageValue, setLocalStorageStateValue]
}

export default useLocalStorage;
