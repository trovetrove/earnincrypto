"use client";
/**
 * hooks/use-form-state.ts
 *
 * Keeps all form field values in React state.
 * This means validation errors from useActionState NEVER reset the form —
 * the inputs are controlled so they always show the user's current values.
 */

import { useState, useCallback, ChangeEvent } from "react";

type FieldValue = string | boolean;
type FormValues = Record<string, FieldValue>;

export function useFormState<T extends FormValues>(initial: T) {
  const [values, setValues] = useState<T>(initial);

  const set = useCallback((field: keyof T, value: FieldValue) => {
    setValues(p => ({ ...p, [field]: value }));
  }, []);

  const onChange = useCallback((field: keyof T) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      set(field, e.target.value);
    }, [set]);

  const onCheck = useCallback((field: keyof T) =>
    (checked: boolean) => {
      set(field, checked);
    }, [set]);

  return { values, set, onChange, onCheck };
}
