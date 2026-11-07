'use client';

import React from 'react';
import { useForm, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from './input';
import { Button } from './button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AutoFormProps<T extends z.ZodObject<any>> {
  schema: T;
  defaultValues?: DefaultValues<z.infer<T>>;
  onSubmit: (values: z.infer<T>) => void | Promise<void>;
  submitText?: string;
  fieldConfig?: Record<
    string,
    {
      label?: string;
      placeholder?: string;
      type?: 'text' | 'password' | 'email' | 'number' | 'textarea' | 'select';
      options?: { label: string; value: string }[];
    }
  >;
  className?: string;
  children?: React.ReactNode;
}

/**
 * AutoForm Component
 * Inspired by shadcn-vue's signature Auto Form feature:
 * Automatically constructs accessible, validated forms directly from a Zod schema.
 */
export function AutoForm<T extends z.ZodObject<any>>({
  schema,
  defaultValues,
  onSubmit,
  submitText = 'บันทึกข้อมูล',
  fieldConfig = {},
  className = '',
  children,
}: AutoFormProps<T>) {
  type FormValues = z.infer<T>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema as any) as any,
    defaultValues,
  });

  // Extract keys and types from Zod shape
  const shape = schema.shape;
  const fieldKeys = Object.keys(shape);

  return (
    <form
      onSubmit={handleSubmit(onSubmit as any)}
      className={cn('space-y-4 w-full text-left', className)}
    >
      {fieldKeys.map((key) => {
        const fieldDef = shape[key];
        const config = fieldConfig[key] || {};
        const error = (errors as any)[key as keyof FormValues];

        // Infer field title/label
        const labelText =
          config.label ||
          key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .replace(/_/g, ' ');

        // Determine input type
        let isTextarea = config.type === 'textarea';
        let isSelect = config.type === 'select' || fieldDef instanceof z.ZodEnum;
        let inputType = config.type || 'text';

        if (fieldDef instanceof z.ZodNumber) {
          inputType = 'number';
        } else if (key.toLowerCase().includes('password')) {
          inputType = 'password';
        } else if (key.toLowerCase().includes('email')) {
          inputType = 'email';
        }

        // Enum options
        let enumOptions: { label: string; value: string }[] = config.options || [];
        if (fieldDef instanceof z.ZodEnum && (!enumOptions || enumOptions.length === 0)) {
          const values =
            (fieldDef as any).options ||
            (fieldDef as any)._def?.values ||
            Object.keys((fieldDef as any)._def?.entries || {});
          enumOptions = values.map((val: string) => ({
            label: val,
            value: val,
          }));
        }

        return (
          <div key={key} className="space-y-1.5">
            <label
              htmlFor={key}
              className="block text-xs sm:text-sm font-extrabold text-slate-800"
            >
              {labelText}
            </label>

            {isTextarea ? (
              <textarea
                id={key}
                rows={3}
                placeholder={config.placeholder}
                {...register(key as any)}
                className={cn(
                  'w-full p-3 rounded-xl border border-input bg-background text-xs sm:text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  error ? 'border-destructive focus-visible:ring-destructive' : ''
                )}
              />
            ) : isSelect && enumOptions.length > 0 ? (
              <select
                id={key}
                {...register(key as any)}
                className={cn(
                  'w-full h-10 sm:h-11 px-3.5 rounded-xl border border-input bg-background text-xs sm:text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  error ? 'border-destructive focus-visible:ring-destructive' : ''
                )}
              >
                {enumOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={key}
                type={inputType}
                placeholder={config.placeholder}
                step={inputType === 'number' ? 'any' : undefined}
                {...register(key as any, {
                  valueAsNumber: inputType === 'number',
                })}
                className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
            )}

            {error?.message && (
              <p className="text-xs font-bold text-destructive animate-in fade-in">
                {String(error.message)}
              </p>
            )}
          </div>
        );
      })}

      {children}

      <Button
        type="submit"
        disabled={isSubmitting}
        variant="default"
        className="w-full h-11 text-sm font-extrabold"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            กำลังประมวลผล...
          </>
        ) : (
          submitText
        )}
      </Button>
    </form>
  );
}
