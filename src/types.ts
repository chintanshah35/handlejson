export type DateSerializationMode = 'iso' | 'timestamp'

export type ParseOptions<T = unknown> = {
  default?: T
  reviver?: (key: string, value: unknown) => unknown
  dates?: boolean | DateSerializationMode
  schema?: Schema
}

export type StringifyOptions = {
  space?: number
  replacer?: (key: string, value: unknown) => unknown
  dates?: boolean | DateSerializationMode
}

export type FormatOptions = {
  space?: number
}

export type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array'
export type SchemaValue = SchemaType | Schema | SchemaType[]

export type Schema = {
  [key: string]: SchemaValue
}

export type ValidationError = {
  path: string
  expected: string
  actual: string
  message: string
}

export type ParseResult<T> = [T, null] | [null, Error]

export type ParseResultWithDetails<T> = {
  success: true
  data: T
} | {
  success: false
  error: string
  position?: number
  context?: string
}

export type StringifyResult = [string, null] | [null, Error]
export type ValidationResult = [true, null] | [false, ValidationError]

export type StreamParseOptions = {
  chunkSize?: number
  onProgress?: (parsed: unknown) => void
  onError?: (error: Error) => void
}

export type StreamParseResult<T> = {
  data: T | null
  error: Error | null
  complete: boolean
}

