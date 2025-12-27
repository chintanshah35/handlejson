import type { 
  ParseOptions, 
  StringifyOptions, 
  FormatOptions,
  ParseResult,
  StringifyResult,
  DateSerializationMode
} from './types'

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
    
    if (datesEnabled && isDate(value)) {
      return serializeDate(value, mode)
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

export function parse<T = unknown>(value: string, options?: ParseOptions<T>): T | null {
  try {
    return JSON.parse(value, options?.reviver) as T
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

export function tryParse<T = unknown>(value: string, reviver?: (key: string, value: unknown) => unknown): ParseResult<T> {
  try {
    return [JSON.parse(value, reviver) as T, null]
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
