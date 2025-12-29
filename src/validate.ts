import type { Schema, SchemaType, ValidationResult } from './types'

function getType(value: unknown): SchemaType {
  if (value === null) return 'object'
  if (Array.isArray(value)) return 'array'
  return typeof value as SchemaType
}

function validateType(value: unknown, expectedType: SchemaType): boolean {
  const actualType = getType(value)
  return actualType === expectedType
}

export function validate(value: unknown, schema: Schema): ValidationResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [false, new Error(`Expected object, got ${getType(value)}`)]
  }

  const obj = value as Record<string, unknown>
  const keys = Object.keys(schema)

  for (const key of keys) {
    const schemaValue = schema[key]
    const objValue = obj[key]

    if (typeof schemaValue === 'string') {
      // Schema type (string, number, boolean, object, array)
      if (!validateType(objValue, schemaValue as SchemaType)) {
        return [
          false,
          new Error(`Field "${key}": expected ${schemaValue}, got ${getType(objValue)}`)
        ]
      }
    } else {
      // Nested schema
      if (typeof objValue !== 'object' || objValue === null || Array.isArray(objValue)) {
        return [
          false,
          new Error(`Field "${key}": expected object, got ${getType(objValue)}`)
        ]
      }
      const [valid, error] = validate(objValue, schemaValue)
      if (!valid) {
        return [false, new Error(`Field "${key}": ${error?.message}`)]
      }
    }
  }

  return [true, null]
}

