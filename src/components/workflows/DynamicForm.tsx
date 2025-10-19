'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { VariableInput } from '@/components/workflows/VariableInput';
import type { FormField, Variable } from '@/types/workflow';

type DynamicFormProps = {
  fields: FormField[];
  initialValues?: Record<string, Variable>;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
};

const EMPTY_INITIAL_VALUES: Record<string, Variable> = {};

export const DynamicForm = ({
  fields,
  initialValues = EMPTY_INITIAL_VALUES,
  onSubmit,
  submitLabel = 'Submit',
  isLoading = false,
}: DynamicFormProps) => {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach((field) => {
      if (initialValues[field.id]) {
        initial[field.id] = initialValues[field.id]?.value;
      } else if (field.defaultValue !== undefined) {
        initial[field.id] = field.defaultValue;
      }
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: FormField, value: any): string | null => {
    if (field.validation?.required && !value) {
      return `${field.label} is required`;
    }

    if (field.type === 'long' && value !== undefined && value !== '') {
      const numValue = Number(value);
      if (Number.isNaN(numValue)) {
        return `${field.label} must be a number`;
      }
      if (
        field.validation?.min !== undefined
        && numValue < field.validation.min
      ) {
        return `${field.label} must be at least ${field.validation.min}`;
      }
      if (
        field.validation?.max !== undefined
        && numValue > field.validation.max
      ) {
        return `${field.label} must be at most ${field.validation.max}`;
      }
    }

    if (field.type === 'string' && value) {
      if (
        field.validation?.minLength
        && value.length < field.validation.minLength
      ) {
        return `${field.label} must be at least ${field.validation.minLength} characters`;
      }
      if (
        field.validation?.maxLength
        && value.length > field.validation.maxLength
      ) {
        return `${field.label} must be at most ${field.validation.maxLength} characters`;
      }
      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          return `${field.label} format is invalid`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      await onSubmit(formData);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fields.map(field => (
        <VariableInput
          key={field.id}
          field={field}
          value={formData[field.id]}
          onChange={value => handleFieldChange(field.id, value)}
          error={errors[field.id]}
        />
      ))}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Processing...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};
