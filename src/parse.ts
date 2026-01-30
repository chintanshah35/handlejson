import type { ParseOptions, ParseResult, ParseResultWithDetails, DateSerializationMode } from './types'
import { validate } from './validate'
import { extractPosition, getContext, formatError } from './errors'

function validateInputSize(json: string, maxSize?: number): void {
  if (maxSize !== undefined && json.length > maxSize) {
    throw new Error(`Input size ${json.length} exceeds maximum ${maxSize} bytes`)
  }
}

function checkDepth(obj: unknown, currentDepth: number, maxDepth: number): void {
  if (currentDepth > maxDepth) {
    throw new Error(`Maximum depth ${maxDepth} exceeded`)
  }
  
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        checkDepth(item, currentDepth + 1, maxDepth)
      }
    } else {
      for (const value of Object.values(obj)) {
        checkDepth(value, currentDepth + 1, maxDepth)
      }
    }
  }
}

function sanitizeKeys(obj: unknown, safeKeys: boolean): unknown {
  if (!safeKeys || typeof obj !== 'object' || obj === null) {
    return obj
  }
  
  if (Array.isArray(obj)) {
    const sanitized = obj.map(item => sanitizeKeys(item, safeKeys))
    return sanitized.some((item, i) => item !== obj[i]) ? sanitized : obj
  }
  
  const objRecord = obj as Record<string, unknown>
  const sanitized: Record<string, unknown> = {}
  let hasDangerousKeys = false
  
  for (const key in objRecord) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      hasDangerousKeys = true
      continue
    }
    const sanitizedValue = sanitizeKeys(objRecord[key], safeKeys)
    if (sanitizedValue !== objRecord[key]) {
      hasDangerousKeys = true
    }
    sanitized[key] = sanitizedValue
  }
  
  return hasDangerousKeys ? sanitized : obj
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/

function createDateReviver(
  customReviver?: (key: string, value: unknown) => unknown,
  dateMode?: boolean | DateSerializationMode
): (key: string, value: unknown) => unknown {
  const datesEnabled = dateMode !== undefined && dateMode !== false
  
  return (key: string, value: unknown) => {
    if (datesEnabled && typeof value === 'string') {
      const len = value.length
      if (len >= 19 && len <= 35 && ISO_DATE_REGEX.test(value)) {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          const result = customReviver ? customReviver(key, date) : date
          return result
        }
      }
    }
    
    return customReviver ? customReviver(key, value) : value
  }
}

/**
 * Safe JSON parse. Returns null on error instead of throwing.
 */
export function parse<T = unknown>(value: string, options?: ParseOptions<T>): T | null {
  try {
    if (options?.maxSize !== undefined) {
      validateInputSize(value, options.maxSize)
    }
    
    const reviver = options?.dates || options?.reviver
      ? createDateReviver(options?.reviver, options?.dates)
      : options?.reviver
    const parsed = JSON.parse(value, reviver) as T
    
    if (options?.maxDepth !== undefined) {
      checkDepth(parsed, 0, options.maxDepth)
    }
    
    const sanitized = options?.safeKeys
      ? sanitizeKeys(parsed, true) as T
      : parsed
    
    if (options?.schema) {
      const [valid, error] = validate(sanitized, options.schema)
      if (!valid) {
        throw new Error(error.message)
      }
    }
    
    return sanitized
  } catch {
    return options?.default ?? null
  }
}

/**
 * Parse with error tuple. Returns [result, error] instead of null.
 */
export function tryParse<T = unknown>(
  value: string, 
  reviver?: (key: string, value: unknown) => unknown,
  dates?: boolean | DateSerializationMode
): ParseResult<T> {
  try {
    const finalReviver = dates || reviver
      ? createDateReviver(reviver, dates)
      : reviver
    return [JSON.parse(value, finalReviver) as T, null]
  } catch (error) {
    return [null, error as Error]
  }
}

/**
 * Parse with error details. Includes position and context for debugging.
 */
export function parseWithDetails<T = unknown>(
  value: string,
  options?: ParseOptions<T>
): ParseResultWithDetails<T> {
  try {
    if (options?.maxSize !== undefined) {
      validateInputSize(value, options.maxSize)
    }
    
    const reviver = options?.dates || options?.reviver
      ? createDateReviver(options?.reviver, options?.dates)
      : options?.reviver
    const parsed = JSON.parse(value, reviver) as T
    
    if (options?.maxDepth !== undefined) {
      checkDepth(parsed, 0, options.maxDepth)
    }
    
    const sanitized = options?.safeKeys
      ? sanitizeKeys(parsed, true) as T
      : parsed
    
    if (options?.schema) {
      const [valid, error] = validate(sanitized, options.schema)
      if (!valid) {
        return {
          success: false,
          error: error.message,
          position: undefined,
          context: undefined
        }
      }
    }
    
    return {
      success: true,
      data: sanitized
    }
  } catch (error) {
    const err = error as Error
    const position = extractPosition(err)
    const context = position !== undefined ? getContext(value, position) : undefined
    const formattedError = formatError(err, position, context)
    
    return {
      success: false,
      error: formattedError,
      position,
      context
    }
  }
}

/**
 * Check if string is valid JSON without parsing.
 */
export function isValid(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

