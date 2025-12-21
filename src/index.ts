import type { 
  ParseOptions, 
  StringifyOptions, 
  FormatOptions,
  ParseResult,
  StringifyResult 
} from './types'

// Shared replacer that handles circular references
function createCircularReplacer(customReplacer?: (key: string, value: unknown) => unknown) {
  const seen = new WeakSet()
  return (key: string, value: unknown) => {
    if (customReplacer) {
      value = customReplacer(key, value)
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
    return JSON.stringify(value, createCircularReplacer(options?.replacer), options?.space)
  } catch {
    return null
  }
}

export function tryParse<T = unknown>(value: string, reviver?: (key: string, value: unknown) => unknown): ParseResult<T> {
  try {
    return [JSON.parse(value, reviver) as T, null]
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))]
  }
}

export function tryStringify(value: unknown, options?: StringifyOptions | number): StringifyResult {
  try {
    const space = typeof options === 'number' ? options : options?.space
    const replacer = typeof options === 'number' ? undefined : options?.replacer
    const result = JSON.stringify(value, createCircularReplacer(replacer), space)
    return [result, null]
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))]
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
