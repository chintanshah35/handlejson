import type { StringifyOptions, StringifyResult, DateSerializationMode } from './types'

function isDate(value: unknown): value is Date {
  return value instanceof Date
}

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

/**
 * Safe JSON stringify. Handles circular refs and returns null on error.
 */
export function stringify(value: unknown, options?: StringifyOptions): string | null {
  try {
    const datesEnabled = options?.dates !== undefined && options?.dates !== false
    const mode: DateSerializationMode = options?.dates === true ? 'iso' : (options?.dates || 'iso')
    
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

/**
 * Stringify with error tuple. Returns [result, error] instead of null.
 */
export function tryStringify(value: unknown, options?: StringifyOptions | number): StringifyResult {
  try {
    const space = typeof options === 'number' ? options : options?.space
    const replacer = typeof options === 'number' ? undefined : options?.replacer
    const dates = typeof options === 'number' ? undefined : options?.dates
    
    const datesEnabled = dates !== undefined && dates !== false
    const mode: DateSerializationMode = dates === true ? 'iso' : (dates || 'iso')
    
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

