import type { 
  ParseOptions, 
  StringifyOptions, 
  FormatOptions,
  ParseResult,
  StringifyResult,
  DateSerializationMode
} from './types'
import { validate } from './validate'

// Check if value is a Date object
function isDate(value: unknown): value is Date {
  return value instanceof Date
}

// Serialize date based on mode
function serializeDate(date: Date, mode: DateSerializationMode): string | number {
  if (mode === 'timestamp') {
    return date.getTime()
  }
  return date.toISOString()
}

// Shared replacer that handles circular references, BigInt, and Dates
function createCircularReplacer(
  customReplacer?: (key: string, value: unknown) => unknown,
  dateMode?: boolean | DateSerializationMode
) {
  const seen = new WeakSet()
  const datesEnabled = dateMode !== undefined && dateMode !== false
  const mode: DateSerializationMode = dateMode === true ? 'iso' : (dateMode || 'iso')
  
  return (key: string, value: unknown) => {
    if (customReplacer) {
      value = customReplacer(key, value)
    }
    
    // If custom replacer returned a non-Date, use that
    // Otherwise, if dates enabled and value is Date, serialize it
    if (datesEnabled && isDate(value)) {
      return serializeDate(value, mode)
    }
    
    // If dates disabled and value is Date, let JSON.stringify handle it (returns ISO string)
    
    if (typeof value === 'bigint') {
      return value.toString() + 'n'
    }
    
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    
    return value
  }
}

// Create reviver that handles date deserialization
function createDateReviver(
  customReviver?: (key: string, value: unknown) => unknown,
  dateMode?: boolean | DateSerializationMode
): (key: string, value: unknown) => unknown {
  const datesEnabled = dateMode !== undefined && dateMode !== false
  
  return (key: string, value: unknown) => {
    if (datesEnabled && typeof value === 'string') {
      // Try ISO 8601 format (e.g., "2023-01-01T10:00:00Z" or "2023-01-01T10:00:00.000Z")
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/
      if (isoDateRegex.test(value)) {
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

export function parse<T = unknown>(value: string, options?: ParseOptions<T>): T | null {
  try {
    const reviver = options?.dates || options?.reviver
      ? createDateReviver(options?.reviver, options?.dates)
      : options?.reviver
    const parsed = JSON.parse(value, reviver) as T
    
    // Validate schema if provided
    if (options?.schema) {
      const [valid, error] = validate(parsed, options.schema)
      if (!valid) {
        throw error
      }
    }
    
    return parsed
  } catch {
    return options?.default ?? null
  }
}

export function stringify(value: unknown, options?: StringifyOptions): string | null {
  try {
    return JSON.stringify(
      value, 
      createCircularReplacer(options?.replacer, options?.dates), 
      options?.space
    )
  } catch {
    return null
  }
}

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

export function tryStringify(value: unknown, options?: StringifyOptions | number): StringifyResult {
  try {
    const space = typeof options === 'number' ? options : options?.space
    const replacer = typeof options === 'number' ? undefined : options?.replacer
    const dates = typeof options === 'number' ? undefined : options?.dates
    const result = JSON.stringify(value, createCircularReplacer(replacer, dates), space)
    return [result, null]
  } catch (error) {
    return [null, error as Error]
  }
}

export function isValid(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export function format(value: unknown, options?: FormatOptions | number): string | null {
  const space = typeof options === 'number' ? options : options?.space ?? 2
  
  if (typeof value === 'string') {
    const parsed = parse(value)
    if (parsed === null) return null
    return stringify(parsed, { space })
  }
  return stringify(value, { space })
}

export function minify(value: string | unknown): string | null {
  if (typeof value === 'string') {
    const parsed = parse(value)
    if (parsed === null) return null
    return stringify(parsed)
  }
  return stringify(value)
}

export type { 
  ParseOptions, 
  StringifyOptions, 
  FormatOptions,
  ParseResult,
  StringifyResult 
}
