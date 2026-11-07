import { z } from 'zod';

export interface JsonSchemaExportOptions {
  title?: string;
  description?: string;
  target?: string;
}

/**
 * Converts any Zod schema into standard JSON Schema (OpenAPI / Draft 2020-12 compliant)
 */
export function exportToJsonSchema(
  schema: z.ZodType<any>,
  options: JsonSchemaExportOptions = {}
): Record<string, any> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, any>;

  if (options.title) {
    jsonSchema.title = options.title;
  }
  if (options.description) {
    jsonSchema.description = options.description;
  }

  return jsonSchema;
}
