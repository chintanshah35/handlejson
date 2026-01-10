import type { ParseOptions, ParseResult, DateSerializationMode } from './types'
import { validate } from './validate'

function createDateReviver(
  customReviver?: (key: string, value: unknown) => unknown,
  dateMode?: boolean | DateSerializationMode
): (key: string, value: unknown) => unknown {
  const datesEnabled = dateMode !== undefined && dateMode !== false
  
  return (key: string, value: unknown) => {
    if (datesEnabled && typeof value === 'string') {
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
    
    if (options?.schema) {
      const [valid, error] = validate(parsed, options.schema)
      if (!valid) {
        throw new Error(error.message)
      }
    }
    
    return parsed
  } catch {
    return options?.default ?? null
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

export function isValid(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

