import type { 
  ParseOptions, 
  StringifyOptions, 
  FormatOptions,
  ParseResult,
  StringifyResult,
  DateSerializationMode,
  Schema,
  SchemaType,
  ValidationResult,
  StreamParseOptions,
  StreamParseResult
} from './types'
import { validate } from './validate'

// Check if value is a Date object
function isDate(value: unknown): value is Date {
  return value instanceof Date
}

// Transform object to convert Date objects to numbers when mode is 'timestamp'
// JSON.stringify calls toJSON() on Date objects before the replacer runs,
// so we need to pre-process the object for timestamp mode
function transformDatesForTimestamp(value: unknown, seen: WeakSet<object>): unknown {
  if (isDate(value)) {
    return value.getTime()
  }
  
  if (typeof value === 'object' && value !== null) {
    if (seen.has(value)) {
      return '[Circular]'
    }
    seen.add(value)
    
    if (Array.isArray(value)) {
      return value.map(item => transformDatesForTimestamp(item, seen))
    }
    
    const transformed: Record<string, unknown> = {}
    for (const key in value) {
      transformed[key] = transformDatesForTimestamp((value as Record<string, unknown>)[key], seen)
    }
    return transformed
  }
  
  return value
}

// Shared replacer that handles circular references and BigInt
// Dates are handled by pre-processing for timestamp mode
// For ISO mode, JSON.stringify's toJSON() handles it automatically
function createCircularReplacer(
  customReplacer?: (key: string, value: unknown) => unknown
) {
  const seen = new WeakSet()
  
  return (key: string, value: unknown) => {
    if (customReplacer) {
      value = customReplacer(key, value)
    }
    
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
    const datesEnabled = options?.dates !== undefined && options?.dates !== false
    const mode: DateSerializationMode = options?.dates === true ? 'iso' : (options?.dates || 'iso')
    
    // For timestamp mode, pre-process to convert Date objects to numbers
    // JSON.stringify calls toJSON() on Date objects before the replacer runs
    let valueToStringify = value
    if (datesEnabled && mode === 'timestamp') {
      const seen = new WeakSet()
      valueToStringify = transformDatesForTimestamp(value, seen)
    }
    
    return JSON.stringify(
      valueToStringify, 
      createCircularReplacer(options?.replacer), 
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
    
    const datesEnabled = dates !== undefined && dates !== false
    const mode: DateSerializationMode = dates === true ? 'iso' : (dates || 'iso')
    
    // For timestamp mode, pre-process to convert Date objects to numbers
    let valueToStringify = value
    if (datesEnabled && mode === 'timestamp') {
      const seen = new WeakSet()
      valueToStringify = transformDatesForTimestamp(value, seen)
    }
    
    const result = JSON.stringify(valueToStringify, createCircularReplacer(replacer), space)
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

export { parseStream } from './stream'

export type { 
  ParseOptions, 
  StringifyOptions, 
  FormatOptions,
  ParseResult,
  StringifyResult,
  Schema,
  SchemaType,
  ValidationResult,
  StreamParseOptions,
  StreamParseResult,
  DateSerializationMode
}
