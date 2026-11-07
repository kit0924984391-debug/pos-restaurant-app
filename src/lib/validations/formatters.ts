import { z } from 'zod';

export interface FormattedZodError {
  fieldErrors: Record<string, string[]>;
  allErrors: string[];
  firstError: string;
  errorCount: number;
}

/**
 * Maps common Zod validation codes into user-friendly Thai error messages if no custom message is set
 */
export function getThaiErrorMessage(issue: z.ZodIssue): string {
  // If the issue message is already customized, return it
  if (issue.message && issue.message !== 'Required' && issue.message !== 'Invalid input') {
    return issue.message;
  }

  const rawField = issue.path[issue.path.length - 1];
  const field = typeof rawField === 'string' || typeof rawField === 'number' ? String(rawField) : 'ฟิลด์ข้อมูล';

  switch (issue.code) {
    case 'invalid_type':
      if ((issue as { input?: unknown }).input === undefined || (issue as { input?: unknown }).input === null) {
        return `กรุณาระบุข้อมูลสำหรับ ${field}`;
      }
      return `ประเภทข้อมูลของ ${field} ไม่ถูกต้อง`;
    case 'too_small':
      return `${field} มีค่าน้อยกว่าเกณฑ์ที่กำหนด`;
    case 'too_big':
      return `${field} มีค่าเกินกว่าเกณฑ์ที่กำหนด`;
    case 'invalid_format':
      return `รูปแบบข้อความของ ${field} ไม่ถูกต้อง`;
    case 'custom':
      return issue.message || `ข้อมูล ${field} ไม่ถูกต้องตามเงื่อนไข`;
    default:
      return issue.message || `ข้อมูล ${field} ไม่ถูกต้อง`;
  }
}

/**
 * Standardizes ZodError into structured field errors, summary, and first error message
 */
export function formatZodError(error: z.ZodError): FormattedZodError {
  const fieldErrors: Record<string, string[]> = {};
  const allErrors: string[] = [];

  for (const issue of error.issues) {
    const pathKey = issue.path.join('.') || '_root';
    const message = getThaiErrorMessage(issue);

    if (!fieldErrors[pathKey]) {
      fieldErrors[pathKey] = [];
    }
    fieldErrors[pathKey].push(message);
    allErrors.push(message);
  }

  return {
    fieldErrors,
    allErrors,
    firstError: allErrors[0] || 'ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด',
    errorCount: allErrors.length,
  };
}

/**
 * Safe parse wrapper that returns typed data on success, or standard FormattedZodError on failure
 */
export function safeValidate<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: FormattedZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: formatZodError(result.error),
  };
}
