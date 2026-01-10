import type { Schema, SchemaType, SchemaValue, ValidationResult, ValidationError } from './types'

function getType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function validateType(value: unknown, expectedType: SchemaType): boolean {
  const actualType = getType(value)
  if (expectedType === 'object' && actualType === 'null') return false
  if (expectedType === 'object') return actualType === 'object'
  return actualType === expectedType
}

function createError(path: string, expected: string, actual: string): ValidationError {
  return {
    path,
    expected,
    actual,
    message: `Expected ${expected} at '${path}', got ${actual}`
  }
}

function validateValue(value: unknown, schemaValue: SchemaValue, path: string): ValidationResult {
  // Handle optional fields
  if (typeof schemaValue === 'string' && schemaValue.startsWith('?')) {
    if (value === undefined) return [true, null]
    const actualType = schemaValue.slice(1) as SchemaType
    if (!validateType(value, actualType)) {
      return [false, createError(path, actualType, getType(value))]
    }
    return [true, null]
  }

  // Handle array item validation
  if (Array.isArray(schemaValue)) {
    if (!Array.isArray(value)) {
      return [false, createError(path, 'array', getType(value))]
    }
    if (schemaValue.length === 0) return [true, null]
    
    const itemSchema = schemaValue[0]
    for (let index = 0; index < value.length; index++) {
      const item = value[index]
      const itemPath = `${path}[${index}]`
      
      if (typeof itemSchema === 'string') {
        if (!validateType(item, itemSchema as SchemaType)) {
          return [false, createError(itemPath, itemSchema, getType(item))]
        }
      } else if (Array.isArray(itemSchema)) {
        const result = validateValue(item, itemSchema, itemPath)
        if (!result[0]) return result
      } else {
        const result = validate(item, itemSchema)
        if (!result[0]) {
          const error = result[1]
          return [false, { ...error, path: `${itemPath}.${error.path}` }]
        }
      }
    }
    return [true, null]
  }

  // Handle simple type validation
  if (typeof schemaValue === 'string') {
    if (!validateType(value, schemaValue as SchemaType)) {
      return [false, createError(path, schemaValue, getType(value))]
    }
    return [true, null]
  }

  // Handle nested object validation
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [false, createError(path, 'object', getType(value))]
  }
  
  const result = validate(value, schemaValue)
  if (!result[0]) {
    const error = result[1]
    return [false, { ...error, path: `${path}.${error.path}` }]
  }
  return [true, null]
}

export function validate(value: unknown, schema: Schema): ValidationResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [false, createError('root', 'object', getType(value))]
  }

  const obj = value as Record<string, unknown>
  const keys = Object.keys(schema)

  for (const key of keys) {
    const schemaValue = schema[key]
    const objValue = obj[key]
    
    const result = validateValue(objValue, schemaValue, key)
    if (!result[0]) return result
  }

  return [true, null]
}

