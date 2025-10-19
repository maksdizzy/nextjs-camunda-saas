import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormField } from '@/types/workflow';

type VariableInputProps = {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
};

export const VariableInput = ({
  field,
  value,
  onChange,
  error,
}: VariableInputProps) => {
  const renderInput = () => {
    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={field.id}
              checked={value || false}
              onChange={e => onChange(e.target.checked)}
              className="size-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary"
            />
            <Label htmlFor={field.id} className="text-sm font-normal">
              {field.label}
            </Label>
          </div>
        );

      case 'long':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.validation?.required && (
                <span className="ml-1 text-destructive">*</span>
              )}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={value || ''}
              onChange={e => onChange(Number.parseInt(e.target.value, 10))}
              min={field.validation?.min}
              max={field.validation?.max}
              required={field.validation?.required}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.validation?.required && (
                <span className="ml-1 text-destructive">*</span>
              )}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={
                value instanceof Date
                  ? value.toISOString().split('T')[0]
                  : value || ''
              }
              onChange={e => onChange(new Date(e.target.value))}
              required={field.validation?.required}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'enum':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.validation?.required && (
                <span className="ml-1 text-destructive">*</span>
              )}
            </Label>
            <select
              id={field.id}
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              required={field.validation?.required}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${error ? 'border-destructive' : ''}`}
            >
              <option value="">Select an option</option>
              {field.properties?.values?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'string':
      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.validation?.required && (
                <span className="ml-1 text-destructive">*</span>
              )}
            </Label>
            <Input
              id={field.id}
              type="text"
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              minLength={field.validation?.minLength}
              maxLength={field.validation?.maxLength}
              pattern={field.validation?.pattern}
              required={field.validation?.required}
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
    }
  };

  return <div className="w-full">{renderInput()}</div>;
};
